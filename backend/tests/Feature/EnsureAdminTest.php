<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

it('leaves an existing admin account alone', function () {
    config(['app.admin_email' => 'ADMIN@udmalumni.edu', 'app.admin_password' => 'Different123']);
    $before = DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('password_hash');

    expect(Artisan::call('app:ensure-admin'))->toBe(0)
        ->and(DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('password_hash'))->toBe($before);
});

it('creates a missing admin with ADMIN_PASSWORD that must be changed', function () {
    config(['app.admin_email' => 'office.admin@udmalumni.edu', 'app.admin_password' => 'StartHere123']);

    expect(Artisan::call('app:ensure-admin'))->toBe(0);
    $this->postJson('/api/v1/auth/login', ['identifier' => 'office.admin@udmalumni.edu', 'password' => 'StartHere123'])
        ->assertOk()->assertJsonPath('user.role', 'admin')->assertJsonPath('user.mustChangePassword', true);
    expect(Artisan::call('app:ensure-admin'))->toBe(0)
        ->and(DB::table('user_account')->where('email', 'office.admin@udmalumni.edu')->count())->toBe(1);
});

it('fails when the admin is missing and ADMIN_PASSWORD is unset or weak', function (?string $password) {
    config(['app.admin_email' => 'office.admin@udmalumni.edu', 'app.admin_password' => $password]);

    expect(Artisan::call('app:ensure-admin'))->toBe(1)
        ->and(Artisan::output())->toContain('Set ADMIN_PASSWORD')
        ->and(DB::table('user_account')->where('email', 'office.admin@udmalumni.edu')->exists())->toBeFalse();
})->with(['unset' => [null], 'weak' => ['short']]);
