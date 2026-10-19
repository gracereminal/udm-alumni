<?php

// Single-host deploy: non-API paths get the built client's index.html (SpaController), API paths stay JSON.

beforeEach(function () {
    $this->index = tempnam(sys_get_temp_dir(), 'spa');
    file_put_contents($this->index, '<!doctype html><div id="root"></div>');
    config(['app.spa_index' => $this->index]);
});

afterEach(fn () => @unlink($this->index));

it('serves the React app for client routes, uncached, with a CSP that allows its own scripts', function (string $path) {
    $response = $this->get($path)
        ->assertOk()
        ->assertHeader('Content-Type', 'text/html; charset=utf-8')
        ->assertSee('<div id="root"></div>', false);

    expect($response->headers->get('Cache-Control'))->toContain('no-cache')
        ->and($response->headers->get('Content-Security-Policy'))->toContain("script-src 'self'")
        ->and($response->headers->get('Content-Security-Policy'))->toContain('https://fonts.googleapis.com');
})->with(['/', '/admin/dashboard', '/alumni/profile']);

it('keeps unknown API paths as JSON 404s with the strict API CSP', function () {
    $this->getJson('/api/v1/nope')
        ->assertNotFound()
        ->assertJsonPath('error', 'Not found.')
        ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
});

it('returns 404 when the client has not been built', function () {
    config(['app.spa_index' => '/missing/index.html']);

    $this->get('/admin/dashboard')->assertNotFound();
});
