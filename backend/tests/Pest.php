<?php

use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
| Feature tests run against the udm_alumni_test Postgres database (phpunit.xml), migrated once per run and
| seeded with LookupSeeder + DemoSeeder; each test runs inside a transaction that is rolled back.
*/
pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)->in('Unit');

/** Signs in through POST /auth/login and returns the session cookie value. */
function signIn(string $identifier, string $password = DemoSeeder::PASSWORD): string
{
    $cookie = test()->postJson('/api/v1/auth/login', ['identifier' => $identifier, 'password' => $password])
        ->assertOk()
        ->getCookie('udm_sid', false);

    return (string) $cookie?->getValue();
}

/** Sends the session cookie on the following requests ('' to send none). */
function withSession(string $token): mixed
{
    return test()->withUnencryptedCookie('udm_sid', $token);
}
