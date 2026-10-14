import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config/index.js';
import { JOBS } from '../jobs/index.js';
import { logger } from '../lib/logger.js';

const router = Router();

function cronAuthorized(req) {
  const got = Buffer.from(String(req.get('x-cron-secret') || ''));
  const want = Buffer.from(String(config.CRON_SECRET || ''));
  return want.length > 0 && got.length === want.length && crypto.timingSafeEqual(got, want);
}

router.post('/jobs/:name', async (req, res, next) => {
  try {
    if (!cronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized.' });
    const job = JOBS[req.params.name];
    if (!job) return res.status(404).json({ error: 'Unknown job.' });
    const started = Date.now();
    const result = await job();
    logger.info({ job: req.params.name, result, ms: Date.now() - started }, 'scheduled job finished');
    res.json({ ok: true, job: req.params.name, result });
  } catch (err) { next(err); }
});

export default router;
