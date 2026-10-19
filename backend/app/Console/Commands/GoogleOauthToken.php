<?php

namespace App\Console\Commands;

use App\Mail\GmailTransport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Gets the Gmail API refresh token for the sending account (deploy-notes Step 1A), once per account:
 *
 *   php artisan app:google-oauth-token --client-id=<id>.apps.googleusercontent.com --client-secret=<secret>
 *
 * OAuth with PKCE: prints a consent URL, catches the redirect on the loopback address REDIRECT_URI, exchanges the code
 * and prints the GOOGLE_OAUTH_* variables. Works with a Web application client (add REDIRECT_URI to its "Authorized
 * redirect URIs") and with a Desktop app client (any loopback port is accepted). With --manual (or when the browser
 * runs on another machine) nothing listens: paste the address the browser lands on instead. Asks for the gmail.send
 * scope only.
 */
class GoogleOauthToken extends Command
{
    public const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    public const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

    public const REDIRECT_URI = 'http://localhost:53682';

    protected $signature = 'app:google-oauth-token
        {--client-id= : OAuth client ID; defaults to GOOGLE_OAUTH_CLIENT_ID}
        {--client-secret= : OAuth client secret; defaults to GOOGLE_OAUTH_CLIENT_SECRET}
        {--account= : the Gmail account to sign in as; defaults to MAIL_FROM_ADDRESS}
        {--redirect-uri='.self::REDIRECT_URI.' : loopback address registered on the client (http://localhost:<port> or http://127.0.0.1:<port>)}
        {--timeout=300 : seconds to wait for the browser}
        {--manual : do not listen; paste the redirected address instead}';

    protected $description = 'Get the Gmail API OAuth refresh token for the sending account';

    public function handle(): int
    {
        $clientId = trim((string) ($this->option('client-id') ?: config('services.google.client_id')));
        $clientSecret = trim((string) ($this->option('client-secret') ?: config('services.google.client_secret')));
        if ($clientId === '' || $clientSecret === '') {
            $this->error('Pass --client-id and --client-secret (Google Cloud > Google Auth Platform > Clients).');

            return self::FAILURE;
        }
        $account = (string) ($this->option('account') ?: config('mail.from.address'));

        $redirectUri = rtrim(trim((string) $this->option('redirect-uri')), '/');
        $uri = parse_url($redirectUri);
        if (($uri['scheme'] ?? '') !== 'http' || ! in_array($uri['host'] ?? '', ['localhost', '127.0.0.1'], true) || empty($uri['port'])) {
            $this->error('--redirect-uri must be a loopback address with a port, e.g. '.self::REDIRECT_URI.'.');

            return self::FAILURE;
        }

        $verifier = Str::random(64);
        $state = Str::random(32);
        $servers = [];
        if (! $this->option('manual')) {
            // "localhost" may resolve to ::1 or 127.0.0.1 in the browser, so listen on both (IPv6 when available).
            foreach (['127.0.0.1', '[::1]'] as $host) {
                if ($server = @stream_socket_server("tcp://{$host}:{$uri['port']}", $errno, $errstr)) {
                    $servers[] = $server;
                } elseif ($host === '127.0.0.1') {
                    $this->error("Could not listen on port {$uri['port']}: {$errstr}. Close what uses it, or use --manual.");

                    return self::FAILURE;
                }
            }
        }
        $this->line("Redirect URI: <info>{$redirectUri}</info> (a Web application client must list it under Authorized redirect URIs).");

        $this->line('1. Open this address in a browser and sign in as <info>'.$account.'</info>:');
        $this->newLine();
        $this->line(self::AUTH_URL.'?'.http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => self::SCOPE,
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
            'code_challenge' => rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '='),
            'code_challenge_method' => 'S256',
            'login_hint' => $account,
        ], '', '&', PHP_QUERY_RFC3986));
        $this->newLine();
        $this->line('2. On "Google hasn\'t verified this app", choose Advanced > Go to UDM Alumni Tracer, then allow "Send email on your behalf".');

        try {
            if ($servers !== []) {
                $this->line('Waiting for the browser...');
                $query = $this->waitForRedirect($servers, (int) $this->option('timeout'));
            } else {
                $this->line('3. The browser then shows "This site can\'t be reached". That is expected: copy the whole address from the address bar.');
                parse_str((string) parse_url(trim((string) $this->ask('Paste the address the browser landed on')), PHP_URL_QUERY), $query);
            }
            $refreshToken = $this->exchange($query, $state, $verifier, $clientId, $clientSecret, $redirectUri);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        } finally {
            array_map(fclose(...), $servers);
        }

        $lines = [
            'GOOGLE_OAUTH_CLIENT_ID' => $clientId,
            'GOOGLE_OAUTH_CLIENT_SECRET' => $clientSecret,
            'GOOGLE_OAUTH_REFRESH_TOKEN' => $refreshToken,
        ];
        $this->newLine();
        $this->info('Done. Set these (secrets: never commit them), together with MAIL_MAILER=gmail and MAIL_FROM_ADDRESS='.$account.':');
        foreach ($lines as $key => $value) {
            $this->line("{$key}={$value}");
        }

        $env = base_path('.env');
        if (is_file($env) && $this->confirm('Write the three GOOGLE_OAUTH_* lines to backend/.env?', false)) {
            file_put_contents($env, self::withEnv((string) file_get_contents($env), $lines));
            $this->info('Updated backend/.env. Run php artisan config:clear if the config is cached.');
        }

        return self::SUCCESS;
    }

    /**
     * Serves the loopback redirect: returns its query once a request carries code, error or state, and answers the
     * browser with a short page. Other requests (favicon) get a 404.
     *
     * @param  list<resource>  $servers
     * @return array<string, mixed>
     */
    private function waitForRedirect(array $servers, int $timeout): array
    {
        $deadline = time() + max(10, $timeout);
        while (($left = $deadline - time()) > 0) {
            $ready = $servers;
            $write = $except = null;
            if (! @stream_select($ready, $write, $except, $left) || ! ($conn = @stream_socket_accept(reset($ready), 5))) {
                continue;
            }
            stream_set_timeout($conn, 5);
            $requestLine = (string) fgets($conn);
            parse_str((string) parse_url((string) (explode(' ', $requestLine)[1] ?? ''), PHP_URL_QUERY), $query);
            $done = isset($query['code']) || isset($query['error']) || isset($query['state']);
            $body = $done
                ? '<!doctype html><meta charset="utf-8"><title>UDM Alumni mailer</title><p style="font:16px sans-serif">'
                    .'Google answered. You can close this tab; the terminal says whether it worked.</p>'
                : '';
            fwrite($conn, ($done ? "HTTP/1.1 200 OK\r\n" : "HTTP/1.1 404 Not Found\r\n")
                ."Content-Type: text/html; charset=utf-8\r\nContent-Length: ".strlen($body)."\r\nConnection: close\r\n\r\n".$body);
            fclose($conn);
            if ($done) {
                return $query;
            }
        }

        throw new RuntimeException('Timed out waiting for the browser. Run the command again (or use --manual).');
    }

    /** @param  array<string, mixed>  $query */
    private function exchange(array $query, string $state, string $verifier, string $clientId, string $clientSecret, string $redirectUri): string
    {
        if (isset($query['error'])) {
            throw new RuntimeException('Google returned an error: '.(string) $query['error'].' (access_denied = the consent was cancelled).');
        }
        if (($query['state'] ?? null) !== $state) {
            throw new RuntimeException('The redirect does not belong to this run (state mismatch). Use the address from this run\'s sign-in.');
        }
        if (! is_string($query['code'] ?? null) || $query['code'] === '') {
            throw new RuntimeException('The redirect has no code.');
        }

        $res = Http::asForm()->acceptJson()->timeout(20)->post(GmailTransport::TOKEN_URL, [
            'grant_type' => 'authorization_code',
            'code' => $query['code'],
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'code_verifier' => $verifier,
        ]);
        if ($res->failed()) {
            throw new RuntimeException('The token exchange failed: '.($res->json('error_description') ?? $res->json('error') ?? $res->status())
                .' (invalid_client = wrong client ID/secret; invalid_grant = the code expired or was used, run again).');
        }
        if (! str_contains((string) $res->json('scope'), self::SCOPE)) {
            throw new RuntimeException('The gmail.send permission was not granted. Run again and tick "Send email on your behalf".');
        }
        $token = $res->json('refresh_token');
        if (! is_string($token) || $token === '') {
            throw new RuntimeException('Google returned no refresh token. Remove the app at https://myaccount.google.com/permissions and run again.');
        }

        return $token;
    }

    /**
     * Sets each KEY=value in a .env file's text: replaces an existing (or commented-out "# KEY=") line, else appends.
     *
     * @param  array<string, string>  $values
     */
    public static function withEnv(string $env, array $values): string
    {
        foreach ($values as $key => $value) {
            $line = "{$key}={$value}";
            $pattern = '/^[ \t]*(?:#[ \t]*)?'.preg_quote($key, '/').'=.*$/m';
            $env = preg_match($pattern, $env)
                ? (string) preg_replace($pattern, str_replace(['\\', '$'], ['\\\\', '\\$'], $line), $env, 1)
                : rtrim($env, "\r\n")."\n{$line}\n";
        }

        return $env;
    }
}
