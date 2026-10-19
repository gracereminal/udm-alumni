<?php

namespace App\Auth;

use App\Models\UserAccount;
use App\Services\SessionService;
use Illuminate\Auth\GuardHelpers;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Http\Request;

/**
 * Resolves the signed-in user from the auth_session cookie, so $request->user() and the auth middleware work
 * everywhere. Registered as the "auth_session" driver in AppServiceProvider.
 */
class SessionGuard implements Guard
{
    use GuardHelpers;

    private bool $resolved = false;

    private ?int $sessionId = null;

    public function __construct(private readonly SessionService $sessions, private Request $request) {}

    public function user(): ?Authenticatable
    {
        if ($this->resolved) {
            return $this->user;
        }
        $this->resolved = true;

        $row = $this->sessions->resolve($this->request->cookies->get((string) config('auth.session.cookie')));
        if ($row !== null) {
            $this->sessionId = (int) $row->session_id;
            $this->user = UserAccount::find($row->user_id);
        }

        return $this->user;
    }

    /** The auth_session row behind the current request, for logout and "sign out other sessions". */
    public function sessionId(): ?int
    {
        $this->user();

        return $this->sessionId;
    }

    /** @param  array<string, mixed>  $credentials */
    public function validate(array $credentials = []): bool
    {
        return false; // sign-in goes through AuthController, not the guard
    }

    /** Sets the user directly (tests' actingAs); kept across requests until forgotten. */
    public function setUser(Authenticatable $user): static
    {
        $this->user = $user;
        $this->resolved = true;
        $this->sessionId = null;

        return $this;
    }

    /**
     * A new request (the container refreshes it per request, and tests reuse the guard) resolves the cookie again,
     * so a session revoked in between is seen at once. A user set with setUser() stays.
     */
    public function setRequest(Request $request): static
    {
        $this->request = $request;
        if ($this->sessionId !== null || $this->user === null) {
            $this->forgetUser();
            $this->resolved = false;
            $this->sessionId = null;
        }

        return $this;
    }
}
