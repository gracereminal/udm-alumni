<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AuditService;
use App\Services\SettingsService;
use App\Support\Scope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * College Outreach (role:admin,dept). The portal sends nothing ("contact offline"): staff reach the alumnus from their
 * own Messenger or mail app, and this records the attempt (outreach_contact + audit_log) after a scope check.
 */
class OutreachController extends Controller
{
    private const SELECT = 'SELECT contact_id AS id, alumni_id AS "alumniId", method, message, note, outcome, contacted_at AS "contactedAt", removed_at AS "removedAt" FROM outreach_contact';

    public function __construct(
        private readonly AuditService $audit,
        private readonly SettingsService $settings,
    ) {}

    /** POST /outreach { alumni_id, method, message?, note? } (throttle:outreach) */
    public function store(Request $request): JsonResponse
    {
        $b = $request->validate([
            'alumni_id' => 'required|integer|min:1',
            'method' => 'required|in:email,phone,facebook,messenger,linkedin',
            'message' => 'nullable|string|max:5000',
            'note' => 'nullable|string|max:1000',
        ]);
        $alumniId = (int) $b['alumni_id'];
        $exists = DB::table('alumnus')->where('alumni_id', $alumniId)->whereNull('archived_at')->whereNull('merged_into_id')->exists();
        if (! $exists) {
            throw ApiException::notFound();
        }
        Scope::for($this->user($request))->authorizeAlumnus($alumniId);
        $days = (int) $this->settings->get('outreach_interval_days');

        $row = DB::transaction(function () use ($request, $b, $alumniId, $days) {
            // The client warns (it doesn't block) when the alumnus was contacted within the interval.
            $recent = DB::selectOne(
                'SELECT contacted_at FROM outreach_contact WHERE alumni_id = ? AND removed_at IS NULL AND contacted_at > now() - make_interval(days => ?) ORDER BY contacted_at DESC LIMIT 1',
                [$alumniId, $days],
            );
            $id = (int) DB::table('outreach_contact')->insertGetId([
                'alumni_id' => $alumniId, 'contacted_by' => $this->user($request)->user_id, 'method' => $b['method'],
                'message' => $b['message'] ?? null, 'note' => $b['note'] ?? null, 'outcome' => 'sent',
            ], 'contact_id');
            $this->audit->log('outreach', 'alumnus', $alumniId, null, ['method' => $b['method']]);

            return (array) DB::selectOne(self::SELECT.' WHERE contact_id = ?', [$id]) + ['recentlyContactedAt' => $recent?->contacted_at];
        });

        return response()->json($row + ['outreachIntervalDays' => $days], 201);
    }

    /** PATCH /outreach/:id { outcome: sent|reached|no_response|bounced, note? } */
    public function update(Request $request, int $id): JsonResponse
    {
        $b = $request->validate(['outcome' => 'required|in:sent,reached,no_response,bounced', 'note' => 'nullable|string|max:1000']);
        $this->authorizeContact($request, $id);
        DB::transaction(function () use ($id, $b) {
            DB::update('UPDATE outreach_contact SET outcome = ?::outreach_outcome, note = COALESCE(?, note) WHERE contact_id = ?', [$b['outcome'], $b['note'] ?? null, $id]);
            $this->audit->log('outreach_outcome', 'outreach_contact', $id, null, ['outcome' => $b['outcome']]);
        });

        return response()->json(DB::selectOne(self::SELECT.' WHERE contact_id = ?', [$id]));
    }

    /** DELETE /outreach/:id: "Remove contacted mark" (the attempt stays in the audit log). */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorizeContact($request, $id);
        DB::transaction(function () use ($id) {
            DB::update('UPDATE outreach_contact SET removed_at = COALESCE(removed_at, now()) WHERE contact_id = ?', [$id]);
            $this->audit->log('outreach_remove', 'outreach_contact', $id);
        });

        return response()->json(DB::selectOne(self::SELECT.' WHERE contact_id = ?', [$id]));
    }

    private function authorizeContact(Request $request, int $id): void
    {
        $alumniId = DB::table('outreach_contact')->where('contact_id', $id)->value('alumni_id') ?? throw ApiException::notFound();
        Scope::for($this->user($request))->authorizeAlumnus((int) $alumniId);
    }

    private function user(Request $request): UserAccount
    {
        $user = $request->user();

        return $user instanceof UserAccount ? $user : throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
    }
}
