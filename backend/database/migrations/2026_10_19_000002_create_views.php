<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Stat views (plan-backend "Views"). Every stat and report query sums these, so screens agree by construction.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/002_views.sql')));
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP VIEW IF EXISTS v_job_stats, v_event_stats, v_alumni_dashboard, v_directory, v_unresponsive,
              v_records_counters, v_stats_grain, v_alumni_current, v_active_cycle;
            DROP FUNCTION IF EXISTS app_setting_int(text, int);
            SQL);
    }
};
