// Local development / test Postgres 16 without a system install (uses the embedded-postgres binaries).
// Usage: npm run db:local            -> keeps a cluster in backend/.pgdata running on port 5433
//        startLocalDb({ dir, port })  -> used by the test setup for a throwaway cluster
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function startLocalDb({ dir = path.join(root, '.pgdata'), port = 5433, database = 'udm_alumni', persistent = true } = {}) {
  // UTF8 like production (Windows would otherwise default to the WIN1252 code page).
  const pg = new EmbeddedPostgres({
    databaseDir: dir, user: 'postgres', password: 'postgres', port, persistent, onLog: () => {},
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });
  if (!existsSync(path.join(dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase(database); } catch { /* already exists */ }
  return { pg, url: `postgres://postgres:postgres@localhost:${port}/${database}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pg, url } = await startLocalDb();
  console.log(`Postgres 16 running. DATABASE_URL=${url}\nPress Ctrl+C to stop.`);
  const stop = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
