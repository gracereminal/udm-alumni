<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\JobService;
use App\Services\StorageService;
use App\Support\Lists;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Job board and approval queue. Board: any signed-in user; post: admin or alumni; review: admin. */
class JobsController extends Controller
{
    public function __construct(
        private readonly JobService $jobs,
        private readonly StorageService $storage,
    ) {}

    /** GET /jobs?view=board|mine|queue|all&q&page&per_page */
    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['view' => 'nullable|in:board,mine,queue,all', 'q' => 'nullable|string|max:100']);
        [$page, $per] = Lists::paging($request, 50);
        $r = $this->jobs->list($this->user($request), $f['view'] ?? 'board', $f['q'] ?? null, $page, $per);

        return response()->json(Lists::out($r['rows'], $r['total'], $page, $per));
    }

    /** GET /jobs/:id */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->jobs->get($id, $this->user($request)));
    }

    /** POST /jobs { title, company, location, type, salary, salaryNote, deadline, applyVia, messenger, desc, tags, badge, note } */
    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $id = DB::transaction(fn () => $this->jobs->create($request->all(), $user));

        return response()->json($this->jobs->get($id, $user), 201);
    }

    /** PATCH /jobs/:id (admin; or the poster while it is pending) */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        DB::transaction(fn () => $this->jobs->update($id, $request->all(), $user));

        return response()->json($this->jobs->get($id, $user));
    }

    /** DELETE /jobs/:id (soft delete; admin can restore) */
    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::transaction(fn () => $this->jobs->delete($id, $this->user($request)));

        return response()->json(['ok' => true]);
    }

    /** POST /jobs/:id/photo (multipart `photo`): the company logo. */
    public function photo(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        $file = $this->storage->store($request->file('photo'), 'image', 'photo');
        $this->jobs->setPhoto($id, $file['key'], $user);

        return response()->json($this->jobs->get($id, $user));
    }

    /** POST /jobs/:id/approve|reject|deactivate|activate|restore { reason? } (admin) */
    public function decide(Request $request, int $id, string $action): JsonResponse
    {
        $reason = $request->validate(['reason' => 'nullable|string|max:500'])['reason'] ?? null;
        $user = $this->user($request);
        DB::transaction(fn () => $this->jobs->decide($id, $action, $reason === null ? null : trim($reason), $user));

        return response()->json($this->jobs->get($id, $user));
    }

    /** POST|DELETE /jobs/:id/save (alumni) */
    public function save(Request $request, int $id): JsonResponse
    {
        DB::transaction(fn () => $this->jobs->save($id, $this->alumniId($request), $request->isMethod('post')));

        return response()->json($this->jobs->get($id, $this->user($request)));
    }

    /** POST /jobs/:id/apply { via: messenger|email|website }, DELETE /jobs/:id/apply (withdraw) (alumni) */
    public function apply(Request $request, int $id): JsonResponse
    {
        $via = $request->isMethod('post') ? $request->validate(['via' => 'required|in:messenger,email,website'])['via'] : null;
        DB::transaction(fn () => $this->jobs->apply($id, $this->alumniId($request), $via));

        return response()->json($this->jobs->get($id, $this->user($request)));
    }

    private function alumniId(Request $request): int
    {
        $id = DB::table('alumnus')->where('user_id', $this->user($request)->user_id)->whereNull('merged_into_id')->value('alumni_id');

        return $id === null ? throw ApiException::forbidden('No alumni record is linked to this account.') : (int) $id;
    }

    private function user(Request $request): UserAccount
    {
        $user = $request->user();

        return $user instanceof UserAccount ? $user : throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
    }
}
