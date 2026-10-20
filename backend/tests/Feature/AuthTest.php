<?php

use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

it('signs in each role by email and returns the user payload with an HttpOnly cookie', function (string $email, string $role, ?string $college) {
    $response = $this->postJson('/api/v1/auth/login', ['identifier' => $email, 'password' => 'demoPass123'])
        ->assertOk()
        ->assertJsonPath('user.role', $role)
        ->assertJsonPath('user.email', $email)
        ->assertJsonPath('user.college', $college)
        ->assertJsonMissingPath('user.password_hash');

    $cookie = $response->getCookie('udm_sid', false);
    expect($cookie)->not->toBeNull()
        ->and($cookie->isHttpOnly())->toBeTrue()
        ->and($cookie->getSameSite())->toBe('lax')
        ->and($cookie->getPath())->toBe('/')
        ->and(strlen($cookie->getValue()))->toBe(43)
        // Only the hash is stored.
        ->and(DB::table('auth_session')->where('session_hash', hash('sha256', $cookie->getValue()))->exists())->toBeTrue()
        ->and(DB::table('auth_session')->where('session_hash', $cookie->getValue())->exists())->toBeFalse();
})->with([
    ['maria.delacruz@udmalumni.edu', 'alumni', null],
    ['ccs.dean@udmalumni.edu', 'dept', 'College of Computing Studies'],
    ['admin@udmalumni.edu', 'admin', null],
]);

it('signs alumni in by Alumni ID or membership ID, in any case', function (string $identifier) {
    $this->postJson('/api/v1/auth/login', ['identifier' => $identifier, 'password' => 'demoPass123'])
        ->assertOk()
        ->assertJsonPath('user.email', 'maria.delacruz@udmalumni.edu')
        ->assertJsonPath('user.studentNo', '24-05-567')
        ->assertJsonPath('user.membershipId', 'AM-2024-00567');
})->with(['24-05-567', 'AM-2024-00567', 'am-2024-00567', ' MARIA.DELACRUZ@udmalumni.edu ']);

it('returns the signed-in user from /auth/session, and 401 without a session', function () {
    $token = signIn('admin@udmalumni.edu');

    withSession($token)->getJson('/api/v1/auth/session')->assertOk()->assertJsonPath('user.role', 'admin')->assertJsonPath('user.initials', 'SA');
    withSession('')->getJson('/api/v1/auth/session')->assertUnauthorized()->assertJsonPath('code', 'unauthenticated');
    withSession('not-a-real-session')->getJson('/api/v1/auth/session')->assertUnauthorized();
});

it('gives an unknown account and a wrong password the same answer, and audits both', function () {
    $unknown = $this->postJson('/api/v1/auth/login', ['identifier' => 'nobody@example.com', 'password' => 'demoPass123']);
    $wrong = $this->postJson('/api/v1/auth/login', ['identifier' => 'admin@udmalumni.edu', 'password' => 'wrongPass123']);

    $unknown->assertUnauthorized()->assertJsonPath('error', AuthController::INVALID);
    $wrong->assertUnauthorized()->assertJsonPath('error', AuthController::INVALID);
    expect($unknown->json('code'))->toBe($wrong->json('code'))
        ->and(DB::table('audit_log')->where('action', 'login_failed')->count())->toBe(2);
});

it('validates the sign-in body with the client messages', function () {
    $this->postJson('/api/v1/auth/login', [])
        ->assertStatus(422)
        ->assertJsonPath('fields.identifier', 'Enter your email or Alumni ID.')
        ->assertJsonPath('fields.password', 'Enter your password.');
});

it('refuses a pending account, but says so only after the password matches', function () {
    $this->postJson('/api/v1/auth/login', ['identifier' => 'paolo.mendoza@gmail.com', 'password' => 'wrongPass123'])
        ->assertUnauthorized()
        ->assertJsonPath('error', AuthController::INVALID);

    $this->postJson('/api/v1/auth/login', ['identifier' => 'paolo.mendoza@gmail.com', 'password' => 'demoPass123'])
        ->assertForbidden()
        ->assertJsonPath('code', 'account_pending')
        ->assertJsonPath('error', AuthController::PENDING)
        ->assertCookieMissing('udm_sid');

    expect(DB::table('auth_session')->join('user_account', 'user_account.user_id', '=', 'auth_session.user_id')
        ->where('email', 'paolo.mendoza@gmail.com')->exists())->toBeFalse();
});

it('signs Paolo in once an admin approves the account', function () {
    DB::table('user_account')->where('email', 'paolo.mendoza@gmail.com')->update(['account_status' => 'active']);

    $this->postJson('/api/v1/auth/login', ['identifier' => 'paolo.mendoza@gmail.com', 'password' => 'demoPass123'])
        ->assertOk()
        ->assertJsonPath('user.role', 'alumni')
        ->assertJsonPath('user.membershipId', 'AM-2026-N0001');
});

it('revokes the session on logout, so the old cookie gets 401 at once', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');
    withSession($token)->getJson('/api/v1/auth/session')->assertOk();

    withSession($token)->postJson('/api/v1/auth/logout')->assertOk()->assertJson(['ok' => true]);

    withSession($token)->getJson('/api/v1/auth/session')->assertUnauthorized();
    expect(DB::table('auth_session')->where('session_hash', hash('sha256', $token))->value('revoked_at'))->not->toBeNull();
});

it('signs a disabled account out at once and refuses to sign it in', function () {
    $token = signIn('ccs.dean@udmalumni.edu');
    DB::table('user_account')->where('email', 'ccs.dean@udmalumni.edu')->update(['account_status' => 'disabled']);

    withSession($token)->getJson('/api/v1/auth/session')->assertUnauthorized();
    $this->postJson('/api/v1/auth/login', ['identifier' => 'ccs.dean@udmalumni.edu', 'password' => 'demoPass123'])
        ->assertUnauthorized()->assertJsonPath('error', AuthController::INVALID);
});

// Expiry is computed with the database clock, so the tests age the rows instead of travelling in time.
it('expires idle and old sessions', function () {
    $token = signIn('admin@udmalumni.edu');
    DB::table('auth_session')->where('session_hash', hash('sha256', $token))->update(['last_seen_at' => DB::raw("now() - interval '11 hours'")]);
    withSession($token)->getJson('/api/v1/auth/session')->assertOk(); // slides the idle window
    expect(DB::table('auth_session')->where('session_hash', hash('sha256', $token))->value(DB::raw("last_seen_at > now() - interval '1 minute'")))->toBeTrue();

    DB::table('auth_session')->where('session_hash', hash('sha256', $token))->update(['last_seen_at' => DB::raw("now() - interval '13 hours'")]);
    withSession($token)->getJson('/api/v1/auth/session')->assertUnauthorized();

    $token = signIn('admin@udmalumni.edu');
    DB::table('auth_session')->where('session_hash', hash('sha256', $token))->update(['expires_at' => now()->subMinute()]);
    withSession($token)->getJson('/api/v1/auth/session')->assertUnauthorized();
});

it('locks an account after repeated failures, even for the right password', function () {
    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', ['identifier' => 'admin@udmalumni.edu', 'password' => 'wrongPass123'])->assertUnauthorized();
    }

    $this->postJson('/api/v1/auth/login', ['identifier' => 'admin@udmalumni.edu', 'password' => 'demoPass123'])
        ->assertUnauthorized()
        ->assertJsonPath('code', 'account_locked');

    expect(DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value(DB::raw("locked_until BETWEEN now() + interval '14 minutes' AND now() + interval '15 minutes'")))->toBeTrue();

    DB::table('user_account')->where('email', 'admin@udmalumni.edu')->update(['locked_until' => DB::raw("now() - interval '1 minute'")]);
    $this->postJson('/api/v1/auth/login', ['identifier' => 'admin@udmalumni.edu', 'password' => 'demoPass123'])->assertOk();
    expect(DB::table('user_account')->where('email', 'admin@udmalumni.edu')->first(['failed_login_count', 'locked_until']))
        ->failed_login_count->toBe(0)
        ->locked_until->toBeNull();
});

it('rate-limits the auth routes per IP', function () {
    config(['auth.rate_limit_per_minute' => 3]);
    foreach (range(1, 3) as $_) {
        $this->postJson('/api/v1/auth/login', ['identifier' => 'x@example.com', 'password' => 'x'])->assertUnauthorized();
    }

    $this->postJson('/api/v1/auth/login', ['identifier' => 'x@example.com', 'password' => 'x'])
        ->assertStatus(429)
        ->assertJsonPath('code', 'rate_limited');
});

it('rejects state-changing requests without X-Requested-With', function () {
    $this->withoutHeader('X-Requested-With')
        ->postJson('/api/v1/auth/login', ['identifier' => 'admin@udmalumni.edu', 'password' => 'demoPass123'])
        ->assertForbidden()
        ->assertJsonPath('code', 'csrf');

    $this->withoutHeader('X-Requested-With')->getJson('/api/v1/health')->assertOk();
});

it('sends the security headers', function () {
    $this->getJson('/api/v1/health')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Content-Security-Policy');
});

it('guards routes by role: 401 signed out, 403 wrong role', function () {
    Route::middleware(['api', 'role:admin,dept'])->get('/api/v1/_test/staff', fn () => ['ok' => true]);

    withSession('')->getJson('/api/v1/_test/staff')->assertUnauthorized();
    withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/_test/staff')->assertForbidden();
    withSession(signIn('ccs.dean@udmalumni.edu'))->getJson('/api/v1/_test/staff')->assertOk();
    withSession(signIn('admin@udmalumni.edu'))->getJson('/api/v1/_test/staff')->assertOk();
});

it('changes the password, keeps this session and signs out the others', function () {
    $other = signIn('maria.delacruz@udmalumni.edu');
    $current = signIn('maria.delacruz@udmalumni.edu');

    withSession($current)->postJson('/api/v1/auth/change-password', ['current' => 'nope', 'password' => 'NewPass123'])
        ->assertStatus(422)->assertJsonPath('fields.current', 'Your current password is incorrect.');
    withSession($current)->postJson('/api/v1/auth/change-password', ['current' => 'demoPass123', 'password' => 'short'])
        ->assertStatus(422)->assertJsonPath('fields.password', 'Use at least 8 characters, including 1 number and 1 uppercase letter.');

    withSession($current)->postJson('/api/v1/auth/change-password', ['current' => 'demoPass123', 'password' => 'NewPass123'])->assertOk();

    withSession($current)->getJson('/api/v1/auth/session')->assertOk();
    withSession($other)->getJson('/api/v1/auth/session')->assertUnauthorized();
    signIn('maria.delacruz@udmalumni.edu', 'NewPass123');
});

it('requires a session to change the password', function () {
    withSession('')->postJson('/api/v1/auth/change-password', ['current' => 'demoPass123', 'password' => 'NewPass123'])->assertUnauthorized();
});

it('stores argon2id hashes and upgrades a bcrypt hash at sign-in', function () {
    $email = 'admin@udmalumni.edu';
    expect(DB::table('user_account')->where('email', $email)->value('password_hash'))->toStartWith('$argon2id$');

    DB::table('user_account')->where('email', $email)->update(['password_hash' => password_hash('demoPass123', PASSWORD_BCRYPT)]);
    $this->postJson('/api/v1/auth/login', ['identifier' => $email, 'password' => 'demoPass123'])->assertOk();

    expect(DB::table('user_account')->where('email', $email)->value('password_hash'))->toStartWith('$argon2id$');
});
