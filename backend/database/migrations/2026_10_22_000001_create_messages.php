<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// In-portal Messages: threads, messages and read marks. The SQL lives in database/sql/003_messages.sql.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/003_messages.sql')));
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TABLE IF EXISTS message_read, message, message_thread CASCADE;
            DROP TYPE IF EXISTS message_channel;
            SQL);
    }
};
