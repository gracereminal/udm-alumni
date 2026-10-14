// APP_SETTING: tunables that used to be literals in the UI (targets, outreach interval, ...).
import { many, pool } from '../db/index.js';

export const DEFAULT_SETTINGS = {
  employment_target: 80,          // % (Reports, dashboards)
  coverage_target: 60,            // % traced per batch
  outreach_interval_days: 7,      // one outreach email per alumnus per N days
  employment_rate_excludes_further_studies: true, // labour force = traced − further studies
  notification_retention_days: 90,
  new_registration_days: 14,      // "New registration" window in the outreach list
};

export async function getSettings(db = pool) {
  const rows = await many('SELECT key, value FROM app_setting', [], db);
  const out = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => { out[r.key] = r.value; });
  return out;
}

export async function putSettings(db, patch, userId) {
  for (const [key, value] of Object.entries(patch)) {
    await db.query(
      `INSERT INTO app_setting (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [key, JSON.stringify(value), userId],
    );
  }
}
