<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** role:admin,dept — 401 when signed out, 403 when the signed-in role is not listed. */
class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user instanceof UserAccount) {
            throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
        }
        if (! in_array($user->role, $roles, true)) {
            throw ApiException::forbidden();
        }

        return $next($request);
    }
}
