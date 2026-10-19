<?php

namespace Database\Seeders;

use App\Services\SettingsService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Lookups for every environment, production included: college, program, skill, app_setting defaults and the first
 * survey_cycle. Idempotent: upserts by code / name / key, and never overwrites a setting an admin changed.
 */
class LookupSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = require __DIR__.'/data/catalog.php';

        DB::transaction(function () use ($catalog) {
            foreach ($catalog['colleges'] as $i => $c) {
                $collegeId = DB::selectOne(
                    'INSERT INTO college (code, name, sort_order) VALUES (?, ?, ?)
                     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
                     RETURNING college_id',
                    [$c['code'], $c['name'], $c['code'] === 'OTH' ? 99 : $i],
                )->college_id;

                foreach ($c['programs'] as [$abbr, $name]) {
                    DB::insert(
                        'INSERT INTO program (college_id, code, abbr, name, degree_level) VALUES (?, ?, ?, ?, ?::degree_level)
                         ON CONFLICT (code) DO UPDATE SET college_id = EXCLUDED.college_id, abbr = EXCLUDED.abbr,
                           name = EXCLUDED.name, degree_level = EXCLUDED.degree_level',
                        [$collegeId, "{$c['code']}-{$abbr}", $abbr, $name, self::degreeLevel($name)],
                    );
                }
            }

            foreach ($catalog['skills'] as [$name, $category]) {
                DB::insert('INSERT INTO skill (name, category) VALUES (?, ?) ON CONFLICT (lower(name)) DO NOTHING', [$name, $category]);
            }

            foreach (SettingsService::DEFAULTS as $key => $value) {
                DB::insert('INSERT INTO app_setting (key, value) VALUES (?, ?::jsonb) ON CONFLICT (key) DO NOTHING', [$key, json_encode($value)]);
            }

            if (! DB::table('survey_cycle')->exists()) {
                $cycle = $catalog['first_cycle'];
                DB::insert(
                    'INSERT INTO survey_cycle (name, status, opens_at, closes_at) VALUES (?, ?::cycle_status, ?, ?)',
                    [$cycle['name'], $cycle['status'], $cycle['opens_at'], $cycle['closes_at']],
                );
            }
        });

        $this->command->info(sprintf(
            'Lookups seeded: %d colleges, %d programs, %d skills.',
            DB::table('college')->count(), DB::table('program')->count(), DB::table('skill')->count(),
        ));
    }

    public static function degreeLevel(string $name): string
    {
        return match (true) {
            (bool) preg_match('/^Doctor (of|in)|PhD/', $name) => 'doctorate',
            str_starts_with($name, 'Master') => 'master',
            str_starts_with($name, 'Juris Doctor') => 'professional',
            default => 'bachelor',
        };
    }
}
