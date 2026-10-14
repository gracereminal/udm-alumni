import { afterEach, describe, expect, it } from 'vitest';
import { as, many, one, register } from './helpers.js';
import { outbox, setTransport } from '../src/services/mailer.js';

afterEach(() => setTransport(null));
const contacts = async (alumniId) => (await one('SELECT count(*)::int AS n FROM outreach_contact WHERE alumni_id = $1', [alumniId])).n;

describe('outreach', () => {
  it('lists CCS alumni who are seeking work, unresponsive or new, with counters from the same query', async () => {
    const dept = await as('dept');
    const res = await dept.get('/stats/unresponsive?limit=100');
    expect(res.status).toBe(200);
    const total = Object.values(res.body.byReason).reduce((a, b) => a + b, 0);
    expect(res.body.total).toBe(total);
    const ccs = await one("SELECT count(*)::int AS n FROM v_unresponsive u JOIN college c ON c.college_id = u.college_id WHERE c.code = 'CCS'");
    expect(res.body.total).toBe(ccs.n);
    expect(JSON.stringify(res.body)).not.toMatch(/@/); // no email addresses reach the client
  });

  it('sends one real email, logs exactly one OUTREACH_CONTACT, and updates last_contacted_at', async () => {
    const { user, form } = await register();
    const dept = await as('dept');
    const sent = outbox.length;
    const res = await dept.post('/outreach', { alumniId: user.alumniId });
    expect(res.status).toBe(201);
    expect(res.body.outcome).toBe('sent');
    expect(outbox.length).toBe(sent + 1);
    expect(outbox.at(-1).to).toBe(form.email);
    expect(outbox.at(-1).subject).toBe('Your UDM alumni survey is waiting');
    expect(await contacts(user.alumniId)).toBe(1);
    expect(await one("SELECT 1 FROM audit_log WHERE action = 'outreach' AND entity_id = $1", [user.alumniId])).toBeTruthy();
    const row = (await dept.get('/stats/unresponsive?limit=100')).body.rows.find((r) => r.alumni_id === user.alumniId);
    const last = await one('SELECT max(contacted_at) AS t FROM outreach_contact WHERE alumni_id = $1', [user.alumniId]);
    expect(new Date(row.last_contacted_at).getTime()).toBe(new Date(last.t).getTime());
    // The alumnus also gets an in-app copy.
    expect(await one("SELECT 1 FROM notification WHERE user_id = $1 AND type = 'outreach'", [user.id])).toBeTruthy();
  });

  it('a failed send records nothing', async () => {
    const { user } = await register();
    setTransport(async () => { throw new Error('Gmail unavailable'); });
    const res = await (await as('dept')).post('/outreach', { alumniId: user.alumniId });
    expect(res.status).toBe(500);
    expect(await contacts(user.alumniId)).toBe(0);
    expect(await one("SELECT 1 FROM notification WHERE user_id = $1 AND type = 'outreach'", [user.id])).toBeNull();
  });

  it('allows one email per alumnus per 7 days (429), but manual contacts can still be logged', async () => {
    const { user } = await register();
    const dept = await as('dept');
    expect((await dept.post('/outreach', { alumniId: user.alumniId })).status).toBe(201);
    const again = await dept.post('/outreach', { alumniId: user.alumniId });
    expect(again.status).toBe(429);
    const phone = await dept.post('/outreach', { alumniId: user.alumniId, method: 'phone', note: 'Called, will answer this week' });
    expect(phone.status).toBe(201);
    expect(phone.body.outcome).toBe('reached');
    const patched = await dept.patch(`/outreach/${phone.body.id}`, { outcome: 'no_response' });
    expect(patched.body.outcome).toBe('no_response');
    expect(await contacts(user.alumniId)).toBe(2);
  });

  it('rejects email outreach to a record without an email', async () => {
    const admin = await as('admin');
    const rec = await admin.post('/alumni', { last_name: 'NoMail', first_name: 'Rec', college: 'College of Computing Studies', course: 'Bachelor of Science in Information Technology', year_graduated: 2023 });
    const res = await (await as('dept')).post('/outreach', { alumniId: rec.body.id });
    expect(res.status).toBe(400);
    expect(await many('SELECT 1 FROM outreach_contact WHERE alumni_id = $1', [rec.body.id])).toHaveLength(0);
  });
});
