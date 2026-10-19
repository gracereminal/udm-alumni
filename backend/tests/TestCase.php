<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** The schema uses Postgres enums and views, so migrate:fresh must drop them too. */
    protected bool $dropViews = true;

    protected bool $dropTypes = true;

    /** RefreshDatabase seeds the fresh test database once (LookupSeeder + DemoSeeder). */
    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();
        // The client sends this on every call; RequireXhr rejects state-changing requests without it.
        $this->withHeader('X-Requested-With', 'XMLHttpRequest');
        // Like the client's fetch(..., { credentials: 'include' }): JSON requests carry the session cookie.
        $this->withCredentials();
    }
}
