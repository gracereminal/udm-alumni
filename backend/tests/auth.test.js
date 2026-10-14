import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, as, client, DEMO, login, one, register, regForm } from './helpers.js';
import { config } from '../src/config/index.js';
import { cookieOptions } from '../src/services/sessions.js';

describe('registration', () => {
  it('repeats every client validation rule on the server', async () => {
    const c = client();
    const res = await c.post('/auth/register', regForm({
      last_name: '', dob: '2999-01-01', marital_status: 'Married', married_name: '', indigenous: 'Yes', indigenous_group: '', pwd: 'Yes', pwd_type: '',
      mobile: '12345', email: 'not-an-email', course: '', course_other: '', year_graduated: '1998', reg_pw: 'short', reg_pw2: 'different', twitter: 'has space',
    }));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(
      ['course', 'dob', 'email', 'indigenous_group', 'last_name', 'married_name', 'mobile', 'pwd_type', 'reg_pw', 'reg_pw2', 'twitter', 'year_graduated'].sort(),
    );
    expect(res.body.fields.year_graduated).toBe('Only years 1999 onward are allowed.');
  });

  it('requires privacy consent', async () => {
    const res = await client().post('/auth/register', regForm({ privacy_consent: false }));
    expect(res.status).toBe(400);
    expect(res.body.fields.privacy_consent).toBeTruthy();
  });

  it('creates user + alumnus + links in one transaction, normalizes the mobile, signs the user in', async () => {
    const { c, user, membershipId, form } = await register({ facebook: 'fb.handle', mobile: '+63 917 555 0199' });
    expect(user.role).toBe('alumni');
    expect(membershipId).toMatch(/^AM-2024-\d{5}$/);
    const a = await one('SELECT a.*, u.password_hash FROM alumnus a JOIN user_account u USING (user_id) WHERE a.membership_id = $1', [membershipId]);
    expect(a.mobile_no).toBe('639175550199');
    expect(a.privacy_consent_at).not.toBeNull();
    expect(a.password_hash).toMatch(/^\$argon2id\$/);
    expect(a.password_hash).not.toContain(form.reg_pw);
    const me = await c.get('/me');
    expect(me.status).toBe(200);
    expect(me.body.a.facebook).toBe('fb.handle');
    expect(me.body.a.mobile).toBe('09175550199');
  });

  it('rejects a duplicate email', async () => {
    const { form } = await register();
    const res = await client().post('/auth/register', regForm({ email: form.email.toUpperCase() }));
    expect(res.status).toBe(409);
    expect(res.body.fields.email).toBeTruthy();
  });

  it('keeps a typed "Others" program unmapped under the declared college', async () => {
    const { membershipId } = await register({ college: 'Others', course: '', course_other: 'BS Marine Engineering' });
    const a = await one('SELECT program_id, course_other, declared_college_id FROM alumnus WHERE membership_id = $1', [membershipId]);
    expect(a.program_id).toBeNull();
    expect(a.course_other).toBe('BS Marine Engineering');
    expect(a.declared_college_id).not.toBeNull();
  });
});

describe('sign-in', () => {
  it('accepts email, membership_id and student_no for alumni', async () => {
    for (const id of [DEMO.alumni, 'AM-2024-00567', '2024-00567-udm']) {
      const c = await login(id);
      expect((await c.get('/auth/session')).body.user.email).toBe(DEMO.alumni);
    }
  });

  it('staff sign in by email only and get their college from the account', async () => {
    const c = await as('dept');
    const u = (await c.get('/auth/session')).body.user;
    expect(u.role).toBe('dept');
    expect(u.college).toBe('College of Computing Studies');
  });

  it('uses one generic message for unknown accounts and wrong passwords', async () => {
    const a = await client().post('/auth/login', { identifier: 'nobody@example.com', password: 'Whatever1' });
    const b = await client().post('/auth/login', { identifier: DEMO.admin, password: 'Wrong1234' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it('locks the account after repeated failures, even for the right password', async () => {
    const { form } = await register();
    for (let i = 0; i < config.LOGIN_LOCKOUT_THRESHOLD; i += 1) await client().post('/auth/login', { identifier: form.email, password: 'Wrong1234' });
    const res = await client().post('/auth/login', { identifier: form.email, password: form.reg_pw });
    expect(res.status).toBe(401);
    const u = await one('SELECT locked_until FROM user_account WHERE lower(email) = lower($1)', [form.email]);
    expect(new Date(u.locked_until).getTime()).toBeGreaterThan(Date.now());
    const failed = await one("SELECT count(*)::int AS n FROM audit_log WHERE action = 'login_failed' AND entity_id = (SELECT user_id FROM user_account WHERE lower(email) = lower($1))", [form.email]);
    expect(failed.n).toBeGreaterThanOrEqual(config.LOGIN_LOCKOUT_THRESHOLD);
  });

  it('sets an httpOnly, SameSite=Lax, path=/ session cookie (Secure in production)', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('X-Requested-With', 'x').send({ identifier: DEMO.admin, password: 'demoPass123' });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^udm_sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    const prev = config.isProd;
    config.isProd = true;
    expect(cookieOptions().secure).toBe(true);
    config.isProd = prev;
    // Only the SHA-256 of the cookie value is stored.
    const raw = decodeURIComponent(cookie.split(';')[0].split('=')[1]);
    expect(await one('SELECT 1 FROM auth_session WHERE session_hash = $1', [raw])).toBeNull();
  });
});

describe('sessions', () => {
  it('logout revokes the session at once', async () => {
    const c = await as('admin');
    expect((await c.get('/auth/session')).status).toBe(200);
    await c.post('/auth/logout');
    expect((await c.get('/auth/session')).status).toBe(401);
  });

  it('disabling an account revokes its sessions immediately', async () => {
    const { c, user } = await register();
    const admin = await as('admin');
    expect((await admin.patch(`/users/${user.id}`, { status: 'disabled' })).status).toBe(200);
    expect((await c.get('/me')).status).toBe(401);
    const relog = await client().post('/auth/login', { identifier: user.email, password: 'Password123' });
    expect(relog.status).toBe(401);
  });

  it('changing the password signs out the other sessions only', async () => {
    const { form } = await register();
    const a = await login(form.email, form.reg_pw);
    const b = await login(form.email, form.reg_pw);
    const res = await a.post('/auth/change-password', { current: form.reg_pw, password: 'NewPassword9' });
    expect(res.status).toBe(200);
    expect((await a.get('/me')).status).toBe(200);
    expect((await b.get('/me')).status).toBe(401);
  });

  it('expires sessions after the idle timeout', async () => {
    const c = await as('admin');
    await one("UPDATE auth_session SET last_seen_at = now() - interval '13 hours' WHERE user_id = (SELECT user_id FROM user_account WHERE email = $1) AND revoked_at IS NULL", [DEMO.admin]);
    expect((await c.get('/auth/session')).status).toBe(401);
  });
});

describe('CSRF and brute force', () => {
  it('rejects state-changing requests without X-Requested-With', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ identifier: DEMO.admin, password: 'demoPass123' });
    expect(res.status).toBe(403);
  });

  it('rate-limits /auth', async () => {
    const prev = config.AUTH_RATE_LIMIT_MAX;
    config.AUTH_RATE_LIMIT_MAX = 2;
    const ip = '203.0.113.77';
    const hit = () => request(app).post('/api/v1/auth/login').set('X-Requested-With', 'x').set('X-Forwarded-For', ip).send({ identifier: 'x@example.com', password: 'Nope12345' });
    await hit();
    await hit();
    const third = await hit();
    config.AUTH_RATE_LIMIT_MAX = prev;
    expect(third.status).toBe(429);
  });
});
