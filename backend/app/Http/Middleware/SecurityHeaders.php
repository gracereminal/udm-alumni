<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Security headers for a JSON API (the helmet equivalent), plus the 1 MB limit on JSON bodies. */
class SecurityHeaders
{
    private const MAX_JSON_BYTES = 1_048_576;

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isJson() && strlen($request->getContent()) > self::MAX_JSON_BYTES) {
            throw new ApiException(413, 'The request is too large.', 'payload_too_large');
        }

        $response = $next($request);
        $h = $response->headers;
        $h->set('X-Content-Type-Options', 'nosniff');
        $h->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $h->set('X-Frame-Options', 'DENY');
        $h->set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
        $h->set('Cross-Origin-Resource-Policy', 'same-origin');
        if (app()->environment('production')) {
            $h->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
