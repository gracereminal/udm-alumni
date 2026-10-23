<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\UserAccount;
use App\Support\Lists;
use App\Support\Mobile;
use App\Support\Scope;
use App\Support\Vocab;
use Illuminate\Support\Facades\DB;

/**
 * Alumni Records (staff side of the alumnus row). One row per person (sync rule 1); every change runs in a transaction
 * that also writes record_review and audit_log (sync rule 7). Callers check the scope before calling.
 */
class AlumniService
{
    public const STATUSES = ['verified', 'flagged', 'archived'];

    public const EMPLOYMENT = ['employed', 'self_employed', 'further_studies', 'not_employed'];

    public const SOURCES = ['self_registration', 'survey', 'alumni_update', 'admin_encoded', 'import'];

    private const STUDENT_NO = '/^\d{2}-\d{2}-\d{3}$/';

    private const PARTICLES = ['de', 'del', 'dela', 'delos', 'san', 'sta.', 'santa', 'sto.', 'santo', 'dos', 'das', 'van', 'von', 'la', 'los'];

    /** The list / detail columns. The college of a record is always program.college_id, else the declared college. */
    public const SELECT = <<<'SQL'
        SELECT a.alumni_id, a.membership_id, a.student_no, a.last_name, a.first_name, a.middle_name, a.year_graduated AS batch,
               a.verification_status, a.archived_at, a.merged_into_id, a.flag_note, a.record_source, a.created_at, a.updated_at,
               a.program_id, a.course_other, COALESCE(p.college_id, a.declared_college_id) AS college_id,
               p.abbr AS program_abbr, p.name AS program_name, c.name AS college_name, c.code AS college_code,
               COALESCE(u.email, a.contact_email) AS email, a.mobile_no, a.present_address, a.user_id, u.account_status,
               e.employment_status, e.employer_name, e.job_title,
               r.status AS survey_status, r.completion_pct, (r.status = 'submitted') AS traced,
               lc.contacted_at AS last_contacted_at, lc.method AS last_contacted_via
          FROM alumnus a
          LEFT JOIN program p ON p.program_id = a.program_id
          LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
          LEFT JOIN user_account u ON u.user_id = a.user_id
          LEFT JOIN employment_record e ON e.alumni_id = a.alumni_id AND e.is_current
          LEFT JOIN v_active_cycle vc ON true
          LEFT JOIN survey_response r ON r.alumni_id = a.alumni_id AND r.cycle_id = vc.cycle_id
          LEFT JOIN LATERAL (
            SELECT o.contacted_at, o.method FROM outreach_contact o
             WHERE o.alumni_id = a.alumni_id AND o.removed_at IS NULL ORDER BY o.contacted_at DESC LIMIT 1
          ) lc ON true
        SQL;

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly RegistrationService $registration,
    ) {}

    // --- Reads -----------------------------------------------------------------------------------------

    /**
     * @param  array<string, mixed>  $f  q, college_id, program_id, unmapped, batch, status, employment, sort, dir
     * @return array{rows: list<array<string, mixed>>, total: int}
     */
    public function list(Scope $scope, array $f, int $page, int $perPage): array
    {
        $where = ['a.merged_into_id IS NULL'];
        $params = [];
        $add = function (string $sql, mixed ...$values) use (&$where, &$params) {
            $where[] = $sql;
            array_push($params, ...$values);
        };
        $college = 'COALESCE(p.college_id, a.declared_college_id)';
        if ($scope->role === 'dept') {
            $add("{$college} = ?", $scope->collegeId);
        } elseif (! empty($f['college_id'])) {
            $add("{$college} = ?", $f['college_id']);
        }
        if (! empty($f['program_id'])) {
            $add('a.program_id = ?', $f['program_id']);
        }
        if (! empty($f['unmapped'])) {
            $where[] = 'a.program_id IS NULL';
        }
        if (! empty($f['batch'])) {
            $add('a.year_graduated = ?', $f['batch']);
        }
        if (! empty($f['batch_from'])) {
            $add('a.year_graduated >= ?', $f['batch_from']);
        }
        if (! empty($f['batch_to'])) {
            $add('a.year_graduated <= ?', $f['batch_to']);
        }
        $status = $f['status'] ?? 'all';
        if ($status === 'archived') {
            $where[] = 'a.archived_at IS NOT NULL';
        } elseif ($status !== 'all') {
            $where[] = 'a.archived_at IS NULL';
            $add('a.verification_status = ?::verification_status', $status);
        }
        $emp = $f['employment'] ?? null;
        if ($emp === 'unanswered') {
            $where[] = 'e.employment_id IS NULL';
        } elseif ($emp !== null) {
            $add('e.employment_status = ?::employment_status', $emp);
        }
        if (! empty($f['q'])) {
            $like = Lists::like((string) $f['q']);
            $add("(concat_ws(' ', a.first_name, a.middle_name, a.last_name) ILIKE ? OR a.membership_id ILIKE ? OR a.student_no ILIKE ?
                   OR COALESCE(u.email, a.contact_email) ILIKE ? OR e.employer_name ILIKE ? OR p.abbr ILIKE ?)", $like, $like, $like, $like, $like, $like);
        }
        $order = match ($f['sort'] ?? 'updated_at') {
            'created_at' => 'a.created_at',
            'name' => 'lower(a.last_name), lower(a.first_name)',
            'batch' => 'a.year_graduated',
            default => 'a.updated_at',
        };
        $dir = ($f['dir'] ?? (($f['sort'] ?? '') === 'name' ? 'asc' : 'desc')) === 'asc' ? 'ASC' : 'DESC';
        $sql = self::SELECT.' WHERE '.implode(' AND ', $where);

        $total = (int) DB::selectOne("SELECT count(*) AS n FROM ({$sql}) x", $params)->n;
        $rows = DB::select("{$sql} ORDER BY {$order} {$dir}, a.alumni_id DESC LIMIT ? OFFSET ?", [...$params, $perPage, ($page - 1) * $perPage]);

        return ['rows' => array_map(self::row(...), $rows), 'total' => $total];
    }

    public function find(int $alumniId): object
    {
        return DB::selectOne(self::SELECT.' WHERE a.alumni_id = ?', [$alumniId]) ?? throw ApiException::notFound();
    }

    /**
     * Record detail with sensitive fields; every staff read is written to audit_log.
     *
     * @return array<string, mixed>
     */
    public function detail(int $alumniId): array
    {
        return DB::transaction(function () use ($alumniId) {
            $r = $this->find($alumniId);
            $x = DB::selectOne('SELECT birth_date, sex, civil_status, is_indigenous, indigenous_group, pwd_type, permanent_address, married_name, suffix, photo_url, merged_into_id FROM alumnus WHERE alumni_id = ?', [$alumniId]);
            $history = DB::select(
                "SELECT rr.review_id AS id, rr.action, rr.note, rr.diff, rr.created_at AS \"createdAt\", COALESCE(u.display_name, 'System') AS who
                   FROM record_review rr LEFT JOIN user_account u ON u.user_id = rr.reviewer_id
                  WHERE rr.alumni_id = ? ORDER BY rr.created_at DESC, rr.review_id DESC LIMIT 50",
                [$alumniId],
            );
            $links = DB::select('SELECT platform, url, is_visible AS "isVisible" FROM social_link WHERE alumni_id = ? ORDER BY platform', [$alumniId]);
            $outreach = DB::select(
                'SELECT o.contact_id AS id, o.method, o.outcome, o.message, o.contacted_at AS "contactedAt", o.removed_at AS "removedAt", u.display_name AS "by"
                   FROM outreach_contact o LEFT JOIN user_account u ON u.user_id = o.contacted_by
                  WHERE o.alumni_id = ? ORDER BY o.contacted_at DESC LIMIT 20',
                [$alumniId],
            );
            $proofs = DB::selectOne('SELECT count(*) FILTER (WHERE uploaded_at IS NOT NULL) AS uploaded, count(*) FILTER (WHERE uploaded_at IS NULL) AS requested FROM proof_document WHERE alumni_id = ?', [$alumniId]);
            $this->audit->log('read_sensitive', 'alumnus', $alumniId);

            return self::row($r) + [
                'birthDate' => $x->birth_date,
                'sex' => Vocab::label(Vocab::SEX, $x->sex),
                'civilStatus' => Vocab::label(Vocab::CIVIL_STATUS, $x->civil_status),
                'marriedName' => $x->married_name,
                'suffix' => $x->suffix,
                'isIndigenous' => (bool) $x->is_indigenous,
                'indigenousGroup' => $x->indigenous_group,
                'pwdType' => Vocab::label(Vocab::PWD_TYPE, $x->pwd_type),
                'permanentAddress' => $x->permanent_address,
                'photoUrl' => StorageService::publicUrl($x->photo_url),
                'mergedIntoId' => $x->merged_into_id,
                'links' => $links,
                'history' => array_map(fn ($h) => ['diff' => $h->diff === null ? null : json_decode($h->diff, true)] + (array) $h, $history),
                'outreach' => $outreach,
                'proofs' => ['uploaded' => (int) $proofs->uploaded, 'requested' => (int) $proofs->requested],
            ];
        });
    }

    /**
     * Recent review activity in the caller's scope ("Recent activity" on Records and the admin dashboard).
     *
     * @return list<object>
     */
    public function activity(Scope $scope, int $limit): array
    {
        $where = $scope->role === 'dept' ? 'WHERE COALESCE(p.college_id, a.declared_college_id) = ?' : '';

        return DB::select(
            "SELECT rr.review_id AS id, rr.action, rr.note, rr.created_at AS \"createdAt\", COALESCE(u.display_name, 'System') AS who,
                    u.role AS \"whoRole\", concat_ws(' ', a.first_name, a.last_name) AS alumnus, a.membership_id AS \"membershipId\", a.alumni_id AS \"alumniId\"
               FROM record_review rr JOIN alumnus a ON a.alumni_id = rr.alumni_id
               LEFT JOIN program p ON p.program_id = a.program_id
               LEFT JOIN user_account u ON u.user_id = rr.reviewer_id
               {$where} ORDER BY rr.created_at DESC, rr.review_id DESC LIMIT ?",
            $scope->role === 'dept' ? [$scope->collegeId, $limit] : [$limit],
        );
    }

    // --- Status, merge, mapping ------------------------------------------------------------------------

    /**
     * verify | flag | unflag | archive | restore. Records start verified, so verify and unflag both clear a flag.
     *
     * @return array{from: string, to: string}
     */
    public function changeStatus(int $alumniId, string $action, ?string $reason, UserAccount $actor): array
    {
        $r = DB::selectOne(
            'SELECT alumni_id, verification_status, archived_at, user_id, merged_into_id FROM alumnus WHERE alumni_id = ? FOR UPDATE',
            [$alumniId],
        );
        if ($r === null || $r->merged_into_id !== null) {
            throw ApiException::notFound();
        }
        $reason = self::text($reason);
        if ($action === 'flag' && $reason === null) {
            throw new ApiException(422, 'Add a note explaining what needs to be fixed.', 'validation', ['reason' => 'Add a note explaining what needs to be fixed.']);
        }

        $from = $r->archived_at !== null ? 'archived' : $r->verification_status;
        [$set, $to] = match ($action) {
            'verify' => ["verification_status = 'verified', flag_note = NULL, archived_at = NULL", 'verified'],
            'flag' => ["verification_status = 'flagged', flag_note = ?, archived_at = NULL", 'flagged'],
            'unflag' => ["verification_status = 'verified', flag_note = NULL", 'verified'],
            'archive' => ['archived_at = now()', 'archived'],
            'restore' => ['archived_at = NULL', $r->verification_status],
            default => throw new ApiException(422, 'Unknown action.', 'validation', ['action' => 'Unknown action.']),
        };
        DB::update("UPDATE alumnus SET {$set} WHERE alumni_id = ?", $action === 'flag' ? [$reason, $alumniId] : [$alumniId]);
        DB::table('record_review')->insert([
            'alumni_id' => $alumniId, 'reviewer_id' => $actor->user_id, 'action' => $action, 'note' => $reason,
            'diff' => json_encode(['from' => $from, 'to' => $to]),
        ]);
        $this->audit->log("status_{$action}", 'alumnus', $alumniId, $actor->user_id, ['from' => $from, 'to' => $to]);

        if ($r->user_id !== null && in_array($action, ['verify', 'flag', 'archive'], true)) {
            [$title, $message] = match ($action) {
                'verify' => ['Your alumni record was verified', 'The Alumni Office verified your record. Thank you for keeping it up to date.'],
                'flag' => ['Your alumni record needs an update', "The Alumni Office flagged your record: {$reason}"],
                default => ['Your alumni record was archived', 'Contact the Alumni Office if you think this is a mistake.'],
            };
            $this->notifications->notify([(int) $r->user_id], 'record_status', $title, $message, 'profile');
        }

        return ['from' => $from, 'to' => $to];
    }

    /** Merges a duplicate into the surviving record. The duplicate keeps its row (merged_into_id) for the audit trail. */
    public function merge(int $sourceId, int $targetId, UserAccount $actor): void
    {
        if ($sourceId === $targetId) {
            throw new ApiException(422, 'Choose a different record to merge into.', 'validation', ['into_id' => 'Choose a different record to merge into.']);
        }
        $s = DB::selectOne('SELECT * FROM alumnus WHERE alumni_id = ? FOR UPDATE', [$sourceId]);
        $d = DB::selectOne('SELECT * FROM alumnus WHERE alumni_id = ? FOR UPDATE', [$targetId]);
        if ($s === null || $d === null || $s->merged_into_id !== null || $d->merged_into_id !== null) {
            throw ApiException::notFound();
        }
        if ($s->user_id !== null && $d->user_id !== null) {
            throw ApiException::conflict('Both records have sign-in accounts. Disable one account before merging.');
        }
        // Move the login and the identifiers the survivor lacks (unique columns: clear the source first).
        foreach (['user_id', 'student_no', 'membership_id'] as $col) {
            if ($d->{$col} === null && $s->{$col} !== null) {
                DB::update("UPDATE alumnus SET {$col} = NULL WHERE alumni_id = ?", [$sourceId]);
                DB::update("UPDATE alumnus SET {$col} = ? WHERE alumni_id = ?", [$s->{$col}, $targetId]);
            }
        }
        // Child rows that cannot collide move; the ones that would collide stay on the (now hidden) duplicate.
        $move = [
            'social_link' => 'platform', 'survey_response' => 'cycle_id', 'event_registration' => 'event_id',
            'saved_job' => 'job_id', 'alumni_skill' => 'skill_id',
        ];
        foreach ($move as $table => $key) {
            DB::update("UPDATE {$table} SET alumni_id = ? WHERE alumni_id = ? AND {$key} NOT IN (SELECT {$key} FROM {$table} WHERE alumni_id = ?)", [$targetId, $sourceId, $targetId]);
        }
        if (DB::table('employment_record')->where('alumni_id', $targetId)->where('is_current', true)->exists()) {
            DB::update('UPDATE employment_record SET is_current = false WHERE alumni_id = ?', [$sourceId]);
        }
        foreach (['employment_record', 'credential', 'outreach_contact', 'proof_document'] as $table) {
            DB::update("UPDATE {$table} SET alumni_id = ? WHERE alumni_id = ?", [$targetId, $sourceId]);
        }
        DB::update('UPDATE alumnus SET merged_into_id = ? WHERE alumni_id = ?', [$targetId, $sourceId]);
        DB::table('record_review')->insert([
            ['alumni_id' => $sourceId, 'reviewer_id' => $actor->user_id, 'action' => 'merge', 'note' => null, 'diff' => json_encode(['merged_into' => $targetId])],
            ['alumni_id' => $targetId, 'reviewer_id' => $actor->user_id, 'action' => 'merge', 'note' => null, 'diff' => json_encode(['absorbed' => $sourceId])],
        ]);
        $this->audit->log('merge', 'alumnus', $sourceId, $actor->user_id, ['into' => $targetId]);
    }

    public function mapProgram(int $alumniId, int $programId, UserAccount $actor, Scope $scope): void
    {
        $p = DB::selectOne('SELECT program_id, college_id, abbr FROM program WHERE program_id = ? AND is_active', [$programId]);
        if ($p === null || ! $scope->allowsCollege((int) $p->college_id)) {
            throw new ApiException(422, 'Choose a program from your college.', 'validation', ['program_id' => 'Choose a program from your college.']);
        }
        $before = DB::selectOne('SELECT program_id, course_other FROM alumnus WHERE alumni_id = ? FOR UPDATE', [$alumniId]) ?? throw ApiException::notFound();
        DB::update('UPDATE alumnus SET program_id = ?, course_other = NULL, declared_college_id = NULL WHERE alumni_id = ?', [$programId, $alumniId]);
        DB::table('record_review')->insert([
            'alumni_id' => $alumniId, 'reviewer_id' => $actor->user_id, 'action' => 'map_program',
            'diff' => json_encode(['from' => $before->course_other ?? $before->program_id, 'to' => $p->abbr]),
        ]);
        $this->audit->log('map_program', 'alumnus', $alumniId, $actor->user_id, ['program_id' => $programId]);
    }

    // --- Composed emails (the portal sends nothing; it records the hand-off) ---------------------------

    /** Records "Email composed" (the client opened the staff member's mail app with the message). */
    public function emailComposed(int $alumniId, string $subject, UserAccount $actor): void
    {
        $this->find($alumniId);
        DB::table('record_review')->insert([
            'alumni_id' => $alumniId, 'reviewer_id' => $actor->user_id, 'action' => 'edit',
            'note' => "Email composed: {$subject}", 'diff' => json_encode(['kind' => 'email']),
        ]);
        $this->audit->log('email_composed', 'alumnus', $alumniId, $actor->user_id);
    }

    // --- Staff-created and edited records (Records form, import) ---------------------------------------

    /**
     * @param  array<string, mixed>  $input  the Records form (name or first/last, college, course, year_graduated, …)
     * @return int the new alumni_id
     */
    public function create(array $input, UserAccount $actor, Scope $scope, string $source = 'admin_encoded'): int
    {
        [$errors, $names] = self::fieldErrors($input, true);
        if ($errors !== []) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', $errors);
        }
        $prog = $this->registration->resolveProgram((string) ($input['college'] ?? ''), self::text($input['course'] ?? null), self::text($input['course_other'] ?? null));
        if (! $scope->allowsCollege($prog['collegeId'])) {
            throw new ApiException(422, 'You can only add alumni to your own college.', 'validation', ['college' => 'You can only add alumni to your own college.']);
        }
        $year = (int) $input['year_graduated'];
        $studentNo = self::text($input['student_no'] ?? null);
        if ($studentNo !== null && DB::table('alumnus')->where('student_no', $studentNo)->exists()) {
            throw new ApiException(409, 'Another record already uses this Alumni ID.', 'student_no_taken', ['student_no' => 'Another record already uses this Alumni ID.']);
        }

        $alumniId = (int) DB::table('alumnus')->insertGetId([
            'membership_id' => $this->registration->nextMembershipId($year),
            'student_no' => $studentNo,
            'program_id' => $prog['programId'], 'course_other' => $prog['courseOther'], 'declared_college_id' => $prog['declaredCollegeId'],
            'year_graduated' => $year,
            'last_name' => $names ? $names['last'] : self::text($input['last_name'] ?? null),
            'first_name' => $names ? $names['first'] : self::text($input['first_name'] ?? null),
            'middle_name' => self::text($input['middle_name'] ?? null),
            'mobile_no' => Mobile::normalize(self::text($input['mobile'] ?? null)),
            'present_address' => self::text($input['address'] ?? null),
            'contact_email' => self::text($input['email'] ?? null),
            'record_source' => in_array($input['source'] ?? null, self::SOURCES, true) ? $input['source'] : $source,
            'flag_note' => self::text($input['note'] ?? null),
        ], 'alumni_id');
        DB::table('record_review')->insert([
            'alumni_id' => $alumniId, 'reviewer_id' => $actor->user_id, 'action' => 'create',
            'note' => $source === 'import' ? 'Imported from the registrar list' : 'Encoded by staff',
        ]);
        $this->audit->log($source === 'import' ? 'import' : 'create', 'alumnus', $alumniId, $actor->user_id);
        $this->writeStaffEmployment($alumniId, self::text($input['employment'] ?? null), self::text($input['company'] ?? null));
        $this->applyFormStatus($alumniId, self::text($input['status'] ?? null), self::text($input['note'] ?? null), $actor);

        return $alumniId;
    }

    /**
     * Partial staff edit: only the fields sent change.
     *
     * @param  array<string, mixed>  $input
     */
    public function update(int $alumniId, array $input, UserAccount $actor, Scope $scope): void
    {
        $before = DB::selectOne(self::SELECT.' WHERE a.alumni_id = ? FOR UPDATE OF a', [$alumniId]) ?? throw ApiException::notFound();
        [$errors, $names] = self::fieldErrors($input, false);
        $set = [];
        $has = fn (string $k) => array_key_exists($k, $input);

        if ($names !== null && ! isset($errors['name'])) {
            // The form edits the list's "First M. Last": the middle initial is not part of the first name.
            $initial = $before->middle_name ? preg_quote(mb_substr($before->middle_name, 0, 1), '/') : null;
            if ($initial !== null) {
                $names['first'] = (string) preg_replace("/\\s+{$initial}\\.\$/iu", '', $names['first']);
            }
            $set['first_name'] = $names['first'];
            $set['last_name'] = $names['last'];
        }
        foreach (['first_name' => 'Enter the first name.', 'last_name' => 'Enter the last name.'] as $k => $msg) {
            if ($has($k) && $names === null) {
                self::text($input[$k]) === null ? $errors[$k] = $msg : $set[$k] = self::text($input[$k]);
            }
        }
        if ($has('middle_name')) {
            $set['middle_name'] = self::text($input['middle_name']);
        }
        if ($has('student_no') && ! isset($errors['student_no'])) {
            $sn = self::text($input['student_no']);
            if ($sn !== null && DB::table('alumnus')->where('student_no', $sn)->where('alumni_id', '<>', $alumniId)->exists()) {
                $errors['student_no'] = 'Another record already uses this Alumni ID.';
            }
            $set['student_no'] = $sn;
        }
        if ($has('year_graduated') && ! isset($errors['year_graduated'])) {
            $set['year_graduated'] = (int) $input['year_graduated'];
        }
        if ($has('mobile') && ! isset($errors['mobile'])) {
            $set['mobile_no'] = Mobile::normalize(self::text($input['mobile']));
        }
        if ($has('address')) {
            $set['present_address'] = self::text($input['address']);
        }
        if ($has('note')) {
            $set['flag_note'] = self::text($input['note']);
        }
        if (in_array($input['source'] ?? null, self::SOURCES, true)) {
            $set['record_source'] = $input['source'];
        }
        if ($has('email') && ! isset($errors['email'])) {
            // The sign-in email belongs to the alumnus (changed from their profile); staff edit only the contact email.
            $email = self::text($input['email']);
            if ($before->user_id !== null) {
                if ($email !== null && strtolower($email) !== strtolower((string) $before->email)) {
                    $errors['email'] = 'This alumnus signs in with their own email; they can change it in their profile.';
                }
            } else {
                $set['contact_email'] = $email;
            }
        }
        if ($has('college') || $has('course') || $has('course_other')) {
            try {
                $prog = $this->registration->resolveProgram((string) ($input['college'] ?? $before->college_name), self::text($input['course'] ?? null), self::text($input['course_other'] ?? null));
                if (! $scope->allowsCollege($prog['collegeId'])) {
                    $errors['college'] = 'You can only assign programs from your own college.';
                } else {
                    $set += ['program_id' => $prog['programId'], 'course_other' => $prog['courseOther'], 'declared_college_id' => $prog['declaredCollegeId']];
                }
            } catch (ApiException $e) {
                $errors += $e->fields ?? [];
            }
        }
        if ($errors !== []) {
            throw new ApiException(422, 'Please correct the highlighted fields.', 'validation', $errors);
        }

        if ($set !== []) {
            DB::table('alumnus')->where('alumni_id', $alumniId)->update($set);
        }
        if ($has('employment') || $has('company')) {
            $this->writeStaffEmployment($alumniId, self::text($input['employment'] ?? null) ?? $before->employment_status,
                $has('company') ? self::text($input['company']) : $before->employer_name);
            DB::update('UPDATE alumnus SET updated_at = now() WHERE alumni_id = ?', [$alumniId]);
        }
        $fields = array_values(array_diff(array_keys($input), ['reason']));
        $diff = ['fields' => $fields];
        if ($has('course') || $has('year_graduated')) {
            $diff['from'] = ($before->program_abbr ?? 'Unmapped').' · '.$before->batch;
        }
        DB::table('record_review')->insert([
            'alumni_id' => $alumniId, 'reviewer_id' => $actor->user_id, 'action' => 'edit', 'note' => self::text($input['reason'] ?? null), 'diff' => json_encode($diff),
        ]);
        $this->audit->log('staff_edit', 'alumnus', $alumniId, $actor->user_id, ['fields' => $fields]);
        $this->applyFormStatus($alumniId, self::text($input['status'] ?? null), self::text($input['note'] ?? null), $actor);
    }

    /**
     * Registrar graduate list (JSON rows; the client parses the CSV). Rows whose Alumni ID already exists are skipped;
     * a failing row is rolled back on its own (savepoint) and reported.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array{created: int, skipped: int, failed: int, errors: list<array<string, mixed>>}
     */
    public function import(array $rows, UserAccount $actor, Scope $scope): array
    {
        $created = $skipped = 0;
        $errors = [];
        foreach ($rows as $i => $row) {
            $sn = self::text($row['student_no'] ?? null);
            if ($sn !== null && DB::table('alumnus')->where('student_no', $sn)->exists()) {
                $skipped++;

                continue;
            }
            try {
                DB::transaction(fn () => $this->create($row, $actor, $scope, 'import'));
                $created++;
            } catch (ApiException $e) {
                $errors[] = ['row' => $i + 1, 'error' => $e->getMessage(), 'fields' => $e->fields];
            }
        }
        $this->audit->log('import_batch', 'alumnus', null, $actor->user_id, ['created' => $created, 'skipped' => $skipped, 'failed' => count($errors)]);

        return ['created' => $created, 'skipped' => $skipped, 'failed' => count($errors), 'errors' => array_slice($errors, 0, 50)];
    }

    // --- Shapes and helpers ----------------------------------------------------------------------------

    /**
     * A records row as the client shows it.
     *
     * @return array<string, mixed>
     */
    public static function row(object $r): array
    {
        return [
            'id' => (int) $r->alumni_id,
            'membershipId' => $r->membership_id,
            'studentNo' => $r->student_no,
            'name' => implode(' ', array_filter([$r->first_name, $r->middle_name ? mb_substr($r->middle_name, 0, 1).'.' : null, $r->last_name])),
            'firstName' => $r->first_name,
            'lastName' => $r->last_name,
            'middleName' => $r->middle_name,
            'program' => $r->program_abbr ?? 'Unmapped',
            'programId' => $r->program_id === null ? null : (int) $r->program_id,
            'course' => $r->program_name ?? $r->course_other ?? '',
            'unmapped' => $r->program_id === null,
            'college' => $r->college_name,
            'collegeId' => $r->college_id === null ? null : (int) $r->college_id,
            'collegeCode' => $r->college_code,
            'batch' => (int) $r->batch,
            'employmentStatus' => $r->employment_status,
            'company' => $r->employer_name ?? '',
            'jobTitle' => $r->job_title ?? '',
            'traced' => (bool) $r->traced,
            'surveyStatus' => $r->survey_status ?? 'not_started',
            'completionPct' => $r->completion_pct === null ? 0 : (int) $r->completion_pct,
            'email' => $r->email ?? '',
            'mobile' => Mobile::display($r->mobile_no),
            'address' => $r->present_address ?? '',
            'source' => $r->record_source,
            'status' => $r->archived_at !== null ? 'archived' : $r->verification_status,
            'note' => $r->flag_note ?? '',
            'hasAccount' => $r->user_id !== null,
            'accountStatus' => $r->account_status,
            'lastContactedAt' => $r->last_contacted_at,
            'lastContactedVia' => $r->last_contacted_via,
            'createdAt' => $r->created_at,
            'updatedAt' => $r->updated_at,
        ];
    }

    /**
     * "Juan Dela Cruz" -> first "Juan", last "Dela Cruz"; surname particles stay with the last name.
     *
     * @return array{first: string, last: string}
     */
    public static function splitName(string $full): array
    {
        $w = array_values(array_filter(preg_split('/\s+/', trim($full)) ?: [], fn ($x) => $x !== ''));
        if (count($w) < 2) {
            return ['first' => $w[0] ?? '', 'last' => ''];
        }
        $i = count($w) - 1;
        while ($i > 1 && in_array(mb_strtolower($w[$i - 1]), self::PARTICLES, true)) {
            $i--;
        }

        return ['first' => implode(' ', array_slice($w, 0, $i)), 'last' => implode(' ', array_slice($w, $i))];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array{0: array<string, string>, 1: array{first: string, last: string}|null}
     */
    private static function fieldErrors(array $input, bool $creating): array
    {
        $e = [];
        $names = array_key_exists('name', $input) ? self::splitName((string) $input['name']) : null;
        if ($names !== null && ($names['first'] === '' || $names['last'] === '')) {
            $e['name'] = 'Enter the alumnus’s first and last name.';
        }
        if ($creating && $names === null) {
            if (self::text($input['last_name'] ?? null) === null) {
                $e['last_name'] = 'Enter the last name.';
            }
            if (self::text($input['first_name'] ?? null) === null) {
                $e['first_name'] = 'Enter the first name.';
            }
        }
        if ($creating && self::text($input['college'] ?? null) === null) {
            $e['college'] = 'Select the college / department.';
        }
        if ($creating || array_key_exists('year_graduated', $input)) {
            $yr = filter_var($input['year_graduated'] ?? null, FILTER_VALIDATE_INT);
            if ($yr === false || $yr < 1950 || $yr > (int) now('Asia/Manila')->year) {
                $e['year_graduated'] = 'Enter a valid graduation year.';
            }
        }
        $mobile = self::text($input['mobile'] ?? null);
        if ($mobile !== null && Mobile::normalize($mobile) === null) {
            $e['mobile'] = 'Enter a valid mobile number (e.g. 09XX XXX XXXX).';
        }
        $sn = self::text($input['student_no'] ?? null);
        if ($sn !== null && ! preg_match(self::STUDENT_NO, $sn)) {
            $e['student_no'] = 'Use the format YY-NN-NNN (e.g. 24-05-567).';
        }
        $email = self::text($input['email'] ?? null);
        if ($email !== null && (! preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email) || strlen($email) > 120)) {
            $e['email'] = 'Enter a valid email address.';
        }
        $emp = self::text($input['employment'] ?? null);
        if ($emp !== null && ! in_array($emp, self::EMPLOYMENT, true)) {
            $e['employment'] = 'Select an employment status.';
        }
        $status = self::text($input['status'] ?? null);
        if ($status !== null && ! in_array($status, self::STATUSES, true)) {
            $e['status'] = 'Select a status.';
        }
        if (isset($input['source']) && ! in_array($input['source'], self::SOURCES, true)) {
            $e['source'] = 'Select a source.';
        }
        foreach (['first_name' => 60, 'last_name' => 60, 'middle_name' => 60, 'address' => 500, 'note' => 1000, 'company' => 160] as $k => $max) {
            if (! isset($e[$k]) && mb_strlen((string) self::text($input[$k] ?? null)) > $max) {
                $e[$k] = "Keep this under {$max} characters.";
            }
        }

        return [$e, $names];
    }

    /** Staff-encoded employment: updates the current employment_record or adds one (counts once the alumnus is traced). */
    private function writeStaffEmployment(int $alumniId, ?string $status, ?string $company): void
    {
        if ($status === null) {
            return;
        }
        $employer = $status === 'not_employed' ? null : $company;
        $current = DB::selectOne('SELECT employment_id FROM employment_record WHERE alumni_id = ? AND is_current FOR UPDATE', [$alumniId]);
        if ($current !== null) {
            DB::update('UPDATE employment_record SET employment_status = ?, employer_name = ? WHERE employment_id = ?', [$status, $employer, $current->employment_id]);
        } else {
            DB::table('employment_record')->insert(['alumni_id' => $alumniId, 'employment_status' => $status, 'employer_name' => $employer]);
        }
    }

    /** The status chips on the Records form map onto the review actions (with their history and notifications). */
    private function applyFormStatus(int $alumniId, ?string $status, ?string $note, UserAccount $actor): void
    {
        if ($status === null) {
            return;
        }
        $r = DB::selectOne('SELECT verification_status, archived_at FROM alumnus WHERE alumni_id = ?', [$alumniId]);
        $current = $r->archived_at !== null ? 'archived' : $r->verification_status;
        if ($status === $current) {
            return;
        }
        if ($status === 'archived') {
            $this->changeStatus($alumniId, 'archive', $note ?? 'Archived from the record form', $actor);

            return;
        }
        if ($r->archived_at !== null) {
            $this->changeStatus($alumniId, 'restore', null, $actor);
        }
        if ($status !== $r->verification_status) {
            match ($status) {
                'flagged' => $this->changeStatus($alumniId, 'flag', $note ?? 'Flagged by the Alumni Office for follow-up.', $actor),
                default => $this->changeStatus($alumniId, 'verify', null, $actor),
            };
        }
    }

    private static function text(mixed $v): ?string
    {
        if (! is_scalar($v)) {
            return null;
        }
        $s = trim((string) $v);

        return $s === '' ? null : $s;
    }
}
