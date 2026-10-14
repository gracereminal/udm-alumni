import { COOKIE, loadSession } from '../services/sessions.js';
import { forbidden, unauthorized } from '../lib/errors.js';

/** Attaches req.user (or null) from the session cookie. */
export async function authenticate(req, _res, next) {
  try {
    req.user = await loadSession(req.cookies?.[COOKIE]);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

/** requireRole('admin', 'dept') */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};
