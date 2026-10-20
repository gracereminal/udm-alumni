<?php

use App\Exceptions\ApiException;
use App\Http\Controllers\SpaController;
use App\Http\Middleware\RequestId;
use App\Http\Middleware\RequireRole;
use App\Http\Middleware\RequireXhr;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        // Single-host deploy: the React app answers every other path (no web middleware: it is a static file).
        then: fn () => Route::fallback(SpaController::class),
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Railway's edge proxy terminates TLS, so the client IP and https scheme come from the proxy headers.
        $middleware->trustProxies(at: '*');
        $middleware->prepend(RequestId::class);
        $middleware->append(SecurityHeaders::class);
        $middleware->api(append: [RequireXhr::class]);
        $middleware->alias(['role' => RequireRole::class]);
        // The session cookie is an opaque random id; it is hashed server-side, not encrypted.
        $middleware->encryptCookies(except: ['udm_sid']); // config('auth.session.cookie')
        // An API: signed-out requests get 401 JSON, never a redirect to a login page.
        $middleware->redirectGuestsTo(null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['password', 'password_confirmation', 'current_password', 'token', 'code']);

        // Every error leaves the API as { error, code?, fields? } (plan-backend "Error shape"), plus the request id.
        $exceptions->render(function (Throwable $e, Request $request): JsonResponse {
            [$status, $body] = match (true) {
                $e instanceof ApiException => [$e->status, $e->body()],
                $e instanceof ValidationException => [422, [
                    'error' => 'Please correct the highlighted fields.',
                    'code' => 'validation',
                    'fields' => array_map(fn (array $messages) => $messages[0], $e->errors()),
                ]],
                $e instanceof AuthenticationException => [401, ['error' => 'Sign in to continue.', 'code' => 'unauthenticated']],
                $e instanceof AuthorizationException => [403, ['error' => 'You do not have access to this resource.', 'code' => 'forbidden']],
                $e instanceof ModelNotFoundException => [404, ['error' => 'Not found.', 'code' => 'not_found']],
                $e instanceof ThrottleRequestsException => [429, ['error' => 'Too many requests. Try again shortly.', 'code' => 'rate_limited']],
                $e instanceof HttpExceptionInterface => [$e->getStatusCode(), [
                    'error' => $e->getStatusCode() === 404 ? 'Not found.' : ($e->getMessage() ?: 'Request failed.'),
                ]],
                default => [500, ['error' => 'Something went wrong. Please try again.', 'code' => 'server_error']],
            };
            if ($status === 500 && config('app.debug')) {
                $body['debug'] = $e->getMessage();
            }
            $body['request_id'] = $request->attributes->get('request_id');

            $headers = $e instanceof HttpExceptionInterface ? $e->getHeaders() : [];

            return response()->json($body, $status, $headers);
        });
    })->create();
