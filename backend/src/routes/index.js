import { Router } from 'express';
import { pool } from '../db/index.js';
import auth from './auth.js';
import lookups from './lookups.js';
import alumni from './alumni.js';
import me from './me.js';
import directory from './directory.js';
import stats from './stats.js';
import reports from './reports.js';
import outreach from './outreach.js';
import jobs from './jobs.js';
import events from './events.js';
import notifications from './notifications.js';
import users from './users.js';
import admin from './admin.js';
import files from './files.js';
import internal from './internal.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ ok: true, db: 'up', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ ok: false, db: 'down' });
  }
});

router.use('/auth', auth);
router.use('/lookups', lookups);
router.use('/alumni', alumni);
router.use('/me', me);
router.use('/directory', directory);
router.use('/stats', stats);
router.use('/reports', reports);
router.use('/outreach', outreach);
router.use('/jobs', jobs);
router.use('/', events); // /events and /announcements
router.use('/notifications', notifications);
router.use('/users', users);
router.use('/', admin); // /settings and /audit
router.use('/files', files);
router.use('/internal', internal);

export default router;
