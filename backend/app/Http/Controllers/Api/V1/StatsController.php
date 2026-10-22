<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\SettingsService;
use App\Services\StatsService;
use App\Support\Lists;
use App\Support\Scope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** /stats/* (role:admin,dept). Admin: all colleges or a chosen one; dept: always their own college. */
class StatsController extends Controller
{
    public function __construct(
        private readonly StatsService $stats,
        private readonly SettingsService $settings,
    ) {}

    /** GET /stats/summary: the KPI metrics plus the targets. */
    public function summary(Request $request): JsonResponse
    {
        $s = $this->settings->all();

        return response()->json($this->stats->aggregate($this->scope($request), $this->filters($request))
            + ['targets' => ['employment' => $s['employment_target'], 'coverage' => $s['coverage_target']]]);
    }

    /** GET /stats/benchmark: university-wide rates only (no counts), for the college dashboard's comparison. */
    public function benchmark(Request $request): JsonResponse
    {
        $this->scope($request); // staff only
        $m = $this->stats->aggregate(Scope::all());

        return response()->json(array_intersect_key($m, array_flip(['employmentRate', 'alignedRate', 'coverage', 'firstGenRate', 'completion'])));
    }

    /** GET /stats/by-batch */
    public function byBatch(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->stats->label($this->stats->aggregate($this->scope($request), $this->filters($request), 'batch'), 'batch')]);
    }

    /** GET /stats/by-program?group=college|program|batch (default: college for admin, program inside a college, batch inside a program). */
    public function byProgram(Request $request): JsonResponse
    {
        $f = $this->filters($request);
        $scope = $this->scope($request);
        $group = $request->validate(['group' => 'nullable|in:college,program,batch'])['group']
            ?? (! empty($f['program_id']) ? 'batch' : (! empty($f['college_id']) || $scope->role === 'dept' ? 'program' : 'college'));

        return response()->json(['group' => $group, 'data' => $this->stats->label($this->stats->aggregate($scope, $f, $group), $group)]);
    }

    /** GET /stats/sectors */
    public function sectors(Request $request): JsonResponse
    {
        return response()->json($this->stats->sectors($this->scope($request), $this->filters($request)));
    }

    /** GET /stats/inclusion */
    public function inclusion(Request $request): JsonResponse
    {
        return response()->json($this->stats->inclusion($this->scope($request), $this->filters($request)));
    }

    /** GET /stats/counters: the Records counter cards. */
    public function counters(Request $request): JsonResponse
    {
        return response()->json($this->stats->counters($this->scope($request), $this->filters($request)));
    }

    /** GET /stats/unresponsive?reason=seeking|new|no_response&page&per_page: the College Outreach list. */
    public function unresponsive(Request $request): JsonResponse
    {
        $f = $this->filters($request) + $request->validate(['reason' => 'nullable|in:seeking,new,no_response']);
        [$page, $per] = Lists::paging($request, 20);
        $r = $this->stats->unresponsive($this->scope($request), $f, $page, $per);

        return response()->json(Lists::out($r['rows'], $r['total'], $page, $per, [
            'byReason' => (object) $r['byReason'],
            'outreachIntervalDays' => $this->settings->get('outreach_interval_days'),
        ]));
    }

    /** @return array<string, mixed> */
    private function filters(Request $request): array
    {
        $f = $request->validate([
            'college_id' => 'nullable|integer|min:1',
            'program_id' => 'nullable|integer|min:1',
            'unmapped' => 'nullable|in:1,true',
            'batch' => 'nullable|integer|between:1950,2100',
            'batch_from' => 'nullable|integer|between:1950,2100',
            'batch_to' => 'nullable|integer|between:1950,2100',
            'batches' => ['nullable', 'regex:/^\d{4}(,\d{4})*$/'],
            'status' => 'nullable|in:verified,flagged',
        ]);
        if (isset($f['batches'])) {
            $f['batches'] = array_map('intval', explode(',', $f['batches']));
        }

        return $f;
    }

    private function scope(Request $request): Scope
    {
        $user = $request->user();

        return Scope::for($user instanceof UserAccount ? $user : null);
    }
}
