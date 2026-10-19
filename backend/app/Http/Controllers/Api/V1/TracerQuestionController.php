<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\SurveyService;
use App\Services\TracerQuestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Alumni Tracer question manager. GET is public (registration needs it); writes are admin only. Every write
 * re-derives completion_pct, because Required / shown decide what counts.
 */
class TracerQuestionController extends Controller
{
    public function __construct(
        private readonly TracerQuestionService $questions,
        private readonly SurveyService $surveys,
    ) {}

    /** GET /tracer/questions: { ov, custom, order }, applied by the client on top of data/formDefs.js. */
    public function index(): JsonResponse
    {
        return response()->json($this->questions->config());
    }

    /** PUT /tracer/questions/:field_id { section, label?, placeholder?, options?, required?, hidden? } */
    public function update(Request $request, string $fieldId): JsonResponse
    {
        $b = $request->validate([
            'section' => 'nullable|string|max:40', 'label' => 'nullable|string|max:255', 'placeholder' => 'nullable|string|max:255',
            'options' => 'nullable|array|max:40', 'required' => 'nullable|boolean', 'hidden' => 'nullable|boolean',
        ]);

        return $this->write(fn () => $this->questions->put($fieldId, array_intersect_key($request->all(), $b + ['section' => 1]), $this->actor($request)));
    }

    /** POST /tracer/questions { section, label, type, options }: an added question. */
    public function store(Request $request): JsonResponse
    {
        $id = null;
        $this->write(function () use ($request, &$id) {
            $id = $this->questions->create($request->only(['id', 'section', 'label', 'type', 'options']), $this->actor($request));
        });

        return response()->json(['id' => $id] + $this->questions->config(), 201);
    }

    /** PUT /tracer/sections/:section/order { ids } */
    public function order(Request $request, string $section): JsonResponse
    {
        $ids = $request->validate(['ids' => 'required|array|max:80', 'ids.*' => 'required|string|max:60'])['ids'];

        return $this->write(fn () => $this->questions->order($section, array_values($ids), $this->actor($request)));
    }

    /** DELETE /tracer/questions/:field_id: resets an edit, or deletes an added question. */
    public function destroy(Request $request, string $fieldId): JsonResponse
    {
        return $this->write(fn () => $this->questions->reset($fieldId, $this->actor($request)));
    }

    /** DELETE /tracer/questions: back to the defaults. */
    public function resetAll(Request $request): JsonResponse
    {
        return $this->write(fn () => $this->questions->resetAll($this->actor($request)));
    }

    private function write(callable $change): JsonResponse
    {
        DB::transaction(function () use ($change) {
            $change();
            $this->surveys->recomputeAll();
        });

        return response()->json($this->questions->config());
    }

    private function actor(Request $request): int
    {
        $user = $request->user();

        return $user instanceof UserAccount ? $user->user_id : 0;
    }
}
