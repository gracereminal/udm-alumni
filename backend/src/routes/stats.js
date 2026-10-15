// /stats/* — admin: all colleges; dept: automatically pinned to their own college (scopeFor).
import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { scopeFor } from '../middleware/scope.js';
import { id } from '../lib/validation.js';
import { aggregate, counters, inclusion, labelRows, sectors, unresponsive } from '../services/stats.js';
import { getSettings } from '../services/settings.js';

const router = Router();
router.use(requireRole('admin', 'dept'));

const intList = z.string().regex(/^\d{4}(,\d{4})*$/).transform((s) => s.split(',').map(Number));
export const statFilters = z.object({
  collegeId: id.optional(),
  programId: id.optional(),
  unmapped: z.enum(['1', 'true']).transform(() => true).optional(),
  batch: z.coerce.number().int().optional(),
  batchFrom: z.coerce.number().int().optional(),
  batchTo: z.coerce.number().int().optional(),
  batches: intList.optional(),
  status: z.enum(['pending', 'verified', 'flagged']).optional(),
});

router.get('/summary', validate({ query: statFilters }), async (req, res, next) => {
  try {
    const [metrics, settings] = await Promise.all([aggregate(req.user, req.valid.query), getSettings()]);
    res.json({ ...metrics, targets: { employment: settings.employment_target, coverage: settings.coverage_target } });
  } catch (err) { next(err); }
});

// University-wide rates for the college dashboard's "college vs university" comparison. Rates only, no counts,
// so a dept user learns nothing about other colleges' alumni.
router.get('/benchmark', async (_req, res, next) => {
  try {
    const m = await aggregate({ role: 'admin' }, {});
    res.json({ employmentRate: m.employmentRate, alignedRate: m.alignedRate, coverage: m.coverage, firstGenRate: m.firstGenRate });
  } catch (err) { next(err); }
});

router.get('/by-batch', validate({ query: statFilters }), async (req, res, next) => {
  try { res.json(await labelRows(await aggregate(req.user, req.valid.query, 'batch'), 'batch')); } catch (err) { next(err); }
});

// group = college (admin, no college selected) | program (a college selected, or a dept user) | batch.
router.get('/by-program', validate({ query: statFilters.extend({ group: z.enum(['college', 'program', 'batch']).optional() }) }), async (req, res, next) => {
  try {
    const f = req.valid.query;
    const group = f.group || (f.programId ? 'batch' : (f.collegeId || scopeFor(req.user).collegeId) ? 'program' : 'college');
    res.json({ group, rows: await labelRows(await aggregate(req.user, f, group), group) });
  } catch (err) { next(err); }
});

router.get('/sectors', validate({ query: statFilters }), async (req, res, next) => {
  try { res.json(await sectors(req.user, req.valid.query)); } catch (err) { next(err); }
});

router.get('/inclusion', validate({ query: statFilters }), async (req, res, next) => {
  try {
    const [m, breakdown] = await Promise.all([aggregate(req.user, req.valid.query), inclusion(req.user, req.valid.query)]);
    res.json({
      traced: m.traced, ip: m.ip, pwd: m.pwd, ipRate: m.ipRate, pwdRate: m.pwdRate,
      ipEmploymentRate: m.ipEmploymentRate, nonIpEmploymentRate: m.nonIpEmploymentRate,
      pwdEmploymentRate: m.pwdEmploymentRate, nonPwdEmploymentRate: m.nonPwdEmploymentRate, ...breakdown,
    });
  } catch (err) { next(err); }
});

router.get('/unresponsive', validate({ query: statFilters.extend({ limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) }) }), async (req, res, next) => {
  try {
    const { limit, offset, ...f } = req.valid.query;
    res.json(await unresponsive(req.user, f, { limit, offset }));
  } catch (err) { next(err); }
});

router.get('/counters', validate({ query: statFilters }), async (req, res, next) => {
  try { res.json(await counters(req.user, req.valid.query)); } catch (err) { next(err); }
});

export default router;
