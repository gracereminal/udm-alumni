// Throwaway database for the test run, migrated and seeded (lookups + a smaller demo seed).
// - TEST_DATABASE_ADMIN_URL set (e.g. CI with a Postgres 16 service): creates and drops a temporary database there.
// - Otherwise: an embedded Postgres 16. initdb is slow on Windows, so an initialized cluster is cached in
//   backend/.pgtest-template and copied for each run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { runner } from 'node-pg-migrate';
import { startLocalDb } from '../scripts/local-db.js';

const TEMPLATE = path.resolve('.pgtest-template');

async function embedded() {
  if (!fs.existsSync(path.join(TEMPLATE, 'PG_VERSION'))) {
    const t = await startLocalDb({ dir: TEMPLATE, port: 54999, database: 'postgres' });
    await t.pg.stop();
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'udm-pgtest-'));
  fs.cpSync(TEMPLATE, dir, { recursive: true, filter: (src) => !/postmaster\.(pid|opts)$/.test(src) });
  const port = 55000 + Math.floor(Math.random() * 5000);
  const { pg: server, url } = await startLocalDb({ dir, port, database: 'udm_test' });
  return {
    url,
    stop: async () => {
      await server.stop();
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* Windows may hold files briefly */ }
    },
  };
}

async function external(adminUrl) {
  const name = `udm_test_${Date.now()}`;
  const admin = new pg.Client(adminUrl);
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    stop: async () => { await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`); await admin.end(); },
  };
}

export default async function setup({ provide }) {
  const db = process.env.TEST_DATABASE_ADMIN_URL ? await external(process.env.TEST_DATABASE_ADMIN_URL) : await embedded();
  await runner({ databaseUrl: db.url, dir: path.resolve('migrations'), direction: 'up', migrationsTable: 'pgmigrations', log: () => {}, checkOrder: true });

  process.env.DATABASE_URL = db.url;
  process.env.NODE_ENV = 'test';
  const { seedLookups } = await import('../seed/lookups.js');
  const { seedDemo } = await import('../seed/demo.js');
  const { pool } = await import('../src/db/index.js');
  const client = new pg.Client(db.url);
  await client.connect();
  await client.query('BEGIN');
  await seedLookups(client);
  await seedDemo(client, { count: 220 });
  await client.query('COMMIT');
  await client.end();
  await pool.end();

  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'udm-uploads-'));
  provide('dbUrl', db.url);
  provide('uploadDir', uploads);
  return async () => {
    await db.stop();
    fs.rmSync(uploads, { recursive: true, force: true });
  };
}
