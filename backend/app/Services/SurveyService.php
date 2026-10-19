<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Support\ProfileProgress;
use App\Support\SurveyMapping;
use Illuminate\Support\Facades\DB;

/**
 * survey_response + employment_record + credential. `answers` (keyed by the client's field ids) is the source for
 * re-rendering the form; the typed columns the stats read are filled from it on every submitted save, in the same
 * transaction. A response becomes "submitted" (traced) and stays so; later saves re-derive the typed columns.
 */
class SurveyService
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly SettingsService $settings,
        private readonly TracerQuestionService $tracer,
        private readonly ProfileService $profiles,
    ) {}

    /** @return array{cycle: ?array<string, mixed>, answers: array<string, mixed>, status: string, submitted: bool, completionPct: int, currentSection: int, submittedAt: ?string, updatedAt: ?string} */
    public function get(int $alumniId): array
    {
        $cycle = DB::selectOne('SELECT cycle_id, name, status, opens_at, closes_at FROM v_active_cycle');
        $r = $cycle === null ? null : DB::selectOne('SELECT * FROM survey_response WHERE alumni_id = ? AND cycle_id = ?', [$alumniId, $cycle->cycle_id]);

        return [
            'cycle' => $cycle === null ? null : ['id' => (int) $cycle->cycle_id, 'name' => $cycle->name, 'status' => $cycle->status, 'opensAt' => $cycle->opens_at, 'closesAt' => $cycle->closes_at],
            'answers' => $r === null ? [] : (array) json_decode($r->answers, true),
            'status' => $r->status ?? 'not_started',
            'submitted' => ($r->status ?? null) === 'submitted',
            'completionPct' => (int) ($r->completion_pct ?? 0),
            'currentSection' => (int) ($r->current_section ?? 0),
            'submittedAt' => $r->submitted_at ?? null,
            'updatedAt' => $r->updated_at ?? null,
        ];
    }

    /**
     * PUT /me/survey: saves a draft or submits.
     *
     * @param  array{answers?: mixed, currentSection?: mixed, submit?: mixed}  $body
     */
    public function save(int $alumniId, array $body, int $actorId): void
    {
        $cycle = DB::selectOne("SELECT cycle_id FROM survey_cycle WHERE status = 'open'")
            ?? throw ApiException::conflict('The alumni survey is closed right now.', 'survey_closed');
        $tracer = $this->tracer->rows();
        [$answers, $errors] = SurveyMapping::clean(is_array($body['answers'] ?? null) ? $body['answers'] : [], $tracer);
        if ($errors !== []) {
            throw new ApiException(422, 'Some answers need attention.', 'validation', $errors);
        }
        $section = filter_var($body['currentSection'] ?? 0, FILTER_VALIDATE_INT);
        $section = $section === false ? 0 : max(0, min(10, $section));

        DB::transaction(function () use ($alumniId, $cycle, $answers, $body, $section, $tracer, $actorId) {
            $existing = DB::selectOne('SELECT response_id, status FROM survey_response WHERE alumni_id = ? AND cycle_id = ? FOR UPDATE', [$alumniId, $cycle->cycle_id]);
            $wasSubmitted = ($existing->status ?? null) === 'submitted';
            $submitted = $wasSubmitted || ($body['submit'] ?? false) === true;
            if ($submitted && ! isset($answers['ever_employed'])) {
                throw new ApiException(422, 'Answer "Have you ever been employed?" before submitting.', 'validation', ['ever_employed' => 'Select an option.']);
            }
            $pct = ProfileProgress::compute($this->profiles->answers($alumniId) + $answers, $tracer)['pct'];
            $row = DB::selectOne(
                "INSERT INTO survey_response (alumni_id, cycle_id, status, completion_pct, current_section, first_gen_grad, passed_udmcat, answers, submitted_at)
                 VALUES (?, ?, ?::response_status, ?, ?, ?, ?, ?::jsonb, CASE WHEN ? THEN now() END)
                 ON CONFLICT (alumni_id, cycle_id) DO UPDATE SET
                   status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct, current_section = EXCLUDED.current_section,
                   first_gen_grad = EXCLUDED.first_gen_grad, passed_udmcat = EXCLUDED.passed_udmcat, answers = EXCLUDED.answers,
                   submitted_at = CASE WHEN EXCLUDED.status = 'submitted' THEN COALESCE(survey_response.submitted_at, now()) END
                 RETURNING response_id",
                [$alumniId, $cycle->cycle_id, $submitted ? 'submitted' : 'draft', $pct, $section,
                    SurveyMapping::yesNo($answers, 'first_grad'), SurveyMapping::yesNo($answers, 'udmcat'), json_encode((object) $answers), $submitted],
            );
            if ($submitted) {
                $this->writeEmployment($alumniId, (int) $row->response_id, SurveyMapping::employment($answers));
                DB::delete("DELETE FROM credential WHERE alumni_id = ? AND type IN ('honor', 'exam')", [$alumniId]);
                foreach (SurveyMapping::credentials($answers) as $c) {
                    DB::table('credential')->insert(['alumni_id' => $alumniId, 'type' => $c['type'], 'name' => mb_substr($c['name'], 0, 160)]);
                }
                DB::update("UPDATE alumnus SET record_source = 'survey' WHERE alumni_id = ?", [$alumniId]);
            }
            $action = $submitted ? ($wasSubmitted ? 'survey_update' : 'survey_submit') : 'survey_draft';
            $this->audit->log($action, 'survey_response', (int) $row->response_id, $actorId);
            if ($submitted && ! $wasSubmitted) {
                $userId = DB::table('alumnus')->where('alumni_id', $alumniId)->value('user_id');
                if ($userId !== null) {
                    $this->notifications->notify([(int) $userId], 'survey', 'Alumni survey response received',
                        'Thank you — your survey response has been recorded.', 'dashboard', "survey:{$cycle->cycle_id}");
                }
                $this->coverageMilestone($alumniId, (int) $cycle->cycle_id);
            }
        });
    }

    /** Re-derives completion_pct of one alumnus' active response (after a profile save). */
    public function recompute(int $alumniId): void
    {
        $r = DB::selectOne('SELECT r.response_id, r.answers FROM survey_response r JOIN v_active_cycle c ON c.cycle_id = r.cycle_id WHERE r.alumni_id = ?', [$alumniId]);
        if ($r !== null) {
            $pct = ProfileProgress::compute($this->profiles->answers($alumniId) + (array) json_decode($r->answers, true), $this->tracer->rows())['pct'];
            DB::update('UPDATE survey_response SET completion_pct = ? WHERE response_id = ? AND completion_pct <> ?', [$pct, $r->response_id, $pct]);
        }
    }

    /** Re-derives every active-cycle completion_pct (after the Admin changes which questions are Required or shown). */
    public function recomputeAll(): int
    {
        $tracer = $this->tracer->rows();
        $changed = 0;
        $rows = DB::select(ProfileService::ANSWERS_SQL.' JOIN survey_response r ON r.alumni_id = a.alumni_id JOIN v_active_cycle vc ON vc.cycle_id = r.cycle_id');
        foreach ($rows as $row) {
            $pct = ProfileProgress::compute(ProfileService::answersFromRow($row) + (array) json_decode($row->response_answers, true), $tracer)['pct'];
            if ($pct !== (int) $row->completion_pct) {
                DB::update('UPDATE survey_response SET completion_pct = ? WHERE response_id = ?', [$pct, $row->response_id]);
                $changed++;
            }
        }

        return $changed;
    }

    /** @param  array<string, mixed>|null  $emp */
    private function writeEmployment(int $alumniId, int $responseId, ?array $emp): void
    {
        $current = DB::selectOne('SELECT employment_id, response_id FROM employment_record WHERE alumni_id = ? AND is_current FOR UPDATE', [$alumniId]);
        if ($emp === null) {
            return;
        }
        $cols = array_fill_keys(['job_title', 'employer_name', 'org_type', 'line_of_business', 'occupation_class', 'place_of_work', 'job_status',
            'job_location', 'time_to_job_bucket', 'months_to_first_job', 'course_relevance'], null);
        $values = array_merge($cols, $emp);
        // The survey answer replaces a staff-encoded record or an older response's record.
        if ($current !== null && (int) $current->response_id === $responseId) {
            DB::table('employment_record')->where('employment_id', $current->employment_id)->update($values);

            return;
        }
        if ($current !== null) {
            DB::update('UPDATE employment_record SET is_current = false WHERE employment_id = ?', [$current->employment_id]);
        }
        DB::table('employment_record')->insert($values + ['alumni_id' => $alumniId, 'response_id' => $responseId, 'is_current' => true]);
    }

    /** Coverage milestone for the alumnus' college + batch, created once per crossing (dedupe_key). */
    private function coverageMilestone(int $alumniId, int $cycleId): void
    {
        $g = DB::selectOne(
            'SELECT v.college_id, v.batch, c.name AS college_name,
                    (SELECT count(*) FROM v_alumni_current x WHERE x.college_id = v.college_id AND x.batch = v.batch) AS total,
                    (SELECT count(*) FROM v_alumni_current x WHERE x.college_id = v.college_id AND x.batch = v.batch AND x.traced) AS traced
               FROM v_alumni_current v JOIN college c ON c.college_id = v.college_id WHERE v.alumni_id = ?',
            [$alumniId],
        );
        if ($g === null || (int) $g->total === 0) {
            return;
        }
        $target = (float) $this->settings->get('coverage_target');
        $rate = $g->traced / $g->total * 100;
        $before = ($g->traced - 1) / $g->total * 100;
        if ($rate >= $target && $before < $target) {
            $this->notifications->notify(
                [...$this->notifications->adminIds(), ...$this->notifications->deptIds((int) $g->college_id)],
                'milestone',
                "Batch {$g->batch} passed {$target}% survey coverage",
                sprintf('%s · Batch %d is now at %.1f%% (%d of %d). Report data has been refreshed.', $g->college_name, $g->batch, $rate, $g->traced, $g->total),
                'reports',
                "coverage:{$cycleId}:{$g->college_id}:{$g->batch}:{$target}",
            );
        }
    }
}
