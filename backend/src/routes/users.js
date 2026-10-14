// Staff account management (admin). Until a screen exists, `npm run create-user` does the same from the shell.
import { Router } from 'express';
import { z } from 'zod';
import { many, one, tx } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { id } from '../lib/validation.js';
import { audit, fromReq } from '../services/audit.js';
import { revokeAllSessions } from '../services/sessions.js';
import { hashPassword, oneTimePassword } from '../services/users.js';

const router = Router();
router.use(requireRole('admin'));

const SELECT = `SELECT u.user_id AS id, u.email, u.role, u.display_name AS name, u.role_label AS "roleLabel", u.account_status AS status,
  u.college_id AS "collegeId", c.name AS college, u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt", u.must_change_password AS "mustChangePassword"
  FROM user_account u LEFT JOIN college c ON c.college_id = u.college_id`;

router.get('/', validate({ query: z.object({ role: z.enum(['alumni', 'dept', 'admin']).optional() }) }), async (req, res, next) => {
  try {
    const r = req.valid.query.role;
    res.json(await many(`${SELECT} ${r ? 'WHERE u.role = $1' : "WHERE u.role <> 'alumni'"} ORDER BY u.role, u.display_name`, r ? [r] : []));
  } catch (err) { next(err); }
});

/** Shared with scripts/create-user.js. Returns the one-time password (shown once, never stored in clear). */
export async function createStaffUser(db, { email, name, role, collegeId = null, roleLabel = null }, actorId = null) {
  if (role === 'dept' && !collegeId) throw badRequest('College accounts need a college.', { collegeId: 'Select the college.' });
  if (await one('SELECT 1 FROM user_account WHERE lower(email) = lower($1)', [email], db)) throw conflict('An account with this email already exists.', { fields: { email: 'Already in use.' } });
  const pw = oneTimePassword();
  const u = await one(
    `INSERT INTO user_account (email, password_hash, role, college_id, display_name, role_label, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING user_id`, [email, await hashPassword(pw), role, role === 'dept' ? collegeId : null, name, roleLabel], db,
  );
  await audit(db, { actorId, entityType: 'user', entityId: u.user_id, action: 'create', details: { role, collegeId } });
  return { userId: u.user_id, oneTimePassword: pw };
}

router.post('/', validate({ body: z.object({
  email: z.string().trim().email().max(120), name: z.string().trim().min(1).max(120), role: z.enum(['dept', 'admin']),
  collegeId: id.optional(), roleLabel: z.string().trim().max(60).optional(),
}) }), async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const r = await createStaffUser(db, req.valid.body, req.user.user_id);
      return { user: await one(`${SELECT} WHERE u.user_id = $1`, [r.userId], db), oneTimePassword: r.oneTimePassword };
    });
    res.status(201).json(out);
  } catch (err) { next(err); }
});

router.patch('/:id', validate({ params: z.object({ id }), body: z.object({
  name: z.string().trim().min(1).max(120).optional(), roleLabel: z.string().trim().max(60).optional(),
  collegeId: id.optional(), status: z.enum(['active', 'disabled']).optional(), resetPassword: z.boolean().optional(),
}) }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    if (Number(req.valid.params.id) === Number(req.user.user_id) && b.status === 'disabled') throw badRequest('You cannot disable your own account.');
    const out = await tx(async (db) => {
      const u = await one('SELECT * FROM user_account WHERE user_id = $1 FOR UPDATE', [req.valid.params.id], db);
      if (!u) throw notFound();
      let pw = null;
      await db.query(
        `UPDATE user_account SET display_name = COALESCE($2, display_name), role_label = COALESCE($3, role_label),
                college_id = CASE WHEN role = 'dept' THEN COALESCE($4, college_id) ELSE college_id END,
                account_status = COALESCE($5::account_status, account_status), updated_at = now() WHERE user_id = $1`,
        [u.user_id, b.name ?? null, b.roleLabel ?? null, b.collegeId ?? null, b.status ?? null],
      );
      if (b.resetPassword) {
        pw = oneTimePassword();
        await db.query('UPDATE user_account SET password_hash = $2, must_change_password = true WHERE user_id = $1', [u.user_id, await hashPassword(pw)]);
      }
      // Disabling, a college change or a password reset signs the account out everywhere, immediately.
      if (b.status === 'disabled' || b.resetPassword || (b.collegeId && Number(b.collegeId) !== Number(u.college_id))) await revokeAllSessions(db, u.user_id);
      await audit(db, fromReq(req, { entityType: 'user', entityId: u.user_id, action: 'update', details: { ...b, resetPassword: !!b.resetPassword } }));
      return { user: await one(`${SELECT} WHERE u.user_id = $1`, [u.user_id], db), oneTimePassword: pw || undefined };
    });
    res.json(out);
  } catch (err) { next(err); }
});

export default router;
