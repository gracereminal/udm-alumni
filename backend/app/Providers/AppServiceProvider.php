<?php

namespace App\Providers;

use App\Auth\SessionGuard;
use App\Mail\GmailTransport;
use App\Services\SessionService;
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
    }

    /** Fail fast with a clear message when production is missing configuration (plan-backend "Environment variables"). */
    private function checkEnvironment(): void
    {
        if (! $this->app->environment('production')) {
            return;
        }

        $problems = [];
        if (config('app.debug')) {
            $problems[] = 'APP_DEBUG must be false';
        }
        if (! config('database.connections.pgsql.url')) {
            $problems[] = 'DB_URL is required';
        }
        if (! config('app.url') || str_contains((string) config('app.url'), 'localhost')) {
            $problems[] = 'APP_URL must be the public frontend URL';
        }
        if (config('mail.default') === 'log') {
            $problems[] = 'MAIL_MAILER=log is not allowed in production';
        }
        if (config('mail.default') === 'gmail' && ! config('services.google.refresh_token') && ! config('services.google.service_account_json')) {
            $problems[] = 'MAIL_MAILER=gmail needs GOOGLE_OAUTH_REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_JSON';
        }
        if (! config('auth.session.secure')) {
            $problems[] = 'the session cookie must be Secure (SESSION_SECURE_COOKIE)';
        }
        if (strlen((string) config('app.cron_secret')) < 24) {
            $problems[] = 'CRON_SECRET must be at least 24 characters';
        }

        if ($problems !== []) {
            throw new RuntimeException('Invalid production configuration: '.implode('; ', $problems).'.');
        }
    }
}
