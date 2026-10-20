<?php

namespace App\Http\Controllers\Api\V1;

use App\Auth\SessionGuard;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\NewPasswordRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\UserAccount;
use App\Services\AccountService;
use App\Services\AuditService;
use App\Services\RegistrationService;
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

    public const PENDING = 'Your account is pending approval. You can sign in once the UDM Alumni Office Admin approves your registration.';

    public function __construct(
        private readonly AccountService $accounts,
        private readonly SessionService $sessions,
        private readonly AuditService $audit,
    ) {}

    /** GET /auth/session: the signed-in user, or 401. */
    public function session(Request $request): JsonResponse
    {
        $user = $request->user() ?? throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');

        return response()->json(['user' => $this->accounts->payload($user)]);
    }

    /**
     * POST /auth/register: creates a pending account and its alumni record. The alumnus is not signed in; they can
     * sign in once an admin approves the account.
     */
    public function register(RegisterRequest $request, RegistrationService $registration): JsonResponse
    {
        $r = $registration->register($request->all());

        return response()->json([
            'ok' => true,
            'status' => 'pending',
            'membershipId' => $r['membershipId'],
            'message' => 'Registration received. You can sign in once the UDM Alumni Office approves your account.',
        ], 201);
    }

    /** POST /auth/login: email or Alumni ID + password. */
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
        // Only after the password matches, so the pending state never reveals which emails are registered.
        if ($user->account_status === 'pending') {
            $this->audit->log('login_failed', 'user', $user->user_id, $user->user_id, ['reason' => 'pending']);
            throw new ApiException(403, self::PENDING, 'account_pending', ['identifier' => self::PENDING]);
        }

        $token = DB::transaction(function () use ($user, $request, $password) {
            DB::update('UPDATE user_account SET failed_login_count = 0, locked_until = NULL, last_login_at = now() WHERE user_id = ?', [$user->user_id]);
            // Upgrade a hash made with another algorithm or older argon2id settings (config/hashing.php).
            if (Hash::needsRehash($user->password_hash)) {
                DB::update('UPDATE user_account SET password_hash = ? WHERE user_id = ?', [Hash::make($password), $user->user_id]);
            }
            $this->audit->log('login', 'user', $user->user_id, $user->user_id);

            return $this->sessions->create($user->user_id, $request);
        });

        return response()->json(['user' => $this->accounts->payload($user)])->withCookie($this->sessions->cookie($token));
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
            DB::update('UPDATE user_account SET password_hash = ?, must_change_password = false WHERE user_id = ?', [Hash::make((string) $request->input('password')), $user->user_id]);
            $this->sessions->revokeAll($user->user_id, $keep);
            $this->audit->log('password_changed', 'user', $user->user_id);
        });

        return response()->json(['ok' => true, 'message' => 'Password updated. Other active sessions have been signed out.']);
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
