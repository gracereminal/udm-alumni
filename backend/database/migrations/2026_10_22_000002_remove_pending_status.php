<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// No more pending state: accounts are active and records verified from the start. Existing pending rows are
// promoted, and CHECK constraints keep 'pending' out (the enum value stays: dropping it would mean rebuilding the views).
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
            UPDATE user_account SET account_status = 'active' WHERE account_status = 'pending';
            UPDATE alumnus SET verification_status = 'verified' WHERE verification_status = 'pending';
            ALTER TABLE alumnus ALTER COLUMN verification_status SET DEFAULT 'verified';
            ALTER TABLE user_account ADD CONSTRAINT user_account_not_pending CHECK (account_status <> 'pending');
            ALTER TABLE alumnus ADD CONSTRAINT alumnus_not_pending CHECK (verification_status <> 'pending');
            SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            ALTER TABLE alumnus DROP CONSTRAINT IF EXISTS alumnus_not_pending;
            ALTER TABLE user_account DROP CONSTRAINT IF EXISTS user_account_not_pending;
            ALTER TABLE alumnus ALTER COLUMN verification_status SET DEFAULT 'pending';
            SQL);
    }
};
