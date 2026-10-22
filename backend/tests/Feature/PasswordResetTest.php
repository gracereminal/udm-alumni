<?php

use App\Mail\GmailTransport;
use App\Mail\PasswordResetMail;
use App\Services\PasswordResetService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

const MARIA = 'maria.delacruz@udmalumni.edu';

/** Requests a reset and returns the emailed [token, code]. */
function requestReset(string $identifier = MARIA): array
{
    Mail::fake();
    test()->postJson('/api/v1/auth/forgot-password', ['identifier' => $identifier])->assertOk();
    $sent = Mail::sent(PasswordResetMail::class)->last();

    return [$sent->token, $sent->code];
}

it('emails a reset link and code, and answers unknown identifiers the same way', function () {
    Mail::fake();

    $known = $this->postJson('/api/v1/auth/forgot-password', ['identifier' => MARIA])->assertOk();
    $unknown = $this->postJson('/api/v1/auth/forgot-password', ['identifier' => 'nobody@example.com'])->assertOk();

    expect($known->json())->toBe($unknown->json())
        ->and($known->json('message'))->toBe(PasswordResetService::SENT);
    Mail::assertSent(PasswordResetMail::class, 1);
    Mail::assertSent(PasswordResetMail::class, fn (PasswordResetMail $m) => $m->hasTo(MARIA) && preg_match('/^\d{6}$/', $m->code) === 1);

    $row = DB::table('password_reset')->latest('reset_id')->first();
    $sent = Mail::sent(PasswordResetMail::class)->first();
    expect($row->token_hash)->toBe(hash('sha256', $sent->token))   // stored only as hashes
        ->and($row->code_hash)->not->toContain($sent->code)
        ->and($row->sent_to)->toBe(MARIA);
});

it('resolves an Alumni ID to the account email', function () {
    Mail::fake();
    $this->postJson('/api/v1/auth/forgot-password', ['identifier' => '24-05-567'])->assertOk();

    Mail::assertSent(PasswordResetMail::class, fn (PasswordResetMail $m) => $m->hasTo(MARIA));
});

it('sends nothing to a disabled account', function () {
    Mail::fake();
    DB::table('user_account')->where('email', 'paolo.mendoza@gmail.com')->update(['account_status' => 'disabled']);
    $this->postJson('/api/v1/auth/forgot-password', ['identifier' => 'paolo.mendoza@gmail.com'])->assertOk()->assertJsonPath('message', PasswordResetService::SENT);

    Mail::assertNothingSent();
});

it('sends at most three reset emails per account per 15 minutes', function () {
    Mail::fake();
    foreach (range(1, 4) as $_) {
        $this->postJson('/api/v1/auth/forgot-password', ['identifier' => MARIA])->assertOk();
    }

    Mail::assertSent(PasswordResetMail::class, 3);
});

it('renders the shared /emails template with the code, link and sender', function () {
    $html = (new PasswordResetMail('Maria', 'tok123', '482913'))->render();
    $mail = (new PasswordResetMail('Maria', 'tok123', '482913'))->build();

    expect($html)->toContain('Hi Maria')
        ->toContain('482 913')
        ->toContain(rtrim(config('app.url'), '/').'/reset-password?token=tok123')
        ->toContain('30 minutes')
        ->and($mail->subject)->toBe('Reset your UDM Alumni portal password')
        ->and($mail->from[0])->toBe(['name' => 'UDM Alumni', 'address' => 'no-reply@udmalumni.edu']);
});

it('verifies the link, resets the password once and signs out every session', function () {
    $session = signIn(MARIA);
    [$token] = requestReset();

    $this->getJson("/api/v1/auth/reset-password/verify?token={$token}")->assertOk()->assertJson(['valid' => true, 'email' => MARIA]);
    $this->getJson('/api/v1/auth/reset-password/verify?token=nope')->assertOk()->assertExactJson(['valid' => false]);

    $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'password' => 'short'])
        ->assertStatus(422)->assertJsonPath('fields.password', 'Use at least 8 characters, including 1 number and 1 uppercase letter.');
    $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'password' => 'BrandNew123'])->assertOk();

    withSession($session)->getJson('/api/v1/auth/session')->assertUnauthorized();
    $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'password' => 'Another123'])
        ->assertStatus(400)->assertJsonPath('code', 'expired');
    $this->getJson("/api/v1/auth/reset-password/verify?token={$token}")->assertExactJson(['valid' => false]);
    signIn(MARIA, 'BrandNew123');
    expect(DB::table('audit_log')->where('action', 'password_reset')->exists())->toBeTrue();
});

it('expires the link after 30 minutes', function () {
    [$token] = requestReset();
    DB::table('password_reset')->update(['expires_at' => DB::raw("now() - interval '1 second'")]);

    $this->getJson("/api/v1/auth/reset-password/verify?token={$token}")->assertExactJson(['valid' => false]);
    $this->postJson('/api/v1/auth/reset-password', ['token' => $token, 'password' => 'BrandNew123'])->assertStatus(400);
});

it('invalidates an earlier reset when a new one is requested', function () {
    [$first] = requestReset();
    [$second] = requestReset();

    $this->getJson("/api/v1/auth/reset-password/verify?token={$first}")->assertExactJson(['valid' => false]);
    $this->getJson("/api/v1/auth/reset-password/verify?token={$second}")->assertJsonPath('valid', true);
});

it('exchanges the right code for a single-use reset session', function () {
    [$token, $code] = requestReset();

    $r = $this->postJson('/api/v1/auth/reset-password/verify-code', ['identifier' => '24-05-567', 'code' => substr($code, 0, 3).' '.substr($code, 3)])
        ->assertOk()->assertJsonPath('email', MARIA);

    // The emailed link no longer works; only the new reset session does.
    $this->getJson("/api/v1/auth/reset-password/verify?token={$token}")->assertExactJson(['valid' => false]);
    $this->postJson('/api/v1/auth/reset-password', ['resetSession' => $r->json('resetSession'), 'password' => 'ViaCode123'])->assertOk();
    signIn(MARIA, 'ViaCode123');
});

it('locks the code after five wrong attempts', function () {
    [, $code] = requestReset();
    $wrong = $code === '000000' ? '111111' : '000000';

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/reset-password/verify-code', ['identifier' => MARIA, 'code' => $wrong])
            ->assertStatus(422)->assertJsonPath('fields.code', PasswordResetService::BAD_CODE);
    }

    $this->postJson('/api/v1/auth/reset-password/verify-code', ['identifier' => MARIA, 'code' => $code])->assertStatus(422);
});

it('answers a code for an unknown account like a wrong code', function () {
    $this->postJson('/api/v1/auth/reset-password/verify-code', ['identifier' => 'nobody@example.com', 'code' => '123456'])
        ->assertStatus(422)->assertJsonPath('error', PasswordResetService::BAD_CODE);
});

it('sends through the Gmail API with OAuth, and keeps the generic answer when sending fails', function () {
    config([
        'mail.default' => 'gmail',
        'services.google' => ['client_id' => 'cid', 'client_secret' => 'secret', 'refresh_token' => 'refresh'],
    ]);
    Http::fake([
        GmailTransport::TOKEN_URL => Http::response(['access_token' => 'access-1', 'expires_in' => 3599]),
        GmailTransport::SEND_URL => Http::sequence()->push(['id' => 'm1'])->push(['error' => 'quota'], 500),
    ]);

    $this->postJson('/api/v1/auth/forgot-password', ['identifier' => MARIA])->assertOk();

    Http::assertSent(fn ($req) => $req->url() === GmailTransport::TOKEN_URL && $req['grant_type'] === 'refresh_token' && $req['refresh_token'] === 'refresh');
    Http::assertSent(function ($req) {
        if ($req->url() !== GmailTransport::SEND_URL || $req->header('Authorization')[0] !== 'Bearer access-1') {
            return false;
        }
        $mime = base64_decode(strtr($req['raw'], '-_', '+/'));

        return str_contains($mime, 'Subject: Reset your UDM Alumni portal password')
            && str_contains($mime, 'To: '.MARIA)
            && str_contains($mime, 'multipart/alternative');
    });
    expect(DB::table('password_reset')->count())->toBe(1);

    // A failed send (the second response) rolls the reset back; the caller still gets the same answer.
    DB::table('password_reset')->delete();
    $this->postJson('/api/v1/auth/forgot-password', ['identifier' => MARIA])->assertOk()->assertJsonPath('message', PasswordResetService::SENT);
    expect(DB::table('password_reset')->count())->toBe(0);
});
