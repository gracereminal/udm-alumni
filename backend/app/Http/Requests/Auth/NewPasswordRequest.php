<?php

namespace App\Http\Requests\Auth;

use App\Services\AccountService;
use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /auth/reset-password {token | resetSession, password} and POST /auth/change-password {current, password}.
 */
class NewPasswordRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $password = ['required', 'string', 'max:200', function (string $attr, mixed $value, \Closure $fail) {
            if (! is_string($value) || ! AccountService::passwordOk($value)) {
                $fail(AccountService::PASSWORD_MESSAGE);
            }
        }];

        return $this->routeIs('auth.change-password')
            ? ['current' => ['required', 'string', 'max:200'], 'password' => $password]
            : ['token' => ['nullable', 'string', 'max:100'], 'resetSession' => ['nullable', 'string', 'max:100'], 'password' => $password];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'password.required' => 'Create a password.',
            'current.required' => 'Enter your current password.',
        ];
    }
}
