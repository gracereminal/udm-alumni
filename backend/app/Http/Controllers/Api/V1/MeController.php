<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Models\UserAccount;
use App\Services\AccountService;
use App\Services\ProfileService;
use App\Services\StorageService;
use App\Services\SurveyService;
use App\Services\TracerQuestionService;
use App\Support\ProfileProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** /me: the signed-in alumnus' profile, privacy, skills, survey, photo and proof documents (role:alumni). */
class MeController extends Controller
{
    public function __construct(
        private readonly ProfileService $profiles,
        private readonly SurveyService $surveys,
        private readonly StorageService $storage,
        private readonly AccountService $accounts,
        private readonly TracerQuestionService $tracer,
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

    /** GET /me/proofs: own proof documents and open requests, with short-lived links. */
    public function proofs(Request $request): JsonResponse
    {
        $rows = DB::select(
            'SELECT document_id AS id, storage_key, mime, size_bytes AS size, requested_at AS "requestedAt", uploaded_at AS "uploadedAt"
               FROM proof_document WHERE alumni_id = ? ORDER BY document_id DESC',
            [$this->alumniId($request)],
        );

        return response()->json(['data' => array_map(function ($d) {
            $key = $d->storage_key;
            unset($d->storage_key);

            return (array) $d + ['url' => $key ? $this->storage->signedUrl($key) : null];
        }, $rows)]);
    }

    /** POST /me/proofs (multipart `file`, PDF/JPG/PNG up to 5 MB). */
    public function uploadProof(Request $request): JsonResponse
    {
        $file = $this->storage->store($request->file('file'), 'proof');
        $id = $this->profiles->addProof($this->alumniId($request), $file, $this->actorId($request));

        return response()->json(['id' => $id, 'mime' => $file['mime'], 'size' => $file['size']], 201);
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
