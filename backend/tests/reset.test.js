import { afterEach, describe, expect, it, vi } from 'vitest';
import { client, login, one, register } from './helpers.js';
import { googleTransport, outbox, sendMail, setTransport } from '../src/services/mailer.js';
import { config } from '../src/config/index.js';

const lastMailTo = (to) => outbox.filter((m) => m.to === to).at(-1);
const linkToken = (mail) => /reset-password\?token=([\w-]+)/.exec(mail.text)[1];
const mailCode = (mail) => /Verification code: (\d{3}) (\d{3})/.exec(mail.text).slice(1).join('');

async function requestReset(identifier) {
  const res = await client().post('/auth/forgot-password', { identifier });
  expect(res.status).toBe(200);
  return res.body;
}

afterEach(() => setTransport(null));

describe('forgot password', () => {
  it('answers unknown and known identifiers the same way', async () => {
    const { form } = await register();
    const a = await requestReset('nobody-here@example.com');
    const b = await requestReset(form.email);
    expect(a).toEqual(b);
    expect(lastMailTo('nobody-here@example.com')).toBeUndefined();
    expect(lastMailTo(form.email)).toBeTruthy();
  });

  it('finds the account by Alumni ID and mails the account email', async () => {
    const { form, membershipId } = await register();
    await requestReset(membershipId);
    const mail = lastMailTo(form.email);
    expect(mail.subject).toBe('Reset your UDM Alumni portal password');
    expect(mail.html).toContain('Reset Password');
    expect(mail.text).toContain(`${config.APP_URL}/reset-password?token=`);
    expect(mail.text).toContain('expires in 30 minutes and can only be used once');
  });

  it('link path: verify, then a token works exactly once and revokes sessions', async () => {
    const { form } = await register();
    const signedIn = await login(form.email, form.reg_pw);
    await requestReset(form.email);
    const token = linkToken(lastMailTo(form.email));
    const v = await client().get(`/auth/reset-password/verify?token=${token}`);
    expect(v.body).toEqual({ valid: true, email: form.email });
    const ok = await client().post('/auth/reset-password', { token, password: 'BrandNew123' });
    expect(ok.status).toBe(200);
    expect((await signedIn.get('/me')).status).toBe(401);
    const again = await client().post('/auth/reset-password', { token, password: 'Another123' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('expired');
    expect((await client().get(`/auth/reset-password/verify?token=${token}`)).body.valid).toBe(false);
    await login(form.email, 'BrandNew123');
    expect(await one("SELECT 1 FROM audit_log WHERE action = 'password_reset' AND entity_id = (SELECT user_id FROM user_account WHERE email = $1)", [form.email])).toBeTruthy();
  });

  it('rejects an expired token', async () => {
    const { form } = await register();
    await requestReset(form.email);
    const token = linkToken(lastMailTo(form.email));
    await one("UPDATE password_reset SET expires_at = now() - interval '1 minute' WHERE sent_to = $1", [form.email]);
    expect((await client().get(`/auth/reset-password/verify?token=${token}`)).body.valid).toBe(false);
    expect((await client().post('/auth/reset-password', { token, password: 'BrandNew123' })).status).toBe(400);
  });

  it('enforces the password rules', async () => {
    const { form } = await register();
    await requestReset(form.email);
    const res = await client().post('/auth/reset-password', { token: linkToken(lastMailTo(form.email)), password: 'alllowercase' });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toMatch(/8 characters/);
  });

  it('code path: a wrong code increments attempts and locks the reset at 5', async () => {
    const { form } = await register();
    await requestReset(form.email);
    const code = mailCode(lastMailTo(form.email));
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 1; i <= 5; i += 1) {
      const r = await client().post('/auth/reset-password/verify-code', { identifier: form.email, code: wrong });
      expect(r.status).toBe(400);
      expect((await one('SELECT attempts FROM password_reset WHERE sent_to = $1 ORDER BY created_at DESC LIMIT 1', [form.email])).attempts).toBe(i);
    }
    const right = await client().post('/auth/reset-password/verify-code', { identifier: form.email, code });
    expect(right.status).toBe(400);
  });

  it('code path: the right code returns a single-use reset session', async () => {
    const { form } = await register();
    await requestReset(form.email);
    const res = await client().post('/auth/reset-password/verify-code', { identifier: form.email, code: mailCode(lastMailTo(form.email)) });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(form.email);
    expect((await client().post('/auth/reset-password', { resetSession: res.body.resetSession, password: 'CodePath123' })).status).toBe(200);
    expect((await client().post('/auth/reset-password', { resetSession: res.body.resetSession, password: 'CodePath456' })).status).toBe(400);
    await login(form.email, 'CodePath123');
  });

  it('a new request invalidates earlier unused resets', async () => {
    const { form } = await register();
    await requestReset(form.email);
    const first = linkToken(lastMailTo(form.email));
    await requestReset(form.email);
    expect((await client().get(`/auth/reset-password/verify?token=${first}`)).body.valid).toBe(false);
    expect((await client().get(`/auth/reset-password/verify?token=${linkToken(lastMailTo(form.email))}`)).body.valid).toBe(true);
  });

  it('a failed send still returns the generic response and stores no reset', async () => {
    const { form } = await register();
    setTransport(async () => { throw new Error('smtp down'); });
    const res = await client().post('/auth/forgot-password', { identifier: form.email });
    expect(res.status).toBe(200);
    expect(await one('SELECT 1 FROM password_reset WHERE sent_to = $1', [form.email])).toBeNull();
  });
});

describe('Google mailer driver', () => {
  it('sends through the Gmail API as the impersonated sender (mocked Google client)', async () => {
    const prev = { u: config.GOOGLE_IMPERSONATE_USER, j: config.GOOGLE_SERVICE_ACCOUNT_JSON };
    config.GOOGLE_IMPERSONATE_USER = 'no-reply@udmalumni.edu';
    config.GOOGLE_SERVICE_ACCOUNT_JSON = '{"client_email":"svc@x.iam.gserviceaccount.com","private_key":"k"}';
    const jwtFactory = vi.fn(() => ({ getAccessToken: async () => ({ token: 'ya29.test' }) }));
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'gmail-1' }) }));
    setTransport(googleTransport({ fetchImpl, jwtFactory }));
    await sendMail({ to: 'grad@gmail.com', subject: 'Hello', text: 'Body', html: '<p>Body</p>' });
    expect(jwtFactory).toHaveBeenCalledWith({ client_email: 'svc@x.iam.gserviceaccount.com', private_key: 'k' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/no-reply%40udmalumni.edu/messages/send');
    expect(init.headers.authorization).toBe('Bearer ya29.test');
    const raw = Buffer.from(JSON.parse(init.body).raw, 'base64url').toString();
    expect(raw).toMatch(/^To: grad@gmail\.com/m);
    expect(raw).toMatch(/^Subject: Hello/m);
    Object.assign(config, { GOOGLE_IMPERSONATE_USER: prev.u, GOOGLE_SERVICE_ACCOUNT_JSON: prev.j });
  });

  it('sends as "me" through an OAuth refresh token (personal Gmail, mocked Google client)', async () => {
    const keys = ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_OAUTH_REFRESH_TOKEN'];
    const prev = Object.fromEntries(keys.map((k) => [k, config[k]]));
    Object.assign(config, { GOOGLE_OAUTH_CLIENT_ID: 'cid', GOOGLE_OAUTH_CLIENT_SECRET: 'secret', GOOGLE_OAUTH_REFRESH_TOKEN: '1//refresh' });
    const oauthFactory = vi.fn(() => ({ getAccessToken: async () => ({ token: 'ya29.oauth' }) }));
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'gmail-2' }) }));
    setTransport(googleTransport({ fetchImpl, oauthFactory }));
    await sendMail({ to: 'grad@gmail.com', subject: 'Hello', text: 'Body' });
    expect(oauthFactory).toHaveBeenCalledWith({ clientId: 'cid', clientSecret: 'secret', refreshToken: '1//refresh' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    expect(init.headers.authorization).toBe('Bearer ya29.oauth');
    Object.assign(config, prev);
  });

  it('throws when Gmail rejects the message', async () => {
    config.GOOGLE_SERVICE_ACCOUNT_JSON = '{}';
    setTransport(googleTransport({ jwtFactory: () => ({ getAccessToken: async () => ({ token: 't' }) }), fetchImpl: async () => ({ ok: false, status: 403, text: async () => 'forbidden' }) }));
    await expect(sendMail({ to: 'a@b.c', subject: 's', text: 't' })).rejects.toThrow(/403/);
    config.GOOGLE_SERVICE_ACCOUNT_JSON = undefined;
  });
});

describe('production config guards', () => {
  it('accepts either OAuth or service-account credentials for the google mailer', async () => {
    const { parseConfig } = await import('../src/config/index.js');
    const base = { DATABASE_URL: 'postgres://x/y', MAIL_DRIVER: 'google' };
    expect(() => parseConfig(base)).toThrow(/MAIL_DRIVER=google needs/);
    expect(() => parseConfig({ ...base, GOOGLE_OAUTH_CLIENT_ID: 'c', GOOGLE_OAUTH_CLIENT_SECRET: 's' })).toThrow(/MAIL_DRIVER=google needs/);
    expect(parseConfig({ ...base, GOOGLE_OAUTH_CLIENT_ID: 'c', GOOGLE_OAUTH_CLIENT_SECRET: 's', GOOGLE_OAUTH_REFRESH_TOKEN: 'r' }).MAIL_DRIVER).toBe('google');
    expect(parseConfig({ ...base, GOOGLE_SERVICE_ACCOUNT_JSON: '{}', GOOGLE_IMPERSONATE_USER: 'a@b.c' }).MAIL_DRIVER).toBe('google');
  });

  it('refuses the console mailer, local storage and a missing cron secret in production', async () => {
    const { parseConfig } = await import('../src/config/index.js');
    expect(() => parseConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x/y', MAIL_DRIVER: 'console' })).toThrow(/MAIL_DRIVER=console is not allowed/);
    expect(() => parseConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x/y?sslmode=require', MAIL_DRIVER: 'smtp', SMTP_URL: 'smtp://x', STORAGE_DRIVER: 'local', CRON_SECRET: 'x'.repeat(30) })).toThrow(/STORAGE_DRIVER must be s3/);
    expect(() => parseConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x/y', MAIL_DRIVER: 'smtp', SMTP_URL: 'smtp://x', STORAGE_DRIVER: 's3', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 's', CRON_SECRET: 'x'.repeat(30) })).toThrow(/sslmode=require/);
    expect(parseConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x/y?sslmode=require', MAIL_DRIVER: 'smtp', SMTP_URL: 'smtp://x', STORAGE_DRIVER: 's3', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 's', CRON_SECRET: 'x'.repeat(30) }).isProd).toBe(true);
  });

  it('reads Neon-style AWS_* storage variables when the S3_* ones are unset', async () => {
    const { parseConfig } = await import('../src/config/index.js');
    const c = parseConfig({ DATABASE_URL: 'postgres://x/y', STORAGE_DRIVER: 's3', S3_BUCKET: 'uploads', AWS_ENDPOINT_URL_S3: 'https://e', AWS_REGION: 'ap-southeast-1', AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 's' });
    expect(c).toMatchObject({ S3_ENDPOINT: 'https://e', S3_REGION: 'ap-southeast-1', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 's' });
    expect(parseConfig({ DATABASE_URL: 'postgres://x/y', S3_REGION: 'auto', AWS_REGION: 'ap-southeast-1' }).S3_REGION).toBe('auto');
  });

  it('refuses to seed demo data in production', async () => {
    const { seedDemo } = await import('../seed/demo.js');
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    await expect(seedDemo({ query: async () => ({ rows: [{ n: 0 }] }) })).rejects.toThrow(/production/);
    process.env.NODE_ENV = prev;
  });

  it('only lets demo data target a local (or explicitly allowed, non-ssl) database', async () => {
    const { assertDemoSeedAllowed } = await import('../seed/demo.js');
    const local = 'postgres://u:p@localhost:5433/udm';
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'production', DATABASE_URL: local })).toThrow(/production/);
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development', DATABASE_URL: 'postgres://u:p@db.example.com/udm' })).toThrow(/non-local database host "db.example.com"/);
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development', DATABASE_URL: 'postgres://u:p@db.example.com/udm?sslmode=require', ALLOW_DEMO_SEED: 'true' })).toThrow(/sslmode/);
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development', DATABASE_URL: '' })).toThrow(/unknown/);
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development', DATABASE_URL: local })).not.toThrow();
    expect(() => assertDemoSeedAllowed({ NODE_ENV: 'development', DATABASE_URL: 'postgres://u:p@staging-db/udm', ALLOW_DEMO_SEED: 'true' })).not.toThrow();
  });
});
