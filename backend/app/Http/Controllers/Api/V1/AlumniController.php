<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AlumniService;
use App\Support\Lists;
use App\Support\Scope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Alumni Records (role:admin,dept). Admin sees every college; a dept user only their own (Scope::for). */
class AlumniController extends Controller
{
    private const ACTIONS = ['verify', 'flag', 'unflag', 'archive', 'restore'];

    public function __construct(private readonly AlumniService $alumni) {}

    /** GET /alumni?q&college_id&program_id&unmapped&batch&status&employment&sort&dir&page&per_page */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate([
            'q' => 'nullable|string|max:100',
            'college_id' => 'nullable|integer|min:1',
            'program_id' => 'nullable|integer|min:1',
            'unmapped' => 'nullable|in:1,true',
            'batch' => 'nullable|integer|between:1950,2100',
            'batch_from' => 'nullable|integer|between:1950,2100',
            'batch_to' => 'nullable|integer|between:1950,2100',
            'status' => 'nullable|in:all,'.implode(',', AlumniService::STATUSES),
            'employment' => 'nullable|in:unanswered,'.implode(',', AlumniService::EMPLOYMENT),
            'sort' => 'nullable|in:updated_at,created_at,name,batch',
            'dir' => 'nullable|in:asc,desc',
        ]);
        [$page, $per] = Lists::paging($request);
        $r = $this->alumni->list(Scope::for($this->user($request)), $f, $page, $per);

        return response()->json(Lists::out($r['rows'], $r['total'], $page, $per));
    }

    /** GET /alumni/activity?limit */
    public function activity(Request $request): JsonResponse
    {
        $limit = (int) ($request->validate(['limit' => 'nullable|integer|between:1,50'])['limit'] ?? 5);

        return response()->json(['data' => $this->alumni->activity(Scope::for($this->user($request)), $limit)]);
    }

    /** GET /alumni/:id (sensitive fields; the read is audited) */
    public function show(Request $request, int $id): JsonResponse
    {
        $this->inScope($request, $id);

        return response()->json($this->alumni->detail($id));
    }

    /** POST /alumni: the Records "Add alumni record" form (full name or first/last, college, course, year, contacts, employment). */
    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $id = DB::transaction(fn () => $this->alumni->create($this->body($request), $user, Scope::for($user)));

        return response()->json(AlumniService::row($this->alumni->find($id)), 201);
    }

    /** PATCH /alumni/:id: partial staff edit. */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        $this->inScope($request, $id);
        DB::transaction(fn () => $this->alumni->update($id, $this->body($request) + $request->only('reason'), $user, Scope::for($user)));

        return response()->json(AlumniService::row($this->alumni->find($id)));
    }

    /** POST /alumni/:id/status { action: verify|flag|unflag|archive|restore, reason } */
    public function status(Request $request, int $id): JsonResponse
    {
        $b = $request->validate(['action' => 'required|in:'.implode(',', self::ACTIONS), 'reason' => 'nullable|string|max:1000']);
        $this->inScope($request, $id);
        DB::transaction(fn () => $this->alumni->changeStatus($id, $b['action'], $b['reason'] ?? null, $this->user($request)));

        return response()->json(AlumniService::row($this->alumni->find($id)));
    }

    /** POST /alumni/bulk-status { ids, action, reason }: all or nothing. */
    public function bulkStatus(Request $request): JsonResponse
    {
        $b = $request->validate([
            'ids' => 'required|array|min:1|max:500', 'ids.*' => 'integer|min:1',
            'action' => 'required|in:'.implode(',', self::ACTIONS), 'reason' => 'nullable|string|max:1000',
        ]);
        $ids = array_values(array_unique(array_map('intval', $b['ids'])));
        foreach ($ids as $id) {
            $this->inScope($request, $id);
        }
        DB::transaction(function () use ($ids, $b, $request) {
            foreach ($ids as $id) {
                $this->alumni->changeStatus($id, $b['action'], $b['reason'] ?? null, $this->user($request));
            }
        });

        return response()->json(['ok' => true, 'count' => count($ids)]);
    }

    /** POST /alumni/:id/merge { into_id }: merges this duplicate into the surviving record. */
    public function merge(Request $request, int $id): JsonResponse
    {
        $into = (int) $request->validate(['into_id' => 'required|integer|min:1'])['into_id'];
        $this->inScope($request, $id);
        $this->inScope($request, $into);
        DB::transaction(fn () => $this->alumni->merge($id, $into, $this->user($request)));

        return response()->json(AlumniService::row($this->alumni->find($into)));
    }

    /** POST /alumni/:id/map-program { program_id }: an unmapped (typed) program becomes a catalog program. */
    public function mapProgram(Request $request, int $id): JsonResponse
    {
        $programId = (int) $request->validate(['program_id' => 'required|integer|min:1'])['program_id'];
        $user = $this->user($request);
        $this->inScope($request, $id);
        DB::transaction(fn () => $this->alumni->mapProgram($id, $programId, $user, Scope::for($user)));

        return response()->json(AlumniService::row($this->alumni->find($id)));
    }

    /** POST /alumni/:id/emails { subject }: records "Email composed" (the portal sends nothing). */
    public function emailComposed(Request $request, int $id): JsonResponse
    {
        $subject = trim((string) $request->validate(['subject' => 'required|string|max:200'])['subject']);
        $this->inScope($request, $id);
        DB::transaction(fn () => $this->alumni->emailComposed($id, $subject, $this->user($request)));

        return response()->json(['ok' => true]);
    }

    /** POST /alumni/import { rows: [...] }: the registrar's graduate list, parsed from CSV by the client. */
    public function import(Request $request): JsonResponse
    {
        $rows = $request->validate(['rows' => 'required|array|min:1|max:5000', 'rows.*' => 'array'])['rows'];
        $user = $this->user($request);

        return response()->json(DB::transaction(fn () => $this->alumni->import(array_values($rows), $user, Scope::for($user))));
    }

    /** @return array<string, mixed> */
    private function body(Request $request): array
    {
        return $request->only(['name', 'last_name', 'first_name', 'middle_name', 'college', 'course', 'course_other', 'year_graduated',
            'student_no', 'mobile', 'address', 'note', 'email', 'employment', 'company', 'source', 'status']);
    }

    private function inScope(Request $request, int $alumniId): void
    {
        if (! DB::table('alumnus')->where('alumni_id', $alumniId)->exists()) {
            throw ApiException::notFound();
        }
        Scope::for($this->user($request))->authorizeAlumnus($alumniId);
    }

    private function user(Request $request): UserAccount
    {
        /** @var UserAccount */
        return $request->user();
    }
}
