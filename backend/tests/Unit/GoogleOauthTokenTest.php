<?php

use App\Console\Commands\GoogleOauthToken;
use App\Mail\GmailTransport;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

const PASTE = 'Paste the address the browser landed on';

beforeEach(function () {
    // Fixed PKCE verifier (64 × "v") and state (32 × "s"): Str::random is the command's only source of randomness.
    Str::createRandomStringsUsing(fn (int $length) => str_repeat($length === 64 ? 'v' : 's', $length));
});

afterEach(fn () => Str::createRandomStringsNormally());

function redirectFor(string $state, string $extra = '&code=4/abc&scope=https://www.googleapis.com/auth/gmail.send'): string
{
    return "http://localhost:53682/?state={$state}{$extra}";
}

it('exchanges the pasted redirect for a refresh token with PKCE, asking for gmail.send only', function () {
    Http::fake([GmailTransport::TOKEN_URL => Http::response([
        'access_token' => 'a', 'refresh_token' => '1//refresh', 'scope' => GoogleOauthToken::SCOPE, 'expires_in' => 3599,
    ])]);
    $challenge = rtrim(strtr(base64_encode(hash('sha256', str_repeat('v', 64), true)), '+/', '-_'), '=');

    $this->artisan('app:google-oauth-token', ['--client-id' => 'id.apps.googleusercontent.com', '--client-secret' => 'secret', '--account' => 'udm.alumni.mailer@gmail.com', '--manual' => true])
        // One output line can meet only one expectsOutputToContain, so the whole consent URL query is checked at once.
        ->expectsOutputToContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&access_type=offline&prompt=consent'
            .'&state='.str_repeat('s', 32)."&code_challenge={$challenge}&code_challenge_method=S256&login_hint=udm.alumni.mailer%40gmail.com")
        ->expectsQuestion(PASTE, redirectFor(str_repeat('s', 32)))
        ->expectsOutputToContain('GOOGLE_OAUTH_REFRESH_TOKEN=1//refresh')
        ->expectsConfirmation('Write the three GOOGLE_OAUTH_* lines to backend/.env?', 'no')
        ->assertSuccessful();

    Http::assertSent(fn ($req) => $req['grant_type'] === 'authorization_code' && $req['code'] === '4/abc'
        && $req['code_verifier'] === str_repeat('v', 64) && $req['redirect_uri'] === 'http://localhost:53682'
        && $req['client_id'] === 'id.apps.googleusercontent.com' && $req['client_secret'] === 'secret');
});

it('refuses a redirect from another run, a cancelled consent, a missing scope and a missing refresh token', function (string $redirect, array $reply, string $error) {
    Http::fake([GmailTransport::TOKEN_URL => Http::response($reply)]);

    $this->artisan('app:google-oauth-token', ['--client-id' => 'id', '--client-secret' => 'secret', '--manual' => true])
        ->expectsQuestion(PASTE, $redirect)
        ->expectsOutputToContain($error)
        ->assertFailed();
})->with([
    'other run' => [redirectFor('someone-else'), [], 'state mismatch'],
    'cancelled' => [redirectFor(str_repeat('s', 32), '&error=access_denied'), [], 'access_denied'],
    'no scope' => [redirectFor(str_repeat('s', 32)), ['refresh_token' => 'r', 'scope' => 'openid'], 'gmail.send permission was not granted'],
    'no refresh token' => [redirectFor(str_repeat('s', 32)), ['access_token' => 'a', 'scope' => GoogleOauthToken::SCOPE], 'no refresh token'],
]);

it('needs the client ID and secret', function () {
    config(['services.google.client_id' => null, 'services.google.client_secret' => null]);

    $this->artisan('app:google-oauth-token', ['--manual' => true])
        ->expectsOutputToContain('--client-id and --client-secret')
        ->assertFailed();
});

it('sets .env keys in place, uncommenting placeholders and appending new ones', function () {
    $env = "MAIL_MAILER=log\n# GOOGLE_OAUTH_CLIENT_ID=\nGOOGLE_OAUTH_REFRESH_TOKEN=old\n";

    expect(GoogleOauthToken::withEnv($env, [
        'GOOGLE_OAUTH_CLIENT_ID' => 'id', 'GOOGLE_OAUTH_REFRESH_TOKEN' => '1//new$1', 'GOOGLE_OAUTH_CLIENT_SECRET' => 's',
    ]))->toBe("MAIL_MAILER=log\nGOOGLE_OAUTH_CLIENT_ID=id\nGOOGLE_OAUTH_REFRESH_TOKEN=1//new\$1\nGOOGLE_OAUTH_CLIENT_SECRET=s\n");
});
