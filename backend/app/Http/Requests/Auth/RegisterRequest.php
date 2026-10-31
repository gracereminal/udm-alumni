<?php

namespace App\Http\Requests\Auth;

use App\Support\RegistrationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * POST /auth/register: every field of the registration steps at once (Personal Information, Contact & Social Media,
 * Educational Background, Account Password, Security Questions) plus privacy_consent. Checks and messages match the client.
 */
class RegisterRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }

    /** @return list<callable> */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                foreach (RegistrationRules::errors($this->all()) as $field => $message) {
                    $validator->errors()->add($field, $message);
                }
            },
        ];
    }
}
