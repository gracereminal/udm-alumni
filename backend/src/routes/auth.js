import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/index.js';
import { one, tx } from '../db/index.js';
import { authLimiter, validate } from '../middleware/common.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest, unauthorized } from '../lib/errors.js';
import { password, PASSWORD_MSG, passwordOk } from '../lib/validation.js';
import { audit, fromReq } from '../services/audit.js';
import { COOKIE, cookieOptions, createSession, randomToken, revokeAllSessions, revokeSession, sha256 } from '../services/sessions.js';
import { dummyVerify, findLoginAccount, hashPassword, userPayload, verifyPassword } from '../services/users.js';
import { registerAlumnus } from '../services/alumni.js';
import { sendMail } from '../services/mailer.js';
import { resetPasswordEmail } from '../services/emailTemplates.js';
import { logger, maskEmail } from '../lib/logger.js';

const router = Router();
const limiter = authLimiter();
const RESET_TTL_MIN = 30;
const MAX_CODE_ATTEMPTS = 5;
const INVALID = 'Incorrect email / Alumni ID or password.';

const setCookie = (res, token) => res.cookie(COOKIE, token, cookieOptions());
const codeHash = (resetTokenHash, code) => sha256(`${resetTokenHash}:${code}`);

async function signedInPayload(userId, db) {
  return userPayload(await one(
    `SELECT u.*, c.name AS college_name, c.code AS college_code, a.alumni_id
       FROM user_account u LEFT JOIN college c ON c.college_id = u.college_id LEFT JOIN alumnus a ON a.user_id = u.user_id
      WHERE u.user_id = $1`, [userId], db,
  ));
}

// Registration: user + alumnus + consent + password hash in one transaction, then signed in.
router.post('/register', limiter, async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const r = await registerAlumnus(db, req.body || {}, req);
      const token = await createSession(db, r.userId, req);
      return { ...r, token, user: await signedInPayload(r.userId, db) };
    });
    setCookie(res, out.token);
    res.status(201).json({ user: out.user, membershipId: out.membershipId });
  } catch (err) { next(err); }
});

router.post('/login', limiter, validate({ body: z.object({ identifier: z.string().trim().min(1, 'Enter your email or Alumni ID.').max(120), password: z.string().min(1, 'Enter your password.').max(200) }) }), async (req, res, next) => {
  try {
    const { identifier, password: pw } = req.valid.body;
    const u = await findLoginAccount(identifier);
    if (!u) {
      await dummyVerify(pw);
      await tx((db) => audit(db, { entityType: 'auth', action: 'login_failed', details: { reason: 'unknown_account' }, ip: req.ip }));
      throw unauthorized(INVALID);
    }
    if (u.locked_until && new Date(u.locked_until) > new Date()) {
      await dummyVerify(pw);
      await tx((db) => audit(db, { actorId: u.user_id, entityType: 'user', entityId: u.user_id, action: 'login_failed', details: { reason: 'locked' }, ip: req.ip }));
      throw unauthorized(`${INVALID} Too many failed attempts — try again in a few minutes or reset your password.`);
    }
    const ok = await verifyPassword(u.password_hash, pw);
    if (!ok || u.account_status !== 'active') {
      await tx(async (db) => {
        const failed = (u.failed_login_count || 0) + 1;
        const lock = failed >= config.LOGIN_LOCKOUT_THRESHOLD;
        await db.query(
          `UPDATE user_account SET failed_login_count = $2, locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE locked_until END WHERE user_id = $1`,
          [u.user_id, lock ? 0 : failed, lock, config.LOGIN_LOCKOUT_MINUTES],
        );
        await audit(db, { actorId: u.user_id, entityType: 'user', entityId: u.user_id, action: 'login_failed', details: { reason: ok ? 'disabled' : 'password', locked: lock }, ip: req.ip });
      });
      throw unauthorized(INVALID);
    }
    const token = await tx(async (db) => {
      await db.query('UPDATE user_account SET failed_login_count = 0, locked_until = NULL, last_login_at = now() WHERE user_id = $1', [u.user_id]);
      await audit(db, { actorId: u.user_id, entityType: 'user', entityId: u.user_id, action: 'login', ip: req.ip });
      return createSession(db, u.user_id, req);
    });
    setCookie(res, token);
    res.json({ user: userPayload(u) });
  } catch (err) { next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    if (req.user) await tx((db) => revokeSession(db, req.user.session_id));
    res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/session', requireAuth, (req, res) => res.json({ user: userPayload(req.user) }));

router.post('/change-password', requireAuth, validate({ body: z.object({ current: z.string().min(1).max(200), password }) }), async (req, res, next) => {
  try {
    const u = await one('SELECT password_hash FROM user_account WHERE user_id = $1', [req.user.user_id]);
    if (!(await verifyPassword(u.password_hash, req.valid.body.current))) throw badRequest('Your current password is incorrect.', { current: 'Your current password is incorrect.' });
    await tx(async (db) => {
      await db.query('UPDATE user_account SET password_hash = $2, must_change_password = false, updated_at = now() WHERE user_id = $1', [req.user.user_id, await hashPassword(req.valid.body.password)]);
      await revokeAllSessions(db, req.user.user_id, req.user.session_id);
      await audit(db, fromReq(req, { entityType: 'user', entityId: req.user.user_id, action: 'password_changed' }));
    });
    res.json({ ok: true, message: 'Password updated. Other active sessions have been signed out.' });
  } catch (err) { next(err); }
});

// --- Password reset -------------------------------------------------------------------------------
const GENERIC_SENT = 'If an account matches, we sent a reset link and code to its email address.';

router.post('/forgot-password', limiter, validate({ body: z.object({ identifier: z.string().trim().min(1, 'Enter your email or Alumni ID.').max(120) }) }), async (req, res, next) => {
  try {
    const u = await findLoginAccount(req.valid.body.identifier);
    if (u && u.account_status === 'active') {
      // Per-account limit: at most 3 reset emails per 15 minutes (silently skipped — same response either way).
      const recent = await one("SELECT count(*)::int AS n FROM password_reset WHERE user_id = $1 AND created_at > now() - interval '15 minutes'", [u.user_id]);
      if (recent.n < 3) {
        const token = randomToken();
        const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
        const tokenHash = sha256(token);
        // A failed send rolls the reset back but still returns the generic response (no account enumeration).
        await tx(async (db) => {
          // A new request invalidates earlier unused ones.
          await db.query('UPDATE password_reset SET expires_at = least(expires_at, now()) WHERE user_id = $1 AND used_at IS NULL', [u.user_id]);
          await db.query(
            `INSERT INTO password_reset (user_id, code_hash, token_hash, sent_to, expires_at) VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
            [u.user_id, codeHash(tokenHash, code), tokenHash, u.email, RESET_TTL_MIN],
          );
          await audit(db, { actorId: u.user_id, entityType: 'user', entityId: u.user_id, action: 'password_reset_requested', details: { sentTo: maskEmail(u.email) }, ip: req.ip });
          const link = `${config.APP_URL}/reset-password?token=${token}`;
          await sendMail({ to: u.email, ...resetPasswordEmail({ appUrl: config.APP_URL, name: u.display_name, email: u.email, link, code }) });
        }).catch((err) => logger.error({ err, user: u.user_id }, 'password reset email failed'));
      }
    } else {
      await dummyVerify('x');
    }
    res.json({ ok: true, message: GENERIC_SENT });
  } catch (err) { next(err); }
});

const activeResetByToken = (token, db) => one(
  `SELECT r.*, u.email FROM password_reset r JOIN user_account u ON u.user_id = r.user_id
    WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now() AND r.attempts < $2 AND u.account_status = 'active'`,
  [sha256(token), MAX_CODE_ATTEMPTS], db,
);

router.get('/reset-password/verify', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    const r = token && token.length < 100 ? await activeResetByToken(token) : null;
    res.json(r ? { valid: true, email: r.sent_to } : { valid: false });
  } catch (err) { next(err); }
});

router.post('/reset-password/verify-code', limiter, validate({ body: z.object({ identifier: z.string().trim().min(1).max(120), code: z.string().trim().max(12) }) }), async (req, res, next) => {
  try {
    const BAD = 'That code is incorrect or has expired. Request a new reset email.';
    const u = await findLoginAccount(req.valid.body.identifier);
    if (!u) throw badRequest(BAD, { code: BAD });
    const code = req.valid.body.code.replace(/\D/g, '');
    const out = await tx(async (db) => {
      const r = await one(
        `SELECT * FROM password_reset WHERE user_id = $1 AND used_at IS NULL AND expires_at > now() AND attempts < $2
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [u.user_id, MAX_CODE_ATTEMPTS], db,
      );
      if (!r) return null;
      if (code.length !== 6 || codeHash(r.token_hash, code) !== r.code_hash) {
        await db.query('UPDATE password_reset SET attempts = attempts + 1 WHERE reset_id = $1', [r.reset_id]);
        return { wrong: true };
      }
      // The code is exchanged for a fresh single-use reset token (the "resetSession").
      const token = randomToken();
      const tokenHash = sha256(token);
      await db.query('UPDATE password_reset SET token_hash = $2, code_hash = $3 WHERE reset_id = $1', [r.reset_id, tokenHash, codeHash(tokenHash, crypto.randomBytes(8).toString('hex'))]);
      return { token, email: r.sent_to };
    });
    if (!out || out.wrong) throw badRequest(BAD, { code: BAD });
    res.json({ resetSession: out.token, email: out.email });
  } catch (err) { next(err); }
});

router.post('/reset-password', limiter, validate({ body: z.object({ token: z.string().min(10).max(100).optional(), resetSession: z.string().min(10).max(100).optional(), password: z.string().max(200) }) }), async (req, res, next) => {
  try {
    const { token, resetSession, password: pw } = req.valid.body;
    if (!passwordOk(pw)) throw badRequest(PASSWORD_MSG, { password: PASSWORD_MSG });
    const t = token || resetSession;
    if (!t) throw badRequest('This reset link is invalid or has expired.', { code: 'expired' });
    const pwHash = await hashPassword(pw);
    const done = await tx(async (db) => {
      const r = await one(
        `SELECT * FROM password_reset WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() AND attempts < $2 FOR UPDATE`,
        [sha256(t), MAX_CODE_ATTEMPTS], db,
      );
      if (!r) return false;
      await db.query('UPDATE password_reset SET used_at = now() WHERE reset_id = $1', [r.reset_id]);
      await db.query('UPDATE user_account SET password_hash = $2, must_change_password = false, failed_login_count = 0, locked_until = NULL, updated_at = now() WHERE user_id = $1', [r.user_id, pwHash]);
      await revokeAllSessions(db, r.user_id);
      await audit(db, { actorId: r.user_id, entityType: 'user', entityId: r.user_id, action: 'password_reset', ip: req.ip });
      return true;
    });
    if (!done) return res.status(400).json({ error: 'This reset link is invalid or has expired.', code: 'expired' });
    res.json({ ok: true, message: 'Password updated. Other active sessions have been signed out.' });
  } catch (err) { next(err); }
});

export default router;
