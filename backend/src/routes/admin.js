// /settings (APP_SETTING) and /audit (AUDIT_LOG), admin only. Mounted at the API root.
import { Router } from 'express';
import { z } from 'zod';
import { many, tx } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { id } from '../lib/validation.js';
import { audit, fromReq } from '../services/audit.js';
import { getSettings, putSettings } from '../services/settings.js';

const router = Router();
router.use(['/settings', '/audit'], requireRole('admin'));

router.get('/settings', async (_req, res, next) => {
  try { res.json(await getSettings()); } catch (err) { next(err); }
});

const pctSetting = z.number().min(0).max(100);
router.put('/settings', validate({ body: z.object({
  employment_target: pctSetting.optional(), coverage_target: pctSetting.optional(),
  outreach_interval_days: z.number().int().min(1).max(365).optional(),
  employment_rate_excludes_further_studies: z.boolean().optional(),
  notification_retention_days: z.number().int().min(7).max(3650).optional(),
  new_registration_days: z.number().int().min(1).max(90).optional(),
}).strict() }), async (req, res, next) => {
  try {
    await tx(async (db) => {
      await putSettings(db, req.valid.body, req.user.user_id);
      await audit(db, fromReq(req, { entityType: 'app_setting', action: 'update', details: req.valid.body }));
    });
    res.json(await getSettings());
  } catch (err) { next(err); }
});

router.get('/audit', validate({ query: z.object({
  entityType: z.string().max(40).optional(), entityId: id.optional(), actorId: id.optional(), action: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100), before: z.string().datetime({ offset: true }).optional(),
}) }), async (req, res, next) => {
  try {
    const q = req.valid.query;
    const where = [];
    const params = [];
    const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
    if (q.entityType) add('l.entity_type = ?', q.entityType);
    if (q.entityId) add('l.entity_id = ?', q.entityId);
    if (q.actorId) add('l.actor_id = ?', q.actorId);
    if (q.action) add('l.action = ?', q.action);
    if (q.before) add('l.created_at < ?', q.before);
    res.json(await many(
      `SELECT l.log_id AS id, l.entity_type AS "entityType", l.entity_id AS "entityId", l.action, l.details, l.ip, l.created_at AS "createdAt",
              COALESCE(u.display_name, 'System') AS actor
         FROM audit_log l LEFT JOIN user_account u ON u.user_id = l.actor_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY l.created_at DESC, l.log_id DESC LIMIT ${q.limit}`, params,
    ));
  } catch (err) { next(err); }
});

export default router;
