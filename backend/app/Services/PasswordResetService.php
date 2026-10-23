<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Mail\PasswordResetMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Password reset (plan-backend "Password reset flow"): a link token and a 6-digit code per request, both stored only
 * as hashes, 30-minute expiry, single use, at most 5 code attempts. Unknown identifiers get the same responses.
 */
class PasswordResetService
{
    public const SENT = 'If an account matches, we sent a reset link and code to its email address.';

    public const BAD_CODE = 'That code is incorrect or has expired. Request a new reset email.';

    public const EXPIRED = 'This reset link is invalid or has expired.';

    public function __construct(
        private readonly AccountService $accounts,
        private readonly SessionService $sessions,
        private readonly AuditService $audit,
        private readonly MfaService $mfa,
    ) {}

    /** The code is bound to its reset row, so a code from one email never verifies another. */
    private static function codeHash(string $tokenHash, string $code): string
    {
        return hash('sha256', "{$tokenHash}:{$code}");
    }

    /** Step 1. Always returns normally; whether an email went out is never revealed. */
    public function request(string $identifier): void
    {
        $user = $this->accounts->findForLogin($identifier);
        if ($user === null || $user->account_status !== 'active') {
            $this->accounts->dummyCheck('x');

            return;
        }
        $recent = DB::table('password_reset')->where('user_id', $user->user_id)
            ->where('created_at', '>', now()->subMinutes(15))->count();
        if ($recent >= (int) config('auth.reset.max_per_window')) {
            return;
        }

        $token = SessionService::randomToken();
        $tokenHash = SessionService::hash($token);
        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
        $firstName = (string) (DB::table('alumnus')->where('user_id', $user->user_id)->value('first_name')
            ?? explode(' ', $user->display_name)[0]);

        // A failed send rolls the reset back but the caller still gets the generic response.
        try {
            DB::transaction(function () use ($user, $token, $tokenHash, $code, $firstName) {
                DB::update('UPDATE password_reset SET expires_at = least(expires_at, now()) WHERE user_id = ? AND used_at IS NULL', [$user->user_id]);
                DB::insert(
                    'INSERT INTO password_reset (user_id, token_hash, code_hash, sent_to, expires_at) VALUES (?, ?, ?, ?, now() + make_interval(mins => ?))',
                    [$user->user_id, $tokenHash, self::codeHash($tokenHash, $code), $user->email, config('auth.reset.ttl_minutes')],
                );
                $this->audit->log('password_reset_requested', 'user', $user->user_id, $user->user_id, ['sent_to' => AuditService::maskEmail($user->email)]);
                Mail::to($user->email)->send(new PasswordResetMail($firstName, $token, $code));
            });
        } catch (Throwable $e) {
            Log::error('password reset email failed', ['user_id' => $user->user_id, 'exception' => $e->getMessage()]);
        }
    }

    /** Step 2: GET /auth/reset-password/verify?token= */
    public function verifyToken(string $token): ?string
    {
        $row = $this->activeByTokenHash($token);

        return $row?->sent_to;
    }

    /**
     * Step 3: exchanges a correct code for a fresh single-use reset token (the client's "resetSession").
     *
     * @return array{resetSession: string, email: string}
     */
    public function verifyCode(string $identifier, string $code): array
    {
        $user = $this->accounts->findForLogin($identifier);
        $code = (string) preg_replace('/\D+/', '', $code);
        $bad = fn () => new ApiException(422, self::BAD_CODE, 'invalid_code', ['code' => self::BAD_CODE]);
        if ($user === null) {
            throw $bad();
        }

        $out = DB::transaction(function () use ($user, $code) {
            $r = DB::selectOne(
                "SELECT r.* FROM password_reset r JOIN user_account u ON u.user_id = r.user_id
                  WHERE r.user_id = ? AND r.used_at IS NULL AND r.expires_at > now() AND r.attempts < ? AND u.account_status = 'active'
                  ORDER BY r.created_at DESC, r.reset_id DESC LIMIT 1 FOR UPDATE OF r",
                [$user->user_id, config('auth.reset.max_code_attempts')],
            );
            if ($r === null) {
                return null;
            }
            if (strlen($code) !== 6 || ! hash_equals($r->code_hash, self::codeHash($r->token_hash, $code))) {
                DB::update('UPDATE password_reset SET attempts = attempts + 1 WHERE reset_id = ?', [$r->reset_id]);

                return null;
            }
            // The emailed link stops working; the new token is the only way to finish this reset.
            $token = SessionService::randomToken();
            $tokenHash = SessionService::hash($token);
            DB::update('UPDATE password_reset SET token_hash = ?, code_hash = ? WHERE reset_id = ?', [$tokenHash, self::codeHash($tokenHash, bin2hex(random_bytes(8))), $r->reset_id]);

            return ['resetSession' => $token, 'email' => (string) $r->sent_to];
        });

        return $out ?? throw $bad();
    }

    /** Step 4: sets the new password, marks the reset used and signs the account out everywhere. */
    public function reset(string $token, string $password): void
    {
        $hash = Hash::make($password);
        $done = DB::transaction(function () use ($token, $hash) {
            $r = $this->activeByTokenHash($token, lock: true);
            if ($r === null) {
                return false;
            }
            DB::update('UPDATE password_reset SET used_at = now() WHERE reset_id = ?', [$r->reset_id]);
            DB::update(
                'UPDATE user_account SET password_hash = ?, must_change_password = false, temp_password_expires_at = NULL, failed_login_count = 0, locked_until = NULL WHERE user_id = ?',
                [$hash, $r->user_id],
            );
            $this->sessions->revokeAll((int) $r->user_id);
            $this->mfa->forgetDevices((int) $r->user_id);
            $this->audit->log('password_reset', 'user', (int) $r->user_id, (int) $r->user_id);

            return true;
        });
        if (! $done) {
            throw new ApiException(400, self::EXPIRED, 'expired');
        }
    }

    private function activeByTokenHash(string $token, bool $lock = false): ?object
    {
        if ($token === '' || strlen($token) > 100) {
            return null;
        }

        return DB::selectOne(
            "SELECT r.* FROM password_reset r JOIN user_account u ON u.user_id = r.user_id
              WHERE r.token_hash = ? AND r.used_at IS NULL AND r.expires_at > now() AND r.attempts < ? AND u.account_status = 'active'"
            .($lock ? ' FOR UPDATE OF r' : ''),
            [SessionService::hash($token), config('auth.reset.max_code_attempts')],
        );
    }
}
