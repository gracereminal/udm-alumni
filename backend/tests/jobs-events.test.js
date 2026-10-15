import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, as, one, register } from './helpers.js';

// Smallest valid PNG (1x1); content sniffing decides the type.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

describe('jobs', () => {
  it('admin postings go live; alumni postings wait in the queue until approved', async () => {
    const admin = await as('admin');
    const { c } = await register();
    const live = await admin.post('/jobs', { title: 'Admin Role', company: 'Org A', type: 'Full-time', tags: ['SQL', 'Brand New Skill'], deadline: '2026-12-31' });
    expect(live.status).toBe(201);
    expect(live.body.status).toBe('active');
    expect(live.body.tags).toEqual(['Brand New Skill', 'SQL']);
    const queued = await c.post('/jobs', { title: 'Referral Role', company: 'Org B' });
    expect((await c.get('/jobs')).body.map((j) => j.id)).toContain(live.body.id);
    expect((await c.get('/jobs')).body.map((j) => j.id)).not.toContain(queued.body.id);
    expect((await c.get('/jobs?view=mine')).body.map((j) => j.id)).toContain(queued.body.id);
    expect((await c.get('/jobs?view=queue')).status).toBe(403);
    expect((await admin.get('/jobs?view=queue')).body.map((j) => j.id)).toContain(queued.body.id);
    await admin.post(`/jobs/${queued.body.id}/reject`, { reason: 'Missing salary range' });
    expect((await admin.get('/jobs?view=queue')).body.map((j) => j.id)).not.toContain(queued.body.id);
  });

  it('alumni can only edit their own pending posting', async () => {
    const a = await register();
    const b = await register();
    const job = await a.c.post('/jobs', { title: 'Mine', company: 'X' });
    expect((await b.c.patch(`/jobs/${job.body.id}`, { title: 'Hijack' })).status).toBe(403);
    expect((await a.c.patch(`/jobs/${job.body.id}`, { title: 'Mine v2' })).body.title).toBe('Mine v2');
  });

  it('save / apply toggles are stored per alumnus and counted from SAVED_JOB', async () => {
    const admin = await as('admin');
    const { c } = await register();
    const job = (await admin.post('/jobs', { title: 'Countable', company: 'Y' })).body;
    expect((await c.post(`/jobs/${job.id}/save`)).body.saved).toBe(true);
    expect((await c.post(`/jobs/${job.id}/apply`)).body.applied.status).toBe('Application submitted');
    const staffView = (await admin.get('/jobs?view=all')).body.find((j) => j.id === job.id);
    expect(staffView.saves).toBe(1);
    expect(staffView.applications).toBe(1);
    expect((await c.del(`/jobs/${job.id}/save`)).body.saved).toBe(false);
    expect((await c.del(`/jobs/${job.id}/apply`)).body.applied).toBeNull();
    expect(await one('SELECT 1 FROM saved_job WHERE job_id = $1', [job.id])).toBeNull();
  });

  it('deactivated and deleted jobs leave the board; delete can be undone', async () => {
    const admin = await as('admin');
    const job = (await admin.post('/jobs', { title: 'Temp', company: 'Z' })).body;
    await admin.post(`/jobs/${job.id}/deactivate`);
    const alum = await as('alumni');
    expect((await alum.get('/jobs')).body.map((j) => j.id)).not.toContain(job.id);
    await admin.post(`/jobs/${job.id}/activate`);
    await admin.del(`/jobs/${job.id}`);
    expect((await alum.get('/jobs')).body.map((j) => j.id)).not.toContain(job.id);
    await admin.post(`/jobs/${job.id}/restore`);
    expect((await alum.get('/jobs')).body.map((j) => j.id)).toContain(job.id);
  });
});

const newEvent = (over = {}) => ({ title: 'Test Meetup', dateISO: '2027-02-10', timeStart: '18:00', timeEnd: '20:00', venue: 'AVR', body: 'Hello alumni.', ...over });

describe('events', () => {
  it('validates like the composer (no past dates, end after start, required fields)', async () => {
    const admin = await as('admin');
    const res = await admin.post('/events', newEvent({ dateISO: '2020-01-01', timeEnd: '17:00' }));
    expect(res.status).toBe(400);
    expect(res.body.fields).toMatchObject({ date: expect.any(String), time: expect.any(String) });
    expect((await admin.post('/events', newEvent({ venue: '' }))).status).toBe(400);
  });

  it('publishing notifies every alumnus once; registrants hear about changes and cancellation', async () => {
    const admin = await as('admin');
    const { c, user } = await register();
    const ev = (await admin.post('/events', newEvent({ regFields: [{ key: 'size', label: 'Shirt size', options: ['S', 'M'] }] }))).body;
    expect(await one("SELECT count(*)::int AS n FROM notification WHERE user_id = $1 AND dedupe_key = $2", [user.id, `event_pub:${ev.id}`])).toEqual({ n: 1 });
    expect((await c.post(`/events/${ev.id}/rsvp`, { answers: {} })).status).toBe(400);
    expect((await c.post(`/events/${ev.id}/rsvp`, { answers: { size: 'XL' } })).status).toBe(400);
    const reg = await c.post(`/events/${ev.id}/rsvp`, { answers: { size: 'M' } });
    expect(reg.body.registered).toBe(true);
    expect(reg.body.regCount).toBe(1);
    expect((await c.post(`/events/${ev.id}/rsvp`, { answers: { size: 'M' } })).status).toBe(409);
    await admin.patch(`/events/${ev.id}`, { venue: 'Gym' });
    await admin.post(`/events/${ev.id}/cancel-event`);
    const titles = (await c.get('/notifications')).body.rows.map((n) => n.title);
    expect(titles).toContain('Event updated: Test Meetup');
    expect(titles).toContain('Event cancelled: Test Meetup');
    expect((await c.get(`/events/${ev.id}`)).body.statusKey).toBe('cancelled');
  });

  it('enforces capacity under concurrent RSVPs', async () => {
    const admin = await as('admin');
    const ev = (await admin.post('/events', newEvent({ title: 'Tiny', capacity: 3 }))).body;
    const people = await Promise.all(Array.from({ length: 6 }, () => register()));
    const results = await Promise.all(people.map((p) => p.c.post(`/events/${ev.id}/rsvp`, {})));
    expect(results.filter((r) => r.status === 200)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    const n = await one('SELECT count(*)::int AS n FROM event_registration WHERE event_id = $1 AND cancelled_at IS NULL', [ev.id]);
    expect(n.n).toBe(3);
    expect((await admin.get(`/events/${ev.id}`)).body.statusKey).toBe('full');
    expect(await one("SELECT 1 FROM notification WHERE dedupe_key = $1", [`rsvp_full:${ev.id}`])).toBeTruthy();
    // Cancelling frees a slot.
    await people.find((p, i) => results[i].status === 200).c.post(`/events/${ev.id}/cancel`);
    expect((await admin.get(`/events/${ev.id}`)).body.statusKey).toBe('open');
    const regs = (await admin.get(`/events/${ev.id}/registrations`)).body;
    expect(regs.active).toBe(2);
  });

  it('uploads, replaces and removes an event cover; a file shared by a duplicate stays until its last event lets go', async () => {
    const admin = await as('admin');
    const ev = (await admin.post('/events', newEvent({ title: 'Cover' }))).body;
    const put = () => admin.agent.post(`/api/v1/events/${ev.id}/photo`).set('X-Requested-With', 'x').attach('photo', PNG, 'cover.png');
    const first = (await put()).body.photo;
    expect(first).toMatch(/^\/api\/v1\/files\/public\/.+\.png$/);
    const second = (await put()).body.photo;
    expect(second).not.toBe(first);
    expect((await request(app).get(first)).status).toBe(404);

    const dup = (await admin.post(`/events/${ev.id}/duplicate`)).body;
    expect(dup.photo).toBe(second);
    // The composer's "Duplicate" creates through POST /events and keeps the cover via coverFrom.
    const copy = await admin.post('/events', newEvent({ title: 'Cover copy', coverFrom: ev.id }));
    expect(copy.status).toBe(201);
    expect(copy.body.photo).toBe(second);
    const removed = await admin.del(`/events/${ev.id}/photo`);
    expect(removed.status).toBe(200);
    expect(removed.body.photo).toBeNull();
    expect((await request(app).get(second)).status).toBe(200);
    expect((await admin.del(`/events/${dup.id}/photo`)).body.photo).toBeNull();
    expect((await request(app).get(second)).status).toBe(200);
    expect((await admin.del(`/events/${copy.body.id}/photo`)).body.photo).toBeNull();
    expect((await request(app).get(second)).status).toBe(404);

    const alum = await as('alumni');
    expect((await alum.del(`/events/${ev.id}/photo`)).status).toBe(403);
    expect((await admin.del('/events/999999999/photo')).status).toBe(404);
  });

  it('status controls, move to past, hide announcement and duplicate', async () => {
    const admin = await as('admin');
    const ev = (await admin.post('/events', newEvent({ title: 'Controls', agenda: [{ time: '18:00', label: 'Start' }] }))).body;
    expect((await admin.patch(`/events/${ev.id}`, { status: 'closed' })).body.statusKey).toBe('closed');
    expect((await admin.patch(`/events/${ev.id}`, { status: 'open', annHidden: true })).body).toMatchObject({ statusKey: 'open', annHidden: true });
    expect((await admin.patch(`/events/${ev.id}`, { status: 'past' })).body.statusKey).toBe('past');
    const dup = (await admin.post(`/events/${ev.id}/duplicate`)).body;
    expect(dup.title).toBe('Controls (copy)');
    expect(dup.published).toBe(false);
    expect(dup.agenda).toEqual([{ time: '18:00', label: 'Start' }]);
    const alum = await as('alumni');
    expect((await alum.get('/events')).body.map((e) => e.id)).not.toContain(dup.id);
  });

  it('standalone announcements: admin CRUD, alumni see only visible ones', async () => {
    const admin = await as('admin');
    const a = (await admin.post('/announcements', { kind: 'Reminder', title: 'Survey closes soon', body: 'Answer before Nov 15.' })).body;
    const hidden = (await admin.post('/announcements', { title: 'Draft', body: 'x', hidden: true })).body;
    const alum = await as('alumni');
    const ids = (await alum.get('/announcements')).body.map((x) => x.id);
    expect(ids).toContain(a.id);
    expect(ids).not.toContain(hidden.id);
    expect((await alum.post('/announcements', { title: 'x', body: 'y' })).status).toBe(403);
    await admin.del(`/announcements/${a.id}`);
    expect((await alum.get('/announcements')).body.map((x) => x.id)).not.toContain(a.id);
  });
});
