<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** POST /auth/login: email or Alumni ID + password. */
class LoginRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string', 'max:200'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'identifier.required' => 'Enter your email or Alumni ID.',
            'password.required' => 'Enter your password.',
        ];
    }
}
