// Opaque server-side sessions (AUTH_SESSION). The cookie holds a random 32-byte id; only its SHA-256 is stored.
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { one, pool } from '../db/index.js';

export const COOKIE = 'udm_sid';
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
export const randomToken = () => crypto.randomBytes(32).toString('base64url');

export function cookieOptions() {
  return { httpOnly: true, secure: config.isProd, sameSite: 'lax', path: '/', maxAge: config.SESSION_TTL_DAYS * 864e5 };
}

export async function createSession(db, userId, req) {
  const token = randomToken();
  await db.query(
    `INSERT INTO auth_session (user_id, session_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))`,
    [userId, sha256(token), String(req.get('user-agent') || '').slice(0, 255), String(req.ip || '').slice(0, 64), config.SESSION_TTL_DAYS * 86400],
  );
  return token;
}

/** Resolve a cookie value to the signed-in user, enforcing expiry, idle timeout, revocation and account status. */
export async function loadSession(token) {
  if (!token || typeof token !== 'string' || token.length > 100) return null;
  const row = await one(
    `SELECT s.session_id, s.last_seen_at, u.user_id, u.email, u.role, u.college_id, u.display_name, u.role_label,
            u.must_change_password, c.name AS college_name, c.code AS college_code, a.alumni_id
       FROM auth_session s
       JOIN user_account u ON u.user_id = s.user_id
       LEFT JOIN college c ON c.college_id = u.college_id
       LEFT JOIN alumnus a ON a.user_id = u.user_id
      WHERE s.session_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
        AND s.last_seen_at > now() - make_interval(secs => $2)
        AND u.account_status = 'active'`,
    [sha256(token), config.SESSION_IDLE_HOURS * 3600],
  );
  if (!row) return null;
  // Slide the idle window, at most once a minute per session.
  if (Date.now() - new Date(row.last_seen_at).getTime() > 60e3) {
    await pool.query('UPDATE auth_session SET last_seen_at = now() WHERE session_id = $1', [row.session_id]);
  }
  return row;
}

export const revokeSession = (db, sessionId) => db.query('UPDATE auth_session SET revoked_at = now() WHERE session_id = $1 AND revoked_at IS NULL', [sessionId]);
export const revokeAllSessions = (db, userId, exceptSessionId = null) => db.query(
  'UPDATE auth_session SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND ($2::bigint IS NULL OR session_id <> $2)',
  [userId, exceptSessionId],
);
