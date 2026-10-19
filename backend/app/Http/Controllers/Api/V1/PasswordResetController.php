<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\NewPasswordRequest;
use App\Services\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** The four password reset steps (plan-backend "Password reset flow"). */
class PasswordResetController extends Controller
{
    public function __construct(private readonly PasswordResetService $resets) {}

    /** POST /auth/forgot-password {identifier}: the same 200 whether or not the account exists. */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $this->resets->request((string) $request->input('identifier'));

        return response()->json(['ok' => true, 'message' => PasswordResetService::SENT]);
    }

    /** GET /auth/reset-password/verify?token= → {valid, email} or {valid: false} ("Link expired"). */
    public function verify(Request $request): JsonResponse
    {
        $email = $this->resets->verifyToken((string) $request->query('token', ''));

        return response()->json($email !== null ? ['valid' => true, 'email' => $email] : ['valid' => false]);
    }

    /** POST /auth/reset-password/verify-code {identifier, code} → {resetSession, email}. */
    public function verifyCode(ForgotPasswordRequest $request): JsonResponse
    {
        return response()->json($this->resets->verifyCode((string) $request->input('identifier'), (string) $request->input('code')));
    }

    /** POST /auth/reset-password {token | resetSession, password}. */
    public function reset(NewPasswordRequest $request): JsonResponse
    {
        $this->resets->reset((string) ($request->input('token') ?: $request->input('resetSession')), (string) $request->input('password'));

        return response()->json(['ok' => true, 'message' => 'Password updated. Sign in with your new password.']);
    }
}
