// Records screen support: full-name form, contact email, staff-encoded employment, proof requests, custom emails, counters.
import { describe, expect, it } from 'vitest';
import { as, one, register } from './helpers.js';
import { outbox } from '../src/services/mailer.js';

const base = { college: 'College of Computing Studies', course: 'Bachelor of Science in Information Technology', year_graduated: 2023 };

describe('records form', () => {
  it('creates from a full name with contact email, employment and status in one call', async () => {
    const admin = await as('admin');
    const res = await admin.post('/alumni', { ...base, name: 'Juan Dela Cruz', email: 'juan.dc@example.com', employment: 'employed', company: 'Accenture', status: 'verified', source: 'admin_encoded' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan.dc@example.com', employmentStatus: 'employed', company: 'Accenture', status: 'verified', hasAccount: false });
    const hist = (await admin.get(`/alumni/${res.body.id}`)).body.history.map((h) => h.action);
    expect(hist).toEqual(['verify', 'create']);
  });

  it('requires first and last name, and validates email and employment', async () => {
    const admin = await as('admin');
    const res = await admin.post('/alumni', { ...base, name: 'Cher', email: 'bad' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['email', 'name']);
    const emp = await admin.post('/alumni', { ...base, name: 'Ana Cruz', employment: 'part_time' });
    expect(emp.status).toBe(400);
    expect(Object.keys(emp.body.fields)).toEqual(['employment']);
  });

  it('staff cannot change the sign-in email of an alumnus with an account', async () => {
    const { user } = await register();
    const admin = await as('admin');
    const res = await admin.patch(`/alumni/${user.alumniId}`, { email: 'other@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.fields.email).toMatch(/their own email/);
    expect((await admin.patch(`/alumni/${user.alumniId}`, { email: user.email, note: 'ok' })).status).toBe(200);
  });

  it('reassigns program / batch with a reason in the history, and a staff employment edit does not count as traced', async () => {
    const admin = await as('admin');
    const rec = (await admin.post('/alumni', { ...base, name: 'Ana Reyes' })).body;
    const before = (await admin.get('/stats/summary')).body;
    const res = await admin.patch(`/alumni/${rec.id}`, { college: 'College of Engineering and Technology', course: 'Bachelor of Science in Computer Science', year_graduated: 2022, reason: 'Registrar masterlist shows BSCS', employment: 'employed', company: 'Globe' });
    expect(res.body).toMatchObject({ program: 'BSCS', batch: 2022, collegeCode: 'CET', company: 'Globe' });
    const h = (await admin.get(`/alumni/${rec.id}`)).body.history[0];
    expect(h.reason).toBe('Registrar masterlist shows BSCS');
    const after = (await admin.get('/stats/summary')).body;
    expect(after.traced).toBe(before.traced);
    expect(after.employed).toBe(before.employed);
  });

  it('requests proof: note on the record, in-app notice and an email', async () => {
    const { user, form } = await register();
    const admin = await as('admin');
    const sent = outbox.length;
    const res = await admin.post(`/alumni/${user.alumniId}/request-proof`, { docs: ['Certificate of employment'], dueDays: 7, note: 'Signed by HR' });
    expect(res.status).toBe(200);
    expect(res.body.note).toBe('Awaiting proof: Certificate of employment — due in 7 days. Signed by HR');
    expect(res.body.emailed).toBe(true);
    expect(outbox.length).toBe(sent + 1);
    expect(outbox.at(-1).to).toBe(form.email);
    expect(await one("SELECT 1 FROM notification WHERE user_id = $1 AND title = 'Please upload proof for your alumni record'", [user.id])).toBeTruthy();
  });

  it('sends a custom follow-up email to a record that only has a contact email', async () => {
    const admin = await as('admin');
    const rec = (await admin.post('/alumni', { ...base, name: 'Lito Lapid', email: 'lito@example.com' })).body;
    expect((await admin.post('/outreach', { alumniId: rec.id, template: 'custom', subject: 'Hi' })).status).toBe(400);
    const res = await admin.post('/outreach', { alumniId: rec.id, template: 'custom', subject: 'Please update your record', body: 'Hi Lito,\n\nPlease update.' });
    expect(res.status).toBe(201);
    expect(outbox.at(-1)).toMatchObject({ to: 'lito@example.com', subject: 'Please update your record' });
    expect(outbox.at(-1).text).toContain('Open your alumni record');
  });

  it('counter context and the scoped activity feed', async () => {
    const [admin, dept] = await Promise.all([as('admin'), as('dept')]);
    const c = (await admin.get('/stats/counters')).body;
    expect(c.oldestPendingAt).toBeTruthy();
    expect(c.batches.length).toBeGreaterThan(3);
    expect(c.verifiedLast7d).toBeGreaterThan(0);
    const feed = (await dept.get('/alumni/activity?limit=20')).body;
    expect(feed.length).toBeGreaterThan(0);
    for (const f of feed) {
      const col = await one('SELECT c.code FROM alumnus a LEFT JOIN program p USING (program_id) JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id) WHERE a.alumni_id = $1', [f.alumniId]);
      expect(col.code).toBe('CCS');
    }
  });

  it('imports rows without a student number', async () => {
    const admin = await as('admin');
    const res = await admin.post('/alumni/import', { rows: [{ ...base, name: 'Imported Person', employment: 'not_employed' }] });
    expect(res.body).toMatchObject({ created: 1, failed: 0 });
  });
});
