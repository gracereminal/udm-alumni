<?php

namespace App\Providers;

use App\Auth\SessionGuard;
use App\Mail\GmailTransport;
use App\Services\SessionService;
use App\Services\SettingsService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // `artisan serve` starts PHP with only a short list of environment variables. Without TEMP/TMP, PHP on
        // Windows has no writable temp folder and drops every upload ("unable to create a temporary file").
        ServeCommand::$passthroughVariables = array_values(array_unique([...ServeCommand::$passthroughVariables, 'TEMP', 'TMP', 'TMPDIR']));

        // One instance per request, so app_setting is read once however many services ask for it.
        $this->app->scoped(SettingsService::class);
    }

    public function boot(): void
    {
        $this->checkEnvironment();

        // The auth_session cookie guard (config/auth.php → guards.api).
        Auth::extend('auth_session', function (Application $app) {
            $guard = new SessionGuard($app->make(SessionService::class), $app->make('request'));
            $app->refresh('request', $guard, 'setRequest');

            return $guard;
        });

        Mail::extend('gmail', fn () => new GmailTransport((array) config('services.google')));

        // throttle:auth on /auth/*: per IP, per minute.
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute((int) config('auth.rate_limit_per_minute'))->by('auth|'.$request->ip()));

        // throttle:outreach on POST /outreach: per staff account, per minute.
        RateLimiter::for('outreach', fn (Request $request) => Limit::perMinute(30)->by('outreach|'.(auth()->id() ?? $request->ip())));

        // throttle:messages on POST /messages/threads/:id/messages: per account, per minute.
        RateLimiter::for('messages', fn (Request $request) => Limit::perMinute(30)->by('messages|'.(auth()->id() ?? $request->ip())));
    }

    /** Fail fast with a clear message when production is missing configuration (docs/deploy-notes.md, section 1.2). */
    private function checkEnvironment(): void
    {
        if (! $this->app->environment('production')) {
            return;
        }

        $problems = self::productionConfigProblems();
        if ($problems !== []) {
            throw new RuntimeException('Invalid production configuration: '.implode('; ', $problems).'.');
        }
    }

    /** @return list<string> what is wrong with the current config for a production deploy (empty when it is fine). */
    public static function productionConfigProblems(): array
    {
        $problems = [];
        if (config('app.debug')) {
            $problems[] = 'APP_DEBUG must be false';
        }
        // Signed file URLs (proof documents) are signed with APP_KEY.
        if (! config('app.key')) {
            $problems[] = 'APP_KEY is required (php artisan key:generate --show)';
        }

        $url = (string) config('app.url');
        if (! str_starts_with($url, 'https://') || str_contains($url, 'localhost') || str_contains($url, '127.0.0.1')) {
            $problems[] = 'APP_URL must be the public https:// URL';
        }

        $pooled = (string) config('database.connections.pgsql.url');
        $direct = (string) config('database.connections.pgsql_direct.url');
        if ($pooled === '') {
            $problems[] = 'DB_URL is required';
        }
        // pgsql_direct falls back to DB_URL, so equal URLs mean DB_URL_DIRECT is unset; migrations need the direct host.
        if ($direct === '' || $direct === $pooled || str_contains($direct, '-pooler')) {
            $problems[] = 'DB_URL_DIRECT must be the direct (non-pooler) database URL';
        }

        $mailer = config('mail.default');
        if (in_array($mailer, ['log', 'array'], true)) {
            $problems[] = "MAIL_MAILER={$mailer} is not allowed in production";
        }
        if ($mailer === 'gmail') {
            $google = (array) config('services.google');
            if (! empty($google['refresh_token'])) {
                if (empty($google['client_id']) || empty($google['client_secret'])) {
                    $problems[] = 'GOOGLE_OAUTH_REFRESH_TOKEN needs GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET';
                }
            } elseif (! empty($google['service_account_json'])) {
                if (empty($google['impersonate_user'])) {
                    $problems[] = 'GOOGLE_SERVICE_ACCOUNT_JSON needs GOOGLE_IMPERSONATE_USER';
                }
            } else {
                $problems[] = 'MAIL_MAILER=gmail needs GOOGLE_OAUTH_REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON';
            }
        }

        // The container disk is wiped on deploy: "local" needs a volume at storage/app (not checkable here), s3 needs its bucket.
        if (config('filesystems.default') === 's3') {
            foreach (['bucket' => 'AWS_BUCKET', 'key' => 'AWS_ACCESS_KEY_ID', 'secret' => 'AWS_SECRET_ACCESS_KEY', 'region' => 'AWS_DEFAULT_REGION'] as $key => $name) {
                if (! config("filesystems.disks.s3.{$key}")) {
                    $problems[] = "FILESYSTEM_DISK=s3 needs {$name}";
                }
            }
        }

        if (! config('auth.session.secure')) {
            $problems[] = 'the session cookie must be Secure (SESSION_SECURE_COOKIE)';
        }
        if (config('hashing.driver') !== 'argon2id') {
            $problems[] = 'HASH_DRIVER must be argon2id';
        } elseif (! defined('PASSWORD_ARGON2ID')) {
            $problems[] = 'this PHP build lacks argon2id (PASSWORD_ARGON2ID)';
        }
        if (strlen((string) config('app.cron_secret')) < 24) {
            $problems[] = 'CRON_SECRET must be at least 24 characters';
        }

        return $problems;
    }
}
