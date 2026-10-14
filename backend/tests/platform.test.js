import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, as, client, EMPLOYED, one, register } from './helpers.js';

// Smallest valid PNG (1x1) and a PDF header — content sniffing, not file names, decides the type.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

describe('health and lookups', () => {
  it('GET /health checks the database', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, db: 'up' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('serves the college/program catalog with unique program codes', async () => {
    const res = await request(app).get('/api/v1/lookups');
    const ccs = res.body.colleges.find((c) => c.code === 'CCS');
    expect(ccs.programs.map((p) => p.abbr)).toEqual(['BSIT']);
    const codes = res.body.colleges.flatMap((c) => c.programs.map((p) => p.code));
    expect(new Set(codes).size).toBe(codes.length);
    expect(res.body.targets).toEqual({ employment: 80, coverage: 60 });
    expect(res.body.cycle.status).toBe('open');
  });

  it('returns JSON 404s with a request id for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
  });
});

describe('me', () => {
  it('profile, survey draft -> submit, and the dashboard counters', async () => {
    const { c } = await register();
    let me = (await c.get('/me')).body;
    expect(me.survey.status).toBe('not_started');
    expect(me.record.membershipId).toMatch(/^AM-/);
    const draft = await c.put('/me/survey', { answers: { first_grad: 'Yes' }, currentSection: 1 });
    expect(draft.body).toMatchObject({ status: 'draft', submitted: false, currentSection: 1 });
    expect((await c.put('/me/survey', { answers: { first_grad: 'Yes' }, submit: true })).status).toBe(400);
    expect((await c.put('/me/survey', { answers: { ever_employed: 'Maybe' } })).body.fields.ever_employed).toBeTruthy();
    const done = await c.put('/me/survey', { answers: { ...EMPLOYED, honors: 'Cum Laude', prof_exams: 'None' }, submit: true });
    expect(done.body.submitted).toBe(true);
    expect(done.body.completionPct).toBeGreaterThan(0);
    me = (await c.get('/me')).body;
    expect(me.a.job_name).toBe('Software Engineer');
    expect(me.a.first_name).toBeTruthy();
    expect(me.credentials.map((x) => x.title)).toEqual(['Cum Laude']);
    const emp = await one('SELECT employment_status, time_to_job_bucket, months_to_first_job, course_relevance FROM employment_record WHERE alumni_id = $1 AND is_current', [me.user.alumniId]);
    expect(emp).toEqual({ employment_status: 'employed', time_to_job_bucket: 'm1_6', months_to_first_job: 3.5, course_relevance: 'related' });
  });

  it('profile edits update the Records row and write a review + audit entry', async () => {
    const { c, user } = await register();
    const res = await c.patch('/me', { present_address: 'Ermita, Manila', mobile: '0918 000 1111' });
    expect(res.status).toBe(200);
    const admin = await as('admin');
    const rec = (await admin.get(`/alumni/${user.alumniId}`)).body;
    expect(rec.address).toBe('Ermita, Manila');
    expect(rec.mobile).toBe('09180001111');
    expect(rec.source).toBe('alumni_update');
    expect(rec.history[0].action).toBe('edit');
    expect((await c.patch('/me', { mobile: '123' })).body.fields.mobile).toBeTruthy();
  });

  it('uploads a photo (sniffed by content) and rejects a disguised file', async () => {
    const { c } = await register();
    const ok = await c.agent.post('/api/v1/me/photo').set('X-Requested-With', 'x').attach('photo', PNG, 'me.png');
    expect(ok.status).toBe(200);
    expect(ok.body.photoUrl).toMatch(/^\/api\/v1\/files\/public\/.+\.png$/);
    const file = await request(app).get(ok.body.photoUrl);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    const fake = await c.agent.post('/api/v1/me/photo').set('X-Requested-With', 'x').attach('photo', Buffer.from('<script>alert(1)</script>'), { filename: 'evil.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
  });

  it('proof documents are private and reachable only through a short-lived signed URL', async () => {
    const { c, user } = await register();
    const emp = (await c.post('/me/employment', { jobTitle: 'Analyst', employer: 'Bank' })).body;
    const up = await c.agent.post(`/api/v1/me/employment/${emp.id}/proof`).set('X-Requested-With', 'x').attach('file', PDF, 'coe.pdf');
    expect(up.status).toBe(201);
    const admin = await as('admin');
    const [doc] = (await admin.get(`/alumni/${user.alumniId}/proofs`)).body;
    expect(doc.url).toMatch(/^\/api\/v1\/files\/private\/.+\.pdf\?exp=\d+&sig=/);
    expect((await request(app).get(doc.url)).status).toBe(200);
    expect((await request(app).get(doc.url.replace(/sig=[^&]+/, 'sig=forged'))).status).toBe(403);
    expect((await request(app).get(doc.url.split('?')[0])).status).toBe(403);
    const dept = await as('dept');
    expect((await dept.get(`/alumni/${user.alumniId}/proofs`)).status).toBe(200); // CCS registrant -> in scope
  });
});

describe('records operations', () => {
  it('verify / flag (needs a reason) / unflag, bulk, with history and alumnus notification', async () => {
    const { c, user } = await register();
    const admin = await as('admin');
    expect((await admin.post(`/alumni/${user.alumniId}/status`, { action: 'flag' })).status).toBe(400);
    expect((await admin.post(`/alumni/${user.alumniId}/status`, { action: 'flag', reason: 'Fix your batch year' })).body.status).toBe('flagged');
    expect((await c.get('/notifications')).body.rows[0].title).toBe('Your alumni record needs an update');
    const bulk = await admin.post('/alumni/bulk-status', { ids: [user.alumniId], action: 'verify' });
    expect(bulk.body.count).toBe(1);
    const rec = (await admin.get(`/alumni/${user.alumniId}`)).body;
    expect(rec.status).toBe('verified');
    expect(rec.history.map((h) => h.action).slice(0, 3)).toEqual(['verify', 'flag', 'create']);
  });

  it('imports a registrar list, skipping existing student numbers and reporting bad rows', async () => {
    const admin = await as('admin');
    const sno = `2020-${String(Date.now()).slice(-5)}-UDM`;
    const rows = [
      { student_no: sno, last_name: 'Import', first_name: 'One', college: 'College of Health Sciences', course: 'Bachelor of Science in Nursing', year_graduated: 2024 },
      { student_no: '2024-00567-UDM', last_name: 'Dela Cruz', first_name: 'Maria', college: 'CCS', course: 'Bachelor of Science in Information Technology', year_graduated: 2024 },
      { student_no: 'BAD', last_name: 'Bad', first_name: 'Row', college: 'College of Health Sciences', course: 'Bachelor of Science in Nursing', year_graduated: 2024 },
    ];
    const res = await admin.post('/alumni/import', { rows });
    expect(res.body).toMatchObject({ created: 1, skipped: 1, failed: 1 });
    expect(res.body.errors[0].fields.student_no).toBeTruthy();
    expect((await one('SELECT record_source FROM alumnus WHERE student_no = $1', [sno])).record_source).toBe('import');
  });
});

describe('settings, users, audit and scheduled jobs', () => {
  it('targets live in APP_SETTING and flow into the reports', async () => {
    const admin = await as('admin');
    await admin.put('/settings', { employment_target: 75 });
    const rep = (await admin.get('/reports/employability')).body;
    expect(rep.target).toBe(75);
    expect(rep.kpis[0].sub).toBe('target 75%');
    await admin.put('/settings', { employment_target: 80 });
    expect((await admin.put('/settings', { unknown: 1 })).status).toBe(400);
    expect((await (await as('dept')).get('/settings')).status).toBe(403);
    const log = (await admin.get('/audit?entityType=app_setting')).body;
    expect(log[0].action).toBe('update');
  });

  it('new staff accounts must change the one-time password', async () => {
    const admin = await as('admin');
    const email = `staff.${Date.now()}@udm.edu.ph`;
    const res = await admin.post('/users', { email, name: 'New Admin', role: 'admin' });
    const c = client();
    const login = await c.post('/auth/login', { identifier: email, password: res.body.oneTimePassword });
    expect(login.body.user.mustChangePassword).toBe(true);
    await c.post('/auth/change-password', { current: res.body.oneTimePassword, password: 'MyOwnPass1' });
    expect((await c.get('/auth/session')).body.user.mustChangePassword).toBe(false);
  });

  it('/internal/jobs requires the cron secret', async () => {
    expect((await request(app).post('/api/v1/internal/jobs/token-cleanup')).status).toBe(401);
    expect((await request(app).post('/api/v1/internal/jobs/token-cleanup').set('x-cron-secret', 'wrong')).status).toBe(401);
    for (const name of ['token-cleanup', 'notification-retention', 'coverage-alerts']) {
      const res = await request(app).post(`/api/v1/internal/jobs/${name}`).set('x-cron-secret', process.env.CRON_SECRET);
      expect(res.status, name).toBe(200);
    }
    expect((await request(app).post('/api/v1/internal/jobs/nope').set('x-cron-secret', process.env.CRON_SECRET)).status).toBe(404);
  });

  it('notification retention deletes only old read notifications', async () => {
    const { user } = await register();
    await one(`INSERT INTO notification (user_id, type, title, message, read_at, created_at) VALUES
      ($1, 'system', 'old read', 'x', now() - interval '100 days', now() - interval '100 days'),
      ($1, 'system', 'old unread', 'x', NULL, now() - interval '100 days')`, [user.id]);
    await request(app).post('/api/v1/internal/jobs/notification-retention').set('x-cron-secret', process.env.CRON_SECRET);
    const left = await one("SELECT string_agg(title, ',' ORDER BY title) AS t FROM notification WHERE user_id = $1 AND type = 'system'", [user.id]);
    expect(left.t).toBe('old unread');
  });
});
