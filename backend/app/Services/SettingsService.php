<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/** app_setting: tunables that are data, not code (targets, outreach interval, retention). */
class SettingsService
{
    public const DEFAULTS = [
        'coverage_target' => 60,                // % traced per batch
        'employment_target' => 80,              // % (Reports, dashboards)
        'outreach_interval_days' => 7,          // the client warns when an alumnus was contacted within N days
        'employment_rate_excludes_further_studies' => true, // open question in plan-backend; labour force = traced - further studies
        'notification_retention_days' => 90,
        'new_registration_days' => 14,          // "New registration" window in the outreach list
    ];

    /** @return array<string, mixed> every setting, with defaults for keys not stored yet */
    public function all(): array
    {
        $stored = DB::table('app_setting')->pluck('value', 'key')
            ->map(fn (string $json) => json_decode($json, true))
            ->all();

        return array_merge(self::DEFAULTS, $stored);
    }

    public function get(string $key): mixed
    {
        return $this->all()[$key] ?? null;
    }

    /**
     * Stores the given keys (known keys only; callers validate the values).
     *
     * @param  array<string, mixed>  $values
     */
    public function put(array $values, ?int $userId): void
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $key => $value) {
            $value = is_numeric($value) ? $value + 0 : $value;
            DB::table('app_setting')->upsert(['key' => $key, 'value' => json_encode($value), 'updated_by' => $userId], ['key'], ['value', 'updated_by']);
        }
    }
}
