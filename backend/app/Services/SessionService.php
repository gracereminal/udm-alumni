<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Opaque server-side sessions (auth_session). The cookie holds a random 32-byte id; only its SHA-256 is stored, so a
 * database leak does not expose live sessions. Revoking a row signs that browser out on its next request.
 */
class SessionService
{
    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function randomToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    /** Creates a session for the user and returns the cookie value. Runs in the caller's transaction. */
    public function create(int $userId, Request $request): string
    {
        $token = self::randomToken();
        DB::insert(
            'INSERT INTO auth_session (user_id, session_hash, user_agent, ip, expires_at)
             VALUES (?, ?, ?, ?, now() + make_interval(days => ?))',
            [$userId, self::hash($token), mb_substr((string) $request->userAgent(), 0, 255), mb_substr((string) $request->ip(), 0, 64), config('auth.session.ttl_days')],
        );

        return $token;
    }

    /**
     * The live session row for a cookie value: not revoked, not expired, not idle, and its account active.
     * Slides the idle window at most once a minute.
     */
    public function resolve(?string $token): ?object
    {
        if ($token === null || $token === '' || strlen($token) > 100) {
            return null;
        }
        $row = DB::selectOne(
            "SELECT s.session_id, s.user_id, s.last_seen_at
               FROM auth_session s JOIN user_account u ON u.user_id = s.user_id
              WHERE s.session_hash = ? AND s.revoked_at IS NULL AND s.expires_at > now()
                AND s.last_seen_at > now() - make_interval(hours => ?)
                AND u.account_status = 'active'",
            [self::hash($token), config('auth.session.idle_hours')],
        );
        if ($row === null) {
            return null;
        }
        DB::update("UPDATE auth_session SET last_seen_at = now() WHERE session_id = ? AND last_seen_at < now() - interval '1 minute'", [$row->session_id]);

        return $row;
    }

    public function revoke(int $sessionId): void
    {
        DB::update('UPDATE auth_session SET revoked_at = now() WHERE session_id = ? AND revoked_at IS NULL', [$sessionId]);
    }

    /** Signs the user out everywhere, optionally keeping the current session. */
    public function revokeAll(int $userId, ?int $exceptSessionId = null): void
    {
        DB::update(
            'UPDATE auth_session SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL AND (?::bigint IS NULL OR session_id <> ?)',
            [$userId, $exceptSessionId, $exceptSessionId],
        );
    }

    public function cookie(string $token): Cookie
    {
        return Cookie::create(
            config('auth.session.cookie'), $token, now()->addDays(config('auth.session.ttl_days')),
            '/', null, config('auth.session.secure'), true, false, Cookie::SAMESITE_LAX,
        );
    }

    public function forgetCookie(): Cookie
    {
        return Cookie::create(config('auth.session.cookie'), '', 1, '/', null, config('auth.session.secure'), true, false, Cookie::SAMESITE_LAX);
    }
}
