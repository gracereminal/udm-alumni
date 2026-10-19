<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Single-host deploy: every non-API path gets the React app's index.html, so client routes like /admin/dashboard
 * survive a reload. The built assets (/assets/*, images) are plain files in public/ and never reach Laravel.
 * Unknown /api/* paths stay JSON 404s. Locally the client still runs on Vite, so this only matters once built.
 */
class SpaController
{
    public function __invoke(Request $request): Response
    {
        $index = config('app.spa_index');
        if ($request->is('api', 'api/*') || ! is_file($index)) {
            throw new NotFoundHttpException;
        }

        return response(file_get_contents($index), 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            // A new deploy changes the hashed asset names, so the page itself must never be cached.
            'Cache-Control' => 'no-cache',
        ]);
    }
}
