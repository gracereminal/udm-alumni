// The signed-in alumnus' own record: profile, survey, employment, privacy, photo, links, credentials, skills.
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { many, one, tx } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { forbidden, notFound } from '../lib/errors.js';
import { id } from '../lib/validation.js';
import { PLATFORMS } from '../lib/vocab.js';
import { audit, fromReq } from '../services/audit.js';
import { applyProfile, profileAnswers } from '../services/alumni.js';
import { getSurvey, saveSurvey } from '../services/survey.js';
import { publicUrl, removeObject, saveUpload, signedUrl } from '../services/storage.js';
import { userPayload } from '../services/users.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

router.use(requireRole('alumni'), (req, _res, next) => (req.user.alumni_id ? next() : next(forbidden('No alumni record is linked to this account.'))));
const me = (req) => req.user.alumni_id;
const actor = (req) => ({ user_id: req.user.user_id, ip: req.ip });

async function mePayload(db, req) {
  const alumniId = me(req);
  const [{ a, row, links }, survey, dash, creds, skills] = await Promise.all([
    profileAnswers(db, alumniId),
    getSurvey(db, alumniId),
    one('SELECT upcoming_events, saved_jobs, applications FROM v_alumni_dashboard WHERE alumni_id = $1', [alumniId], db),
    many('SELECT credential_id AS id, type, title, issuer, date_taken AS "dateTaken", rating FROM credential WHERE alumni_id = $1 ORDER BY credential_id', [alumniId], db),
    many('SELECT s.name, x.is_top AS "isTop" FROM alumni_skill x JOIN skill s ON s.skill_id = x.skill_id WHERE x.alumni_id = $1 ORDER BY x.is_top DESC, s.name', [alumniId], db),
  ]);
  return {
    user: userPayload(req.user),
    // Profile + survey answers in one object, keyed by the form field ids (what ProfileContext calls `a`).
    a: { ...survey.answers, ...a },
    survey: { ...survey, answers: undefined },
    record: {
      id: alumniId, membershipId: row.membership_id, studentNo: row.student_no, status: row.archived_at ? 'archived' : row.verification_status,
      flagNote: row.flag_note, photoUrl: publicUrl(row.photo_url), registeredAt: row.created_at, profileSavedAt: row.profile_saved_at,
      industry: row.industry || '', bio: row.bio || '',
    },
    privacy: {
      directoryOptIn: row.directory_opt_in, showEmail: row.show_email, showMobile: row.show_mobile,
      links: Object.fromEntries(links.map((l) => [l.platform, { url: l.url, isVisible: l.is_visible }])),
    },
    credentials: creds,
    skills,
    dashboard: dash,
  };
}

router.get('/', async (req, res, next) => {
  try { res.json(await mePayload(undefined, req)); } catch (err) { next(err); }
});

// Edit Profile: the same rows Records shows (sync rule 1), with RECORD_REVIEW + AUDIT_LOG.
router.patch('/', async (req, res, next) => {
  try {
    const input = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => /^[a-z_]+$/.test(k)));
    await tx((db) => applyProfile(db, me(req), input, actor(req)));
    res.json(await mePayload(undefined, req));
  } catch (err) { next(err); }
});

router.put('/survey', validate({ body: z.object({ answers: z.record(z.string(), z.any()), currentSection: z.number().int().min(0).max(10).optional(), submit: z.boolean().optional() }) }), async (req, res, next) => {
  try {
    const survey = await tx((db) => saveSurvey(db, me(req), req.valid.body, actor(req)));
    res.json(survey);
  } catch (err) { next(err); }
});

router.patch('/privacy', validate({ body: z.object({
  directoryOptIn: z.boolean().optional(), showEmail: z.boolean().optional(), showMobile: z.boolean().optional(),
  industry: z.string().trim().max(120).optional(), bio: z.string().trim().max(1000).optional(),
  links: z.partialRecord(z.enum(PLATFORMS), z.boolean()).optional(),
}) }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    await tx(async (db) => {
      await db.query(
        `UPDATE alumnus SET directory_opt_in = COALESCE($2, directory_opt_in), show_email = COALESCE($3, show_email), show_mobile = COALESCE($4, show_mobile),
                industry = COALESCE($5, industry), bio = COALESCE($6, bio), updated_at = now() WHERE alumni_id = $1`,
        [me(req), b.directoryOptIn ?? null, b.showEmail ?? null, b.showMobile ?? null, b.industry ?? null, b.bio ?? null],
      );
      for (const [platform, visible] of Object.entries(b.links || {})) {
        await db.query('UPDATE social_link SET is_visible = $3 WHERE alumni_id = $1 AND platform = $2', [me(req), platform, visible]);
      }
      await audit(db, fromReq(req, { entityType: 'alumnus', entityId: me(req), action: 'privacy_update', details: b }));
    });
    res.json(await mePayload(undefined, req));
  } catch (err) { next(err); }
});

// Contact channels (Facebook, Messenger, X/Twitter, Instagram, LinkedIn, website) with per-link visibility.
router.get('/links', async (req, res, next) => {
  try { res.json(await many('SELECT platform, url, is_visible AS "isVisible" FROM social_link WHERE alumni_id = $1 ORDER BY platform', [me(req)])); } catch (err) { next(err); }
});
router.put('/links', validate({ body: z.object({ links: z.array(z.object({ platform: z.enum(PLATFORMS), url: z.string().trim().min(1).max(255).refine((v) => !/\s/.test(v), 'Enter a username, handle or link without spaces.'), isVisible: z.boolean().default(false) })).max(PLATFORMS.length) }) }), async (req, res, next) => {
  try {
    await tx(async (db) => {
      await db.query('DELETE FROM social_link WHERE alumni_id = $1', [me(req)]);
      for (const l of req.valid.body.links) await db.query('INSERT INTO social_link (alumni_id, platform, url, is_visible) VALUES ($1, $2, $3, $4) ON CONFLICT (alumni_id, platform) DO UPDATE SET url = EXCLUDED.url, is_visible = EXCLUDED.is_visible', [me(req), l.platform, l.url, l.isVisible]);
      await audit(db, fromReq(req, { entityType: 'alumnus', entityId: me(req), action: 'links_update' }));
    });
    res.json(await many('SELECT platform, url, is_visible AS "isVisible" FROM social_link WHERE alumni_id = $1 ORDER BY platform', [me(req)]));
  } catch (err) { next(err); }
});

// Certifications (honors and exams come from the survey answers).
router.get('/credentials', async (req, res, next) => {
  try { res.json(await many('SELECT credential_id AS id, type, title, issuer, date_taken AS "dateTaken", rating FROM credential WHERE alumni_id = $1 ORDER BY credential_id', [me(req)])); } catch (err) { next(err); }
});
router.post('/credentials', validate({ body: z.object({ title: z.string().trim().min(1).max(160), issuer: z.string().trim().max(120).optional(), dateTaken: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), rating: z.string().trim().max(20).optional() }) }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const row = await tx(async (db) => {
      const r = await one(`INSERT INTO credential (alumni_id, type, title, issuer, date_taken, rating) VALUES ($1, 'certification', $2, $3, $4, $5)
                           RETURNING credential_id AS id, type, title, issuer, date_taken AS "dateTaken", rating`, [me(req), b.title, b.issuer || null, b.dateTaken || null, b.rating || null], db);
      await audit(db, fromReq(req, { entityType: 'credential', entityId: r.id, action: 'create' }));
      return r;
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});
router.delete('/credentials/:id', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const r = await tx((db) => db.query("DELETE FROM credential WHERE credential_id = $1 AND alumni_id = $2 AND type = 'certification'", [req.valid.params.id, me(req)]));
    if (!r.rowCount) throw notFound();
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/skills', async (req, res, next) => {
  try { res.json(await many('SELECT s.name, x.is_top AS "isTop" FROM alumni_skill x JOIN skill s ON s.skill_id = x.skill_id WHERE x.alumni_id = $1 ORDER BY x.is_top DESC, s.name', [me(req)])); } catch (err) { next(err); }
});
router.put('/skills', validate({ body: z.object({ skills: z.array(z.string().trim().min(1).max(60)).max(30), top: z.array(z.string().trim().max(60)).max(3).optional() }) }), async (req, res, next) => {
  try {
    const { skills, top = [] } = req.valid.body;
    await tx(async (db) => {
      await db.query('DELETE FROM alumni_skill WHERE alumni_id = $1', [me(req)]);
      for (const name of [...new Set(skills)]) {
        const s = await one('INSERT INTO skill (name) VALUES ($1) ON CONFLICT (lower(name)) DO UPDATE SET name = skill.name RETURNING skill_id', [name], db);
        await db.query('INSERT INTO alumni_skill (alumni_id, skill_id, is_top) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [me(req), s.skill_id, top.includes(name)]);
      }
    });
    res.json(await many('SELECT s.name, x.is_top AS "isTop" FROM alumni_skill x JOIN skill s ON s.skill_id = x.skill_id WHERE x.alumni_id = $1 ORDER BY x.is_top DESC, s.name', [me(req)]));
  } catch (err) { next(err); }
});

// Employment history outside the survey (e.g. a new job) and proof documents.
const EMP_SELECT = `SELECT employment_id AS id, employment_status AS "employmentStatus", job_title AS "jobTitle", employer_name AS "employer", is_current AS "isCurrent",
  reported_at AS "reportedAt", (SELECT count(*)::int FROM proof_document d WHERE d.employment_id = e.employment_id) AS proofs FROM employment_record e`;
router.get('/employment', async (req, res, next) => {
  try { res.json(await many(`${EMP_SELECT} WHERE alumni_id = $1 ORDER BY is_current DESC, reported_at DESC`, [me(req)])); } catch (err) { next(err); }
});
router.post('/employment', validate({ body: z.object({ jobTitle: z.string().trim().min(1).max(120), employer: z.string().trim().min(1).max(160), selfEmployed: z.boolean().default(false) }) }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const row = await tx(async (db) => {
      await db.query('UPDATE employment_record SET is_current = false WHERE alumni_id = $1 AND is_current', [me(req)]);
      const r = await one(`INSERT INTO employment_record (alumni_id, employment_status, job_title, employer_name, is_self_employed) VALUES ($1, $2, $3, $4, $5) RETURNING employment_id`,
        [me(req), b.selfEmployed ? 'self_employed' : 'employed', b.jobTitle, b.employer, b.selfEmployed], db);
      await audit(db, fromReq(req, { entityType: 'employment_record', entityId: r.employment_id, action: 'create' }));
      return one(`${EMP_SELECT} WHERE employment_id = $1`, [r.employment_id], db);
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});
router.delete('/employment/:id', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    await tx(async (db) => {
      const r = await db.query('DELETE FROM employment_record WHERE employment_id = $1 AND alumni_id = $2 AND response_id IS NULL', [req.valid.params.id, me(req)]);
      if (!r.rowCount) throw notFound('Only jobs you added yourself can be removed; survey answers are edited in the survey.');
      await audit(db, fromReq(req, { entityType: 'employment_record', entityId: req.valid.params.id, action: 'delete' }));
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
router.post('/employment/:id/proof', validate({ params: z.object({ id }) }), upload.single('file'), async (req, res, next) => {
  try {
    const emp = await one('SELECT employment_id FROM employment_record WHERE employment_id = $1 AND alumni_id = $2', [req.valid.params.id, me(req)]);
    if (!emp) throw notFound();
    const f = await saveUpload(req.file?.buffer, 'proof');
    const row = await tx(async (db) => {
      const r = await one(`INSERT INTO proof_document (employment_id, file_name, file_url, mime_type, file_size) VALUES ($1, $2, $3, $4, $5)
                           RETURNING document_id AS id, file_name AS "fileName", mime_type AS "mimeType", file_size AS "size", uploaded_at AS "uploadedAt"`,
      [emp.employment_id, String(req.file.originalname || 'proof').slice(0, 160), f.key, f.mime, f.size], db);
      await audit(db, fromReq(req, { entityType: 'proof_document', entityId: r.id, action: 'upload' }));
      return r;
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.post('/photo', upload.single('photo'), async (req, res, next) => {
  try {
    const f = await saveUpload(req.file?.buffer, 'image');
    const old = await tx(async (db) => {
      const prev = await one('SELECT photo_url FROM alumnus WHERE alumni_id = $1 FOR UPDATE', [me(req)], db);
      await db.query('UPDATE alumnus SET photo_url = $2, updated_at = now() WHERE alumni_id = $1', [me(req), f.key]);
      await audit(db, fromReq(req, { entityType: 'alumnus', entityId: me(req), action: 'photo_update' }));
      return prev.photo_url;
    });
    if (old) await removeObject(old);
    res.json({ photoUrl: publicUrl(f.key) });
  } catch (err) { next(err); }
});
router.delete('/photo', async (req, res, next) => {
  try {
    const old = await tx(async (db) => {
      const prev = await one('SELECT photo_url FROM alumnus WHERE alumni_id = $1 FOR UPDATE', [me(req)], db);
      await db.query('UPDATE alumnus SET photo_url = NULL WHERE alumni_id = $1', [me(req)]);
      return prev.photo_url;
    });
    if (old) await removeObject(old);
    res.json({ photoUrl: null });
  } catch (err) { next(err); }
});

// Proof documents are private: a short-lived signed URL is issued only after the ownership check.
router.get('/employment/:id/proof/:docId', validate({ params: z.object({ id, docId: id }) }), async (req, res, next) => {
  try {
    const d = await one(`SELECT d.file_url FROM proof_document d JOIN employment_record e ON e.employment_id = d.employment_id
                          WHERE d.document_id = $1 AND e.employment_id = $2 AND e.alumni_id = $3`, [req.valid.params.docId, req.valid.params.id, me(req)]);
    if (!d) throw notFound();
    res.json({ url: await signedUrl(d.file_url) });
  } catch (err) { next(err); }
});

export default router;
