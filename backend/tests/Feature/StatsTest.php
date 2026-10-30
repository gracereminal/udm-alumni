<?php

use App\Services\ReportsService;
use Illuminate\Support\Facades\DB;

/*
| Survey (PUT /me/survey), /stats/* and /reports/*: plan-backend "Verification" invariants at the API level
| (admin total = sum of college totals = Records counter = Reports total; a survey submit moves coverage and
| employment by exactly that person) and the scope rules (dept pinned to their college, benchmark has no counts).
*/

/** A fresh alumnus account with no response yet, signed in. */
function newAlumnus(string $college = 'CCS', string $course = 'CCS-BSIT', int $year = 2024): string
{
    test()->postJson('/api/v1/auth/register', [
        'last_name' => 'Ramos', 'first_name' => 'Lia', 'dob' => '2001-02-03', 'gender' => 'Female', 'marital_status' => 'Single',
        'present_address' => '12 Rizal St., Brgy. 5, Manila', 'permanent_same' => true, 'indigenous' => 'No', 'pwd' => 'No',
        'mobile' => '09171230000', 'email' => 'lia.ramos@example.com', 'facebook' => 'lia.ramos',
        'college' => $college, 'course' => $course, 'year_graduated' => (string) $year,
        'reg_pw' => 'Password1', 'reg_pw2' => 'Password1', 'privacy_consent' => true,
    ])->assertCreated();
    DB::table('user_account')->where('email', 'lia.ramos@example.com')->update(['account_status' => 'active']);

    return signIn('lia.ramos@example.com', 'Password1');
}

function employedAnswers(): array
{
    return [
        'first_grad' => 'Yes', 'udmcat' => 'Yes', 'honors' => 'Cum Laude', 'prof_exams' => 'None', 'ever_employed' => 'Yes',
        'job_name' => 'Web Developer', 'job_address' => 'Makati City', 'employer' => 'Globe Telecom', 'job_status' => 'Regular or Permanent',
        'org_type' => 'Private', 'business_line' => 'Information and communication', 'occ_class' => 'Professionals',
        'place_of_work' => 'Local (within the Philippines)', 'time_to_job' => '1 to 6 months', 'job_related' => 'Yes',
        'still_working' => 'Yes', 'stay_reasons' => ['Career challenge'], 'fb_contribute' => 'Mentoring', 'fb_activity' => 'Job fair',
    ];
}

it('keeps the totals equal across the admin dashboard, colleges, Records counters and Reports', function () {
    $token = signIn('admin@udmalumni.edu');
    $summary = withSession($token)->getJson('/api/v1/stats/summary')->assertOk()->json();
    $colleges = withSession($token)->getJson('/api/v1/stats/by-program')->assertOk();
    $counters = withSession($token)->getJson('/api/v1/stats/counters')->assertOk()->json();

    expect($colleges->json('group'))->toBe('college')
        ->and(collect($colleges->json('data'))->sum('total'))->toBe($summary['total'])
        ->and($counters['active'])->toBe($summary['total'])
        ->and($summary['total'])->toBe(DB::table('v_alumni_current')->count())
        ->and($summary['traced'])->toBeLessThanOrEqual($summary['total'])
        ->and($summary['employed'])->toBeLessThanOrEqual($summary['traced'])
        ->and($summary['targets'])->toBe(['employment' => 80, 'coverage' => 60]);

    // Reports cover the last five batches; their totals equal the same window over the stats.
    $B = ReportsService::batches();
    $window = withSession($token)->getJson("/api/v1/stats/summary?batch_from={$B['from']}&batch_to={$B['to']}")->json();
    $coverage = withSession($token)->getJson('/api/v1/reports/coverage')->assertOk();
    expect($coverage->json('recordCount'))->toBe($window['traced'])
        ->and(end($coverage->json()['rows'])[1])->toBe(number_format($window['total']));
});

it('pins a dept user to their own college, whatever filter they send', function () {
    $token = signIn('ccs.dean@udmalumni.edu');
    $ccs = (int) DB::table('college')->where('code', 'CCS')->value('college_id');
    $chs = (int) DB::table('college')->where('code', 'CHS')->value('college_id');

    $own = withSession($token)->getJson('/api/v1/stats/summary')->json('total');
    expect($own)->toBe(DB::table('v_alumni_current')->where('college_id', $ccs)->count())
        ->and(withSession($token)->getJson("/api/v1/stats/summary?college_id={$chs}")->json('total'))->toBe($own);

    $programs = withSession($token)->getJson('/api/v1/stats/by-program')->json();
    expect($programs['group'])->toBe('program')->and(collect($programs['data'])->sum('total'))->toBe($own);

    $report = withSession($token)->getJson("/api/v1/reports/employability?college_id={$chs}")->assertOk();
    expect($report->json('scope'))->toBe('College of Computing Studies');
});

it('serves university rates without counts as the benchmark, and stats only to staff', function () {
    $b = withSession(signIn('ccs.dean@udmalumni.edu'))->getJson('/api/v1/stats/benchmark')->assertOk()->json();

    expect(array_keys($b))->toEqualCanonicalizing(['employmentRate', 'alignedRate', 'coverage', 'firstGenRate', 'completion'])
        ->and($b['coverage'])->toBe(withSession(signIn('admin@udmalumni.edu'))->getJson('/api/v1/stats/summary')->json('coverage'));
    withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/stats/summary')->assertForbidden();
});

it('derives the typed columns on submit and moves coverage and employment by exactly that person', function () {
    $admin = signIn('admin@udmalumni.edu');
    $before = withSession($admin)->getJson('/api/v1/stats/summary')->json();
    $token = newAlumnus();
    $mid = withSession($admin)->getJson('/api/v1/stats/summary')->json();
    expect($mid['total'])->toBe($before['total'] + 1)->and($mid['traced'])->toBe($before['traced']);

    // A draft is not traced.
    withSession($token)->putJson('/api/v1/me/survey', ['answers' => ['first_grad' => 'Yes'], 'currentSection' => 1])->assertOk()
        ->assertJsonPath('survey.status', 'draft');
    expect(withSession($admin)->getJson('/api/v1/stats/summary')->json('traced'))->toBe($before['traced']);

    $me = withSession($token)->putJson('/api/v1/me/survey', ['answers' => employedAnswers(), 'submit' => true])->assertOk();
    expect($me->json('survey.submitted'))->toBeTrue()->and($me->json('survey.completionPct'))->toBe(100)->and($me->json('progress.pct'))->toBe(100);

    $after = withSession($admin)->getJson('/api/v1/stats/summary')->json();
    expect($after['traced'])->toBe($before['traced'] + 1)
        ->and($after['employed'])->toBe($before['employed'] + 1)
        ->and($after['aligned'])->toBe($before['aligned'] + 1)
        ->and($after['timeToJob']['m1_6'])->toBe($before['timeToJob']['m1_6'] + 1);

    $id = (int) DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')->where('u.email', 'lia.ramos@example.com')->value('a.alumni_id');
    $emp = DB::table('employment_record')->where('alumni_id', $id)->where('is_current', true)->first();
    expect($emp->employment_status)->toBe('employed')->and($emp->org_type)->toBe('private')->and($emp->time_to_job_bucket)->toBe('m1_6')
        ->and((float) $emp->months_to_first_job)->toBe(3.5)->and($emp->course_relevance)->toBe('related')
        ->and(DB::table('credential')->where('alumni_id', $id)->pluck('name')->all())->toBe(['Cum Laude'])
        ->and(DB::table('survey_response')->where('alumni_id', $id)->value('first_gen_grad'))->toBeTrue();

    // A later save re-derives the columns: no longer employed there.
    withSession($token)->putJson('/api/v1/me/survey', ['answers' => ['still_working' => 'No'] + employedAnswers()])->assertOk()->assertJsonPath('survey.submitted', true);
    expect(DB::table('employment_record')->where('alumni_id', $id)->where('is_current', true)->value('employment_status'))->toBe('not_employed')
        ->and(DB::table('employment_record')->where('alumni_id', $id)->where('is_current', true)->count())->toBe(1)
        ->and(withSession($admin)->getJson('/api/v1/stats/summary')->json('employed'))->toBe($before['employed']);
});

it('validates survey answers and requires the employment question to submit', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');

    withSession($token)->putJson('/api/v1/me/survey', ['answers' => ['job_status' => 'Boss', 'stay_reasons' => 'x']])->assertUnprocessable()
        ->assertJsonPath('fields.job_status', 'Select a valid option.')->assertJsonPath('fields.stay_reasons', 'Select from the listed options.');

    $token = newAlumnus();
    withSession($token)->putJson('/api/v1/me/survey', ['answers' => ['first_grad' => 'No'], 'submit' => true])->assertUnprocessable()
        ->assertJsonPath('fields.ever_employed', 'Select an option.');
});

it('refuses survey saves when no cycle is open', function () {
    DB::table('survey_cycle')->update(['status' => 'closed']);
    withSession(signIn('maria.delacruz@udmalumni.edu'))->putJson('/api/v1/me/survey', ['answers' => employedAnswers()])->assertStatus(409)->assertJsonPath('code', 'survey_closed');
});

it('notifies admin and that college once when a batch crosses the coverage target', function () {
    // An empty batch in a small college: the first response takes it from 0% to 100%.
    $token = newAlumnus('CCS', 'CCS-BSIT', 1999);
    withSession($token)->putJson('/api/v1/me/survey', ['answers' => employedAnswers(), 'submit' => true])->assertOk();
    withSession($token)->putJson('/api/v1/me/survey', ['answers' => employedAnswers(), 'submit' => true])->assertOk();

    $admin = DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('user_id');
    $dean = DB::table('user_account')->where('email', 'ccs.dean@udmalumni.edu')->value('user_id');
    $milestones = DB::table('notification')->where('type', 'milestone')->where('title', 'like', 'Batch 1999%');
    expect((clone $milestones)->where('user_id', $admin)->count())->toBe(1)
        ->and((clone $milestones)->where('user_id', $dean)->count())->toBe(1)
        ->and((clone $milestones)->count())->toBe(DB::table('user_account')->where('account_status', 'active')->where(fn ($q) => $q->where('role', 'admin')->orWhere(fn ($w) => $w->where('role', 'dept')->where('college_id', DB::table('college')->where('code', 'CCS')->value('college_id'))))->count());
});

it('serves the five report types and records exports in scope', function () {
    $admin = signIn('admin@udmalumni.edu');
    $types = withSession($admin)->getJson('/api/v1/reports/types')->assertOk()->json('data');
    expect(array_column($types, 'id'))->toBe(['ched', 'employability', 'coverage', 'employer', 'inclusion']);

    foreach (array_column($types, 'id') as $type) {
        $r = withSession($admin)->getJson("/api/v1/reports/{$type}")->assertOk();
        expect($r->json())->toHaveKeys(['kpis', 'bars', 'cols', 'rows', 'findings', 'file', 'scope'])->and($r->json('kpis'))->toHaveCount(4);
    }
    withSession($admin)->getJson('/api/v1/reports/bogus')->assertNotFound();

    // The Inclusion report carries counts only, never names.
    $inclusion = json_encode(withSession($admin)->getJson('/api/v1/reports/inclusion')->json());
    expect($inclusion)->not->toContain('Dela Cruz');

    // Without a window: the last five batches.
    $y = (int) now('Asia/Manila')->year;
    $default = withSession($admin)->getJson('/api/v1/reports/coverage')->json();
    expect($default['batchLabel'])->toBe('Batches '.($y - 4).'–'.$y)->and(count($default['bars']))->toBe(5);
    // A chosen window, in either order; one batch is labelled as such.
    $range = withSession($admin)->getJson('/api/v1/reports/coverage?batch_from=2023&batch_to=2020')->json();
    expect($range['batchLabel'])->toBe('Batches 2020–2023')->and($range['batchRange'])->toBe('2020-2023')
        ->and(array_column($range['bars'], 0))->toBe(['2020', '2021', '2022', '2023']);
    $one = withSession($admin)->getJson('/api/v1/reports/ched?batch_from=2022&batch_to=2022')->json();
    expect($one['batchLabel'])->toBe('Batch 2022')->and($one['batchRange'])->toBe('2022')
        ->and($one['recordCount'])->toBe(withSession($admin)->getJson('/api/v1/stats/summary?batch=2022')->json('traced'));

    $dean = signIn('ccs.dean@udmalumni.edu');
    withSession($dean)->postJson('/api/v1/reports/exports', ['type' => 'coverage', 'format' => 'Excel', 'batch_from' => 2020, 'batch_to' => 2023])->assertCreated()
        ->assertJsonPath('fmt', 'Excel')->assertJsonPath('by', 'Dr. Maria Santos')
        ->assertJsonPath('filters.batches', '2020-2023')->assertJsonPath('scopeLabel', fn ($s) => str_contains($s, 'Batches 2020–2023'));
    $deanHistory = withSession($dean)->getJson('/api/v1/reports/exports')->assertOk()->json();
    expect($deanHistory['meta']['total'])->toBe(1)
        ->and(withSession($admin)->getJson('/api/v1/reports/exports')->json('meta.total'))->toBe(DB::table('report_export')->count());
});

it('lists the outreach queue in scope with the channels on file', function () {
    $r = withSession(signIn('ccs.dean@udmalumni.edu'))->getJson('/api/v1/stats/unresponsive?per_page=50')->assertOk();
    $ccs = (int) DB::table('college')->where('code', 'CCS')->value('college_id');

    expect($r->json('meta.total'))->toBe(DB::table('v_unresponsive')->where('college_id', $ccs)->count())
        ->and(array_sum((array) $r->json('meta.byReason')))->toBe($r->json('meta.total'))
        ->and($r->json('data.0'))->toHaveKeys(['id', 'name', 'reason', 'lastContactedAt', 'lastContactedVia', 'email', 'facebook']);
});

it('lists the alumni behind the dashboard dialogs, matching the summary counts', function () {
    $admin = withSession(signIn('admin@udmalumni.edu'));
    $rows = collect($admin->getJson('/api/v1/stats/records')->assertOk()->json('data'));
    $summary = $admin->getJson('/api/v1/stats/summary')->json();

    expect($rows->count())->toBe($summary['total'])
        ->and($rows->where('traced', true)->count())->toBe($summary['traced'])
        ->and($rows->where('traced', true)->whereIn('employment', ['employed', 'self_employed'])->where('relevance', 'related')->count())->toBe($summary['aligned'])
        ->and($rows->first())->toHaveKeys(['id', 'name', 'collegeId', 'programId', 'batch', 'traced', 'updatedAt', 'employment', 'relevance', 'job', 'industry']);

    // A dept user only gets their own college, whatever filter they send.
    $ccs = (int) DB::table('college')->where('code', 'CCS')->value('college_id');
    $chs = (int) DB::table('college')->where('code', 'CHS')->value('college_id');
    $dean = collect(withSession(signIn('ccs.dean@udmalumni.edu'))->getJson("/api/v1/stats/records?college_id={$chs}")->json('data'));
    expect($dean->pluck('collegeId')->unique()->all())->toBe([$ccs])
        ->and($dean->count())->toBe(DB::table('v_alumni_current')->where('college_id', $ccs)->count());
});

it('stores completion with the full client rule, Admin edits included', function () {
    $maria = (int) DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')->where('u.email', 'maria.delacruz@udmalumni.edu')->value('a.alumni_id');
    $token = signIn('maria.delacruz@udmalumni.edu');
    $me = withSession($token)->getJson('/api/v1/me')->json();
    expect(DB::table('survey_response')->where('alumni_id', $maria)->value('completion_pct'))->toBe($me['progress']['pct']);

    // Making middle name Required adds an unanswered question for Maria.
    withSession(signIn('admin@udmalumni.edu'))->putJson('/api/v1/tracer/questions/middle_name', ['section' => 'personal', 'required' => true])->assertOk();
    $after = withSession($token)->getJson('/api/v1/me')->json('progress');
    expect($after['total'])->toBe($me['progress']['total'] + 1)
        ->and(DB::table('survey_response')->where('alumni_id', $maria)->value('completion_pct'))->toBe($after['pct']);
});
