// Scheduled jobs, triggered by the host's cron through POST /api/v1/internal/jobs/:name (no in-process timers:
// instances may sleep or run as several copies). Each job is idempotent.
import { many, tx } from '../db/index.js';
import { deptIds, notify } from '../services/notifications.js';
import { getSettings } from '../services/settings.js';

/** coverage-alerts (daily): college users get one alert per batch below the coverage target, per cycle and day-week. */
export async function coverageAlerts() {
  return tx(async (db) => {
    const s = await getSettings(db);
    const target = Number(s.coverage_target);
    const cycle = (await many('SELECT cycle_id FROM v_active_cycle', [], db))[0];
    if (!cycle) return { alerts: 0 };
    const rows = await many(
      `SELECT g.college_id, c.name AS college_name, g.batch, sum(g.total)::int AS total, sum(g.traced)::int AS traced
         FROM v_stats_grain g JOIN college c ON c.college_id = g.college_id
        WHERE g.batch >= extract(year FROM app_today())::int - 4
        GROUP BY 1, 2, 3 HAVING sum(g.total) > 0 AND sum(g.traced)::numeric / sum(g.total) * 100 < $1`, [target], db,
    );
    // ISO week in the key: at most one reminder per college + batch per week.
    const week = (await many(`SELECT to_char(app_today(), 'IYYY-IW') AS w`, [], db))[0].w;
    let alerts = 0;
    for (const r of rows) {
      const rate = (r.traced / r.total) * 100;
      alerts += await notify(db, await deptIds(db, r.college_id), {
        type: 'coverage_alert', link: 'outreach', dedupeKey: `coverage_low:${cycle.cycle_id}:${r.college_id}:${r.batch}:${week}`,
        title: `Batch ${r.batch} coverage below target`,
        message: `${rate.toFixed(1)}% traced (${r.traced} of ${r.total}) vs the ${target}% target. Send survey reminders to alumni who haven't responded.`,
      });
    }
    return { alerts, batchesBelowTarget: rows.length };
  });
}

/** notification-retention (daily): delete read notifications older than the retention window (default 90 days). */
export async function notificationRetention() {
  return tx(async (db) => {
    const s = await getSettings(db);
    const r = await db.query('DELETE FROM notification WHERE read_at IS NOT NULL AND read_at < now() - make_interval(days => $1)', [Number(s.notification_retention_days)]);
    return { deleted: r.rowCount };
  });
}

/** token-cleanup (daily): expired password resets and expired / revoked sessions. */
export async function tokenCleanup() {
  return tx(async (db) => {
    const resets = await db.query("DELETE FROM password_reset WHERE expires_at < now() - interval '1 day' OR used_at < now() - interval '1 day'");
    const sessions = await db.query("DELETE FROM auth_session WHERE expires_at < now() OR revoked_at < now() - interval '1 day' OR last_seen_at < now() - interval '30 days'");
    return { resets: resets.rowCount, sessions: sessions.rowCount };
  });
}

export const JOBS = { 'coverage-alerts': coverageAlerts, 'notification-retention': notificationRetention, 'token-cleanup': tokenCleanup };
