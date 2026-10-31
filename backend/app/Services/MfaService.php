<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Mail\LoginCodeMail;
use App\Models\UserAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Cookie;
use Throwable;

/**
 * Two-step verification at sign-in (UDM Alumni.dc.html "MFA Verification"). A correct password opens a login challenge:
 * a random token for the browser and a 6-digit code by email, both stored only as hashes, 10-minute expiry, single use,
 * at most 5 code attempts and 3 resends. The "Security questions" tab finishes the same challenge with the answers to
 * the account's two security questions instead (SecurityQuestionService); wrong answers count as attempts too.
 * A trusted device (udm_tdev cookie, 30 days) skips this step.
 */
class MfaService
{
    public const BAD_CODE = 'That code is incorrect or expired. Try again.';

    public const EXPIRED = 'This sign-in has expired. Sign in again to get a new code.';

    public const SEND_FAILED = 'We couldn’t send your verification code. Try again in a few minutes.';

    public function __construct(
        private readonly AuditService $audit,
        private readonly SecurityQuestionService $questions,
    ) {}

    /** The code is bound to its challenge row, so a code from one email never verifies another sign-in. */
    private static function codeHash(string $tokenHash, string $code): string
    {
        return hash('sha256', "{$tokenHash}:{$code}");
    }

    private static function newCode(): string
    {
        return str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
    }

    /** Whether this sign-in needs a code: two-step verification is on and the browser is not trusted for this account. */
    public function required(int $userId, Request $request): bool
    {
        if (! config('auth.mfa.enabled')) {
            return false;
        }
        $token = (string) $request->cookie(config('auth.mfa.trust_cookie'), '');
        if ($token === '' || strlen($token) > 100) {
            return true;
        }

        return ! DB::table('trusted_device')
            ->where('token_hash', SessionService::hash($token))->where('user_id', $userId)
            ->whereNull('revoked_at')->where('expires_at', '>', now())
            ->exists();
    }

    /**
     * Opens a challenge and emails its code. Returns what the Verify screen needs, with the account's security
     * questions ([] when none are set up yet).
     *
     * @return array{challenge: string, sentTo: string, expiresMinutes: int, questions: list<string>}
     */
    public function start(UserAccount $user): array
    {
        $recent = DB::table('login_challenge')->where('user_id', $user->user_id)
            ->where('created_at', '>', now()->subMinutes(15))->count();
        if ($recent >= (int) config('auth.mfa.max_per_window')) {
            throw new ApiException(429, 'Too many verification codes were requested. Try again in 15 minutes.', 'mfa_rate_limited');
        }

        $token = SessionService::randomToken();
        $tokenHash = SessionService::hash($token);
        $code = self::newCode();

        // A failed send rolls the challenge back, so no code exists that nobody received.
        try {
            DB::transaction(function () use ($user, $tokenHash, $code) {
                DB::update('UPDATE login_challenge SET expires_at = least(expires_at, now()) WHERE user_id = ? AND used_at IS NULL', [$user->user_id]);
                DB::insert(
                    'INSERT INTO login_challenge (user_id, token_hash, code_hash, sent_to, expires_at) VALUES (?, ?, ?, ?, now() + make_interval(mins => ?))',
                    [$user->user_id, $tokenHash, self::codeHash($tokenHash, $code), $user->email, config('auth.mfa.ttl_minutes')],
                );
                $this->audit->log('mfa_code_sent', 'user', $user->user_id, $user->user_id, ['sent_to' => AuditService::maskEmail($user->email)]);
                Mail::to($user->email)->send(new LoginCodeMail(self::firstName($user->user_id, $user->display_name), $code));
            });
        } catch (Throwable $e) {
            Log::error('login code email failed', ['user_id' => $user->user_id, 'exception' => $e->getMessage()]);
            throw new ApiException(503, self::SEND_FAILED, 'mfa_send_failed');
        }

        return [
            'challenge' => $token, 'sentTo' => AuditService::maskEmail($user->email), 'expiresMinutes' => (int) config('auth.mfa.ttl_minutes'),
            'questions' => $this->questions->questionsFor($user->user_id),
        ];
    }

    /**
     * Emails a new code for the same challenge: the old code stops working and the attempts and expiry start over.
     *
     * @return array{sentTo: string, expiresMinutes: int}
     */
    public function resend(string $token): array
    {
        $out = DB::transaction(function () use ($token) {
            $c = $this->active($token);
            if ($c === null) {
                return null;
            }
            if ($c->resends >= (int) config('auth.mfa.max_resends')) {
                throw new ApiException(429, 'No more codes can be sent for this sign-in. Sign in again.', 'mfa_resend_limit');
            }
            if ($c->wait > 0) {
                throw new ApiException(429, "Wait {$c->wait} seconds before asking for another code.", 'mfa_resend_wait');
            }
            $code = self::newCode();
            DB::update(
                'UPDATE login_challenge SET code_hash = ?, attempts = 0, resends = resends + 1, last_sent_at = now(),
                        expires_at = now() + make_interval(mins => ?) WHERE challenge_id = ?',
                [self::codeHash($c->token_hash, $code), config('auth.mfa.ttl_minutes'), $c->challenge_id],
            );
            $this->audit->log('mfa_code_sent', 'user', (int) $c->user_id, (int) $c->user_id, ['sent_to' => AuditService::maskEmail($c->sent_to), 'resend' => true]);
            try {
                Mail::to($c->sent_to)->send(new LoginCodeMail(self::firstName((int) $c->user_id, (string) $c->display_name), $code));
            } catch (Throwable $e) {
                Log::error('login code email failed', ['user_id' => $c->user_id, 'exception' => $e->getMessage()]);
                throw new ApiException(503, self::SEND_FAILED, 'mfa_send_failed');
            }

            return ['sentTo' => AuditService::maskEmail($c->sent_to), 'expiresMinutes' => (int) config('auth.mfa.ttl_minutes')];
        });

        return $out ?? throw new ApiException(400, self::EXPIRED, 'mfa_expired');
    }

    /**
     * Checks the emailed code, or the security answers when $answers is given, and closes the challenge. Returns the
     * account to sign in.
     *
     * @param  list<mixed>|null  $answers
     */
    public function verify(string $token, string $code, ?array $answers = null): int
    {
        $code = (string) preg_replace('/\D+/', '', $code);
        // The failed attempt must be counted even though the request fails, so the outcome leaves the transaction.
        $result = DB::transaction(function () use ($token, $code, $answers) {
            $c = $this->active($token);
            if ($c === null) {
                return 'expired';
            }
            if ($answers !== null && ! $this->questions->has((int) $c->user_id)) {
                return 'none';
            }
            $ok = $answers !== null
                ? $this->questions->matches((int) $c->user_id, $answers)
                : strlen($code) === 6 && hash_equals($c->code_hash, self::codeHash($c->token_hash, $code));
            if (! $ok) {
                $attempts = (int) DB::selectOne('UPDATE login_challenge SET attempts = attempts + 1 WHERE challenge_id = ? RETURNING attempts', [$c->challenge_id])->attempts;
                $this->audit->log('login_failed', 'user', (int) $c->user_id, (int) $c->user_id, ['reason' => $answers !== null ? 'mfa_answers' : 'mfa_code']);

                return $attempts >= (int) config('auth.mfa.max_code_attempts') ? 'locked' : 'bad';
            }
            DB::update('UPDATE login_challenge SET used_at = now() WHERE challenge_id = ?', [$c->challenge_id]);

            return (int) $c->user_id;
        });

        return match ($result) {
            'expired' => throw new ApiException(400, self::EXPIRED, 'mfa_expired'),
            'locked' => throw new ApiException(400, 'Too many incorrect tries. Sign in again to start over.', 'mfa_expired'),
            'none' => throw new ApiException(422, 'Security questions aren’t set up for this account. Use the email code.', 'no_questions'),
            'bad' => $answers !== null
                ? throw new ApiException(422, SecurityQuestionService::BAD_ANSWERS, 'invalid_answers', ['answers' => SecurityQuestionService::BAD_ANSWERS])
                : throw new ApiException(422, self::BAD_CODE, 'invalid_code', ['code' => self::BAD_CODE]),
            default => $result,
        };
    }

    /** Remembers this browser for the account; returns the udm_tdev cookie. Runs in the caller's transaction. */
    public function trustDevice(int $userId, Request $request): Cookie
    {
        $token = SessionService::randomToken();
        $days = (int) config('auth.mfa.trust_days');
        DB::insert(
            'INSERT INTO trusted_device (user_id, token_hash, user_agent, expires_at) VALUES (?, ?, ?, now() + make_interval(days => ?))',
            [$userId, SessionService::hash($token), mb_substr((string) $request->userAgent(), 0, 255), $days],
        );

        return Cookie::create(
            config('auth.mfa.trust_cookie'), $token, now()->addDays($days),
            '/', null, config('auth.session.secure'), true, false, Cookie::SAMESITE_LAX,
        );
    }

    /** After a password change or reset every browser has to verify again. */
    public function forgetDevices(int $userId): void
    {
        DB::update('UPDATE trusted_device SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL', [$userId]);
    }

    /** The open challenge for a token (locked for update), with the seconds left before a resend is allowed. */
    private function active(string $token): ?object
    {
        if ($token === '' || strlen($token) > 100) {
            return null;
        }

        return DB::selectOne(
            "SELECT c.*, u.display_name,
                    greatest(0, ceil(extract(epoch FROM c.last_sent_at + make_interval(secs => ?) - now())))::int AS wait
               FROM login_challenge c JOIN user_account u ON u.user_id = c.user_id
              WHERE c.token_hash = ? AND c.used_at IS NULL AND c.expires_at > now() AND c.attempts < ?
                AND u.account_status = 'active'
              FOR UPDATE OF c",
            [config('auth.mfa.resend_cooldown_seconds'), SessionService::hash($token), config('auth.mfa.max_code_attempts')],
        );
    }

    private static function firstName(int $userId, string $displayName): string
    {
        return (string) (DB::table('alumnus')->where('user_id', $userId)->value('first_name') ?? explode(' ', $displayName)[0]);
    }
}
