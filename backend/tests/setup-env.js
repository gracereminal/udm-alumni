// Runs in each test worker before the test files import the app (config is parsed on import).
import { afterAll, inject } from 'vitest';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: inject('dbUrl'),
  MAIL_DRIVER: 'memory',
  STORAGE_DRIVER: 'local',
  STORAGE_LOCAL_DIR: inject('uploadDir'),
  CRON_SECRET: 'test-cron-secret-0123456789abcdef',
  AUTH_RATE_LIMIT_MAX: '10000',
  OUTREACH_RATE_LIMIT_MAX: '10000',
  APP_URL: 'http://localhost:5173',
});

afterAll(async () => {
  const { pool } = await import('../src/db/index.js');
  await pool.end().catch(() => {});
});
