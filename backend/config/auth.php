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

    // Two-step verification: after the password, a 6-digit code emailed or the answers to two security questions. On
    // unless MFA_ENABLED=false. An account with neither a real inbox nor security questions can no longer sign in, so
    // dummy accounts get theirs from dummy_security_questions.sql.
    'mfa' => [
        'enabled' => (bool) env('MFA_ENABLED', true),
        'ttl_minutes' => 10,
        'max_code_attempts' => 5,
        'max_resends' => 3,
        'resend_cooldown_seconds' => 30,
        // Codes per account per 15 minutes (sign-ins that reach the code step).
        'max_per_window' => 5,
        // "Trust this device": the udm_tdev cookie skips the code on this browser for this many days.
        'trust_cookie' => 'udm_tdev',
        'trust_days' => 30,
    ],

];
