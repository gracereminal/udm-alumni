<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AuditService;
use App\Services\EventService;
use App\Services\StorageService;
use App\Support\Vocab;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Events (read: signed-in; write: admin; RSVP: alumni) and standalone announcements (read: signed-in; write: admin). */
class EventsController extends Controller
{
    public function __construct(
        private readonly EventService $events,
        private readonly StorageService $storage,
        private readonly AuditService $audit,
    ) {}

    /** GET /events?when=upcoming|past (unpublished drafts only for admin) */
    public function index(Request $request): JsonResponse
    {
        $when = $request->validate(['when' => 'nullable|in:upcoming,past'])['when'] ?? null;

        return response()->json(['data' => $this->events->list($this->user($request), $when)]);
    }

    /** GET /events/:id (the confirmation email's deep link) */
    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->events->get($id, $this->user($request)));
    }

    /** POST /events { title, kind, organizer, dateISO, timeStart, timeEnd, venue, fee, capacity, highlights, body, agenda, regFields, publish, coverFrom } */
    public function store(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $id = DB::transaction(fn () => $this->events->create($request->all(), $user));

        return response()->json($this->events->get($id, $user), 201);
    }

    /** PATCH /events/:id (partial, plus status: open|closed|full|past and annHidden) */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        DB::transaction(fn () => $this->events->update($id, $request->all(), $user));

        return response()->json($this->events->get($id, $user));
    }

    /** DELETE /events/:id */
    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::transaction(fn () => $this->events->delete($id, $this->user($request)));

        return response()->json(['ok' => true]);
    }

    /** POST /events/:id/duplicate: an unpublished copy. */
    public function duplicate(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        $new = DB::transaction(fn () => $this->events->duplicate($id, $user));

        return response()->json($this->events->get($new, $user), 201);
    }

    /** POST /events/:id/photo (multipart `photo`), DELETE /events/:id/photo */
    public function photo(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        $key = $request->isMethod('delete') ? null : $this->storage->store($request->file('photo'), 'image', 'photo')['key'];
        $this->events->setCover($id, $key, $user);

        return response()->json($this->events->get($id, $user));
    }

    /** POST /events/:id/cancel-event (admin): cancels the event and tells the registrants. */
    public function cancelEvent(Request $request, int $id): JsonResponse
    {
        $user = $this->user($request);
        DB::transaction(fn () => $this->events->cancelEvent($id, $user));

        return response()->json($this->events->get($id, $user));
    }

    /** POST /events/:id/rsvp { answers, rsvp?: going|maybe } (alumni): registers, issues the entry pass, emails the confirmation. */
    public function rsvp(Request $request, int $id): JsonResponse
    {
        $b = $request->validate(['answers' => 'nullable|array', 'rsvp' => 'nullable|in:going,maybe']);
        $sent = $this->events->rsvp($id, $this->alumniId($request), $b['answers'] ?? [], $b['rsvp'] ?? 'going');

        return response()->json($this->events->get($id, $this->user($request)) + ['emailSent' => $sent]);
    }

    /** POST /events/:id/cancel (alumni): cancels their own RSVP. */
    public function cancelRsvp(Request $request, int $id): JsonResponse
    {
        DB::transaction(fn () => $this->events->cancelRsvp($id, $this->alumniId($request)));

        return response()->json($this->events->get($id, $this->user($request)));
    }

    /** GET /events/:id/registrations (admin) */
    public function registrations(int $id): JsonResponse
    {
        return response()->json($this->events->registrations($id));
    }

    // --- Standalone announcements (event_id IS NULL) ---------------------------------------------------

    /** GET /announcements (hidden ones only for admin) */
    public function announcements(Request $request): JsonResponse
    {
        $staff = $this->user($request)->role === 'admin';
        $rows = DB::table('announcement')->whereNull('event_id')->when(! $staff, fn ($q) => $q->where('is_hidden', false))
            ->orderByDesc('published_at')->orderByDesc('announcement_id')->get();

        return response()->json(['data' => $rows->map(self::announcement(...))]);
    }

    /** POST /announcements { kind: Notice|Reminder|Update, source, title, body, hidden } */
    public function storeAnnouncement(Request $request): JsonResponse
    {
        $b = $this->announcementBody($request, true);
        $id = DB::transaction(function () use ($b, $request) {
            $id = (int) DB::table('announcement')->insertGetId($b + ['author_id' => $this->user($request)->user_id], 'announcement_id');
            $this->audit->log('create', 'announcement', $id);

            return $id;
        });

        return response()->json(self::announcement(DB::table('announcement')->where('announcement_id', $id)->first()), 201);
    }

    /** PATCH /announcements/:id */
    public function updateAnnouncement(Request $request, int $id): JsonResponse
    {
        $b = $this->announcementBody($request, false);
        DB::transaction(function () use ($b, $id) {
            if (! DB::table('announcement')->where('announcement_id', $id)->whereNull('event_id')->exists()) {
                throw ApiException::notFound();
            }
            if ($b !== []) {
                DB::table('announcement')->where('announcement_id', $id)->update($b);
            }
            $this->audit->log('edit', 'announcement', $id);
        });

        return response()->json(self::announcement(DB::table('announcement')->where('announcement_id', $id)->first()));
    }

    /** DELETE /announcements/:id */
    public function destroyAnnouncement(int $id): JsonResponse
    {
        DB::transaction(function () use ($id) {
            if (DB::table('announcement')->where('announcement_id', $id)->whereNull('event_id')->delete() === 0) {
                throw ApiException::notFound();
            }
            $this->audit->log('delete', 'announcement', $id);
        });

        return response()->json(['ok' => true]);
    }

    /** @return array<string, mixed> */
    private function announcementBody(Request $request, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';
        $b = $request->validate([
            'kind' => 'nullable|in:'.implode(',', array_keys(Vocab::NOTICE_KIND)),
            'source' => 'nullable|string|max:120',
            'title' => "{$req}|string|max:160",
            'body' => "{$req}|string|max:2000",
            'hidden' => 'nullable|boolean',
        ], ['title.required' => 'Enter a title.', 'body.required' => 'Enter the announcement text.']);
        $out = [];
        foreach (['source' => 'source', 'title' => 'title', 'body' => 'body', 'hidden' => 'is_hidden'] as $k => $col) {
            if (array_key_exists($k, $b)) {
                $out[$col] = is_string($b[$k]) ? trim($b[$k]) : $b[$k];
            }
        }
        if (isset($b['kind']) || $creating) {
            $out['kind'] = Vocab::code(Vocab::NOTICE_KIND, $b['kind'] ?? 'Notice');
        }

        return $out;
    }

    /** @return array<string, mixed> */
    private static function announcement(?object $a): array
    {
        if ($a === null) {
            throw ApiException::notFound();
        }

        return ['id' => (int) $a->announcement_id, 'kind' => Vocab::label(Vocab::NOTICE_KIND, $a->kind), 'source' => $a->source ?? '', 'title' => $a->title,
            'body' => $a->body ?? '', 'hidden' => (bool) $a->is_hidden, 'pub' => $a->published_at, 'updatedAt' => $a->updated_at];
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
