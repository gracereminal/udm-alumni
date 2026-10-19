<?php

use App\Exceptions\ApiException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

it('reports health with a database round-trip', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJson(['ok' => true, 'db' => 'up'])
        ->assertHeader('X-Request-Id');
});

it('returns 503 when the database is unreachable', function () {
    // A separate unreachable connection, so the test transaction on pgsql survives.
    config(['database.connections.unreachable' => ['port' => 1, 'connect_timeout' => 1] + config('database.connections.pgsql')]);
    config(['database.default' => 'unreachable']);

    try {
        $this->getJson('/api/v1/health')->assertStatus(503)->assertJson(['ok' => false, 'db' => 'down']);
    } finally {
        config(['database.default' => 'pgsql']);
    }
});

it('renders unknown routes in the error shape', function () {
    $this->getJson('/api/v1/nope')
        ->assertNotFound()
        ->assertJson(['error' => 'Not found.'])
        ->assertJsonStructure(['error', 'request_id']);
});

it('renders validation errors as { error, code, fields } keyed by field id', function () {
    Route::post('/api/v1/_test/validate', fn (Request $r) => $r->validate(['email' => 'required|email', 'last_name' => 'required']));

    $this->postJson('/api/v1/_test/validate', ['email' => 'not-an-email'])
        ->assertStatus(422)
        ->assertJsonPath('code', 'validation')
        ->assertJsonStructure(['error', 'fields' => ['email', 'last_name'], 'request_id'])
        ->assertJsonMissingPath('errors')
        ->assertJsonMissingPath('message');
});

it('renders ApiException with its status, code and fields', function () {
    Route::get('/api/v1/_test/conflict', fn () => throw new ApiException(409, 'That email is already registered.', 'email_taken', ['email' => 'Already registered.']));

    $this->getJson('/api/v1/_test/conflict')
        ->assertStatus(409)
        ->assertJson(['error' => 'That email is already registered.', 'code' => 'email_taken', 'fields' => ['email' => 'Already registered.']]);
});

it('hides internal errors behind a generic message', function () {
    config(['app.debug' => false]);
    Route::get('/api/v1/_test/boom', fn () => throw new RuntimeException('secret detail'));

    $response = $this->getJson('/api/v1/_test/boom')->assertStatus(500)->assertJsonPath('code', 'server_error');
    expect($response->getContent())->not->toContain('secret detail');
});

it('echoes a well-formed X-Request-Id', function () {
    $this->getJson('/api/v1/health', ['X-Request-Id' => 'abc12345-test'])->assertHeader('X-Request-Id', 'abc12345-test');
});
