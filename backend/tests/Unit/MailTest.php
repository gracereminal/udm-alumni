<?php

use App\Mail\EmailTemplate;
use App\Mail\GmailTransport;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mime\Email;

it('fills placeholders, escapes HTML and reads subject and sender from the shared templates', function () {
    $t = EmailTemplate::render('password-reset', [
        'first_name' => '<Maria & co>', 'reset_url' => 'https://x.test/reset-password?token=a', 'code' => '482 913',
        'expires_minutes' => 30, 'logo_url' => 'https://x.test/logo.png',
    ]);

    expect($t['subject'])->toBe('Reset your UDM Alumni portal password')
        ->and($t['from'])->toBe(['name' => 'UDM Alumni', 'address' => 'no-reply@udmalumni.edu'])
        ->and($t['html'])->toContain('&lt;Maria &amp; co&gt;')->not->toContain('{{')
        ->and($t['text'])->toContain('Hi <Maria & co>,')->toContain('482 913')->not->toContain('{{');
});

it('refuses to send a template with a missing placeholder', function () {
    expect(fn () => EmailTemplate::render('password-reset', ['first_name' => 'Maria']))
        ->toThrow(InvalidArgumentException::class, 'has no value');
});

it('keeps an if-block only when its value is not empty', function () {
    $vars = ['first_name' => 'Maria', 'event_title' => 'Homecoming', 'event_date' => 'Oct 29', 'event_time' => '4 PM', 'event_venue' => 'Gym',
        'event_fee' => 'Free', 'pass_code' => 'UDM-HOME-00001', 'event_url' => 'https://x.test/e', 'logo_url' => 'https://x.test/l.png'];

    $without = EmailTemplate::render('event-registration', $vars + ['answers' => '']);
    $with = EmailTemplate::render('event-registration', $vars + ['answers' => 'Guests: 2']);

    expect($without['html'])->not->toContain('Guests: 2')->not->toContain('<!--if:')
        ->and($with['html'])->toContain('Guests: 2');
});

it('signs a service-account assertion that impersonates the sending mailbox', function () {
    // A minimal openssl.cnf, because PHP on Windows often has none to generate keys with.
    $cnf = tempnam(sys_get_temp_dir(), 'ssl');
    file_put_contents($cnf, "[req]\ndistinguished_name = dn\n[dn]\n");
    $opts = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA, 'config' => $cnf];
    $key = openssl_pkey_new($opts);
    openssl_pkey_export($key, $pem, null, $opts);
    unlink($cnf);
    $public = openssl_pkey_get_details($key)['key'];

    Http::fake([
        GmailTransport::TOKEN_URL => Http::response(['access_token' => 'sa-token', 'expires_in' => 3600]),
        GmailTransport::SEND_URL => Http::response(['id' => 'm1']),
    ]);
    $transport = new GmailTransport([
        'service_account_json' => json_encode(['client_email' => 'mailer@udm.iam.gserviceaccount.com', 'private_key' => $pem]),
        'impersonate_user' => 'no-reply@udmalumni.edu',
    ]);
    $transport->send((new Email)->from('no-reply@udmalumni.edu')->to('a@example.com')->subject('Hi')->text('Hello'));

    Http::assertSent(function ($req) use ($public) {
        if ($req->url() !== GmailTransport::TOKEN_URL) {
            return false;
        }
        [$h, $p, $s] = explode('.', $req['assertion']);
        $claims = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
        $valid = openssl_verify("{$h}.{$p}", base64_decode(strtr($s, '-_', '+/')), $public, OPENSSL_ALGO_SHA256) === 1;

        return $valid && $claims['sub'] === 'no-reply@udmalumni.edu' && $claims['scope'] === 'https://www.googleapis.com/auth/gmail.send'
            && $req['grant_type'] === 'urn:ietf:params:oauth:grant-type:jwt-bearer';
    });
    Http::assertSent(fn ($req) => $req->url() === GmailTransport::SEND_URL && $req->header('Authorization')[0] === 'Bearer sa-token');
});
