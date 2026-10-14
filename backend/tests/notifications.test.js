import { describe, expect, it } from 'vitest';
import { as, collegeId, EMPLOYED, login, many, one, register } from './helpers.js';
import { notify } from '../src/services/notifications.js';
import { pool } from '../src/db/index.js';
import { coverageAlerts } from '../src/jobs/index.js';

const countFor = async (userId, type, since) => (await one('SELECT count(*)::int AS n FROM notification WHERE user_id = $1 AND type = $2 AND created_at >= $3', [userId, type, since])).n;
const staffIn = (code) => many("SELECT u.user_id FROM user_account u JOIN college c ON c.college_id = u.college_id WHERE u.role = 'dept' AND c.code = $1", [code]);

describe('notifications', () => {
  it('a registration notifies every admin and that college\'s staff, and no other college', async () => {
    const admin = await as('admin');
    // A second college account in another college to prove the negative.
    const created = await admin.post('/users', { email: `chs.staff.${Date.now()}@udm.edu.ph`, name: 'CHS Staff', role: 'dept', collegeId: await collegeId('CHS') });
    expect(created.status).toBe(201);
    expect(created.body.oneTimePassword).toMatch(/[A-Z]/);
    const since = new Date();
    await register();
    const admins = await many("SELECT user_id FROM user_account WHERE role = 'admin'");
    for (const a of admins) expect(await countFor(a.user_id, 'registration', since)).toBe(1);
    for (const d of await staffIn('CCS')) expect(await countFor(d.user_id, 'registration', since)).toBe(1);
    for (const d of await staffIn('CHS')) expect(await countFor(d.user_id, 'registration', since)).toBe(0);
  });

  it('approving a job sends the decision to the poster only', async () => {
    const { c, user } = await register();
    const job = await c.post('/jobs', { title: 'Night Shift Analyst', company: 'Test Corp', tags: ['Excel'] });
    expect(job.status).toBe(201);
    expect(job.body.approvalStatus).toBe('pending');
    const since = new Date();
    const admin = await as('admin');
    expect((await admin.post(`/jobs/${job.body.id}/approve`)).status).toBe(200);
    const decisions = await many("SELECT user_id FROM notification WHERE type = 'job_decision' AND created_at >= $1", [since]);
    expect(decisions.map((d) => Number(d.user_id))).toEqual([user.id]);
    const bell = await c.get('/notifications');
    expect(bell.body.rows[0].title).toBe('Your job posting was approved');
    expect(bell.body.rows[0].to).toBe('jobs');
  });

  it('read state follows the user across sessions', async () => {
    const { form, user } = await register();
    await notify(pool, [user.id], { type: 'system', title: 'Hello', message: 'Cross-device' });
    const a = await login(form.email, form.reg_pw);
    const b = await login(form.email, form.reg_pw);
    const list = (await a.get('/notifications')).body;
    const n = list.rows.find((r) => r.title === 'Hello');
    expect(n.read).toBe(false);
    await a.post(`/notifications/${n.id}/read`);
    const seen = (await b.get('/notifications')).body;
    expect(seen.rows.find((r) => r.id === n.id).read).toBe(true);
    expect(seen.unread).toBe(list.unread - 1);
    await b.post('/notifications/read-all');
    expect((await a.get('/notifications?unread=1')).body.rows).toHaveLength(0);
  });

  it('a user cannot read or mark another user\'s notification', async () => {
    const { user } = await register();
    await notify(pool, [user.id], { type: 'system', title: 'Private', message: 'Only mine' });
    const n = await one("SELECT notification_id FROM notification WHERE user_id = $1 AND title = 'Private'", [user.id]);
    const other = await as('alumni');
    expect((await other.post(`/notifications/${n.notification_id}/read`)).status).toBe(404);
    expect((await other.get('/notifications')).body.rows.find((r) => r.id === n.notification_id)).toBeUndefined();
  });

  it('a milestone (dedupe_key) is created once', async () => {
    const { user } = await register();
    const m = { type: 'milestone', title: 'Batch passed 60%', message: 'x', dedupeKey: 'test:milestone:1' };
    expect(await notify(pool, [user.id], m)).toBe(1);
    expect(await notify(pool, [user.id], m)).toBe(0);
  });

  it('coverage crossing the target notifies admin and the college once, with numbers from the views', async () => {
    // A brand-new batch (1999) in one college: 2 alumni -> the first submission takes coverage from 0% to 50% (< 60),
    // the second to 100% (crosses 60) -> one milestone. Resubmitting does not repeat it.
    const one1 = await register({ year_graduated: '1999', college: 'College of Law', course: 'Juris Doctor' });
    const two = await register({ year_graduated: '1999', college: 'College of Law', course: 'Juris Doctor' });
    const since = new Date();
    await one1.c.put('/me/survey', { answers: EMPLOYED, submit: true });
    expect(await one("SELECT count(*)::int AS n FROM notification WHERE type = 'milestone' AND created_at >= $1", [since])).toEqual({ n: 0 });
    await two.c.put('/me/survey', { answers: EMPLOYED, submit: true });
    const ms = await many("SELECT title, message, user_id FROM notification WHERE type = 'milestone' AND created_at >= $1", [since]);
    const admins = await many("SELECT user_id FROM user_account WHERE role = 'admin'");
    expect(ms.length).toBe(admins.length); // no College of Law staff exist
    expect(ms[0].title).toBe('Batch 1999 passed 60% survey coverage');
    expect(ms[0].message).toContain('100.0% (2 of 2)');
    await two.c.put('/me/survey', { answers: EMPLOYED, submit: true });
    expect((await many("SELECT 1 FROM notification WHERE type = 'milestone' AND created_at >= $1", [since])).length).toBe(admins.length);
  });

  it('the coverage-alerts job reminds college staff once per batch per week', async () => {
    const first = await coverageAlerts();
    const second = await coverageAlerts();
    expect(first.batchesBelowTarget).toBeGreaterThanOrEqual(0);
    expect(second.alerts).toBe(0);
  });
});
