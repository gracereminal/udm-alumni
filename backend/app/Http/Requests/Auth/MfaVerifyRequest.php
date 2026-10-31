<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /auth/mfa/verify: the challenge from /auth/login, then either the emailed 6-digit code or the answers to the
 * account's two security questions, and "Trust this device".
 */
class MfaVerifyRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'challenge' => ['required', 'string', 'max:100'],
            'code' => ['required_without:answers', 'string', 'max:20'],
            'answers' => ['sometimes', 'array', 'size:2'],
            'answers.*' => ['nullable', 'string', 'max:200'],
            'trust' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'challenge.required' => 'This sign-in has expired. Sign in again to get a new code.',
            'code.required_without' => 'Enter the 6-digit code.',
        ];
    }
}
