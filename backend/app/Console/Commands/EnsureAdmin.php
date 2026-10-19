<?php

namespace App\Console\Commands;

use App\Services\AccountService;
use App\Services\AuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Makes sure the built-in admin account (ADMIN_EMAIL, default admin@udmalumni.edu) exists. Runs on every container
 * start (docker/start.sh). A missing account is created with ADMIN_PASSWORD, which must be changed at first sign-in;
 * an existing account is never touched, so a password changed in the app survives redeploys.
 */
class EnsureAdmin extends Command
{
    protected $signature = 'app:ensure-admin';

    protected $description = 'Create the built-in admin account from ADMIN_EMAIL / ADMIN_PASSWORD if it does not exist';

    public function handle(AuditService $audit): int
    {
        $email = trim((string) config('app.admin_email'));
        $password = (string) config('app.admin_password');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('ADMIN_EMAIL must be a valid email address.');

            return self::FAILURE;
        }
        if (DB::table('user_account')->whereRaw('lower(email) = lower(?)', [$email])->exists()) {
            $this->info("Admin account {$email} exists.");

            return self::SUCCESS;
        }
        if (! AccountService::passwordOk($password)) {
            $this->error("Admin account {$email} is missing. Set ADMIN_PASSWORD (".AccountService::PASSWORD_MESSAGE.')');

            return self::FAILURE;
        }

        $userId = DB::transaction(function () use ($email, $password, $audit) {
            $id = (int) DB::table('user_account')->insertGetId([
                'email' => $email, 'password_hash' => Hash::make($password), 'role' => 'admin',
                'display_name' => 'System Admin', 'role_label' => 'Administrator', 'must_change_password' => true,
            ], 'user_id');
            $audit->log('user_created', 'user', $id, null, ['role' => 'admin', 'via' => 'app:ensure-admin']);

            return $id;
        });

        $this->info("Created admin account #{$userId} for {$email}. Sign in with ADMIN_PASSWORD and change it.");

        return self::SUCCESS;
    }
}
