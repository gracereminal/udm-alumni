<?php

namespace App\Http\Controllers\Api\V1;

use App\Auth\SessionGuard;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\MfaVerifyRequest;
use App\Http\Requests\Auth\NewPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\UserAccount;
use App\Services\AccountService;
use App\Services\AuditService;
use App\Services\MfaService;
use App\Services\RegistrationService;
use App\Services\SecurityQuestionService;
use App\Services\SessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** Sign-in, sign-out, the current session and self-registration (plan-backend "Authentication and authorization"). */
class AuthController extends Controller
{
    public const INVALID = 'Incorrect email / Alumni ID or password.';

    public function __construct(
        private readonly AccountService $accounts,
        private readonly SessionService $sessions,
        private readonly AuditService $audit,
        private readonly MfaService $mfa,
    ) {}

    /** GET /auth/session: the signed-in user, or 401. */
    public function session(Request $request): JsonResponse
    {
        $user = $request->user() ?? throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');

        return response()->json(['user' => $this->accounts->payload($user)]);
    }

    /**
     * POST /auth/register: creates an active account and its alumni record. The alumnus is not signed in here; they
     * sign in next.
     */
    public function register(RegisterRequest $request, RegistrationService $registration): JsonResponse
    {
        $r = $registration->register($request->all());

        return response()->json([
            'ok' => true,
            'status' => 'active',
            'membershipId' => $r['membershipId'],
            'message' => 'Registration complete. You can now sign in.',
        ], 201);
    }

    /**
     * POST /auth/login: email or Alumni ID + password. With two-step verification on (and an untrusted browser) it
     * answers {mfaRequired, challenge, sentTo, expiresMinutes} and emails a code instead of signing in.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $password = (string) $request->input('password');
        $user = $this->accounts->findForLogin((string) $request->input('identifier'));

        if ($user === null) {
            $this->accounts->dummyCheck($password);
            $this->audit->log('login_failed', 'auth', null, null, ['reason' => 'unknown_account']);
            throw new ApiException(401, self::INVALID, 'invalid_credentials');
        }
        if ($user->locked_until !== null && $user->locked_until->isFuture()) {
            $this->accounts->dummyCheck($password);
            $this->audit->log('login_failed', 'user', $user->user_id, $user->user_id, ['reason' => 'locked']);
            throw new ApiException(401, self::INVALID.' Too many failed attempts — try again in a few minutes or reset your password.', 'account_locked');
        }

        $ok = Hash::check($password, $user->password_hash);
        if (! $ok || $user->account_status === 'disabled') {
            $this->recordFailure($user, $ok ? 'disabled' : 'password');
            throw new ApiException(401, self::INVALID, 'invalid_credentials');
        }
        // A temporary password from a masterlist import (AI Data Management) works for 7 days.
        if ($user->must_change_password && $user->temp_password_expires_at !== null && $user->temp_password_expires_at->isPast()) {
            $this->audit->log('login_failed', 'user', $user->user_id, $user->user_id, ['reason' => 'temp_password_expired']);
            throw new ApiException(401, 'Your temporary password has expired. Use “Forgot password?” to set a new one.', 'temp_password_expired');
        }

        DB::transaction(function () use ($user, $password) {
            DB::update('UPDATE user_account SET failed_login_count = 0, locked_until = NULL WHERE user_id = ?', [$user->user_id]);
            // Upgrade a hash made with another algorithm or older argon2id settings (config/hashing.php).
            if (Hash::needsRehash($user->password_hash)) {
                DB::update('UPDATE user_account SET password_hash = ? WHERE user_id = ?', [Hash::make($password), $user->user_id]);
            }
        });

        // Two-step verification: no session yet; the Verify screen finishes the sign-in with the emailed code.
        if ($this->mfa->required($user->user_id, $request)) {
            return response()->json(['mfaRequired' => true] + $this->mfa->start($user));
        }

        return $this->signedIn($user, $request);
    }

    /** POST /auth/mfa/verify {challenge, code | answers[2], trust?}: the second sign-in step. */
    public function verifyMfa(MfaVerifyRequest $request): JsonResponse
    {
        $answers = $request->has('answers') ? array_values((array) $request->input('answers')) : null;
        $userId = $this->mfa->verify((string) $request->input('challenge'), (string) $request->input('code', ''), $answers);

        return $this->signedIn(UserAccount::query()->findOrFail($userId), $request, mfa: true, trust: $request->boolean('trust'));
    }

    /** POST /auth/mfa/resend {challenge}: a new code for the same sign-in. */
    public function resendMfa(Request $request): JsonResponse
    {
        return response()->json(['ok' => true] + $this->mfa->resend((string) $request->input('challenge', '')));
    }

    /** POST /auth/security-questions {sq1, sq1_answer, sq2, sq2_answer}: the one-time setup after signing in. */
    public function setSecurityQuestions(Request $request, SecurityQuestionService $questions): JsonResponse
    {
        /** @var UserAccount $user */
        $user = $request->user();
        $questions->setUp($user->user_id, $request->only(['sq1', 'sq1_answer', 'sq2', 'sq2_answer']));

        return response()->json(['ok' => true, 'user' => $this->accounts->payload($user)]);
    }

    /** POST /auth/logout: revokes the session row, so the old cookie gets 401 at once. */
    public function logout(): JsonResponse
    {
        $guard = Auth::guard();
        if ($guard instanceof SessionGuard && ($sessionId = $guard->sessionId()) !== null) {
            DB::transaction(function () use ($sessionId, $guard) {
                $this->sessions->revoke($sessionId);
                $this->audit->log('logout', 'user', (int) $guard->id(), (int) $guard->id());
            });
        }

        return response()->json(['ok' => true])->withCookie($this->sessions->forgetCookie());
    }

    /** POST /auth/change-password {current, password}: also required after app:create-user's one-time password. */
    public function changePassword(NewPasswordRequest $request): JsonResponse
    {
        /** @var UserAccount $user */
        $user = $request->user();
        if (! Hash::check((string) $request->input('current'), $user->password_hash)) {
            throw new ApiException(422, 'Your current password is incorrect.', 'validation', ['current' => 'Your current password is incorrect.']);
        }
        $guard = Auth::guard();
        $keep = $guard instanceof SessionGuard ? $guard->sessionId() : null;

        DB::transaction(function () use ($user, $request, $keep) {
            DB::update('UPDATE user_account SET password_hash = ?, must_change_password = false, temp_password_expires_at = NULL WHERE user_id = ?', [Hash::make((string) $request->input('password')), $user->user_id]);
            $this->sessions->revokeAll($user->user_id, $keep);
            $this->mfa->forgetDevices($user->user_id);
            $this->audit->log('password_changed', 'user', $user->user_id);
        });

        return response()->json(['ok' => true, 'message' => 'Password updated. Other active sessions have been signed out.']);
    }

    /** Creates the session (and, when asked after a code, the trusted-device cookie) and answers with the user. */
    private function signedIn(UserAccount $user, Request $request, bool $mfa = false, bool $trust = false): JsonResponse
    {
        [$token, $device] = DB::transaction(function () use ($user, $request, $mfa, $trust) {
            DB::update('UPDATE user_account SET last_login_at = now() WHERE user_id = ?', [$user->user_id]);
            $this->audit->log('login', 'user', $user->user_id, $user->user_id, $mfa ? ['mfa' => 'email', 'trusted' => $trust] : []);

            return [$this->sessions->create($user->user_id, $request), $trust ? $this->mfa->trustDevice($user->user_id, $request) : null];
        });

        $response = response()->json(['user' => $this->accounts->payload($user)])->withCookie($this->sessions->cookie($token));

        return $device ? $response->withCookie($device) : $response;
    }

    /** Counts a failed sign-in; the threshold-th failure locks the account for a few minutes. */
    private function recordFailure(UserAccount $user, string $reason): void
    {
        $threshold = (int) config('auth.lockout.threshold');
        DB::transaction(function () use ($user, $reason, $threshold) {
            $failed = (int) DB::selectOne(
                'UPDATE user_account SET failed_login_count = failed_login_count + 1 WHERE user_id = ? RETURNING failed_login_count',
                [$user->user_id],
            )->failed_login_count;
            $lock = $failed >= $threshold;
            if ($lock) {
                DB::update(
                    'UPDATE user_account SET failed_login_count = 0, locked_until = now() + make_interval(mins => ?) WHERE user_id = ?',
                    [config('auth.lockout.minutes'), $user->user_id],
                );
            }
            $this->audit->log('login_failed', 'user', $user->user_id, $user->user_id, ['reason' => $reason, 'locked' => $lock]);
        });
    }
}
