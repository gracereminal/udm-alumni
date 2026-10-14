// pg pool + transaction helper. Queries stay as plain SQL so the stat definitions remain visible.
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

// DATE stays 'YYYY-MM-DD' (no local-midnight Date objects); numeric/bigint become JS numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v)));

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: config.DB_POOL_MAX });
pool.on('error', (err) => logger.error({ err }, 'idle pg client error'));

export const query = (text, params) => pool.query(text, params);
export const one = async (text, params, db = pool) => (await db.query(text, params)).rows[0] || null;
export const many = async (text, params, db = pool) => (await db.query(text, params)).rows;

/** Run fn(client) inside BEGIN/COMMIT; rolls back on any error. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
