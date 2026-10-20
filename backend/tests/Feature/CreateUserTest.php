<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

it('creates a college account with a one-time password that must be changed', function () {
    $exit = Artisan::call('app:create-user', ['--role' => 'dept', '--college' => 'cet', '--email' => 'cet.staff@udm.edu.ph', '--name' => 'CET Staff']);
    preg_match('/One-time password: (\S+)/', Artisan::output(), $m);

    $user = DB::table('user_account as u')->join('college as c', 'c.college_id', '=', 'u.college_id')
        ->where('u.email', 'cet.staff@udm.edu.ph')->first(['u.role', 'u.must_change_password', 'c.code']);
    expect($exit)->toBe(0)
        ->and($m[1] ?? null)->toMatch('/^(?=.*\d)(?=.*[A-Z]).{16}$/')
        ->and($user->role)->toBe('dept')
        ->and($user->code)->toBe('CET')
        ->and($user->must_change_password)->toBeTrue();

    $token = $this->postJson('/api/v1/auth/login', ['identifier' => 'cet.staff@udm.edu.ph', 'password' => $m[1]])
        ->assertOk()->assertJsonPath('user.mustChangePassword', true)->getCookie('udm_sid', false)->getValue();
    // Until the one-time password is replaced, only /auth/* works.
    withSession($token)->getJson('/api/v1/notifications')->assertForbidden()->assertJsonPath('code', 'password_change_required');
    withSession($token)->getJson('/api/v1/auth/session')->assertOk();
    withSession($token)->postJson('/api/v1/auth/change-password', ['current' => $m[1], 'password' => 'MyOwnPass123'])->assertOk();
    withSession($token)->getJson('/api/v1/notifications')->assertOk();
    withSession($token)->getJson('/api/v1/auth/session')->assertJsonPath('user.mustChangePassword', false);
});

it('refuses alumni, duplicates and dept accounts without a known college', function (array $args, string $error) {
    expect(Artisan::call('app:create-user', $args))->toBe(1)
        ->and(Artisan::output())->toContain($error);
})->with([
    'alumni role' => [['--role' => 'alumni', '--email' => 'a@example.com'], 'admin or dept'],
    'duplicate' => [['--role' => 'admin', '--email' => 'ADMIN@udmalumni.edu'], 'already exists'],
    'no college' => [['--role' => 'dept', '--email' => 'd@example.com'], 'college code'],
    'bad email' => [['--role' => 'admin', '--email' => 'not-an-email'], 'valid email'],
]);
