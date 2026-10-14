// The topbar bell. Own notifications only; read state is a column, so it follows the user across devices.
import { Router } from 'express';
import { z } from 'zod';
import { many, one, tx } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { notFound } from '../lib/errors.js';
import { id } from '../lib/validation.js';

const router = Router();
router.use(requireAuth);

const out = (n) => ({ id: n.notification_id, type: n.type, title: n.title, body: n.message, to: n.link_url, createdAt: n.created_at, readAt: n.read_at, read: !!n.read_at });

router.get('/', validate({ query: z.object({ unread: z.enum(['1', 'true', '0', 'false']).optional(), limit: z.coerce.number().int().min(1).max(100).default(30) }) }), async (req, res, next) => {
  try {
    const onlyUnread = ['1', 'true'].includes(req.valid.query.unread);
    const [rows, count] = await Promise.all([
      many(`SELECT * FROM notification WHERE user_id = $1 ${onlyUnread ? 'AND read_at IS NULL' : ''} ORDER BY created_at DESC, notification_id DESC LIMIT ${req.valid.query.limit}`, [req.user.user_id]),
      one('SELECT count(*)::int AS n FROM notification WHERE user_id = $1 AND read_at IS NULL', [req.user.user_id]),
    ]);
    res.json({ rows: rows.map(out), unread: count.n });
  } catch (err) { next(err); }
});

router.post('/read-all', async (req, res, next) => {
  try {
    const r = await tx((db) => db.query('UPDATE notification SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [req.user.user_id]));
    res.json({ ok: true, updated: r.rowCount });
  } catch (err) { next(err); }
});

router.post('/:id/read', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const r = await tx((db) => db.query('UPDATE notification SET read_at = COALESCE(read_at, now()) WHERE notification_id = $1 AND user_id = $2 RETURNING *', [req.valid.params.id, req.user.user_id]));
    if (!r.rowCount) throw notFound();
    res.json(out(r.rows[0]));
  } catch (err) { next(err); }
});

export default router;
