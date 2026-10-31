<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Security questions for two-step verification. The SQL lives in database/sql/006_security_questions.sql.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/006_security_questions.sql')));
    }

    public function down(): void
    {
        DB::unprepared('DROP TABLE IF EXISTS security_answer CASCADE;');
    }
};
