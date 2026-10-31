<?php

namespace App\Support;

use App\Services\AccountService;
use App\Services\SecurityQuestionService;
use Illuminate\Support\Facades\DB;

/**
 * Server copy of the client's registration checks (client/src/lib/validation.js: baseRegErrors + applyRules), with
 * the same messages so the client can show them inline. Returns { field id => message }.
 */
final class RegistrationRules
{
    public const REQUIRED = 'This field is required.';

    private const EMAIL = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';

    /** Fields the Admin cannot hide or make optional (the tracer_core_fields constraint). */
    private const CORE = ['last_name', 'first_name', 'email', 'college', 'course', 'year_graduated', 'reg_pw', 'reg_pw2'];

    /**
     * @param  array<string, mixed>  $a  the registration body
     * @param  array<string, array{shown: ?bool, required: ?bool}>|null  $overrides  Admin edits; null = read tracer_question
     * @param  bool  $profile  Edit Profile: the same checks without the password step and the privacy consent
     * @return array<string, string>
     */
    public static function errors(array $a, ?array $overrides = null, bool $profile = false): array
    {
        $e = self::base($a);
        if ($profile) {
            unset($e['reg_pw'], $e['reg_pw2']);
        } else {
            $e += SecurityQuestionService::errors($a);
        }
        $overrides ??= self::overrides($profile ? 'profile' : 'register');

        foreach ($overrides as $id => $o) {
            if (in_array($id, self::CORE, true)) {
                continue;
            }
            $answered = self::answered($a, $id);
            if ($o['shown'] === false || ($o['required'] === false && ! $answered)) {
                unset($e[$id]);
            } elseif ($o['required'] === true && ! $answered && ! isset($e[$id])) {
                $e[$id] = self::REQUIRED;
            }
        }
        if (! $profile && ($a['privacy_consent'] ?? null) !== true) {
            $e['privacy_consent'] = 'Accept the privacy notice to register.';
        }

        return $e;
    }

    /** @return array<string, array{shown: ?bool, required: ?bool}> */
    public static function overrides(string $form = 'register'): array
    {
        return DB::table('tracer_question')->whereIn('form', [$form, 'both'])->where('is_custom', false)->get(['field_id', 'shown', 'required'])
            ->mapWithKeys(fn ($q) => [$q->field_id => ['shown' => $q->shown, 'required' => $q->required]])
            ->all();
    }

    /** @param  array<string, mixed>  $a */
    public static function blank(array $a, string $key): bool
    {
        $v = $a[$key] ?? null;

        return $v === null || (is_string($v) && trim($v) === '') || $v === [];
    }

    /**
     * @param  array<string, mixed>  $a
     * @return array<string, string>
     */
    private static function base(array $a): array
    {
        $e = [];
        $s = fn (string $k) => is_scalar($a[$k] ?? null) ? trim((string) $a[$k]) : '';

        // Personal information
        if (self::blank($a, 'last_name')) {
            $e['last_name'] = 'Enter your last name.';
        }
        if (self::blank($a, 'first_name')) {
            $e['first_name'] = 'Enter your first name.';
        }
        $dob = $s('dob');
        if ($dob === '') {
            $e['dob'] = 'Select your date of birth.';
        } elseif (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob) || ! checkdate((int) substr($dob, 5, 2), (int) substr($dob, 8, 2), (int) substr($dob, 0, 4))) {
            $e['dob'] = 'Select your date of birth.';
        } elseif ($dob > now('Asia/Manila')->toDateString()) {
            $e['dob'] = 'Date of birth cannot be in the future.';
        }
        if ($msg = self::addressError($s('present_address'), 'present address')) {
            $e['present_address'] = $msg;
        }
        if (empty($a['permanent_same']) && ($msg = self::addressError($s('permanent_address'), 'permanent address'))) {
            $e['permanent_address'] = $msg;
        }
        if (! in_array($s('gender'), array_keys(Vocab::SEX), true)) {
            $e['gender'] = 'Select an option.';
        }
        if (! in_array($s('marital_status'), array_keys(Vocab::CIVIL_STATUS), true)) {
            $e['marital_status'] = 'Select an option.';
        } elseif ($s('marital_status') === 'Married' && $s('married_name') === '') {
            $e['married_name'] = 'Enter your full name after marriage.';
        }
        if (! in_array($s('indigenous'), ['Yes', 'No'], true)) {
            $e['indigenous'] = 'Select an option.';
        } elseif ($s('indigenous') === 'Yes' && $s('indigenous_group') === '') {
            $e['indigenous_group'] = 'Specify your Indigenous group.';
        }
        if (! in_array($s('pwd'), ['Yes', 'No'], true)) {
            $e['pwd'] = 'Select an option.';
        } elseif ($s('pwd') === 'Yes' && ! in_array($s('pwd_type'), array_keys(Vocab::PWD_TYPE), true)) {
            $e['pwd_type'] = 'Select your type of disability.';
        }

        // Contact & social media
        if ($s('mobile') === '') {
            $e['mobile'] = 'Enter your mobile number.';
        } elseif (Mobile::normalize($s('mobile')) === null) {
            $e['mobile'] = 'Enter a valid mobile number (e.g. 09XX XXX XXXX).';
        }
        if ($s('email') === '') {
            $e['email'] = 'Enter your email address.';
        } elseif (! preg_match(self::EMAIL, $s('email')) || strlen($s('email')) > 120) {
            $e['email'] = 'Enter a valid email address.';
        }
        if ($s('facebook') === '') {
            $e['facebook'] = 'Enter your Facebook / Messenger username or profile link.';
        }
        foreach (['facebook', 'twitter', 'instagram', 'linkedin'] as $k) {
            $v = $s($k);
            if ($v !== '' && ((preg_match('/\s/', $v) && ! preg_match('#^https?://#i', $v)) || strlen($v) > 255)) {
                $e[$k] = 'Enter a username, handle or link without spaces.';
            }
        }

        // Educational background
        if ($s('college') === '') {
            $e['college'] = 'Select your college / department.';
        }
        if ($s('course') === '' && $s('course_other') === '') {
            $e['course'] = 'Select your program or indicate it under Others.';
        }
        $yr = $s('year_graduated');
        if ($yr === '') {
            $e['year_graduated'] = 'Select the year you graduated.';
        } elseif (! preg_match('/^\d{4}$/', $yr)) {
            $e['year_graduated'] = 'Enter a valid 4-digit year.';
        } elseif ((int) $yr > (int) now('Asia/Manila')->year) {
            $e['year_graduated'] = 'Year graduated cannot be in the future.';
        } elseif ((int) $yr < 1999) {
            $e['year_graduated'] = 'Only years 1999 onward are allowed.';
        }

        // Account password
        $pw = is_string($a['reg_pw'] ?? null) ? $a['reg_pw'] : '';
        if ($pw === '') {
            $e['reg_pw'] = 'Create a password.';
        } elseif (! AccountService::passwordOk($pw) || strlen($pw) > 200) {
            $e['reg_pw'] = AccountService::PASSWORD_MESSAGE;
        }
        if (self::blank($a, 'reg_pw2')) {
            $e['reg_pw2'] = 'Re-enter your password.';
        } elseif (($a['reg_pw2'] ?? null) !== $pw) {
            $e['reg_pw2'] = 'Passwords do not match.';
        }

        foreach (['last_name' => 60, 'first_name' => 60, 'middle_name' => 60, 'suffix' => 10, 'married_name' => 120, 'indigenous_group' => 80, 'course_other' => 160] as $k => $max) {
            if (! isset($e[$k]) && mb_strlen($s($k)) > $max) {
                $e[$k] = "Keep this under {$max} characters.";
            }
        }

        return $e;
    }

    /** Required address: letters, numbers and common address punctuation, with enough detail to locate it. */
    private static function addressError(string $s, string $label): string
    {
        return match (true) {
            $s === '' => "Enter your {$label}.",
            preg_match("/[^\\p{L}\\p{N}\\s.,#'&()\\/-]/u", $s) === 1 => 'Use only letters, numbers, spaces and . , # \' - / ( ) &.',
            preg_match('/\p{L}/u', $s) !== 1 => 'Enter a valid address, not just numbers.',
            count(array_filter(preg_split('/[\s,]+/', $s) ?: [])) < 3 || mb_strlen($s) < 10 => 'Enter a complete address (house no., street, barangay, city).',
            mb_strlen($s) > 200 => 'Keep the address under 200 characters.',
            default => '',
        };
    }

    /** @param  array<string, mixed>  $a */
    private static function answered(array $a, string $id): bool
    {
        return match ($id) {
            'course' => ! self::blank($a, 'course') || ! self::blank($a, 'course_other'),
            'permanent_address' => ! self::blank($a, 'permanent_address') || ! empty($a['permanent_same']),
            default => ! self::blank($a, $id),
        };
    }
}
