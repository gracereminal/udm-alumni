<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class HealthController extends Controller
{
    /** GET /health: select 1 against the database; polled by the host and the uptime check. */
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
        } catch (Throwable $e) {
            Log::error('health check: database unreachable', ['exception' => $e->getMessage()]);

            return response()->json(['ok' => false, 'db' => 'down'], 503);
        }

        return response()->json(['ok' => true, 'db' => 'up', 'time' => now()->toIso8601String()]);
    }
}
