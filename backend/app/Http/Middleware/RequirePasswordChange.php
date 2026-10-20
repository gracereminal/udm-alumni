<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * An account still on its one-time password (must_change_password) can only use /auth/* (session, change-password,
 * logout) and the open lookups until it sets its own password; everything else is 403 password_change_required.
 */
class RequirePasswordChange
{
    private const OPEN = ['api/v1/health', 'api/v1/lookups'];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user instanceof UserAccount && $user->must_change_password
            && ! str_starts_with((string) $request->route()?->getName(), 'auth.')
            && ! $request->routeIs('files.public') && ! in_array($request->path(), self::OPEN, true)) {
            throw new ApiException(403, 'Set a new password to continue.', 'password_change_required');
        }

        return $next($request);
    }
}
