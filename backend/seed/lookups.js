// Lookups for every environment (including production): COLLEGE, PROGRAM, SKILL, APP_SETTING defaults and the
// first SURVEY_CYCLE. Idempotent: upserts by code / name / key and never overwrites settings an admin changed.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { COLLEGES, FIRST_CYCLE, SKILLS, degreeLevel } from './catalog.js';
import { DEFAULT_SETTINGS } from '../src/services/settings.js';

export async function seedLookups(db) {
  for (const [i, c] of COLLEGES.entries()) {
    const { rows: [col] } = await db.query(
      `INSERT INTO college (code, name, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order RETURNING college_id`,
      [c.code, c.name, c.code === 'OTH' ? 99 : i],
    );
    for (const [abbr, name] of c.programs) {
      await db.query(
        `INSERT INTO program (college_id, code, abbr, name, degree_level) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET abbr = EXCLUDED.abbr, name = EXCLUDED.name, college_id = EXCLUDED.college_id, degree_level = EXCLUDED.degree_level`,
        [col.college_id, `${c.code}-${abbr}`, abbr, name, degreeLevel(name)],
      );
    }
  }
  for (const [name, category] of SKILLS) {
    await db.query('INSERT INTO skill (name, category) VALUES ($1, $2) ON CONFLICT (lower(name)) DO NOTHING', [name, category]);
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query('INSERT INTO app_setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, JSON.stringify(value)]);
  }
  const { rows } = await db.query('SELECT 1 FROM survey_cycle LIMIT 1');
  if (!rows.length) {
    await db.query('INSERT INTO survey_cycle (label, opens_on, closes_on, status) VALUES ($1, $2, $3, $4)',
      [FIRST_CYCLE.label, FIRST_CYCLE.opens_on, FIRST_CYCLE.closes_on, FIRST_CYCLE.status]);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pool, tx } = await import('../src/db/index.js');
  await tx(seedLookups);
  const { rows: [n] } = await pool.query('SELECT (SELECT count(*) FROM college) AS colleges, (SELECT count(*) FROM program) AS programs, (SELECT count(*) FROM skill) AS skills');
  console.log(`Lookups seeded: ${n.colleges} colleges, ${n.programs} programs, ${n.skills} skills.`);
  await pool.end();
}
