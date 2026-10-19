<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CSRF defence for the cookie session: every state-changing request must carry X-Requested-With, which the client
 * always sends and a cross-site form post cannot set. Laravel's VerifyCsrfToken is not used (no XSRF token).
 */
class RequireXhr
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethodSafe() && $request->headers->get('X-Requested-With') !== 'XMLHttpRequest') {
            throw new ApiException(403, 'Missing X-Requested-With header.', 'csrf');
        }

        return $next($request);
    }
}
