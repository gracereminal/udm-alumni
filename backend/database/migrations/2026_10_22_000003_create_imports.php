<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// AI Data Management: masterlist import batches and their rows. The SQL lives in database/sql/004_imports.sql.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/004_imports.sql')));
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TABLE IF EXISTS import_row, import_batch CASCADE;
            DROP TYPE IF EXISTS import_status;
            ALTER TABLE user_account DROP COLUMN IF EXISTS temp_password_expires_at;
            SQL);
    }
};
