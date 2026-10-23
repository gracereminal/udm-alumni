<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AccountService;
use App\Services\AuditService;
use App\Services\ProfileService;
use App\Services\StorageService;
use App\Services\SurveyService;
use App\Services\TracerQuestionService;
use App\Support\ProfileProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** /me: the signed-in alumnus' profile, privacy, skills, survey, photo and data export (role:alumni). */
class MeController extends Controller
{
    public function __construct(
        private readonly ProfileService $profiles,
        private readonly SurveyService $surveys,
        private readonly StorageService $storage,
        private readonly AccountService $accounts,
        private readonly TracerQuestionService $tracer,
        private readonly AuditService $audit,
    ) {}

    /** GET /me */
    public function show(Request $request): JsonResponse
    {
        return response()->json($this->payload($request));
    }

    /**
     * PATCH /me: any of the profile fields (form ids, as Edit Profile sends them), `privacy` { directoryOptIn, showEmail,
     * showMobile, industry, bio, links: { platform: visible } } and `skills` [names].
     */
    public function update(Request $request): JsonResponse
    {
        $id = $this->alumniId($request);
        $actor = $this->actorId($request);
        $body = $request->all();
        DB::transaction(function () use ($id, $actor, $body) {
            if (array_intersect_key($body, array_flip(ProfileService::FIELDS)) !== []) {
                $this->profiles->apply($id, $body, $actor);
            }
            if (isset($body['privacy'])) {
                $this->profiles->applyPrivacy($id, is_array($body['privacy']) ? $body['privacy'] : [], $actor);
            }
            if (isset($body['skills'])) {
                $this->profiles->setSkills($id, is_array($body['skills']) ? array_values($body['skills']) : []);
            }
            $this->surveys->recompute($id);
        });

        return response()->json($this->payload($request));
    }

    /** PUT /me/survey { answers, currentSection, submit }: a draft, or the submitted survey. */
    public function survey(Request $request): JsonResponse
    {
        $this->surveys->save($this->alumniId($request), $request->only(['answers', 'currentSection', 'submit']), $this->actorId($request));

        return response()->json($this->payload($request));
    }

    /** POST /me/photo (multipart `photo`, JPG/PNG/WebP up to 2 MB). Replacing deletes the old file. */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $file = $this->storage->store($request->file('photo'), 'image', 'photo');

        return response()->json($this->profiles->setPhoto($this->alumniId($request), $file['key'], $this->actorId($request)));
    }

    /** DELETE /me/photo */
    public function deletePhoto(Request $request): JsonResponse
    {
        return response()->json($this->profiles->setPhoto($this->alumniId($request), null, $this->actorId($request)));
    }

    /**
     * GET /me/export: a JSON copy of everything the portal holds about the signed-in alumnus (RA 10173 right of access),
     * downloaded from Privacy & My Data. Proof documents are listed without their files. Audited.
     */
    public function export(Request $request): JsonResponse
    {
        $id = $this->alumniId($request);
        $p = $this->payload($request);

        $data = [
            'exportedAt' => now()->toIso8601String(),
            'about' => 'A copy of the personal data the UDM Alumni Tracer holds about you, under the Data Privacy Act of 2012 (RA 10173).',
            'account' => $p['user'],
            'record' => $p['record'],
            'profile' => $p['a'],
            'privacy' => $p['privacy'],
            'skills' => $p['skills'],
            'credentials' => $p['credentials'],
            'survey' => $p['survey'],
            'employment' => DB::select(
                'SELECT employment_status AS "employmentStatus", job_title AS "jobTitle", employer_name AS employer, org_type AS "orgType",
                        place_of_work AS "placeOfWork", job_status AS "jobStatus", job_location AS location, is_current AS "isCurrent",
                        created_at AS "createdAt", updated_at AS "updatedAt"
                   FROM employment_record WHERE alumni_id = ? ORDER BY employment_id',
                [$id],
            ),
            'jobs' => DB::select(
                'SELECT j.title, j.company, s.saved_at AS "savedAt", s.applied_at AS "appliedAt", s.applied_via AS "appliedVia"
                   FROM saved_job s JOIN job_posting j ON j.job_id = s.job_id WHERE s.alumni_id = ? ORDER BY s.created_at',
                [$id],
            ),
            'eventRegistrations' => array_map(function ($r) {
                $r->answers = json_decode((string) $r->answers, true) ?? [];

                return $r;
            }, DB::select(
                'SELECT e.title, e.starts_at AS "startsAt", r.rsvp, r.answers, r.entry_pass AS "entryPass",
                        r.created_at AS "registeredAt", r.cancelled_at AS "cancelledAt"
                   FROM event_registration r JOIN event e ON e.event_id = r.event_id WHERE r.alumni_id = ? ORDER BY r.created_at',
                [$id],
            )),
            'proofDocuments' => DB::select(
                'SELECT mime, size_bytes AS size, requested_at AS "requestedAt", uploaded_at AS "uploadedAt"
                   FROM proof_document WHERE alumni_id = ? ORDER BY document_id',
                [$id],
            ),
        ];
        $this->audit->log('data_export', 'alumnus', $id, $this->actorId($request));

        return response()->json($data, 200, [
            'Content-Disposition' => 'attachment; filename="udm-alumni-my-data-'.now()->format('Y-m-d').'.json"',
            'Cache-Control' => 'no-store',
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(Request $request): array
    {
        /** @var UserAccount $user */
        $user = $request->user();
        $id = $this->alumniId($request);
        $row = DB::selectOne('SELECT * FROM alumnus WHERE alumni_id = ?', [$id]);
        $survey = $this->surveys->get($id);
        $answers = $this->profiles->answers($id) + $survey['answers'];
        unset($survey['answers']);
        $links = DB::table('social_link')->where('alumni_id', $id)->orderBy('platform')->get(['platform', 'url', 'is_visible']);

        return [
            'user' => $this->accounts->payload($user->fresh() ?? $user),
            'a' => $answers,
            'survey' => $survey,
            'progress' => ProfileProgress::compute($answers, $this->tracer->rows()),
            'record' => [
                'id' => $id,
                'membershipId' => $row->membership_id,
                'studentNo' => $row->student_no,
                'status' => $row->archived_at !== null ? 'archived' : $row->verification_status,
                'flagNote' => $row->flag_note,
                'photoUrl' => StorageService::publicUrl($row->photo_url),
                'registeredAt' => $row->created_at,
                'consentAt' => $row->privacy_consent_at,
                'updatedAt' => $row->updated_at,
                'industry' => $row->industry ?? '',
                'bio' => $row->bio ?? '',
            ],
            'privacy' => [
                'directoryOptIn' => (bool) $row->directory_opt_in,
                'showEmail' => (bool) $row->show_email,
                'showMobile' => (bool) $row->show_mobile,
                'links' => (object) $links->mapWithKeys(fn ($l) => [$l->platform => ['url' => $l->url, 'isVisible' => (bool) $l->is_visible]])->all(),
            ],
            'credentials' => DB::select('SELECT credential_id AS id, type, name, year FROM credential WHERE alumni_id = ? ORDER BY type, credential_id', [$id]),
            'skills' => DB::select('SELECT s.name, x.is_top AS "isTop" FROM alumni_skill x JOIN skill s ON s.skill_id = x.skill_id WHERE x.alumni_id = ? ORDER BY x.is_top DESC, s.name', [$id]),
            'dashboard' => DB::selectOne('SELECT upcoming_events AS "upcomingEvents", saved_jobs AS "savedJobs", applications FROM v_alumni_dashboard WHERE alumni_id = ?', [$id]),
        ];
    }

    private function actorId(Request $request): int
    {
        $user = $request->user();

        return $user instanceof UserAccount ? $user->user_id : throw new ApiException(401, 'Sign in to continue.', 'unauthenticated');
    }

    private function alumniId(Request $request): int
    {
        $id = DB::table('alumnus')->where('user_id', $this->actorId($request))->whereNull('merged_into_id')->value('alumni_id');

        return $id === null ? throw ApiException::forbidden('No alumni record is linked to this account.') : (int) $id;
    }
}
