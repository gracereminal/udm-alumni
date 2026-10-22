<?php

use App\Support\RegistrationRules;
use Illuminate\Support\Facades\DB;

/** A complete registration body, as the client sends it after the last step. */
function registration(array $overrides = []): array
{
    return array_merge([
        'last_name' => 'Garcia', 'first_name' => 'Lea', 'middle_name' => 'Reyes', 'dob' => '2001-05-09',
        'present_address' => '123 Mabini St., Brgy. 650, Ermita, Manila', 'permanent_same' => true, 'permanent_address' => '',
        'gender' => 'Female', 'marital_status' => 'Single', 'indigenous' => 'No', 'pwd' => 'No',
        'mobile' => '0917 123 4567', 'email' => 'lea.garcia@example.com', 'facebook' => 'lea.garcia', 'linkedin' => 'https://linkedin.com/in/leagarcia',
        'college' => 'College of Computing Studies', 'course' => 'Bachelor of Science in Information Technology', 'course_other' => '',
        'year_graduated' => '2025', 'reg_pw' => 'Register123', 'reg_pw2' => 'Register123', 'privacy_consent' => true,
    ], $overrides);
}

it('registers an active account with its alumni record, without signing in', function () {
    $response = $this->postJson('/api/v1/auth/register', registration())
        ->assertCreated()
        ->assertJson(['ok' => true, 'status' => 'active'])
        ->assertJsonPath('membershipId', fn ($id) => (bool) preg_match('/^AM-2025-\d{5}$/', $id))
        ->assertCookieMissing('udm_sid');

    $user = DB::table('user_account')->where('email', 'lea.garcia@example.com')->first();
    $alumnus = DB::table('alumnus as a')->join('program as p', 'p.program_id', '=', 'a.program_id')
        ->where('a.user_id', $user->user_id)->first(['a.*', 'p.code AS program_code']);

    expect($user->account_status)->toBe('active')
        ->and($user->role)->toBe('alumni')
        ->and($user->password_hash)->toStartWith('$argon2id$')
        ->and($alumnus->program_code)->toBe('CCS-BSIT')
        ->and($alumnus->membership_id)->toBe($response->json('membershipId'))
        ->and($alumnus->mobile_no)->toBe('639171234567')
        ->and($alumnus->permanent_address)->toBe('123 Mabini St., Brgy. 650, Ermita, Manila')
        ->and($alumnus->sex)->toBe('female')
        ->and($alumnus->civil_status)->toBe('single')
        ->and($alumnus->verification_status)->toBe('verified')
        ->and($alumnus->record_source)->toBe('self_registration')
        ->and($alumnus->privacy_consent_at)->not->toBeNull()
        ->and(DB::table('social_link')->where('alumni_id', $alumnus->alumni_id)->orderBy('platform')->pluck('url', 'platform')->all())
        ->toBe(['facebook' => 'lea.garcia', 'linkedin' => 'https://linkedin.com/in/leagarcia'])
        ->and(DB::table('record_review')->where('alumni_id', $alumnus->alumni_id)->value('action'))->toBe('create')
        ->and(DB::table('audit_log')->where(['action' => 'register', 'entity_id' => $alumnus->alumni_id])->exists())->toBeTrue();

    // No admin approval needed: the account signs in right away.
    $this->postJson('/api/v1/auth/login', ['identifier' => 'lea.garcia@example.com', 'password' => 'Register123'])
        ->assertOk()->assertJsonPath('user.role', 'alumni');
});

it('numbers registrations in the same AM-YYYY-NNNNN sequence as staff-created records', function () {
    $last = (int) DB::table('alumnus')->where('membership_id', '~', '^AM-2026-[0-9]{5}$')->max(DB::raw('substring(membership_id from 9)::int'));
    $this->postJson('/api/v1/auth/register', registration(['year_graduated' => '2026']))->assertCreated()
        ->assertJsonPath('membershipId', sprintf('AM-2026-%05d', $last + 1));
    $this->postJson('/api/v1/auth/register', registration(['email' => 'second@example.com', 'year_graduated' => '2026']))->assertCreated()
        ->assertJsonPath('membershipId', sprintf('AM-2026-%05d', $last + 2));
});

it('notifies admins and that college only', function () {
    $cet = DB::table('college')->where('code', 'CET')->value('college_id');
    $cetDean = DB::table('user_account')->insertGetId(['email' => 'cet.dean@example.com', 'password_hash' => 'x', 'role' => 'dept', 'college_id' => $cet, 'display_name' => 'CET Dean'], 'user_id');

    $before = DB::table('notification')->max('notification_id');
    $this->postJson('/api/v1/auth/register', registration())->assertCreated();

    $new = DB::table('notification as n')->join('user_account as u', 'u.user_id', '=', 'n.user_id')
        ->where('n.notification_id', '>', $before)->orderBy('u.email')->get(['u.email', 'n.type', 'n.message', 'n.link_url']);
    expect($new->pluck('email')->all())->toBe(['admin@udmalumni.edu', 'ccs.dean@udmalumni.edu'])
        ->and(DB::table('notification')->where('user_id', $cetDean)->exists())->toBeFalse()
        ->and($new->pluck('type')->unique()->all())->toBe(['registration'])
        ->and($new->first()->message)->toBe('Lea Garcia (BSIT 2025) registered.')
        ->and($new->first()->link_url)->toBe('records');
});

it('refuses an email that is already registered, in any case', function () {
    $this->postJson('/api/v1/auth/register', registration(['email' => 'Maria.DelaCruz@udmalumni.edu']))
        ->assertStatus(409)
        ->assertJsonPath('code', 'email_taken')
        ->assertJsonPath('fields.email', 'An account with this email already exists. Sign in or reset your password.');
});

it('returns every field error keyed by field id, with the client messages', function () {
    $this->postJson('/api/v1/auth/register', [
        'dob' => '2999-01-01', 'present_address' => '12', 'mobile' => '12345', 'email' => 'nope',
        'year_graduated' => '1998', 'reg_pw' => 'weakpass', 'reg_pw2' => 'other', 'marital_status' => 'Married', 'pwd' => 'Yes',
    ])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation')
        ->assertJsonPath('fields.last_name', 'Enter your last name.')
        ->assertJsonPath('fields.dob', 'Date of birth cannot be in the future.')
        ->assertJsonPath('fields.present_address', 'Enter a valid address, not just numbers.')
        ->assertJsonPath('fields.permanent_address', 'Enter your permanent address.')
        ->assertJsonPath('fields.married_name', 'Enter your full name after marriage.')
        ->assertJsonPath('fields.pwd_type', 'Select your type of disability.')
        ->assertJsonPath('fields.mobile', 'Enter a valid mobile number (e.g. 09XX XXX XXXX).')
        ->assertJsonPath('fields.email', 'Enter a valid email address.')
        ->assertJsonPath('fields.facebook', 'Enter your Facebook / Messenger username or profile link.')
        ->assertJsonPath('fields.course', 'Select your program or indicate it under Others.')
        ->assertJsonPath('fields.year_graduated', 'Only years 1999 onward are allowed.')
        ->assertJsonPath('fields.reg_pw', 'Use at least 8 characters, including 1 number and 1 uppercase letter.')
        ->assertJsonPath('fields.reg_pw2', 'Passwords do not match.')
        ->assertJsonPath('fields.privacy_consent', 'Accept the privacy notice to register.');

    expect(DB::table('user_account')->where('email', 'nope')->exists())->toBeFalse();
});

it('rejects a program that is not in the chosen college', function () {
    $this->postJson('/api/v1/auth/register', registration(['course' => 'Bachelor of Science in Nursing']))
        ->assertStatus(422)
        ->assertJsonPath('fields.course', 'Select a program from the list, or indicate it under Others.');
});

it('stores a typed program under "Others" as an unmapped program', function () {
    $this->postJson('/api/v1/auth/register', registration(['college' => 'Others', 'course' => '', 'course_other' => 'BS Marine Engineering']))
        ->assertCreated();

    $a = DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')->join('college as c', 'c.college_id', '=', 'a.declared_college_id')
        ->where('u.email', 'lea.garcia@example.com')->first(['a.program_id', 'a.course_other', 'c.code']);
    expect($a->program_id)->toBeNull()
        ->and($a->course_other)->toBe('BS Marine Engineering')
        ->and($a->code)->toBe('OTH');
});

it('follows the Admin tracer-question edits for required and hidden fields', function () {
    DB::table('tracer_question')->insert([
        ['field_id' => 'facebook', 'section' => 'contact', 'form' => 'both', 'shown' => false, 'required' => null],
        ['field_id' => 'middle_name', 'section' => 'personal', 'form' => 'both', 'shown' => null, 'required' => true],
    ]);

    $this->postJson('/api/v1/auth/register', registration(['facebook' => '', 'middle_name' => '']))
        ->assertStatus(422)
        ->assertJsonMissingPath('fields.facebook')
        ->assertJsonPath('fields.middle_name', RegistrationRules::REQUIRED);

    $this->postJson('/api/v1/auth/register', registration(['facebook' => '', 'middle_name' => 'Reyes']))->assertCreated();
});
