<?php

use Database\Seeders\DemoSeeder;
use Database\Seeders\LookupSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

it('seeds the demo accounts with the demo password', function (string $email, string $role, string $status) {
    $user = DB::table('user_account')->where('email', $email)->first();

    expect($user)->not->toBeNull()
        ->and($user->role)->toBe($role)
        ->and($user->account_status)->toBe($status)
        ->and(Hash::check(DemoSeeder::PASSWORD, $user->password_hash))->toBeTrue()
        ->and($user->password_hash)->toStartWith('$argon2id$');
})->with([
    ['maria.delacruz@udmalumni.edu', 'alumni', 'active'],
    ['ccs.dean@udmalumni.edu', 'dept', 'active'],
    ['admin@udmalumni.edu', 'admin', 'active'],
    ['paolo.mendoza@gmail.com', 'alumni', 'active'],
]);

it('links Maria to her alumni record with both identifiers', function () {
    $maria = DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')
        ->where('u.email', 'maria.delacruz@udmalumni.edu')->first(['a.student_no', 'a.membership_id']);

    expect($maria->student_no)->toBe('24-05-567')
        ->and($maria->membership_id)->toBe('AM-2024-00567');
});

it('puts the dean in the College of Computing Studies and gives staff no alumni record', function () {
    $dean = DB::table('user_account as u')->join('college as c', 'c.college_id', '=', 'u.college_id')
        ->where('u.email', 'ccs.dean@udmalumni.edu')->first(['c.name', 'u.user_id']);

    expect($dean->name)->toBe('College of Computing Studies')
        ->and(DB::table('alumnus')->where('user_id', $dean->user_id)->exists())->toBeFalse();
});

it('gives every Alumni ID the class year as its first two digits', function () {
    $wrong = DB::table('alumnus')->whereNotNull('student_no')
        ->whereRaw("left(student_no, 2) <> lpad((year_graduated % 100)::text, 2, '0')")->count();

    expect($wrong)->toBe(0);
});

it('stores survey answers in sync with the typed columns', function () {
    $mismatch = DB::table('survey_response')
        ->whereRaw("first_gen_grad IS DISTINCT FROM (CASE answers->>'first_grad' WHEN 'Yes' THEN true WHEN 'No' THEN false END)")
        ->count();

    expect($mismatch)->toBe(0);
});

it('re-runs LookupSeeder without duplicating or overwriting settings', function () {
    DB::table('app_setting')->where('key', 'coverage_target')->update(['value' => '70']);
    $counts = fn () => [DB::table('college')->count(), DB::table('program')->count(), DB::table('skill')->count(), DB::table('survey_cycle')->count()];
    $before = $counts();

    $this->seed(LookupSeeder::class);

    expect($counts())->toBe($before)
        ->and(DB::table('app_setting')->where('key', 'coverage_target')->value('value'))->toBe('70');
});

it('refuses to seed demo data in production or into an existing population', function () {
    expect(fn () => $this->seed(DemoSeeder::class))->toThrow(RuntimeException::class, 'Alumni already exist');

    app()->instance('env', 'production');
    expect(fn () => DemoSeeder::assertAllowed())->toThrow(RuntimeException::class, 'APP_ENV=production');
});

it('refuses to seed demo data into a production-looking database', function () {
    config(['database.connections.pgsql.url' => 'postgresql://u:p@ep-prod.neon.tech/db?sslmode=require']);
    expect(fn () => DemoSeeder::assertAllowed())->toThrow(RuntimeException::class, 'TLS');

    config(['database.connections.pgsql.url' => 'postgresql://u:p@db.staging.example.com/db']);
    expect(fn () => DemoSeeder::assertAllowed())->toThrow(RuntimeException::class, 'non-local');
});
