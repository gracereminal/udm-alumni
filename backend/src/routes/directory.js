// Public alumni directory (search overlay, contact modal, alumni card): v_directory only — opted-in alumni,
// visible links only, and email / mobile only when the alumnus turned them on.
import { Router } from 'express';
import { z } from 'zod';
import { many, one } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { notFound } from '../lib/errors.js';
import { id } from '../lib/validation.js';
import { EMPLOYMENT_LABEL, TIME_TO_JOB, label } from '../lib/vocab.js';
import { displayMobile } from '../lib/validation.js';
import { publicUrl } from '../services/storage.js';

const router = Router();
router.use(requireAuth);

function card(r) {
  const contacts = { ...r.links };
  if (r.email) contacts.email = r.email;
  if (r.mobile) contacts.mobile = displayMobile(r.mobile);
  return {
    id: r.alumni_id, name: r.name, studentId: r.student_no || r.membership_id, degree: r.degree || '—', program: r.program_name || r.degree || '',
    batch: r.batch, title: r.title || '', company: r.company || '', status: r.employment_status ? EMPLOYMENT_LABEL[r.employment_status] : '',
    skills: r.skills.slice(0, 3), more: Math.max(0, r.skills.length - 3), allSkills: r.skills, photoUrl: publicUrl(r.photo_url),
    profile: {
      industry: r.industry || '', bio: r.bio || '', since: r.since ? String(r.since) : '', firstJob: label(TIME_TO_JOB, r.time_to_job_bucket),
      related: r.course_relevance === 'related' ? 'Yes' : r.course_relevance === 'not_related' ? 'No' : '', contacts,
    },
  };
}

router.get('/', validate({ query: z.object({ q: z.string().trim().max(100).optional(), batch: z.coerce.number().int().optional(), limit: z.coerce.number().int().min(1).max(100).default(50), offset: z.coerce.number().int().min(0).default(0) }) }), async (req, res, next) => {
  try {
    const { q, batch, limit, offset } = req.valid.query;
    const where = [];
    const params = [];
    if (q) { params.push(`%${q.replace(/[%_\\]/g, '\\$&')}%`); where.push(`(name ILIKE $1 OR degree ILIKE $1 OR title ILIKE $1 OR company ILIKE $1 OR skills::text ILIKE $1)`); }
    if (batch) { params.push(batch); where.push(`batch = $${params.length}`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows, n] = await Promise.all([
      many(`SELECT * FROM v_directory ${w} ORDER BY name LIMIT ${limit} OFFSET ${offset}`, params),
      one(`SELECT count(*)::int AS n FROM v_directory ${w}`, params),
    ]);
    res.json({ rows: rows.map(card), total: n.n });
  } catch (err) { next(err); }
});

router.get('/:id', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const r = await one('SELECT * FROM v_directory WHERE alumni_id = $1', [req.valid.params.id]);
    if (!r) throw notFound('This alumnus is not listed in the directory.');
    res.json(card(r));
  } catch (err) { next(err); }
});

export default router;
