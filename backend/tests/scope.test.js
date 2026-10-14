import { describe, expect, it } from 'vitest';
import { as, collegeId, many, one, register } from './helpers.js';

const otherCollegeAlumnus = async () => (await one(
  `SELECT a.alumni_id FROM alumnus a JOIN program p USING (program_id) JOIN college c ON c.college_id = p.college_id
    WHERE c.code = 'CHS' AND a.archived_at IS NULL AND a.merged_into_id IS NULL LIMIT 1`)).alumni_id;

describe('dept scope (own college only)', () => {
  it('lists only its own college in Records', async () => {
    const dept = await as('dept');
    const res = await dept.get('/alumni?pageSize=200');
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeGreaterThan(0);
    expect(new Set(res.body.rows.map((r) => r.collegeCode))).toEqual(new Set(['CCS']));
    // A collegeId filter for another college cannot widen the scope.
    const chs = await collegeId('CHS');
    expect((await dept.get(`/alumni?collegeId=${chs}`)).body.total).toBe(0);
  });

  it('cannot read, edit, verify, merge or contact another college\'s alumnus', async () => {
    const dept = await as('dept');
    const id = await otherCollegeAlumnus();
    expect((await dept.get(`/alumni/${id}`)).status).toBe(404);
    expect((await dept.patch(`/alumni/${id}`, { note: 'x' })).status).toBe(404);
    expect((await dept.post(`/alumni/${id}/status`, { action: 'verify' })).status).toBe(404);
    expect((await dept.post('/outreach', { alumniId: id })).status).toBe(404);
  });

  it('gets stats pinned to its college whatever it asks for', async () => {
    const [dept, admin] = await Promise.all([as('dept'), as('admin')]);
    const ccs = await collegeId('CCS');
    const chs = await collegeId('CHS');
    const own = await admin.get(`/stats/summary?collegeId=${ccs}`);
    const asked = await dept.get(`/stats/summary?collegeId=${chs}`);
    expect(asked.body.total).toBe(own.body.total);
    expect(asked.body.traced).toBe(own.body.traced);
    const rep = await dept.get(`/reports/coverage?collegeId=${chs}`);
    expect(rep.body.scope).toBe('College of Computing Studies');
  });

  it('cannot create a record in another college', async () => {
    const dept = await as('dept');
    const res = await dept.post('/alumni', { last_name: 'X', first_name: 'Y', college: 'College of Health Sciences', course: 'Bachelor of Science in Nursing', year_graduated: 2024 });
    expect(res.status).toBe(400);
  });
});

describe('alumni scope', () => {
  it('cannot use staff endpoints', async () => {
    const alum = await as('alumni');
    expect((await alum.get('/alumni')).status).toBe(403);
    expect((await alum.get('/stats/summary')).status).toBe(403);
    expect((await alum.get('/reports/ched')).status).toBe(403);
    expect((await alum.patch(`/alumni/${await otherCollegeAlumnus()}`, { note: 'x' })).status).toBe(403);
    expect((await alum.post('/outreach', { alumniId: 1 })).status).toBe(403);
    expect((await alum.get('/users')).status).toBe(403);
  });

  it('PATCH /me only ever changes the caller\'s own row', async () => {
    const { c, user } = await register();
    const other = await one('SELECT alumni_id, last_name FROM alumnus WHERE alumni_id <> $1 LIMIT 1', [user.alumniId]);
    const res = await c.patch('/me', { last_name: 'Changed', alumni_id: other.alumni_id });
    expect(res.status).toBe(200);
    expect((await one('SELECT last_name FROM alumnus WHERE alumni_id = $1', [other.alumni_id])).last_name).toBe(other.last_name);
    expect((await one('SELECT last_name FROM alumnus WHERE alumni_id = $1', [user.alumniId])).last_name).toBe('Changed');
  });
});

describe('directory privacy', () => {
  it('shows only opted-in alumni', async () => {
    const alum = await as('alumni');
    const res = await alum.get('/directory?limit=100');
    const opted = await one('SELECT count(*)::int AS n FROM alumnus WHERE directory_opt_in AND archived_at IS NULL AND merged_into_id IS NULL');
    expect(res.body.total).toBe(opted.n);
  });

  it('masks hidden email, mobile and links, and hiding a contact updates the directory at once', async () => {
    const { c, user } = await register({ linkedin: 'linkedin.com/in/tester' });
    const viewer = await as('alumni');
    expect((await viewer.get(`/directory/${user.alumniId}`)).status).toBe(404); // not opted in yet

    await c.patch('/me/privacy', { directoryOptIn: true, showEmail: true, showMobile: false, links: { linkedin: true } });
    let card = (await viewer.get(`/directory/${user.alumniId}`)).body;
    expect(card.profile.contacts.email).toBe(user.email);
    expect(card.profile.contacts.linkedin).toBe('linkedin.com/in/tester');
    expect(card.profile.contacts.mobile).toBeUndefined();

    await c.patch('/me/privacy', { showEmail: false, links: { linkedin: false } });
    card = (await viewer.get(`/directory/${user.alumniId}`)).body;
    expect(card.profile.contacts).toEqual({});
    // Staff see the same masked directory; full contact data stays in scoped, audited Records reads.
    const admin = await as('admin');
    expect((await admin.get(`/directory/${user.alumniId}`)).body.profile.contacts).toEqual({});
  });

  it('audits staff reads of sensitive record fields', async () => {
    const admin = await as('admin');
    const id = await otherCollegeAlumnus();
    const before = await one("SELECT count(*)::int AS n FROM audit_log WHERE action = 'read_sensitive' AND entity_id = $1", [id]);
    const res = await admin.get(`/alumni/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('birthDate');
    const after = await one("SELECT count(*)::int AS n FROM audit_log WHERE action = 'read_sensitive' AND entity_id = $1", [id]);
    expect(after.n).toBe(before.n + 1);
  });

  it('never exposes password hashes or session hashes in any record payload', async () => {
    const admin = await as('admin');
    const rows = (await admin.get('/alumni?pageSize=5')).body.rows;
    const text = JSON.stringify(rows) + JSON.stringify((await admin.get(`/alumni/${rows[0].id}`)).body);
    expect(text).not.toMatch(/argon2|password_hash|session_hash/);
    expect(await many('SELECT 1')).toHaveLength(1);
  });
});
