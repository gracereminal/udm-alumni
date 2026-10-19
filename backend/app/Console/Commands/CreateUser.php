<?php

namespace App\Console\Commands;

use App\Services\AccountService;
use App\Services\AuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Creates a staff account (admin or college) with a one-time password that must be changed at first sign-in.
 * Production users are created this way, never seeded.
 *
 *   php artisan app:create-user --role=admin --email=registrar@udm.edu.ph --name="Registrar"
 *   php artisan app:create-user --role=dept --college=CCS --email=ccs.dean@udm.edu.ph --name="Dr. Santos"
 */
class CreateUser extends Command
{
    protected $signature = 'app:create-user
        {--role=admin : admin or dept}
        {--email= : sign-in email}
        {--name= : display name (defaults to the part of the email before @)}
        {--college= : college code, required for --role=dept (e.g. CCS)}
        {--label= : role label shown in the top bar (e.g. College Dean)}';

    protected $description = 'Create an admin or college staff account with a one-time password';

    public function handle(AuditService $audit): int
    {
        $role = (string) $this->option('role');
        $email = trim((string) $this->option('email'));
        if (! in_array($role, ['admin', 'dept'], true)) {
            $this->error('--role must be admin or dept (alumni register themselves).');

            return self::FAILURE;
        }
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('--email must be a valid email address.');

            return self::FAILURE;
        }
        if (DB::table('user_account')->whereRaw('lower(email) = lower(?)', [$email])->exists()) {
            $this->error("An account with {$email} already exists.");

            return self::FAILURE;
        }

        $collegeId = null;
        if ($role === 'dept') {
            $collegeId = DB::table('college')->where('code', strtoupper((string) $this->option('college')))->value('college_id');
            if ($collegeId === null) {
                $this->error('--college must be a college code from the catalog (e.g. CCS) for a dept account.');

                return self::FAILURE;
            }
        }

        $password = AccountService::oneTimePassword();
        $name = trim((string) $this->option('name')) ?: explode('@', $email)[0];
        $userId = DB::transaction(function () use ($email, $role, $collegeId, $name, $password, $audit) {
            $id = (int) DB::table('user_account')->insertGetId([
                'email' => $email, 'password_hash' => Hash::make($password), 'role' => $role, 'college_id' => $collegeId,
                'display_name' => $name, 'role_label' => $this->option('label') ?: null, 'must_change_password' => true,
            ], 'user_id');
            $audit->log('user_created', 'user', $id, null, ['role' => $role, 'via' => 'app:create-user']);

            return $id;
        });

        $this->info("Created {$role} account #{$userId} for {$email}.");
        $this->line("One-time password: {$password}");
        $this->line('It is shown only once. The user must change it at first sign-in.');

        return self::SUCCESS;
    }
}
