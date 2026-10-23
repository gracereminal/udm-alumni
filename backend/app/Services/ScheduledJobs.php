<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Daily jobs, run by Artisan commands (app:coverage-alerts, app:notification-retention, app:token-cleanup) from the
 * host's cron or POST /internal/jobs/:name. No queue worker or in-process timers. Each job is idempotent.
 */
class ScheduledJobs
{
    public const NAMES = ['coverage-alerts', 'notification-retention', 'token-cleanup'];

    public function __construct(
        private readonly NotificationService $notifications,
        private readonly SettingsService $settings,
    ) {}

    /** @return array<string, int> */
    public function run(string $name): array
    {
        return match ($name) {
            'coverage-alerts' => $this->coverageAlerts(),
            'notification-retention' => $this->notificationRetention(),
            'token-cleanup' => $this->tokenCleanup(),
            default => throw new InvalidArgumentException("Unknown job: {$name}"),
        };
    }

    /**
     * College users get one alert per recent batch below the coverage target, at most once per batch and ISO week.
     *
     * @return array{alerts: int, batchesBelowTarget: int}
     */
    public function coverageAlerts(): array
    {
        return DB::transaction(function () {
            $cycle = DB::selectOne('SELECT cycle_id FROM v_active_cycle');
            if ($cycle === null) {
                return ['alerts' => 0, 'batchesBelowTarget' => 0];
            }
            $target = (float) $this->settings->get('coverage_target');
            $rows = DB::select(
                'SELECT g.college_id, g.batch, sum(g.total)::int AS total, sum(g.traced)::int AS traced
                   FROM v_stats_grain g
                  WHERE g.batch >= extract(year FROM app_today())::int - 4
                  GROUP BY 1, 2 HAVING sum(g.total) > 0 AND sum(g.traced)::numeric / sum(g.total) * 100 < ?
                  ORDER BY 1, 2',
                [$target],
            );
            $week = DB::selectOne("SELECT to_char(app_today(), 'IYYY-IW') AS w")->w;
            $t = rtrim(rtrim(number_format($target, 1, '.', ''), '0'), '.');
            $alerts = 0;
            foreach ($rows as $r) {
                $alerts += $this->notifications->notify(
                    $this->notifications->deptIds((int) $r->college_id), 'coverage_alert',
                    "Batch {$r->batch} coverage below target",
                    sprintf('%.1f%% traced (%d of %d) vs the %s%% target. Send survey reminders to alumni who haven\'t responded.', $r->traced / $r->total * 100, $r->traced, $r->total, $t),
                    'outreach', "coverage_low:{$cycle->cycle_id}:{$r->college_id}:{$r->batch}:{$week}",
                );
            }

            return ['alerts' => $alerts, 'batchesBelowTarget' => count($rows)];
        });
    }

    /**
     * Deletes read notifications older than the retention window (default 90 days).
     *
     * @return array{deleted: int}
     */
    public function notificationRetention(): array
    {
        $days = (int) $this->settings->get('notification_retention_days');

        return ['deleted' => DB::delete('DELETE FROM notification WHERE read_at IS NOT NULL AND read_at < now() - make_interval(days => ?)', [$days])];
    }

    /**
     * Expired or used password resets and login codes, expired / revoked / long-idle sessions, and expired or revoked
     * trusted devices.
     *
     * @return array{resets: int, sessions: int, challenges: int, devices: int}
     */
    public function tokenCleanup(): array
    {
        return [
            'resets' => DB::delete("DELETE FROM password_reset WHERE expires_at < now() - interval '1 day' OR used_at < now() - interval '1 day'"),
            'sessions' => DB::delete("DELETE FROM auth_session WHERE expires_at < now() OR revoked_at < now() - interval '1 day' OR last_seen_at < now() - interval '30 days'"),
            'challenges' => DB::delete("DELETE FROM login_challenge WHERE expires_at < now() - interval '1 day' OR used_at < now() - interval '1 day'"),
            'devices' => DB::delete("DELETE FROM trusted_device WHERE expires_at < now() OR revoked_at < now() - interval '1 day'"),
        ];
    }
}
