// AUDIT_LOG writer. Pass the transaction client so the audit row commits (or rolls back) with the change.
export function audit(db, { actorId = null, entityType, entityId = null, action, details = null, ip = null, reversibleUntil = null }) {
  return db.query(
    `INSERT INTO audit_log (actor_id, entity_type, entity_id, action, details, ip, reversible_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, entityType, entityId, action, details ? JSON.stringify(details) : null, ip ? String(ip).slice(0, 64) : null, reversibleUntil],
  );
}

/** Shorthand used by routes: audit(db, fromReq(req, {...})) */
export const fromReq = (req, o) => ({ actorId: req.user?.user_id ?? null, ip: req.ip, ...o });

export function recordReview(db, { alumniId, reviewerId = null, action, fromStatus = null, toStatus = null, changes = null, reason = null }) {
  return db.query(
    `INSERT INTO record_review (alumni_id, reviewer_id, action, from_status, to_status, changes, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [alumniId, reviewerId, action, fromStatus, toStatus, changes ? JSON.stringify(changes) : null, reason],
  );
}
