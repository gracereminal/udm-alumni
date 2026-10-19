<?php

namespace App\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

/**
 * MAIL_MAILER=gmail: sends the MIME message Laravel builds through the Gmail API (users.messages.send, gmail.send
 * scope only). Two credential modes, picked by configuration:
 *  - OAuth (now): GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN of udm.alumni.mailer@gmail.com.
 *  - Workspace service account (later): GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_IMPERSONATE_USER (domain-wide delegation).
 * OAuth wins when the refresh token is set, so switching is an env-var change. Uses Laravel's HTTP client rather than
 * google/apiclient: the two calls below are all the mailer needs.
 */
class GmailTransport extends AbstractTransport
{
    public const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

    public const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

    /** @param  array{client_id?: ?string, client_secret?: ?string, refresh_token?: ?string, service_account_json?: ?string, impersonate_user?: ?string}  $google */
    public function __construct(private readonly array $google)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $raw = rtrim(strtr(base64_encode($message->toString()), '+/', '-_'), '=');
        Http::withToken($this->accessToken())->acceptJson()->timeout(20)
            ->post(self::SEND_URL, ['raw' => $raw])
            ->throw();
    }

    public function __toString(): string
    {
        return 'gmail';
    }

    private function accessToken(): string
    {
        $key = 'gmail_access_token:'.md5(($this->google['refresh_token'] ?? '').($this->google['impersonate_user'] ?? ''));
        if (is_string($cached = Cache::get($key))) {
            return $cached;
        }

        $res = Http::asForm()->acceptJson()->timeout(20)->post(self::TOKEN_URL, $this->tokenRequest())->throw()->json();
        $token = $res['access_token'] ?? null;
        if (! is_string($token)) {
            throw new RuntimeException('Gmail: the token endpoint returned no access_token.');
        }
        Cache::put($key, $token, max(60, (int) ($res['expires_in'] ?? 3600) - 120));

        return $token;
    }

    /** @return array<string, string> */
    private function tokenRequest(): array
    {
        if (! empty($this->google['refresh_token'])) {
            if (empty($this->google['client_id']) || empty($this->google['client_secret'])) {
                throw new RuntimeException('Gmail: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are required with the refresh token.');
            }

            return [
                'grant_type' => 'refresh_token',
                'client_id' => (string) $this->google['client_id'],
                'client_secret' => (string) $this->google['client_secret'],
                'refresh_token' => (string) $this->google['refresh_token'],
            ];
        }

        return ['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $this->serviceAccountAssertion()];
    }

    /** A signed JWT (RS256) for the service account, impersonating the sending mailbox. */
    private function serviceAccountAssertion(): string
    {
        $json = (string) ($this->google['service_account_json'] ?? '');
        $sa = json_decode(is_file($json) ? (string) file_get_contents($json) : $json, true);
        $subject = (string) ($this->google['impersonate_user'] ?? '');
        if (! is_array($sa) || empty($sa['client_email']) || empty($sa['private_key']) || $subject === '') {
            throw new RuntimeException('Gmail: set GOOGLE_OAUTH_REFRESH_TOKEN, or GOOGLE_SERVICE_ACCOUNT_JSON (JSON or a file path) with GOOGLE_IMPERSONATE_USER.');
        }

        $b64 = fn (string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
        $now = time();
        $unsigned = $b64((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT'])).'.'.$b64((string) json_encode([
            'iss' => $sa['client_email'], 'sub' => $subject, 'scope' => self::SCOPE,
            'aud' => $sa['token_uri'] ?? self::TOKEN_URL, 'iat' => $now, 'exp' => $now + 3600,
        ]));
        if (! openssl_sign($unsigned, $signature, (string) $sa['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Gmail: could not sign the service account assertion (check private_key).');
        }

        return $unsigned.'.'.$b64($signature);
    }
}
