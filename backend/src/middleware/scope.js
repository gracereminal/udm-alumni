// Authorization in one place (sync rule 5). Every list and stat query filters with scopeFor(user);
// the client never supplies its own scope.
import { forbidden } from '../lib/errors.js';
import { one } from '../db/index.js';

/** { collegeId } for dept users (their own college), { alumniId } for alumni, {} for admin. */
export function scopeFor(user) {
  if (!user) throw forbidden();
  if (user.role === 'admin') return {};
  if (user.role === 'dept') return { collegeId: user.college_id };
  return { alumniId: user.alumni_id ?? -1 };
}

/**
 * Appends the scope filter to a WHERE list.
 * @param where   array of SQL conditions (mutated)
 * @param params  array of bind params (mutated)
 * @param cols    { college: 'v.college_id', alumni: 'v.alumni_id' }
 */
export function applyScope(user, where, params, cols) {
  const s = scopeFor(user);
  if (s.collegeId != null) { params.push(s.collegeId); where.push(`${cols.college} = $${params.length}`); }
  if (s.alumniId != null) {
    if (!cols.alumni) throw forbidden();
    params.push(s.alumniId); where.push(`${cols.alumni} = $${params.length}`);
  }
  return s;
}

/** Throws 404 (not 403, to avoid leaking existence) unless the alumnus is inside the caller's scope. */
export async function assertAlumnusInScope(user, alumniId, db) {
  const row = await one(
    `SELECT a.alumni_id, COALESCE(p.college_id, a.declared_college_id) AS college_id
       FROM alumnus a LEFT JOIN program p ON p.program_id = a.program_id WHERE a.alumni_id = $1`,
    [alumniId], db,
  );
  const s = scopeFor(user);
  if (!row || (s.collegeId != null && Number(row.college_id) !== Number(s.collegeId)) || (s.alumniId != null && Number(row.alumni_id) !== Number(s.alumniId))) {
    const err = new Error('Not found.');
    err.status = 404;
    throw err;
  }
  return row;
}
