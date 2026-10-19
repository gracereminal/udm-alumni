<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Services\ScheduledJobs;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/** POST /internal/jobs/:name for the host's cron (X-Cron-Secret header). Use this or schedule:run, not both. */
class InternalJobsController extends Controller
{
    public function __invoke(Request $request, string $name, ScheduledJobs $jobs): JsonResponse
    {
        $secret = (string) config('app.cron_secret');
        if ($secret === '' || ! hash_equals($secret, (string) $request->header('X-Cron-Secret'))) {
            throw new ApiException(401, 'Unauthorized.', 'unauthenticated');
        }
        if (! in_array($name, ScheduledJobs::NAMES, true)) {
            throw ApiException::notFound('Unknown job.');
        }
        $started = microtime(true);
        $result = $jobs->run($name);
        Log::info('scheduled job finished', ['job' => $name, 'result' => $result, 'ms' => (int) ((microtime(true) - $started) * 1000)]);

        return response()->json(['ok' => true, 'job' => $name, 'result' => $result]);
    }
}
