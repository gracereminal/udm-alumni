import crypto from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { one } from '../db/index.js';

// argon2id with OWASP-recommended parameters.
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
export const hashPassword = (pw) => hash(pw, ARGON);
export const verifyPassword = async (h, pw) => { try { return await verify(h, pw); } catch { return false; } };
/** Verified against when the account does not exist, so response time does not reveal which accounts exist. */
let dummy;
export const dummyVerify = async (pw) => { dummy = dummy || await hashPassword('Dummy-password-1'); await verifyPassword(dummy, pw); return false; };

export const initials = (name) => String(name || '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** What the client keeps as the signed-in user (replaces data/demoAccounts.js). */
export function userPayload(u) {
  return {
    id: u.user_id,
    role: u.role,
    email: u.email,
    name: u.display_name,
    roleLabel: u.role_label || (u.role === 'admin' ? 'Administrator' : u.role === 'dept' ? 'College Staff' : 'Alumni'),
    initials: initials(u.display_name),
    college: u.college_name || null,
    collegeId: u.college_id || null,
    collegeCode: u.college_code || null,
    alumniId: u.alumni_id || null,
    mustChangePassword: !!u.must_change_password,
  };
}

/** Email, or Alumni ID matched against both student_no and membership_id. Staff sign in by email only. */
export function findLoginAccount(identifier, db) {
  const id = String(identifier || '').trim();
  return one(
    `SELECT u.*, c.name AS college_name, c.code AS college_code, a.alumni_id
       FROM user_account u
       LEFT JOIN college c ON c.college_id = u.college_id
       LEFT JOIN alumnus a ON a.user_id = u.user_id
      WHERE lower(u.email) = lower($1)
         OR (u.role = 'alumni' AND a.merged_into_id IS NULL AND (upper(a.student_no) = upper($1) OR upper(a.membership_id) = upper($1)))
      LIMIT 1`,
    [id], db,
  );
}

/** One-time password for create-user: 16 chars, always satisfies the password rules. */
export function oneTimePassword() {
  const base = crypto.randomBytes(12).toString('base64url').replace(/[-_]/g, 'x');
  return `${base.slice(0, 12)}A7${base.slice(12, 14)}`;
}
