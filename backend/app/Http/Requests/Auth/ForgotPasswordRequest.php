<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** POST /auth/forgot-password and POST /auth/reset-password/verify-code. */
class ForgotPasswordRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $rules = ['identifier' => ['required', 'string', 'max:120']];
        if ($this->routeIs('auth.reset.verify-code')) {
            $rules['code'] = ['required', 'string', 'max:12'];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'identifier.required' => 'Enter your email or Alumni ID.',
            'code.required' => 'Enter the 6-digit code from the email.',
        ];
    }
}
