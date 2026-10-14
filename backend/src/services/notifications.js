// NOTIFICATION rows are written by the same transaction that changes the data, so every role's bell reflects
// what the other roles did. Recipients are always resolved here from role / college_id, never by the client.
import { many } from '../db/index.js';

/**
 * Fan out one row per recipient. With a dedupeKey, a recipient that already has that key is skipped
 * (milestones are created once per crossing).
 */
export async function notify(db, userIds, { type, title, message, link = null, dedupeKey = null }) {
  const ids = [...new Set((userIds || []).filter(Boolean).map(Number))];
  if (!ids.length) return 0;
  const r = await db.query(
    `INSERT INTO notification (user_id, type, title, message, link_url, dedupe_key)
     SELECT u, $2, $3, $4, $5, $6 FROM unnest($1::bigint[]) AS u
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [ids, type, String(title).slice(0, 160), String(message).slice(0, 255), link, dedupeKey],
  );
  return r.rowCount;
}

const active = "account_status = 'active'";
export const adminIds = async (db) => (await many(`SELECT user_id FROM user_account WHERE role = 'admin' AND ${active}`, [], db)).map((r) => r.user_id);
export const deptIds = async (db, collegeId) => (collegeId == null ? []
  : (await many(`SELECT user_id FROM user_account WHERE role = 'dept' AND college_id = $1 AND ${active}`, [collegeId], db)).map((r) => r.user_id));
export const alumniUserId = async (db, alumniId) => (await many('SELECT user_id FROM alumnus WHERE alumni_id = $1 AND user_id IS NOT NULL', [alumniId], db)).map((r) => r.user_id);
export const allAlumniIds = async (db) => (await many(
  `SELECT u.user_id FROM user_account u JOIN alumnus a ON a.user_id = u.user_id
    WHERE u.role = 'alumni' AND u.${active} AND a.archived_at IS NULL AND a.merged_into_id IS NULL`, [], db)).map((r) => r.user_id);
export const eventRegistrantIds = async (db, eventId) => (await many(
  `SELECT a.user_id FROM event_registration r JOIN alumnus a ON a.alumni_id = r.alumni_id
    WHERE r.event_id = $1 AND r.cancelled_at IS NULL AND a.user_id IS NOT NULL`, [eventId], db)).map((r) => r.user_id);
