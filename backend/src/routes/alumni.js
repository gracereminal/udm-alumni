// Alumni Records (admin: all colleges; dept: own college via scopeFor).
import { Router } from 'express';
import { z } from 'zod';
import { many, one, tx } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { applyScope, assertAlumnusInScope, scopeFor } from '../middleware/scope.js';
import { badRequest } from '../lib/errors.js';
import { id } from '../lib/validation.js';
import { CIVIL, PWD, SEX, label } from '../lib/vocab.js';
import { audit, fromReq } from '../services/audit.js';
import { signedUrl } from '../services/storage.js';
import { config } from '../config/index.js';
import { recordReview } from '../services/audit.js';
import { notify } from '../services/notifications.js';
import { sendMail } from '../services/mailer.js';
import { proofRequestEmail } from '../services/emailTemplates.js';
import { RECORD_SELECT, changeStatus, createRecord, getRecord, mapProgram, mergeInto, recordRow, staffUpdate } from '../services/alumni.js';

const router = Router();
router.use(requireRole('admin', 'dept'));

const actorOf = (req) => ({ user_id: req.user.user_id, ip: req.ip, scopeCollegeId: scopeFor(req.user).collegeId ?? null });
const STATUSES = ['pending', 'verified', 'flagged', 'archived'];
const EMP = ['employed', 'self_employed', 'further_studies', 'not_employed', 'unanswered'];

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  collegeId: id.optional(),
  programId: id.optional(),
  unmapped: z.enum(['1', 'true']).optional(),
  batch: z.coerce.number().int().optional(),
  status: z.enum(['all', ...STATUSES]).optional(),
  employment: z.enum(EMP).optional(),
  sort: z.enum(['updated_at', 'created_at', 'name', 'batch']).default('updated_at'),
  dir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

router.get('/', validate({ query: listQuery }), async (req, res, next) => {
  try {
    const f = req.valid.query;
    const where = ['a.merged_into_id IS NULL'];
    const params = [];
    const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', `$${params.length}`)); };
    applyScope(req.user, where, params, { college: 'COALESCE(p.college_id, a.declared_college_id)' });
    if (f.collegeId) add('COALESCE(p.college_id, a.declared_college_id) = ?', f.collegeId);
    if (f.programId) add('a.program_id = ?', f.programId);
    if (f.unmapped) where.push('a.program_id IS NULL');
    if (f.batch) add('a.year_graduated = ?', f.batch);
    if (f.status === 'archived') where.push('a.archived_at IS NOT NULL');
    else if (f.status && f.status !== 'all') { where.push('a.archived_at IS NULL'); add('a.verification_status = ?::verification_status', f.status); }
    if (f.employment === 'unanswered') where.push('e.employment_id IS NULL');
    else if (f.employment) add('e.employment_status = ?::employment_status', f.employment);
    if (f.q) {
      add(`(concat_ws(' ', a.first_name, a.middle_name, a.last_name) ILIKE ? OR a.membership_id ILIKE ? OR a.student_no ILIKE ? OR u.email ILIKE ?
            OR e.employer_name ILIKE ? OR p.abbr ILIKE ?)`, `%${f.q.replace(/[%_\\]/g, '\\$&')}%`);
    }
    const order = { updated_at: 'a.updated_at', created_at: 'a.created_at', name: 'lower(a.last_name), lower(a.first_name)', batch: 'a.year_graduated' }[f.sort];
    const dir = f.dir || (f.sort === 'name' ? 'asc' : 'desc');
    const sql = `${RECORD_SELECT} WHERE ${where.join(' AND ')}`;
    const [rows, count] = await Promise.all([
      many(`${sql} ORDER BY ${order} ${dir}, a.alumni_id DESC LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`, params),
      one(`SELECT count(*)::int AS n FROM (${sql}) x`, params),
    ]);
    res.json({ rows: rows.map(recordRow), total: count.n, page: f.page, pageSize: f.pageSize });
  } catch (err) { next(err); }
});

// Recent review activity in the caller's scope (the "Recent activity" panel on Records).
router.get('/activity', validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(5) }) }), async (req, res, next) => {
  try {
    const where = [];
    const params = [];
    applyScope(req.user, where, params, { college: 'COALESCE(p.college_id, a.declared_college_id)' });
    res.json(await many(
      `SELECT rr.review_id AS id, rr.action, rr.reason, rr.to_status AS "toStatus", rr.created_at AS "createdAt",
              COALESCE(u.display_name, 'System') AS who, u.role AS "whoRole", concat_ws(' ', a.first_name, a.last_name) AS alumnus, a.membership_id AS "membershipId", a.alumni_id AS "alumniId"
         FROM record_review rr JOIN alumnus a ON a.alumni_id = rr.alumni_id
         LEFT JOIN program p ON p.program_id = a.program_id LEFT JOIN user_account u ON u.user_id = rr.reviewer_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY rr.created_at DESC, rr.review_id DESC LIMIT ${req.valid.query.limit}`, params,
    ));
  } catch (err) { next(err); }
});

// Request document proof: notes the request on the record, tells the alumnus in-app and by email (when one is on file).
router.post('/:id/request-proof', validate({ params: z.object({ id }), body: z.object({
  docs: z.array(z.string().trim().min(1).max(80)).min(1).max(8), dueDays: z.coerce.number().int().min(1).max(90).default(14), note: z.string().trim().max(500).optional(),
}) }), async (req, res, next) => {
  try {
    const alumniId = req.valid.params.id;
    await assertAlumnusInScope(req.user, alumniId);
    const { docs, dueDays, note } = req.valid.body;
    const out = await tx(async (db) => {
      const r = await getRecord(db, alumniId);
      const flagNote = `Awaiting proof: ${docs.join(', ')} — due in ${dueDays} days.${note ? ` ${note}` : ''}`;
      await db.query('UPDATE alumnus SET flag_note = $2, updated_at = now() WHERE alumni_id = $1', [alumniId, flagNote]);
      await recordReview(db, { alumniId, reviewerId: req.user.user_id, action: 'edit', reason: `Proof requested (${docs.join(', ')}) · due in ${dueDays} days` });
      await audit(db, fromReq(req, { entityType: 'alumnus', entityId: alumniId, action: 'request_proof', details: { docs, dueDays } }));
      if (r.user_id) await notify(db, [r.user_id], { type: 'record_status', title: 'Please upload proof for your alumni record', message: `${docs.join(', ')} — due in ${dueDays} days. Upload it from your profile.`, link: 'profile' });
      if (r.email) {
        await sendMail({ to: r.email, ...proofRequestEmail({ appUrl: config.APP_URL, name: r.first_name, docs, dueDays, note }) });
      }
      return { ...recordRow(await getRecord(db, alumniId)), emailed: !!r.email };
    });
    res.json(out);
  } catch (err) { next(err); }
});

// Record detail: includes sensitive fields, so every staff read is written to AUDIT_LOG.
router.get('/:id', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const alumniId = req.valid.params.id;
    await assertAlumnusInScope(req.user, alumniId);
    const out = await tx(async (db) => {
      const r = await getRecord(db, alumniId);
      const extra = await one('SELECT birth_date, sex, civil_status, is_indigenous, indigenous_group, pwd_type, permanent_address, married_name, suffix, photo_url, merged_into_id FROM alumnus WHERE alumni_id = $1', [alumniId], db);
      // Sequential: one transaction client cannot run queries concurrently.
      const history = await many(`SELECT rr.action, rr.from_status, rr.to_status, rr.reason, rr.changes, rr.created_at, COALESCE(u.display_name, 'System') AS who
        FROM record_review rr LEFT JOIN user_account u ON u.user_id = rr.reviewer_id WHERE rr.alumni_id = $1 ORDER BY rr.created_at DESC, rr.review_id DESC LIMIT 50`, [alumniId], db);
      const links = await many('SELECT platform, url, is_visible FROM social_link WHERE alumni_id = $1 ORDER BY platform', [alumniId], db);
      const survey = await one(`SELECT r.status, r.completion_pct, r.submitted_at, r.saved_at FROM survey_response r JOIN v_active_cycle c ON c.cycle_id = r.cycle_id WHERE r.alumni_id = $1`, [alumniId], db);
      const outreachLog = await many(`SELECT o.contact_id, o.method, o.outcome, o.contacted_at, u.display_name AS by FROM outreach_contact o LEFT JOIN user_account u ON u.user_id = o.contacted_by
        WHERE o.alumni_id = $1 ORDER BY o.contacted_at DESC LIMIT 20`, [alumniId], db);
      await audit(db, fromReq(req, { entityType: 'alumnus', entityId: alumniId, action: 'read_sensitive' }));
      return {
        ...recordRow(r),
        birthDate: extra.birth_date, sex: label(SEX, extra.sex), civilStatus: label(CIVIL, extra.civil_status), marriedName: extra.married_name,
        isIndigenous: extra.is_indigenous, indigenousGroup: extra.indigenous_group, pwdType: label(PWD, extra.pwd_type), permanentAddress: extra.permanent_address,
        photoUrl: extra.photo_url ? `/api/v1/files/${extra.photo_url}` : null,
        links, survey, history, outreach: outreachLog,
      };
    });
    res.json(out);
  } catch (err) { next(err); }
});

// Proof documents for verification: private files, reachable only through short-lived signed URLs after the scope check.
router.get('/:id/proofs', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    await assertAlumnusInScope(req.user, req.valid.params.id);
    const docs = await many(
      `SELECT d.document_id AS id, d.file_name AS "fileName", d.mime_type AS "mimeType", d.file_size AS size, d.uploaded_at AS "uploadedAt", d.file_url,
              e.job_title AS "jobTitle", e.employer_name AS employer
         FROM proof_document d JOIN employment_record e ON e.employment_id = d.employment_id WHERE e.alumni_id = $1 ORDER BY d.uploaded_at DESC`,
      [req.valid.params.id],
    );
    await tx((db) => audit(db, fromReq(req, { entityType: 'alumnus', entityId: req.valid.params.id, action: 'read_proofs' })));
    res.json(await Promise.all(docs.map(async ({ file_url: key, ...d }) => ({ ...d, url: await signedUrl(key) }))));
  } catch (err) { next(err); }
});

// The Records form sends a single full name; imports and the API may send first/last separately.
const createBody = z.object({
  name: z.string().max(180).optional(), last_name: z.string().max(60).optional(), first_name: z.string().max(60).optional(), middle_name: z.string().max(60).optional(),
  college: z.string().max(120), course: z.string().max(160).optional(), course_other: z.string().max(160).optional(),
  year_graduated: z.coerce.number().int(), student_no: z.string().max(20).optional(), mobile: z.string().max(20).optional(),
  address: z.string().max(500).optional(), note: z.string().max(1000).optional(), email: z.string().max(120).optional(),
  employment: z.enum(['employed', 'self_employed', 'further_studies', 'not_employed', '']).optional(), company: z.string().max(160).optional(),
  source: z.enum(['self_registration', 'survey', 'alumni_update', 'admin_encoded', 'import']).optional(),
  status: z.enum(['pending', 'verified', 'flagged', 'archived']).optional(),
});
const updateBody = createBody.partial().extend({ reason: z.string().max(1000).optional() });

router.post('/', validate({ body: createBody }), async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const r = await createRecord(db, req.valid.body, actorOf(req));
      return recordRow(await getRecord(db, r.alumniId));
    });
    res.status(201).json(out);
  } catch (err) { next(err); }
});

router.patch('/:id', validate({ params: z.object({ id }), body: updateBody }), async (req, res, next) => {
  try {
    await assertAlumnusInScope(req.user, req.valid.params.id);
    const out = await tx(async (db) => {
      await staffUpdate(db, req.valid.params.id, req.valid.body, actorOf(req));
      return recordRow(await getRecord(db, req.valid.params.id));
    });
    res.json(out);
  } catch (err) { next(err); }
});

const statusBody = z.object({ action: z.enum(['verify', 'flag', 'unflag', 'archive', 'restore']), reason: z.string().max(1000).optional() });

router.post('/:id/status', validate({ params: z.object({ id }), body: statusBody }), async (req, res, next) => {
  try {
    await assertAlumnusInScope(req.user, req.valid.params.id);
    const out = await tx(async (db) => {
      await changeStatus(db, req.valid.params.id, req.valid.body.action, req.valid.body.reason, actorOf(req));
      return recordRow(await getRecord(db, req.valid.params.id));
    });
    res.json(out);
  } catch (err) { next(err); }
});

// Bulk status change from the Records table selection (all-or-nothing).
router.post('/bulk-status', validate({ body: statusBody.extend({ ids: z.array(id).min(1).max(500) }) }), async (req, res, next) => {
  try {
    const { ids, action, reason } = req.valid.body;
    for (const alumniId of ids) await assertAlumnusInScope(req.user, alumniId);
    await tx(async (db) => { for (const alumniId of ids) await changeStatus(db, alumniId, action, reason, actorOf(req)); });
    res.json({ ok: true, count: ids.length });
  } catch (err) { next(err); }
});

router.post('/:id/merge', validate({ params: z.object({ id }), body: z.object({ intoId: id }) }), async (req, res, next) => {
  try {
    await assertAlumnusInScope(req.user, req.valid.params.id);
    await assertAlumnusInScope(req.user, req.valid.body.intoId);
    const out = await tx(async (db) => {
      await mergeInto(db, req.valid.params.id, req.valid.body.intoId, actorOf(req));
      return recordRow(await getRecord(db, req.valid.body.intoId));
    });
    res.json(out);
  } catch (err) { next(err); }
});

router.post('/:id/map-program', validate({ params: z.object({ id }), body: z.object({ programId: id }) }), async (req, res, next) => {
  try {
    await assertAlumnusInScope(req.user, req.valid.params.id);
    const out = await tx(async (db) => {
      await mapProgram(db, req.valid.params.id, req.valid.body.programId, actorOf(req), scopeFor(req.user).collegeId ?? null);
      return recordRow(await getRecord(db, req.valid.params.id));
    });
    res.json(out);
  } catch (err) { next(err); }
});

// Registrar graduate list import: JSON rows (the client parses the CSV). Upserts by student_no.
router.post('/import', validate({ body: z.object({ rows: z.array(createBody).min(1).max(5000) }) }), async (req, res, next) => {
  try {
    const actor = actorOf(req);
    const result = await tx(async (db) => {
      let created = 0;
      let skipped = 0;
      const errors = [];
      for (const [i, row] of req.valid.body.rows.entries()) {
        const exists = row.student_no && await one('SELECT 1 FROM alumnus WHERE upper(student_no) = upper($1)', [row.student_no.trim()], db);
        if (exists) { skipped += 1; continue; }
        try {
          await db.query('SAVEPOINT imp');
          await createRecord(db, row, actor, 'import');
          await db.query('RELEASE SAVEPOINT imp');
          created += 1;
        } catch (e) {
          await db.query('ROLLBACK TO SAVEPOINT imp');
          errors.push({ row: i + 1, error: e.message, fields: e.fields });
        }
      }
      await audit(db, fromReq(req, { entityType: 'alumnus', action: 'import_batch', details: { created, skipped, failed: errors.length } }));
      return { created, skipped, failed: errors.length, errors: errors.slice(0, 50) };
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.use((err, _req, _res, next) => next(err.status ? err : err.code === '22P02' ? badRequest('Invalid value.') : err));

export default router;
