// Environment parsing. Fails fast with a clear message when a variable is missing or unsafe for production.
import 'dotenv/config';
import { z } from 'zod';

const bool = z.union([z.boolean(), z.string()]).transform((v) => v === true || v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_DIRECT: z.string().optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  SESSION_TTL_DAYS: z.coerce.number().positive().default(14),
  SESSION_IDLE_HOURS: z.coerce.number().positive().default(12),
  APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().optional(),
  TRUST_PROXY: bool.default(true),
  MAIL_DRIVER: z.enum(['console', 'memory', 'google', 'smtp']).default('console'),
  MAIL_FROM: z.string().default('UDM Alumni <no-reply@udmalumni.edu>'),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_IMPERSONATE_USER: z.string().optional(),
  SMTP_URL: z.string().optional(),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('uploads'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  FILE_SIGNING_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().positive().default(15),
  OUTREACH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().positive().default(15),
});

export function parseConfig(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  const c = parsed.data;
  const problems = [];
  if (c.NODE_ENV === 'production') {
    if (['console', 'memory'].includes(c.MAIL_DRIVER)) problems.push(`MAIL_DRIVER=${c.MAIL_DRIVER} is not allowed in production (use google or smtp)`);
    if (c.MAIL_DRIVER === 'google' && (!c.GOOGLE_SERVICE_ACCOUNT_JSON || !c.GOOGLE_IMPERSONATE_USER)) problems.push('GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_IMPERSONATE_USER are required for MAIL_DRIVER=google');
    if (c.STORAGE_DRIVER !== 's3') problems.push('STORAGE_DRIVER must be s3 in production (host disks are ephemeral)');
    if (!c.CRON_SECRET || c.CRON_SECRET.length < 24) problems.push('CRON_SECRET (24+ characters) is required in production');
    if (!/sslmode=require/.test(c.DATABASE_URL)) problems.push('DATABASE_URL must use sslmode=require in production');
  }
  if (c.MAIL_DRIVER === 'smtp' && !c.SMTP_URL) problems.push('SMTP_URL is required for MAIL_DRIVER=smtp');
  if (c.STORAGE_DRIVER === 's3' && (!c.S3_BUCKET || !c.S3_ACCESS_KEY_ID || !c.S3_SECRET_ACCESS_KEY)) problems.push('S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required for STORAGE_DRIVER=s3');
  if (problems.length) throw new Error(`Invalid environment configuration:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  c.isProd = c.NODE_ENV === 'production';
  c.FILE_SIGNING_SECRET = c.FILE_SIGNING_SECRET || c.CRON_SECRET || 'dev-only-file-signing-secret';
  return c;
}

/** Live config object. Tests may mutate fields before building the app. */
export const config = parseConfig();
