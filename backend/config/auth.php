<?php

use App\Models\UserAccount;

// Auth is self-hosted (plan-backend "Authentication and authorization"): no Sanctum, Breeze or Fortify, and no
// Laravel session. App\Auth\SessionGuard (registered with Auth::extend in AppServiceProvider) resolves the user from
// the auth_session cookie.
return [

    'defaults' => [
        'guard' => 'api',
        'passwords' => null,
    ],

    'guards' => [
        'api' => [
            'driver' => 'auth_session',
            'provider' => 'user_accounts',
        ],
    ],

    'providers' => [
        'user_accounts' => [
            'driver' => 'eloquent',
            'model' => UserAccount::class,
        ],
    ],

    'passwords' => [],

    'password_timeout' => 10800,

    // The session cookie: a random 32-byte id; only its SHA-256 is stored in auth_session.
    'session' => [
        'cookie' => 'udm_sid',
        'ttl_days' => (int) env('SESSION_TTL_DAYS', 14),
        'idle_hours' => (int) env('SESSION_IDLE_HOURS', 12),
        // Secure everywhere except local http development.
        'secure' => (bool) env('SESSION_SECURE_COOKIE', ! in_array(env('APP_ENV', 'production'), ['local', 'testing'], true)),
    ],

    // Per-account lockout after repeated failed sign-ins.
    'lockout' => [
        'threshold' => 5,
        'minutes' => 15,
    ],

    // Requests per minute per IP on the throttle:auth routes.
    'rate_limit_per_minute' => (int) env('AUTH_RATE_LIMIT', 10),

    'reset' => [
        'ttl_minutes' => 30,
        'max_code_attempts' => 5,
        // Reset emails per account per 15 minutes; extra requests are skipped silently (same response).
        'max_per_window' => 3,
    ],

];
