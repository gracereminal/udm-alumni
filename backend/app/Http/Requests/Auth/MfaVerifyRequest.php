<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** POST /auth/mfa/verify: the challenge from /auth/login, the emailed 6-digit code and "Trust this device". */
class MfaVerifyRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'challenge' => ['required', 'string', 'max:100'],
            'code' => ['required', 'string', 'max:20'],
            'trust' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'challenge.required' => 'This sign-in has expired. Sign in again to get a new code.',
            'code.required' => 'Enter the 6-digit code.',
        ];
    }
}
