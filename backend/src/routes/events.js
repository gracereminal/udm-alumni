// Events, RSVPs and announcements. Counts come from EVENT_REGISTRATION (v_event_stats); capacity is enforced in the
// RSVP transaction with SELECT ... FOR UPDATE on the event.
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { many, one, tx } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/common.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { id, manilaToday } from '../lib/validation.js';
import { EVENT_CATEGORY, NOTICE_KIND, code, label } from '../lib/vocab.js';
import { audit, fromReq } from '../services/audit.js';
import { adminIds, allAlumniIds, eventRegistrantIds, notify } from '../services/notifications.js';
import { publicUrl, removeObject, saveUpload } from '../services/storage.js';

const router = Router();
// Mounted at the API root, so auth is scoped to this router's own paths.
router.use(['/events', '/announcements'], requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

const SELECT = `
  SELECT ev.*, s.registered, s.status_key,
         to_char(ev.starts_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS date_iso,
         to_char(ev.starts_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS time_start,
         to_char(ev.ends_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS time_end,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('time', to_char(i.start_time, 'HH24:MI'), 'label', i.label) ORDER BY i.sort_order, i.item_id) FROM event_agenda_item i WHERE i.event_id = ev.event_id), '[]') AS agenda,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('key', f.field_key, 'label', f.label, 'hint', f.hint, 'options', f.options) ORDER BY f.sort_order, f.field_id) FROM event_reg_field f WHERE f.event_id = ev.event_id), '[]') AS reg_fields,
         COALESCE(an.is_hidden, false) AS ann_hidden,
         r.answers AS my_answers, r.registered_at AS my_registered_at
    FROM event ev
    JOIN v_event_stats s ON s.event_id = ev.event_id
    LEFT JOIN announcement an ON an.event_id = ev.event_id
    LEFT JOIN event_registration r ON r.event_id = ev.event_id AND r.alumni_id = $1 AND r.cancelled_at IS NULL`;

function eventOut(e) {
  return {
    id: e.event_id, title: e.title, kind: label(EVENT_CATEGORY, e.category), organizer: e.organizer || '', venue: e.venue || '', fee: e.fee_text || '',
    iso: e.date_iso, timeStart: e.time_start, timeEnd: e.time_end || '', startsAt: e.starts_at, endsAt: e.ends_at,
    capacity: e.capacity, regCount: e.registered, statusKey: e.status_key, regStatus: e.reg_status,
    highlights: e.highlights || [], teaser: e.teaser || '', body: String(e.body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    agenda: e.agenda, regFields: e.reg_fields, photo: publicUrl(e.cover_photo_url), annHidden: e.ann_hidden,
    published: !!e.published_at, pub: e.published_at, cancelledAt: e.cancelled_at, updatedAt: e.updated_at,
    registered: !!e.my_registered_at, myAnswers: e.my_answers || null, myRegisteredAt: e.my_registered_at || null,
  };
}

const viewer = (req) => req.user.alumni_id ?? -1;
const getEvent = (db, eventId, req) => one(`${SELECT} WHERE ev.event_id = $2 AND ev.deleted_at IS NULL`, [viewer(req), eventId], db);

router.get('/events', async (req, res, next) => {
  try {
    const staff = req.user.role === 'admin';
    const rows = await many(`${SELECT} WHERE ev.deleted_at IS NULL ${staff ? '' : 'AND ev.published_at IS NOT NULL'} ORDER BY ev.starts_at`, [viewer(req)]);
    res.json(rows.map(eventOut));
  } catch (err) { next(err); }
});

router.get('/events/:id', validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const e = await getEvent(undefined, req.valid.params.id, req);
    if (!e || (!e.published_at && req.user.role !== 'admin')) throw notFound();
    res.json(eventOut(e));
  } catch (err) { next(err); }
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid time.');
const eventBody = z.object({
  title: z.string().trim().min(1, 'Enter an event title.').max(160),
  kind: z.enum(Object.keys(EVENT_CATEGORY.toCode)).default('EVENT'),
  organizer: z.string().trim().max(120).optional(),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date.'),
  timeStart: hhmm, timeEnd: hhmm.optional().or(z.literal('')),
  venue: z.string().trim().min(1, 'Enter a venue.').max(160),
  fee: z.string().trim().max(120).optional(),
  capacity: z.number().int().positive().nullable().optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).optional(),
  body: z.string().trim().min(1, 'Add a description.').max(10000),
  agenda: z.array(z.object({ time: hhmm.optional().or(z.literal('')), label: z.string().trim().min(1).max(160) })).max(30).optional(),
  regFields: z.array(z.object({ key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/), label: z.string().trim().min(1).max(120), hint: z.string().trim().max(160).optional(), options: z.array(z.string().trim().min(1).max(80)).max(20) })).max(10).optional(),
  publish: z.boolean().default(true),
});

const ts = (d, t) => `${d}T${t}:00+08:00`;
function checkTimes(b, checkPast) {
  const e = {};
  if (checkPast && b.dateISO < manilaToday()) e.date = 'Choose a date that hasn’t passed.';
  if (b.timeEnd && b.timeEnd <= b.timeStart) e.time = 'End time must be after the start time.';
  if (Object.keys(e).length) throw badRequest('Some fields need attention.', e);
}

async function writeChildren(db, eventId, b) {
  if (b.agenda) {
    await db.query('DELETE FROM event_agenda_item WHERE event_id = $1', [eventId]);
    for (const [i, a] of b.agenda.entries()) await db.query('INSERT INTO event_agenda_item (event_id, start_time, label, sort_order) VALUES ($1, $2, $3, $4)', [eventId, a.time || null, a.label, i]);
  }
  if (b.regFields) {
    await db.query('DELETE FROM event_reg_field WHERE event_id = $1', [eventId]);
    for (const [i, f] of b.regFields.entries()) await db.query('INSERT INTO event_reg_field (event_id, field_key, label, hint, options, sort_order) VALUES ($1, $2, $3, $4, $5, $6)', [eventId, f.key, f.label, f.hint || null, JSON.stringify(f.options), i]);
  }
}

const whenText = (b) => `${b.dateISO}${b.timeStart ? ` ${b.timeStart}` : ''} · ${b.venue}`;

// `coverFrom`: reuse another event's cover file (the composer's "Duplicate"); it is shared, as with /duplicate.
router.post('/events', requireRole('admin'), validate({ body: eventBody.extend({ coverFrom: id.optional() }) }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    checkTimes(b, true);
    const out = await tx(async (db) => {
      const r = await one(
        `INSERT INTO event (created_by, title, category, organizer, starts_at, ends_at, venue, fee_text, capacity, highlights, teaser, body, published_at, cover_photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, (SELECT cover_photo_url FROM event WHERE event_id = $14 AND deleted_at IS NULL)) RETURNING event_id`,
        [req.user.user_id, b.title, code(EVENT_CATEGORY, b.kind), b.organizer || null, ts(b.dateISO, b.timeStart), b.timeEnd ? ts(b.dateISO, b.timeEnd) : null,
          b.venue, b.fee || null, b.capacity ?? null, JSON.stringify(b.highlights || []), b.body.slice(0, 150), b.body, b.publish ? new Date() : null, b.coverFrom ?? null], db,
      );
      await writeChildren(db, r.event_id, b);
      await audit(db, fromReq(req, { entityType: 'event', entityId: r.event_id, action: 'create' }));
      if (b.publish) await notify(db, await allAlumniIds(db), { type: 'event', title: `New event: ${b.title}`, message: whenText(b), link: 'events', dedupeKey: `event_pub:${r.event_id}` });
      return getEvent(db, r.event_id, req);
    });
    res.status(201).json(eventOut(out));
  } catch (err) { next(err); }
});

router.patch('/events/:id', requireRole('admin'), validate({ params: z.object({ id }), body: eventBody.partial().extend({
  status: z.enum(['open', 'closed', 'full', 'past']).optional(), annHidden: z.boolean().optional(),
}) }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const out = await tx(async (db) => {
      const e = await one(`SELECT *, to_char(starts_at AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS d, to_char(starts_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS t1,
                                  to_char(ends_at AT TIME ZONE 'Asia/Manila', 'HH24:MI') AS t2 FROM event WHERE event_id = $1 AND deleted_at IS NULL FOR UPDATE`, [req.valid.params.id], db);
      if (!e) throw notFound();
      const sets = [];
      const params = [e.event_id];
      const set = (col, val) => { params.push(val); sets.push(`${col} = $${params.length}`); };
      const timing = 'dateISO' in b || 'timeStart' in b || 'timeEnd' in b;
      if (timing) {
        const t = { dateISO: b.dateISO ?? e.d, timeStart: b.timeStart ?? e.t1, timeEnd: 'timeEnd' in b ? b.timeEnd : e.t2 };
        checkTimes(t, b.dateISO != null && b.dateISO !== e.d);
        set('starts_at', ts(t.dateISO, t.timeStart)); set('ends_at', t.timeEnd ? ts(t.dateISO, t.timeEnd) : null);
      }
      if ('title' in b) set('title', b.title);
      if ('kind' in b) set('category', code(EVENT_CATEGORY, b.kind));
      if ('organizer' in b) set('organizer', b.organizer || null);
      if ('venue' in b) set('venue', b.venue);
      if ('fee' in b) set('fee_text', b.fee || null);
      if ('capacity' in b) set('capacity', b.capacity ?? null);
      if ('highlights' in b) set('highlights', JSON.stringify(b.highlights || []));
      if ('body' in b) { set('body', b.body); set('teaser', b.body.slice(0, 150)); }
      if (b.publish === true && !e.published_at) set('published_at', new Date());
      if (b.status === 'past') set('ended_at', new Date());
      else if (b.status) { set('reg_status', b.status); set('ended_at', null); }
      if (sets.length) await db.query(`UPDATE event SET ${sets.join(', ')}, updated_at = now() WHERE event_id = $1`, params);
      await writeChildren(db, e.event_id, b);
      if ('annHidden' in b) {
        await db.query(`INSERT INTO announcement (event_id, author_id, kind, title, is_hidden) VALUES ($1, $2, 'notice', $3, $4)
                        ON CONFLICT (event_id) DO UPDATE SET is_hidden = EXCLUDED.is_hidden, updated_at = now()`, [e.event_id, req.user.user_id, e.title, b.annHidden]);
      }
      await audit(db, fromReq(req, { entityType: 'event', entityId: e.event_id, action: 'edit', details: { fields: Object.keys(b) } }));
      if (timing || 'venue' in b) {
        await notify(db, await eventRegistrantIds(db, e.event_id), { type: 'event', title: `Event updated: ${b.title || e.title}`, message: 'The date, time or venue changed. Check the event details.', link: 'events' });
      }
      if (b.publish === true && !e.published_at) {
        await notify(db, await allAlumniIds(db), { type: 'event', title: `New event: ${b.title || e.title}`, message: `${e.venue || ''}`, link: 'events', dedupeKey: `event_pub:${e.event_id}` });
      }
      return getEvent(db, e.event_id, req);
    });
    res.json(eventOut(out));
  } catch (err) { next(err); }
});

// Sets (key) or clears (null) the cover and returns the old key when no other event still uses it:
// /duplicate copies cover_photo_url, so a file can be shared and is removed only with its last reference.
async function setCover(db, eventId, key) {
  const prev = await one('SELECT cover_photo_url FROM event WHERE event_id = $1 AND deleted_at IS NULL FOR UPDATE', [eventId], db);
  if (!prev) throw notFound();
  await db.query('UPDATE event SET cover_photo_url = $2, updated_at = now() WHERE event_id = $1', [eventId, key]);
  const old = prev.cover_photo_url;
  if (!old || old === key) return null;
  const shared = await one('SELECT 1 AS x FROM event WHERE cover_photo_url = $1 LIMIT 1', [old], db);
  return shared ? null : old;
}

router.post('/events/:id/photo', requireRole('admin'), validate({ params: z.object({ id }) }), upload.single('photo'), async (req, res, next) => {
  try {
    const f = await saveUpload(req.file?.buffer, 'image');
    const { out, old } = await tx(async (db) => {
      const old = await setCover(db, req.valid.params.id, f.key);
      return { out: await getEvent(db, req.valid.params.id, req), old };
    });
    if (old) await removeObject(old);
    res.json(eventOut(out));
  } catch (err) { next(err); }
});

router.delete('/events/:id/photo', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const { out, old } = await tx(async (db) => {
      const old = await setCover(db, req.valid.params.id, null);
      await audit(db, fromReq(req, { entityType: 'event', entityId: req.valid.params.id, action: 'photo_remove' }));
      return { out: await getEvent(db, req.valid.params.id, req), old };
    });
    if (old) await removeObject(old);
    res.json(eventOut(out));
  } catch (err) { next(err); }
});

router.delete('/events/:id', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    await tx(async (db) => {
      const r = await db.query('UPDATE event SET deleted_at = now() WHERE event_id = $1 AND deleted_at IS NULL', [req.valid.params.id]);
      if (!r.rowCount) throw notFound();
      await audit(db, fromReq(req, { entityType: 'event', entityId: req.valid.params.id, action: 'delete' }));
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Copy as an unpublished draft (same details, "(copy)" title); the admin edits the date and publishes it.
router.post('/events/:id/duplicate', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const r = await one(
        `INSERT INTO event (created_by, title, category, organizer, starts_at, ends_at, venue, fee_text, capacity, cover_photo_url, highlights, teaser, body)
         SELECT $2, left(title || ' (copy)', 160), category, organizer, starts_at, ends_at, venue, fee_text, capacity, cover_photo_url, highlights, teaser, body
           FROM event WHERE event_id = $1 AND deleted_at IS NULL RETURNING event_id`, [req.valid.params.id, req.user.user_id], db,
      );
      if (!r) throw notFound();
      await db.query('INSERT INTO event_agenda_item (event_id, start_time, label, sort_order) SELECT $2, start_time, label, sort_order FROM event_agenda_item WHERE event_id = $1', [req.valid.params.id, r.event_id]);
      await db.query('INSERT INTO event_reg_field (event_id, field_key, label, hint, options, sort_order) SELECT $2, field_key, label, hint, options, sort_order FROM event_reg_field WHERE event_id = $1', [req.valid.params.id, r.event_id]);
      await audit(db, fromReq(req, { entityType: 'event', entityId: r.event_id, action: 'duplicate', details: { from: req.valid.params.id } }));
      return getEvent(db, r.event_id, req);
    });
    res.status(201).json(eventOut(out));
  } catch (err) { next(err); }
});

router.post('/events/:id/cancel-event', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const e = await one('UPDATE event SET cancelled_at = COALESCE(cancelled_at, now()), updated_at = now() WHERE event_id = $1 AND deleted_at IS NULL RETURNING title', [req.valid.params.id], db);
      if (!e) throw notFound();
      await audit(db, fromReq(req, { entityType: 'event', entityId: req.valid.params.id, action: 'cancel' }));
      await notify(db, await eventRegistrantIds(db, req.valid.params.id), { type: 'event', title: `Event cancelled: ${e.title}`, message: 'This event has been cancelled. We’re sorry for the inconvenience.', link: 'events', dedupeKey: `event_cancel:${req.valid.params.id}` });
      return getEvent(db, req.valid.params.id, req);
    });
    res.json(eventOut(out));
  } catch (err) { next(err); }
});

router.post('/events/:id/rsvp', requireRole('alumni'), validate({ params: z.object({ id }), body: z.object({ answers: z.record(z.string(), z.string().max(200)).default({}) }) }), async (req, res, next) => {
  try {
    if (!req.user.alumni_id) throw forbidden();
    const out = await tx(async (db) => {
      const e = await one('SELECT * FROM event WHERE event_id = $1 AND deleted_at IS NULL AND published_at IS NOT NULL FOR UPDATE', [req.valid.params.id], db);
      if (!e) throw notFound();
      const s = await one('SELECT status_key, registered FROM v_event_stats WHERE event_id = $1', [e.event_id], db);
      const mine = await one('SELECT cancelled_at FROM event_registration WHERE event_id = $1 AND alumni_id = $2', [e.event_id, req.user.alumni_id], db);
      if (mine && !mine.cancelled_at) throw conflict('You are already registered for this event.');
      if (s.status_key !== 'open') throw conflict(s.status_key === 'full' ? 'This event is full.' : 'Registration for this event is closed.');
      const fields = await many('SELECT field_key, options FROM event_reg_field WHERE event_id = $1', [e.event_id], db);
      const answers = {};
      for (const f of fields) {
        const val = req.valid.body.answers[f.field_key];
        if (val == null || val === '') throw badRequest('Answer every registration question.', { [f.field_key]: 'Select an option.' });
        if (f.options.length && !f.options.includes(val)) throw badRequest('Select a listed option.', { [f.field_key]: 'Select a listed option.' });
        answers[f.field_key] = val;
      }
      await db.query(
        `INSERT INTO event_registration (event_id, alumni_id, answers) VALUES ($1, $2, $3)
         ON CONFLICT (event_id, alumni_id) DO UPDATE SET answers = EXCLUDED.answers, registered_at = now(), cancelled_at = NULL`,
        [e.event_id, req.user.alumni_id, JSON.stringify(answers)],
      );
      const n = s.registered + 1;
      await audit(db, fromReq(req, { entityType: 'event', entityId: e.event_id, action: 'rsvp' }));
      // Capacity milestones for the admins: full, and every 100 registrations (each created once).
      if (e.capacity && n >= e.capacity) await notify(db, await adminIds(db), { type: 'rsvp', title: `${e.title} is full`, message: `${n.toLocaleString()} of ${e.capacity.toLocaleString()} slots are taken. Registration is now closed.`, link: 'events', dedupeKey: `rsvp_full:${e.event_id}` });
      else if (n % 100 === 0) await notify(db, await adminIds(db), { type: 'rsvp', title: `${e.title} RSVPs reached ${n}`, message: `${n.toLocaleString()} alumni have registered.`, link: 'events', dedupeKey: `rsvp:${e.event_id}:${n}` });
      return getEvent(db, e.event_id, req);
    });
    res.json(eventOut(out));
  } catch (err) { next(err); }
});

router.post('/events/:id/cancel', requireRole('alumni'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const out = await tx(async (db) => {
      const r = await db.query('UPDATE event_registration SET cancelled_at = now() WHERE event_id = $1 AND alumni_id = $2 AND cancelled_at IS NULL', [req.valid.params.id, req.user.alumni_id ?? -1]);
      if (!r.rowCount) throw notFound('You are not registered for this event.');
      await audit(db, fromReq(req, { entityType: 'event', entityId: req.valid.params.id, action: 'rsvp_cancel' }));
      return getEvent(db, req.valid.params.id, req);
    });
    res.json(eventOut(out));
  } catch (err) { next(err); }
});

router.get('/events/:id/registrations', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    const rows = await many(
      `SELECT r.registration_id AS id, concat_ws(' ', a.first_name, a.last_name) AS name, COALESCE(p.abbr, 'Unmapped') AS program, a.year_graduated AS batch,
              r.answers, r.registered_at AS "registeredAt", r.cancelled_at AS "cancelledAt"
         FROM event_registration r JOIN alumnus a ON a.alumni_id = r.alumni_id LEFT JOIN program p ON p.program_id = a.program_id
        WHERE r.event_id = $1 ORDER BY r.cancelled_at NULLS FIRST, r.registered_at DESC`, [req.valid.params.id],
    );
    res.json({ rows, active: rows.filter((r) => !r.cancelledAt).length });
  } catch (err) { next(err); }
});

// --- Standalone announcements (event_id IS NULL) ---------------------------------------------------
const annOut = (a) => ({ id: a.announcement_id, kind: label(NOTICE_KIND, a.kind), source: a.source || '', title: a.title, body: a.body || '', hidden: a.is_hidden, pub: a.published_at, updatedAt: a.updated_at, expiresAt: a.expires_at });

router.get('/announcements', async (req, res, next) => {
  try {
    const staff = req.user.role === 'admin';
    const rows = await many(`SELECT * FROM announcement WHERE event_id IS NULL ${staff ? '' : 'AND NOT is_hidden AND (expires_at IS NULL OR expires_at > now())'} ORDER BY published_at DESC`);
    res.json(rows.map(annOut));
  } catch (err) { next(err); }
});

const annBody = z.object({
  kind: z.enum(Object.keys(NOTICE_KIND.toCode)).default('Notice'), source: z.string().trim().max(120).optional(),
  title: z.string().trim().min(1, 'Enter a title.').max(160), body: z.string().trim().min(1, 'Enter the announcement text.').max(2000),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(), hidden: z.boolean().optional(),
});

router.post('/announcements', requireRole('admin'), validate({ body: annBody }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const row = await tx(async (db) => {
      const a = await one(`INSERT INTO announcement (author_id, kind, source, title, body, expires_at, is_hidden) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.user.user_id, code(NOTICE_KIND, b.kind), b.source || null, b.title, b.body, b.expiresAt || null, !!b.hidden], db);
      await audit(db, fromReq(req, { entityType: 'announcement', entityId: a.announcement_id, action: 'create' }));
      return a;
    });
    res.status(201).json(annOut(row));
  } catch (err) { next(err); }
});

router.patch('/announcements/:id', requireRole('admin'), validate({ params: z.object({ id }), body: annBody.partial() }), async (req, res, next) => {
  try {
    const b = req.valid.body;
    const row = await tx(async (db) => {
      const a = await one(
        `UPDATE announcement SET kind = COALESCE($2, kind), source = COALESCE($3, source), title = COALESCE($4, title), body = COALESCE($5, body),
                expires_at = CASE WHEN $6 THEN $7::timestamptz ELSE expires_at END, is_hidden = COALESCE($8, is_hidden), updated_at = now()
          WHERE announcement_id = $1 AND event_id IS NULL RETURNING *`,
        [req.valid.params.id, b.kind ? code(NOTICE_KIND, b.kind) : null, b.source ?? null, b.title ?? null, b.body ?? null, 'expiresAt' in b, b.expiresAt ?? null, b.hidden ?? null], db,
      );
      if (!a) throw notFound();
      await audit(db, fromReq(req, { entityType: 'announcement', entityId: a.announcement_id, action: 'edit' }));
      return a;
    });
    res.json(annOut(row));
  } catch (err) { next(err); }
});

router.delete('/announcements/:id', requireRole('admin'), validate({ params: z.object({ id }) }), async (req, res, next) => {
  try {
    await tx(async (db) => {
      const r = await db.query('DELETE FROM announcement WHERE announcement_id = $1 AND event_id IS NULL', [req.valid.params.id]);
      if (!r.rowCount) throw notFound();
      await audit(db, fromReq(req, { entityType: 'announcement', entityId: req.valid.params.id, action: 'delete' }));
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
