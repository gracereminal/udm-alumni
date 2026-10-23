<?php

use App\Mail\LoginCodeMail;
use App\Services\MfaService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

const MFA_USER = 'maria.delacruz@udmalumni.edu';

beforeEach(function () {
    config(['auth.mfa.enabled' => true]);
    Mail::fake();
});

/** Signs in with the password and returns [challenge, emailed code]. */
function startMfa(string $identifier = MFA_USER): array
{
    $r = test()->postJson('/api/v1/auth/login', ['identifier' => $identifier, 'password' => 'demoPass123'])->assertOk();

    return [(string) $r->json('challenge'), Mail::sent(LoginCodeMail::class)->last()->code];
}

it('asks for an emailed code instead of signing in, and stores only hashes', function () {
    $r = $this->postJson('/api/v1/auth/login', ['identifier' => MFA_USER, 'password' => 'demoPass123'])
        ->assertOk()
        ->assertJsonPath('mfaRequired', true)
        ->assertJsonPath('sentTo', 'ma***@udmalumni.edu')
        ->assertJsonPath('expiresMinutes', 10)
        ->assertJsonMissingPath('user');

    expect($r->getCookie('udm_sid', false))->toBeNull();
    Mail::assertSent(LoginCodeMail::class, fn (LoginCodeMail $m) => $m->hasTo(MFA_USER) && preg_match('/^\d{6}$/', $m->code) === 1);

    $row = DB::table('login_challenge')->latest('challenge_id')->first();
    $code = Mail::sent(LoginCodeMail::class)->first()->code;
    expect($row->token_hash)->toBe(hash('sha256', $r->json('challenge')))
        ->and($row->code_hash)->not->toContain($code);
});

it('signs in with the right code, once', function () {
    [$challenge, $code] = startMfa();

    $r = $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $code])
        ->assertOk()
        ->assertJsonPath('user.email', MFA_USER);
    $token = (string) $r->getCookie('udm_sid', false)?->getValue();
    withSession($token)->getJson('/api/v1/auth/session')->assertOk();
    expect($r->getCookie('udm_tdev', false))->toBeNull()
        ->and(DB::table('audit_log')->where('action', 'login')->latest('created_at')->value('meta'))->toContain('"mfa"');

    $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $code])
        ->assertStatus(400)->assertJsonPath('code', 'mfa_expired');
});

it('rejects a wrong code and closes the challenge after five', function () {
    [$challenge, $code] = startMfa();
    $wrong = $code === '000000' ? '111111' : '000000';

    foreach (range(1, 4) as $_) {
        $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $wrong])
            ->assertStatus(422)->assertJsonPath('fields.code', MfaService::BAD_CODE);
    }
    $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $wrong])->assertStatus(400)->assertJsonPath('code', 'mfa_expired');
    $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $code])->assertStatus(400);
});

it('expires the code after 10 minutes', function () {
    [$challenge, $code] = startMfa();
    DB::table('login_challenge')->update(['expires_at' => DB::raw("now() - interval '1 second'")]);

    $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $code])->assertStatus(400)->assertJsonPath('error', MfaService::EXPIRED);
});

it('still checks the password first and sends nothing on a wrong one', function () {
    $this->postJson('/api/v1/auth/login', ['identifier' => MFA_USER, 'password' => 'wrongPass123'])->assertUnauthorized();
    Mail::assertNothingSent();
});

it('resends a new code after the cooldown, and the old code stops working', function () {
    [$challenge, $old] = startMfa();

    $this->postJson('/api/v1/auth/mfa/resend', ['challenge' => $challenge])->assertStatus(429)->assertJsonPath('code', 'mfa_resend_wait');

    DB::table('login_challenge')->update(['last_sent_at' => DB::raw("now() - interval '1 minute'")]);
    $this->postJson('/api/v1/auth/mfa/resend', ['challenge' => $challenge])->assertOk()->assertJsonPath('sentTo', 'ma***@udmalumni.edu');
    Mail::assertSent(LoginCodeMail::class, 2);
    $new = Mail::sent(LoginCodeMail::class)->last()->code;

    if ($old !== $new) {
        $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $old])->assertStatus(422);
    }
    $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $new])->assertOk();
});

it('stops resending after three resends', function () {
    [$challenge] = startMfa();
    foreach (range(1, 3) as $_) {
        DB::table('login_challenge')->update(['last_sent_at' => DB::raw("now() - interval '1 minute'")]);
        $this->postJson('/api/v1/auth/mfa/resend', ['challenge' => $challenge])->assertOk();
    }
    DB::table('login_challenge')->update(['last_sent_at' => DB::raw("now() - interval '1 minute'")]);
    $this->postJson('/api/v1/auth/mfa/resend', ['challenge' => $challenge])->assertStatus(429)->assertJsonPath('code', 'mfa_resend_limit');
});

it('skips the code on a trusted device until the password changes', function () {
    [$challenge, $code] = startMfa();
    $device = $this->postJson('/api/v1/auth/mfa/verify', ['challenge' => $challenge, 'code' => $code, 'trust' => true])
        ->assertOk()->getCookie('udm_tdev', false);
    expect($device)->not->toBeNull()
        ->and($device->isHttpOnly())->toBeTrue()
        ->and(DB::table('trusted_device')->where('token_hash', hash('sha256', $device->getValue()))->exists())->toBeTrue();

    $this->withUnencryptedCookie('udm_tdev', $device->getValue())
        ->postJson('/api/v1/auth/login', ['identifier' => MFA_USER, 'password' => 'demoPass123'])
        ->assertOk()->assertJsonPath('user.email', MFA_USER)->assertJsonMissingPath('mfaRequired');

    // The device is trusted for this account only.
    $this->withUnencryptedCookie('udm_tdev', $device->getValue())
        ->postJson('/api/v1/auth/login', ['identifier' => 'admin@udmalumni.edu', 'password' => 'demoPass123'])
        ->assertOk()->assertJsonPath('mfaRequired', true);

    $userId = DB::table('user_account')->where('email', MFA_USER)->value('user_id');
    app(MfaService::class)->forgetDevices($userId);
    $this->withUnencryptedCookie('udm_tdev', $device->getValue())
        ->postJson('/api/v1/auth/login', ['identifier' => MFA_USER, 'password' => 'demoPass123'])
        ->assertOk()->assertJsonPath('mfaRequired', true);
});

it('limits codes per account per 15 minutes', function () {
    foreach (range(1, 5) as $_) {
        startMfa();
    }
    $this->postJson('/api/v1/auth/login', ['identifier' => MFA_USER, 'password' => 'demoPass123'])
        ->assertStatus(429)->assertJsonPath('code', 'mfa_rate_limited');
})->skip(fn () => (int) config('auth.rate_limit_per_minute') < 6, 'the per-IP auth limit is lower than the codes window');

it('answers 503 and keeps no challenge when the email cannot be sent', function () {
    Mail::shouldReceive('to')->andThrow(new RuntimeException('gmail down'));

    $this->postJson('/api/v1/auth/login', ['identifier' => MFA_USER, 'password' => 'demoPass123'])
        ->assertStatus(503)->assertJsonPath('code', 'mfa_send_failed');
    expect(DB::table('login_challenge')->count())->toBe(0);
});

it('renders the shared /emails template with the code and sender', function () {
    $mail = (new LoginCodeMail('Maria', '482913'))->build();
    $html = (new LoginCodeMail('Maria', '482913'))->render();

    expect($html)->toContain('Hi Maria')->toContain('482913')->toContain('10 minutes')
        ->and($mail->subject)->toBe('482913 is your UDM Alumni verification code')
        ->and($mail->from[0])->toBe(['name' => 'UDM Alumni', 'address' => 'no-reply@udmalumni.edu']);
});
