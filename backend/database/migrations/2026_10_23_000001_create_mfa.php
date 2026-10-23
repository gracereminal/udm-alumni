<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Two-step verification at sign-in: emailed login codes and trusted devices. The SQL lives in database/sql/005_mfa.sql.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/005_mfa.sql')));
    }

    public function down(): void
    {
        DB::unprepared('DROP TABLE IF EXISTS trusted_device, login_challenge CASCADE;');
    }
};
