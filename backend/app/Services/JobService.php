<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use App\Support\Contact;
use App\Support\Lists;
use App\Support\TfIdf;
use App\Support\Vocab;
use Illuminate\Support\Facades\DB;

/**
 * Job board: admin postings go live at once; alumni postings wait in the approval queue. Saves and applications are
 * saved_job rows; the alumnus applies through Messenger, email or the careers page and the portal records the channel.
 */
class JobService
{
    private const SELECT = <<<'SQL'
        SELECT j.*, s.saves, s.applications,
               COALESCE((SELECT jsonb_agg(sk.name ORDER BY sk.name) FROM job_skill js JOIN skill sk ON sk.skill_id = js.skill_id WHERE js.job_id = j.job_id), '[]'::jsonb) AS tags,
               u.display_name AS poster_name, u.email AS poster_email, pa.year_graduated AS poster_batch, pp.abbr AS poster_program,
               sj.saved_at AS my_saved_at, sj.applied_at AS my_applied_at, sj.applied_via AS my_applied_via
          FROM job_posting j
          LEFT JOIN v_job_stats s ON s.job_id = j.job_id
          LEFT JOIN user_account u ON u.user_id = j.posted_by
          LEFT JOIN alumnus pa ON pa.user_id = j.posted_by
          LEFT JOIN program pp ON pp.program_id = pa.program_id
          LEFT JOIN saved_job sj ON sj.job_id = j.job_id AND sj.alumni_id = ?
        SQL;

    private const COLUMNS = [
        'title' => 'title', 'company' => 'company', 'location' => 'location', 'salary' => 'salary_range', 'salaryNote' => 'salary_note',
        'deadline' => 'deadline', 'applyVia' => 'apply_via', 'messenger' => 'messenger', 'desc' => 'description', 'badge' => 'badge', 'note' => 'note',
    ];

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly StorageService $storage,
    ) {}

    /** @return array{rows: list<array<string, mixed>>, total: int} */
    public function list(UserAccount $viewer, string $view, ?string $q, int $page, int $perPage): array
    {
        $where = ['j.deleted_at IS NULL'];
        $params = [];
        if (in_array($view, ['queue', 'all'], true) && $viewer->role !== 'admin') {
            throw ApiException::forbidden();
        }
        if ($view === 'mine') {
            $where[] = 'j.posted_by = ?';
            $params[] = $viewer->user_id;
        } else {
            $where[] = match ($view) {
                'queue' => "j.approval_status = 'pending'",
                'all' => "j.approval_status = 'approved'",
                default => "j.approval_status = 'approved' AND j.is_active",
            };
        }
        if ($q !== null && trim($q) !== '') {
            $where[] = '(j.title ILIKE ? OR j.company ILIKE ? OR j.location ILIKE ?)';
            array_push($params, ...array_fill(0, 3, Lists::like($q)));
        }
        $w = implode(' AND ', $where);
        $total = (int) DB::selectOne("SELECT count(*) AS n FROM job_posting j WHERE {$w}", $params)->n;
        $rows = DB::select(self::SELECT." WHERE {$w} ORDER BY COALESCE(j.published_at, j.created_at) DESC, j.job_id DESC LIMIT ? OFFSET ?",
            [$this->viewerAlumni($viewer), ...$params, $perPage, ($page - 1) * $perPage]);

        return ['rows' => array_map(fn ($j) => self::out($j, $viewer), $rows), 'total' => $total];
    }

    /**
     * Board summary over the open postings (approved, active, not deleted): how many, distinct employers, the average
     * disclosed salary range, and the share of postings alumni have applied to.
     *
     * @return array{open: int, employers: int, salary: array{low: int, high: int, disclosed: int}|null, applications: int, responseRate: int|null}
     */
    public function stats(): array
    {
        $open = "j.deleted_at IS NULL AND j.approval_status = 'approved' AND j.is_active";
        $s = DB::selectOne("SELECT count(*) AS open, count(DISTINCT lower(trim(j.company))) AS employers,
                                   count(*) FILTER (WHERE s.applications > 0) AS responded, COALESCE(sum(s.applications), 0) AS applications
                              FROM job_posting j LEFT JOIN v_job_stats s ON s.job_id = j.job_id WHERE {$open}");
        $ranges = array_values(array_filter(array_map(self::salaryRange(...), DB::table('job_posting as j')->whereRaw($open)->pluck('salary_range')->all())));
        $avg = fn (int $i) => (int) round(array_sum(array_column($ranges, $i)) / count($ranges));

        return [
            'open' => (int) $s->open, 'employers' => (int) $s->employers,
            'salary' => $ranges ? ['low' => $avg(0), 'high' => $avg(1), 'disclosed' => count($ranges)] : null,
            'applications' => (int) $s->applications,
            'responseRate' => $s->open > 0 ? (int) round(100 * $s->responded / $s->open) : null,
        ];
    }

    /**
     * "Recommended jobs for you": open postings ranked by TF-IDF cosine similarity between the alumnus' course, skills,
     * industry and current job title and each posting's title, skill tags and description. Content-based, so it needs
     * no history of who applied where. Skips the alumnus' own postings and ones already applied to. Each row carries
     * `match` { score, terms } with the shared terms that weighed most.
     *
     * @return list<array<string, mixed>>
     */
    public function recommended(UserAccount $viewer, int $limit = 6): array
    {
        $alumniId = $this->viewerAlumni($viewer);
        $a = DB::selectOne(
            "SELECT p.name AS program, p.abbr, a.course_other, a.industry,
                    (SELECT e.job_title FROM employment_record e WHERE e.alumni_id = a.alumni_id AND e.is_current ORDER BY e.updated_at DESC LIMIT 1) AS job_title,
                    COALESCE((SELECT jsonb_agg(s.name) FROM alumni_skill x JOIN skill s ON s.skill_id = x.skill_id WHERE x.alumni_id = a.alumni_id), '[]'::jsonb) AS skills
               FROM alumnus a LEFT JOIN program p ON p.program_id = a.program_id WHERE a.alumni_id = ?",
            [$alumniId],
        );
        if ($a === null) {
            return [];
        }
        $course = preg_replace('/^(Bachelor|Master|Doctor|BS|BTVTE)\b( of| in)?( (Science|Arts))?( in)?\s*/i', '', (string) ($a->program ?? $a->course_other));
        $abbr = explode('-', (string) $a->abbr)[0];
        $profile = array_merge(
            TfIdf::name($course, 2),
            // "BSIT" -> IT, "BIT-Cyber" -> IT, "BSCS" -> CS: the short form postings use ("IT, CS and Computer Engineering graduates").
            TfIdf::terms($abbr, 2), TfIdf::terms(preg_replace('/^(BS|AB|B(?!S))(?=[A-Z]{2,}$)/', '', $abbr), 2),
            TfIdf::terms($a->industry), TfIdf::terms($a->job_title),
            ...array_map(fn ($s) => TfIdf::phrase($s, 2), json_decode((string) $a->skills, true)),
        );

        $jobs = DB::select(
            "SELECT j.job_id, j.title, j.description,
                    COALESCE((SELECT jsonb_agg(sk.name) FROM job_skill js JOIN skill sk ON sk.skill_id = js.skill_id WHERE js.job_id = j.job_id), '[]'::jsonb) AS tags
               FROM job_posting j LEFT JOIN saved_job sj ON sj.job_id = j.job_id AND sj.alumni_id = ?
              WHERE j.deleted_at IS NULL AND j.approval_status = 'approved' AND j.is_active
                AND j.posted_by IS DISTINCT FROM ? AND sj.applied_at IS NULL",
            [$alumniId, $viewer->user_id],
        );
        $docs = [];
        foreach ($jobs as $j) {
            $docs[(int) $j->job_id] = array_merge(TfIdf::terms($j->title, 2), TfIdf::terms($j->description),
                ...array_map(fn ($s) => TfIdf::phrase($s, 2), json_decode((string) $j->tags, true)));
        }
        $ranked = array_slice(TfIdf::rank($profile, $docs, 0.05), 0, $limit);
        if ($ranked === []) {
            return [];
        }

        $rows = collect(DB::select(self::SELECT.' WHERE j.job_id IN ('.implode(',', array_fill(0, count($ranked), '?')).')',
            [$alumniId, ...array_column($ranked, 'key')]))->keyBy(fn ($j) => (int) $j->job_id);

        return array_map(fn ($r) => self::out($rows[$r['key']], $viewer) + ['match' => ['score' => round($r['score'], 3), 'terms' => $r['terms']]], $ranked);
    }

    /** "₱35,000 - ₱48,000" / "₱45k" -> [low, high] in pesos; null when no amount is given. */
    private static function salaryRange(?string $text): ?array
    {
        preg_match_all('/(\d[\d,]*(?:\.\d+)?)\s*(k)?/i', (string) $text, $m, PREG_SET_ORDER);
        $amounts = array_values(array_filter(array_map(fn ($x) => (float) str_replace(',', '', $x[1]) * (empty($x[2]) ? 1 : 1000), $m), fn ($n) => $n >= 1000));

        return $amounts ? [(int) min($amounts), (int) max($amounts)] : null;
    }

    /** @return array<string, mixed> */
    public function get(int $jobId, UserAccount $viewer): array
    {
        $j = DB::selectOne(self::SELECT.' WHERE j.job_id = ? AND j.deleted_at IS NULL', [$this->viewerAlumni($viewer), $jobId]) ?? throw ApiException::notFound();
        $own = (int) $j->posted_by === $viewer->user_id;
        if ($viewer->role !== 'admin' && ! $own && ($j->approval_status !== 'approved' || ! $j->is_active)) {
            throw ApiException::notFound();
        }

        return self::out($j, $viewer);
    }

    /** @param  array<string, mixed>  $b */
    public function create(array $b, UserAccount $user): int
    {
        $b = self::validate($b, true);
        $admin = $user->role === 'admin';
        $id = (int) DB::table('job_posting')->insertGetId(self::columns($b) + [
            'posted_by' => $user->user_id, 'reviewed_by' => $admin ? $user->user_id : null,
            'employment_type' => Vocab::code(Vocab::EMPLOYMENT_TYPE, $b['type'] ?? null) ?? 'full_time',
            'source' => $admin ? 'admin' : 'alumni', 'approval_status' => $admin ? 'approved' : 'pending',
            'published_at' => $admin ? now() : null, 'submitter_email' => $admin ? null : $user->email,
        ], 'job_id');
        $this->writeSkills($id, $b['tags'] ?? []);
        $this->audit->log($admin ? 'create' : 'submit', 'job_posting', $id, $user->user_id);
        if ($admin) {
            $this->notifyMatches($id, (string) $b['title'], (string) $b['company']);
        } else {
            $this->notifications->notify($this->notifications->adminIds(), 'job_submitted', 'Job posting submitted for review',
                "{$user->display_name} submitted “{$b['title']}” at {$b['company']}.", 'jobs');
        }

        return $id;
    }

    /** @param  array<string, mixed>  $b */
    public function update(int $jobId, array $b, UserAccount $user): void
    {
        $this->loadForEdit($jobId, $user);
        $b = self::validate($b, false);
        $set = self::columns($b);
        if (isset($b['type'])) {
            $set['employment_type'] = Vocab::code(Vocab::EMPLOYMENT_TYPE, $b['type']) ?? 'full_time';
        }
        if ($set !== []) {
            DB::table('job_posting')->where('job_id', $jobId)->update($set);
        }
        if (array_key_exists('tags', $b)) {
            $this->writeSkills($jobId, $b['tags']);
        }
        $this->audit->log('edit', 'job_posting', $jobId, $user->user_id, ['fields' => array_keys($b)]);
    }

    public function setPhoto(int $jobId, string $key, UserAccount $user): void
    {
        $old = null;
        DB::transaction(function () use ($jobId, $key, $user, &$old) {
            $old = $this->loadForEdit($jobId, $user)->company_photo_url;
            DB::table('job_posting')->where('job_id', $jobId)->update(['company_photo_url' => $key]);
            $this->audit->log('photo_update', 'job_posting', $jobId, $user->user_id);
        });
        if ($old !== null && ! DB::table('job_posting')->where('company_photo_url', $old)->exists()) {
            $this->storage->delete($old);
        }
    }

    public function delete(int $jobId, UserAccount $user): void
    {
        $this->loadForEdit($jobId, $user);
        DB::update('UPDATE job_posting SET deleted_at = now() WHERE job_id = ?', [$jobId]);
        $this->audit->log('delete', 'job_posting', $jobId, $user->user_id);
    }

    /** approve | reject | deactivate | activate | restore (admin). */
    public function decide(int $jobId, string $action, ?string $reason, UserAccount $admin): void
    {
        if ($action === 'restore') {
            if (DB::update('UPDATE job_posting SET deleted_at = NULL WHERE job_id = ? AND deleted_at IS NOT NULL', [$jobId]) === 0) {
                throw ApiException::notFound();
            }
            $this->audit->log('restore', 'job_posting', $jobId, $admin->user_id);

            return;
        }
        $j = DB::selectOne('SELECT * FROM job_posting WHERE job_id = ? AND deleted_at IS NULL FOR UPDATE', [$jobId]) ?? throw ApiException::notFound();
        $poster = $j->posted_by === null ? [] : [(int) $j->posted_by];
        switch ($action) {
            case 'approve':
                DB::update("UPDATE job_posting SET approval_status = 'approved', is_active = true, reviewed_by = ?, published_at = now(), reject_reason = NULL WHERE job_id = ?", [$admin->user_id, $jobId]);
                if ($j->approval_status !== 'approved') {
                    $this->notifications->notify($poster, 'job_decision', 'Your job posting was approved', "“{$j->title}” is now live on the alumni job board.", 'jobs');
                }
                $this->notifyMatches($jobId, $j->title, $j->company);
                break;
            case 'reject':
                DB::update("UPDATE job_posting SET approval_status = 'rejected', reviewed_by = ?, reject_reason = ? WHERE job_id = ?", [$admin->user_id, $reason, $jobId]);
                $this->notifications->notify($poster, 'job_decision', 'Your job posting was not approved',
                    "“{$j->title}”".($reason ? ": {$reason}" : ' was declined by the Alumni Office.'), 'jobs');
                break;
            default:
                DB::update('UPDATE job_posting SET is_active = ? WHERE job_id = ?', [$action === 'activate', $jobId]);
        }
        $this->audit->log($action, 'job_posting', $jobId, $admin->user_id, $reason ? ['reason' => $reason] : null);
    }

    /** Save (or unsave) a job for the alumnus. */
    public function save(int $jobId, int $alumniId, bool $on): void
    {
        $this->assertListed($jobId);
        $this->mark($jobId, $alumniId, ['saved_at' => $on ? DB::raw('COALESCE(saved_job.saved_at, now())') : null]);
    }

    /** Records how the alumnus applied (the portal sends nothing), or withdraws the mark. */
    public function apply(int $jobId, int $alumniId, ?string $via): void
    {
        $j = $this->assertListed($jobId);
        if ($via !== null) {
            $available = array_filter([
                'messenger' => Contact::messengerUrl($j->messenger) !== '',
                'email' => Contact::applyChannel($j->apply_via) === 'email',
                'website' => Contact::applyChannel($j->apply_via) === 'website',
            ]);
            if (! isset($available[$via])) {
                throw new ApiException(422, 'This posting does not take applications that way.', 'validation', ['via' => 'This posting does not take applications that way.']);
            }
        }
        $this->mark($jobId, $alumniId, $via === null ? ['applied_at' => null, 'applied_via' => null] : ['applied_at' => now(), 'applied_via' => $via]);
        $this->audit->log($via === null ? 'apply_withdraw' : 'apply', 'job_posting', $jobId, null, $via ? ['via' => $via] : null);
    }

    /**
     * The job card as the client shows it.
     *
     * @return array<string, mixed>
     */
    public static function out(object $j, UserAccount $viewer): array
    {
        $staff = $viewer->role === 'admin';

        return [
            'id' => (int) $j->job_id, 'title' => $j->title, 'company' => $j->company, 'location' => $j->location ?? '',
            'type' => Vocab::label(Vocab::EMPLOYMENT_TYPE, $j->employment_type) ?: 'Full-time',
            'salary' => $j->salary_range ?? '', 'salaryNote' => $j->salary_note ?? '', 'deadline' => $j->deadline,
            'applyVia' => $j->apply_via ?? '', 'messenger' => $j->messenger ?? '', 'desc' => $j->description ?? '',
            'badge' => $j->badge ?? ($j->source === 'alumni' ? 'Alumni Referral' : ''), 'note' => $j->note ?? '',
            'tags' => json_decode((string) $j->tags, true), 'photo' => StorageService::publicUrl($j->company_photo_url),
            'source' => $j->source, 'approvalStatus' => $j->approval_status, 'status' => $j->is_active ? 'active' : 'inactive',
            'publishedAt' => $j->published_at, 'createdAt' => $j->created_at, 'rejectReason' => $j->reject_reason ?? '',
            'by' => $j->poster_name ?? '', 'batch' => $j->poster_program ? "{$j->poster_program} {$j->poster_batch}" : '',
            'mine' => (int) $j->posted_by === $viewer->user_id,
            'saved' => $j->my_saved_at !== null,
            'applied' => $j->my_applied_at === null ? null : ['via' => $j->my_applied_via, 'at' => $j->my_applied_at],
        ] + ($staff ? ['email' => $j->submitter_email ?? $j->poster_email ?? '', 'saves' => (int) $j->saves, 'applications' => (int) $j->applications] : []);
    }

    /** Alumni whose skills overlap the job's skills, notified once per job. */
    private function notifyMatches(int $jobId, string $title, string $company): void
    {
        $ids = array_map(fn ($r) => (int) $r->user_id, DB::select(
            "SELECT DISTINCT a.user_id FROM alumni_skill x JOIN alumnus a ON a.alumni_id = x.alumni_id JOIN job_skill js ON js.skill_id = x.skill_id
               JOIN user_account u ON u.user_id = a.user_id
              WHERE js.job_id = ? AND u.account_status = 'active' AND a.archived_at IS NULL AND a.merged_into_id IS NULL",
            [$jobId],
        ));
        $this->notifications->notify($ids, 'job_match', "New job match: {$title}", "{$company} is hiring and your skills match this posting.", 'jobs', "job_match:{$jobId}");
    }

    private function loadForEdit(int $jobId, UserAccount $user): object
    {
        $j = DB::selectOne('SELECT * FROM job_posting WHERE job_id = ? AND deleted_at IS NULL FOR UPDATE', [$jobId]) ?? throw ApiException::notFound();
        $ownPending = (int) $j->posted_by === $user->user_id && $j->approval_status === 'pending';
        if ($user->role !== 'admin' && ! $ownPending) {
            throw ApiException::forbidden();
        }

        return $j;
    }

    private function assertListed(int $jobId): object
    {
        return DB::selectOne("SELECT * FROM job_posting WHERE job_id = ? AND deleted_at IS NULL AND approval_status = 'approved' AND is_active", [$jobId])
            ?? throw ApiException::notFound();
    }

    /** @param  array<string, mixed>  $set */
    private function mark(int $jobId, int $alumniId, array $set): void
    {
        DB::table('saved_job')->insertOrIgnore(['alumni_id' => $alumniId, 'job_id' => $jobId]);
        DB::table('saved_job')->where(['alumni_id' => $alumniId, 'job_id' => $jobId])->update($set);
        DB::table('saved_job')->where(['alumni_id' => $alumniId, 'job_id' => $jobId])->whereNull('saved_at')->whereNull('applied_at')->delete();
    }

    /** @param  list<string>  $tags */
    private function writeSkills(int $jobId, array $tags): void
    {
        DB::delete('DELETE FROM job_skill WHERE job_id = ?', [$jobId]);
        foreach (array_unique($tags) as $name) {
            $id = DB::selectOne('INSERT INTO skill (name) VALUES (?) ON CONFLICT (lower(name)) DO UPDATE SET name = skill.name RETURNING skill_id', [$name])->skill_id;
            DB::insert('INSERT INTO job_skill (job_id, skill_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [$jobId, $id]);
        }
    }

    private function viewerAlumni(UserAccount $viewer): int
    {
        return (int) (DB::table('alumnus')->where('user_id', $viewer->user_id)->value('alumni_id') ?? -1);
    }

    /**
     * Form checks with the client's messages; returns the cleaned body (only the keys sent).
     *
     * @param  array<string, mixed>  $b
     * @return array<string, mixed>
     */
    private static function validate(array $b, bool $creating): array
    {
        $out = [];
        $e = [];
        $limits = ['title' => 160, 'company' => 160, 'location' => 120, 'salary' => 60, 'salaryNote' => 60, 'applyVia' => 255, 'messenger' => 255, 'desc' => 5000, 'badge' => 60, 'note' => 160, 'type' => 20, 'deadline' => 10];
        foreach ($limits as $k => $max) {
            if (! array_key_exists($k, $b)) {
                continue;
            }
            $v = is_scalar($b[$k]) ? trim((string) $b[$k]) : '';
            if (mb_strlen($v) > $max) {
                $e[$k] = "Keep this under {$max} characters.";
            }
            $out[$k] = $v === '' ? null : $v;
        }
        foreach (['title' => 'Enter a job title.', 'company' => 'Enter the company name.'] as $k => $msg) {
            if (($creating || array_key_exists($k, $b)) && ($out[$k] ?? null) === null) {
                $e[$k] = $msg;
            }
        }
        if (($out['type'] ?? null) !== null && ! isset(Vocab::EMPLOYMENT_TYPE[$out['type']])) {
            $e['type'] = 'Select an employment type.';
        }
        if (($out['deadline'] ?? null) !== null && (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $out['deadline']) || ! strtotime($out['deadline']))) {
            $e['deadline'] = 'Use a valid date.';
        }
        if (($out['applyVia'] ?? null) !== null && Contact::applyChannel($out['applyVia']) === null) {
            $e['applyVia'] = 'Enter an email address or a website for applications.';
        }
        if (($out['messenger'] ?? null) !== null && Contact::messengerUrl($out['messenger']) === '') {
            $e['messenger'] = 'Enter a Facebook username or profile link for Messenger.';
        }
        if (array_key_exists('tags', $b)) {
            $tags = is_array($b['tags']) ? array_values(array_filter(array_map(fn ($t) => is_scalar($t) ? trim((string) $t) : '', $b['tags']), fn ($t) => $t !== '')) : [];
            if (count($tags) > 12 || ($tags !== [] && max(array_map('mb_strlen', $tags)) > 60)) {
                $e['tags'] = 'Use at most 12 tags of 60 characters.';
            }
            $out['tags'] = $tags;
        }
        if ($e !== []) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', $e);
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $b
     * @return array<string, mixed>
     */
    private static function columns(array $b): array
    {
        $set = [];
        foreach (self::COLUMNS as $k => $col) {
            if (array_key_exists($k, $b)) {
                $set[$col] = $b[$k];
            }
        }

        return $set;
    }
}
