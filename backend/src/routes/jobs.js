// Job board: admin postings go live at once; alumni postings wait in the approval queue.
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { many, one, tx } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { forbidden, notFound } from '../lib/errors.js';
import { id } from '../lib/validation.js';
import { EMP_TYPE, code, label } from '../lib/vocab.js';
import { audit, fromReq } from '../services/audit.js';
import { adminIds, notify } from '../services/notifications.js';
import { publicUrl, saveUpload } from '../services/storage.js';

const router = Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

const SELECT = `
  SELECT j.*, s.saves, s.applications,
         COALESCE((SELECT jsonb_agg(sk.name ORDER BY sk.name) FROM job_skill js JOIN skill sk ON sk.skill_id = js.skill_id WHERE js.job_id = j.job_id), '[]'::jsonb) AS tags,
         u.display_name AS poster_name, u.email AS poster_email, u.role AS poster_role, pa.year_graduated AS poster_batch, pp.abbr AS poster_program,
         sj.saved_at AS my_saved_at, sj.applied_at AS my_applied_at
    FROM job_posting j
    JOIN v_job_stats s ON s.job_id = j.job_id
    LEFT JOIN user_account u ON u.user_id = j.posted_by
    LEFT JOIN alumnus pa ON pa.user_id = j.posted_by
    LEFT JOIN program pp ON pp.program_id = pa.program_id
    LEFT JOIN saved_job sj ON sj.job_id = j.job_id AND sj.alumni_id = $1`;

function jobOut(j, viewer) {
  const staff = viewer.role === 'admin';
  return {
    id: j.job_id, title: j.title, company: j.company, location: j.location || '', type: label(EMP_TYPE, j.employment_type) || 'Full-time',
    salary: j.salary_range || '', salaryNote: j.salary_note || '', deadline: j.deadline, applyVia: j.how_to_apply || '', desc: j.description || '',
    badge: j.badge || (j.source === 'alumni' ? 'Alumni Referral' : ''), badgeKind: 'alumni', note: j.note || '',
    tags: j.tags, photo: publicUrl(j.company_photo_url), source: j.source, approvalStatus: j.approval_status,
    status: j.is_active ? 'active' : 'inactive', publishedAt: j.published_at, createdAt: j.created_at, rejectReason: j.reject_reason || '',
    by: j.poster_name || '', batch: j.poster_program ? `${j.poster_program} ${j.poster_batch}` : '', mine: Number(j.posted_by) === Number(viewer.user_id),
    email: staff ? j.poster_email || '' : undefined,
    saved: !!j.my_saved_at, applied: j.my_applied_at ? { status: 'Application submitted', at: j.my_applied_at } : null,
    saves: staff ? j.saves : undefined, applications: staff ? j.applications : undefined,
  };
}

const viewerAlumni = (req) => req.user.alumni_id ?? -1;

router.get('/', validate({ query: z.object({ view: z.enum(['board', 'queue', 'mine', 'all']).default('board'), q: z.string().trim().max(100).optional() }) }), async (req, res, next) => {
  try {
    const { view, q } = req.valid.query;
    const where = ['j.deleted_at IS NULL'];
    const params = [viewerAlumni(req)];
    if (view === 'queue') { if (req.user.role !== 'admin') throw forbidden(); where.push("j.approval_status = 'pending'"); }
    else if (view === 'mine') { params.push(req.user.user_id); where.push(`j.posted_by = $${params.length}`); }
    else if (view === 'all') { if (req.user.role !== 'admin') throw forbidden(); where.push("j.approval_status = 'approved'"); }
    else where.push("j.approval_status = 'approved' AND j.is_active");
    if (q) { params.push(`%${q.replace(/[%_\\]/g, '\\$&')}%`); where.push(`(j.title ILIKE $${params.length} OR j.company ILIKE $${params.length})`); }
    const rows = await many(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY COALESCE(j.published_at, j.created_at) DESC`, params);
    res.json(rows.map((j) => jobOut(j, req.user)));
  } catch (err) { next(err); }
});

const jobBody = z.object({
  title: z.string().trim().min(1, 'Enter a job title.').max(160), company: z.string().trim().min(1, 'Enter the company.').max(160),
  location: z.string().trim().max(120).optional(), type: z.enum(Object.keys(EMP_TYPE.toCode)).optional(),
  salary: z.string().trim().max(60).optional(), salaryNote: z.string().trim().max(60).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').optional().or(z.literal('')),
  applyVia: z.string().trim().max(500).optional(), desc: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(12).optional(), badge: z.string().trim().max(60).optional(), note: z.string().trim().max(160).optional(),
});

async function writeSkills(db, jobId, tags) {
  if (!tags) return;
  await db.query('DELETE FROM job_skill WHERE job_id = $1', [jobId]);
  for (const name of [...new Set(tags)]) {
    const s = await one('INSERT INTO skill (name) VALUES ($1) ON CONFLICT (lower(name)) DO UPDATE SET name = skill.name RETURNING skill_id', [name], db);
    await db.query('INSERT INTO job_skill (job_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [jobId, s.skill_id]);
  }
}

const getJob = (db, jobId, req) => one(`${SELECT} WHERE j.job_id = $2 AND j.deleted_at IS NULL`, [viewerAlumni(req), jobId], db);

/** Alumni whose skills overlap the job's skills (JOB_SKILL), notified once per job. */
async function notifyMatches(db, jobId, title, company) {
  const ids = (await many(
    `SELECT DISTINCT a.user_id FROM alumni_skill x JOIN alumnus a ON a.alumni_id = x.alumni_id JOIN job_skill js ON js.skill_id = x.skill_id
      JOIN user_account u ON u.user_id = a.user_id WHERE js.job_id = $1 AND u.account_status = 'active' AND a.archived_at IS NULL`, [jobId], db,
  )).map((r) => r.user_id);
  await notify(db, ids, { type: 'job_match', title: `New job match: ${title}`, message: `${company} is hiring and your skills match this posting.`, link: 'jobs', dedupeKey: `job_match:${jobId}` });
}

router.post('/', requireRole('admin', 'alumni'), validate({ body: jobBody }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const admin = req.user.role === 'admin';
    const out = await tx(async (db) => {
      const r = await one(
        `INSERT INTO job_posting (posted_by, reviewed_by, title, company, location, employment_type, salary_range, salary_note, deadline, how_to_apply, description,
                                  badge, note, source, approval_status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING job_id`,
        [req.user.user_id, admin ? req.user.user_id : null, b.title, b.company, b.location || null, code(EMP_TYPE, b.type) || 'full_time', b.salary || null, b.salaryNote || null,
          b.deadline || null, b.applyVia || null, b.desc || null, b.badge || null, b.note || null, admin ? 'admin' : 'alumni', admin ? 'approved' : 'pending', admin ? new Date() : null], db,
      );
      await writeSkills(db, r.job_id, b.tags);
      await audit(db, fromReq(req, { entityType: 'job_posting', entityId: r.job_id, action: admin ? 'create' : 'submit' }));
      if (admin) await notifyMatches(db, r.job_id, b.title, b.company);
      else await notify(db, await adminIds(db), { type: 'job_submitted', title: 'Job posting submitted for review', message: `${req.user.display_name} submitted “${b.title}” at ${b.company}.`, link: 'jobs' });
      return getJob(db, r.job_id, req);
    });
    res.status(201).json(jobOut(out, req.user));
  } catch (err) { next(err); }
});

async function loadForEdit(db, req) {
  const j = await one('SELECT * FROM job_posting WHERE job_id = $1 AND deleted_at IS NULL FOR UPDATE', [req.valid.params.id], db);
  if (!j) throw notFound();
  const own = Number(j.posted_by) === Number(req.user.user_id) && j.approval_status === 'pending';
  if (req.user.role !== 'admin' && !own) throw forbidden();
  return j;
}

router.patch('/:id', validate({ params: z.object({ id }), body: jobBody.partial() }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const out = await tx(async (db) => {
      await loadForEdit(db, req);
      const map = { title: 'title', company: 'company', location: 'location', salary: 'salary_range', salaryNote: 'salary_note', deadline: 'deadline', applyVia: 'how_to_apply', desc: 'description', badge: 'badge', note: 'note' };
      const sets = [];
      const params = [req.valid.params.id];
      Object.entries(map).forEach(([k, col]) => { if (k in b) { params.push(b[k] === '' ? null : b[k]); sets.push(`${col} = $${params.length}`); } });
      if (b.type) { params.push(code(EMP_TYPE, b.type)); sets.push(`employment_type = $${params.length}`); }
      if (sets.length) await db.query(`UPDATE job_posting SET ${sets.join(', ')}, updated_at = now() WHERE job_id = $1`, params);
      await writeSkills(db, req.valid.params.id, b.tags);
      await audit(db, fromReq(req, { entityType: 'job_posting', entityId: req.valid.params.id, action: 'edit', details: { fields: Object.keys(b) } }));
      return getJob(db, req.valid.params.id, req);
    });
    res.json(jobOut(out, req.user));
  } catch (err) { next(err); }
});

router.post('/:id/photo', validate({ params: z.object({ id }) }), upload.single('photo'), async (req, res, next) => {
  try {
    const f = await saveUpload(req.file?.buffer, 'image');
    const out = await tx(async (db) => {
      await loadForEdit(db, req);
      await db.query('UPDATE job_posting SET company_photo_url = $2, updated_at = now() WHERE job_id = $1', [req.valid.params.id, f.key]);
      return getJob(db, req.valid.params.id, req);
    });
    res.json(jobOut(out, req.user));
  } catch (err) { next(err); }
});

router.delete('/:id', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    await tx(async (db) => {
      await loadForEdit(db, req);
      await db.query('UPDATE job_posting SET deleted_at = now() WHERE job_id = $1', [req.valid.params.id]);
      await audit(db, fromReq(req, { entityType: 'job_posting', entityId: req.valid.params.id, action: 'delete', reversibleUntil: new Date(Date.now() + 30 * 864e5) }));
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/:id/restore', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const r = await db.query('UPDATE job_posting SET deleted_at = NULL WHERE job_id = $1 AND deleted_at IS NOT NULL', [req.valid.params.id]);
      if (!r.rowCount) throw notFound();
      await audit(db, fromReq(req, { entityType: 'job_posting', entityId: req.valid.params.id, action: 'restore' }));
      return getJob(db, req.valid.params.id, req);
    });
    res.json(jobOut(out, req.user));
  } catch (err) { next(err); }
});

// Save / apply (alumni). PUT-like semantics: POST sets, DELETE clears.
const mark = (col, on) => async (req, res, next) => {
  try {
    if (!req.user.alumni_id) throw forbidden();
    const out = await tx(async (db) => {
      const j = await one("SELECT job_id FROM job_posting WHERE job_id = $1 AND deleted_at IS NULL AND approval_status = 'approved'", [req.valid.params.id], db);
      if (!j) throw notFound();
      await db.query(
        `INSERT INTO saved_job (alumni_id, job_id, ${col}) VALUES ($1, $2, ${on ? 'now()' : 'NULL'})
         ON CONFLICT (alumni_id, job_id) DO UPDATE SET ${col} = ${on ? `COALESCE(saved_job.${col}, now())` : 'NULL'}`,
        [req.user.alumni_id, req.valid.params.id],
      );
      await db.query('DELETE FROM saved_job WHERE alumni_id = $1 AND job_id = $2 AND saved_at IS NULL AND applied_at IS NULL', [req.user.alumni_id, req.valid.params.id]);
      return getJob(db, req.valid.params.id, req);
    });
    res.json(jobOut(out, req.user));
  } catch (err) { next(err); }
};
const p = validate({ params: z.object({ id }) });
router.post('/:id/save', requireRole('alumni'), p, mark('saved_at', true));
router.delete('/:id/save', requireRole('alumni'), p, mark('saved_at', false));
router.post('/:id/apply', requireRole('alumni'), p, mark('applied_at', true));
router.delete('/:id/apply', requireRole('alumni'), p, mark('applied_at', false));

router.post('/:id/:action', requireRole('admin'), validate({ params: z.object({ id, action: z.enum(['approve', 'reject', 'deactivate', 'activate']) }), body: z.object({ reason: z.string().trim().max(500).optional() }) }), async (req, res, next) => {
  try {
    const { id: jobId, action } = req.valid.params;
    const out = await tx(async (db) => {
      const j = await one('SELECT * FROM job_posting WHERE job_id = $1 AND deleted_at IS NULL FOR UPDATE', [jobId], db);
      if (!j) throw notFound();
      if (action === 'approve') {
        await db.query("UPDATE job_posting SET approval_status = 'approved', is_active = true, reviewed_by = $2, published_at = now(), reject_reason = NULL, updated_at = now() WHERE job_id = $1", [jobId, req.user.user_id]);
        await notify(db, [j.posted_by], { type: 'job_decision', title: 'Your job posting was approved', message: `“${j.title}” is now live on the alumni job board.`, link: 'jobs' });
        await notifyMatches(db, jobId, j.title, j.company);
      } else if (action === 'reject') {
        await db.query("UPDATE job_posting SET approval_status = 'rejected', reviewed_by = $2, reject_reason = $3, updated_at = now() WHERE job_id = $1", [jobId, req.user.user_id, req.valid.body.reason || null]);
        await notify(db, [j.posted_by], { type: 'job_decision', title: 'Your job posting was not approved', message: `“${j.title}”${req.valid.body.reason ? `: ${req.valid.body.reason}` : ' was declined by the Alumni Office.'}`, link: 'jobs' });
      } else {
        await db.query('UPDATE job_posting SET is_active = $2, updated_at = now() WHERE job_id = $1', [jobId, action === 'activate']);
      }
      await audit(db, fromReq(req, { entityType: 'job_posting', entityId: jobId, action, details: req.valid.body.reason ? { reason: req.valid.body.reason } : null }));
      return getJob(db, jobId, req);
    });
    res.json(jobOut(out, req.user));
  } catch (err) { next(err); }
});

export default router;
