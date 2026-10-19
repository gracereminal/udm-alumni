<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/*
| Alumni Records (/alumni): scope, CRUD, status (incl. account approval), merge, program mapping, proof requests,
| composed emails, import and activity. Plan-backend "Scope tests" and the Records part of "Feature tests".
*/

function collegeId(string $code): int
{
    return (int) DB::table('college')->where('code', $code)->value('college_id');
}

function alumniIdOf(string $email): int
{
    return (int) DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')->where('u.email', $email)->value('a.alumni_id');
}

function otherCollegeAlumnus(): int
{
    return (int) DB::table('v_alumni_current')->where('college_id', '<>', collegeId('CCS'))->orderBy('alumni_id')->value('alumni_id');
}

it('lists records with the list meta, and admin sees every college', function () {
    $r = withSession(signIn('admin@udmalumni.edu'))->getJson('/api/v1/alumni?per_page=10')->assertOk();

    expect($r->json('meta.per_page'))->toBe(10)
        ->and($r->json('meta.total'))->toBe(DB::table('alumnus')->whereNull('merged_into_id')->count())
        ->and($r->json('data'))->toHaveCount(10)
        ->and($r->json('data.0'))->toHaveKeys(['id', 'membershipId', 'studentNo', 'name', 'program', 'college', 'batch', 'status', 'traced', 'completionPct']);
});

it('limits a dept user to their own college and refuses other records', function () {
    $token = signIn('ccs.dean@udmalumni.edu');
    $r = withSession($token)->getJson('/api/v1/alumni?per_page=100&status=all')->assertOk();
    $ccs = collegeId('CCS');

    expect(collect($r->json('data'))->pluck('collegeId')->unique()->values()->all())->toBe([$ccs])
        ->and($r->json('meta.total'))->toBe(DB::table('v_records_counters')->where('college_id', $ccs)->sum(DB::raw('pending + flagged + verified + archived')));

    $other = otherCollegeAlumnus();
    withSession($token)->getJson("/api/v1/alumni/{$other}")->assertForbidden();
    withSession($token)->patchJson("/api/v1/alumni/{$other}", ['address' => 'Somewhere else, Manila City'])->assertForbidden();
    withSession($token)->postJson("/api/v1/alumni/{$other}/status", ['action' => 'verify'])->assertForbidden();
    withSession($token)->postJson('/api/v1/alumni/bulk-status', ['ids' => [$other], 'action' => 'verify'])->assertForbidden();
});

it('keeps alumni and signed-out users out of Records', function () {
    withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/alumni')->assertForbidden();
    withSession('')->getJson('/api/v1/alumni')->assertUnauthorized();
});

it('filters by status, batch, employment and search', function () {
    $token = signIn('admin@udmalumni.edu');

    $flagged = withSession($token)->getJson('/api/v1/alumni?status=flagged&per_page=100')->json('data');
    expect($flagged)->not->toBeEmpty()->and(collect($flagged)->pluck('status')->unique()->all())->toBe(['flagged']);

    $archived = withSession($token)->getJson('/api/v1/alumni?status=archived')->json('meta.total');
    expect($archived)->toBe(DB::table('alumnus')->whereNotNull('archived_at')->whereNull('merged_into_id')->count());

    $batch = withSession($token)->getJson('/api/v1/alumni?batch=2024&per_page=100')->json('data');
    expect(collect($batch)->pluck('batch')->unique()->all())->toBe([2024]);

    // A batch range (the dashboards' From / To filter), bounds included.
    $range = withSession($token)->getJson('/api/v1/alumni?batch_from=2022&batch_to=2023&per_page=100');
    expect(collect($range->json('data'))->pluck('batch')->unique()->sort()->values()->all())->toBe([2022, 2023])
        ->and($range->json('meta.total'))->toBe(DB::table('alumnus')->whereBetween('year_graduated', [2022, 2023])->whereNull('merged_into_id')->count()); // 'all' includes archived records

    $found = withSession($token)->getJson('/api/v1/alumni?q=24-05-567')->json('data');
    expect($found)->toHaveCount(1)->and($found[0]['name'])->toBe('Maria Dela Cruz');

    withSession($token)->getJson('/api/v1/alumni?status=bogus')->assertUnprocessable()->assertJsonPath('fields.status', fn ($m) => is_string($m));
});

it('creates a record that counts once in the population, Records counters and the college', function () {
    $token = signIn('admin@udmalumni.edu');
    $population = DB::table('v_alumni_current')->count();
    $ccsPending = (int) DB::table('v_records_counters')->where('college_id', collegeId('CCS'))->sum('pending');

    $r = withSession($token)->postJson('/api/v1/alumni', [
        'name' => 'Juan Dela Cruz', 'college' => 'CCS', 'course' => 'CCS-BSIT', 'year_graduated' => 2025,
        'email' => 'juan.dc@example.com', 'mobile' => '0917 555 0101', 'employment' => 'employed', 'company' => 'Accenture',
    ])->assertCreated();

    expect($r->json('firstName'))->toBe('Juan')->and($r->json('lastName'))->toBe('Dela Cruz')
        ->and($r->json('membershipId'))->toMatch('/^AM-2025-\d{5}$/')
        ->and($r->json('status'))->toBe('pending')->and($r->json('mobile'))->toBe('0917 555 0101')
        ->and($r->json('employmentStatus'))->toBe('employed')->and($r->json('hasAccount'))->toBeFalse()
        ->and(DB::table('v_alumni_current')->count())->toBe($population + 1)
        ->and((int) DB::table('v_records_counters')->where('college_id', collegeId('CCS'))->sum('pending'))->toBe($ccsPending + 1)
        ->and(DB::table('record_review')->where('alumni_id', $r->json('id'))->where('action', 'create')->exists())->toBeTrue()
        ->and(DB::table('audit_log')->where(['entity' => 'alumnus', 'entity_id' => $r->json('id'), 'action' => 'create'])->exists())->toBeTrue();
});

it('validates the record form with field messages', function () {
    $r = withSession(signIn('admin@udmalumni.edu'))->postJson('/api/v1/alumni', [
        'name' => 'Juan', 'college' => 'CCS', 'course' => 'CCS-BSIT', 'year_graduated' => 1800, 'student_no' => '2024-1', 'mobile' => '123',
    ])->assertUnprocessable();

    expect($r->json('fields'))->toHaveKeys(['name', 'year_graduated', 'student_no', 'mobile']);
});

it('stops a dept user from adding alumni to another college', function () {
    withSession(signIn('ccs.dean@udmalumni.edu'))->postJson('/api/v1/alumni', [
        'name' => 'Ana Reyes', 'college' => 'CHS', 'course' => 'CHS-BSN', 'year_graduated' => 2024,
    ])->assertUnprocessable()->assertJsonPath('fields.college', 'You can only add alumni to your own college.');
});

it('edits a record, keeping the login email with the alumnus', function () {
    $token = signIn('admin@udmalumni.edu');
    $maria = alumniIdOf('maria.delacruz@udmalumni.edu');

    withSession($token)->patchJson("/api/v1/alumni/{$maria}", ['address' => '123 Lacson Ave, Sampaloc, Manila', 'reason' => 'Updated by phone'])
        ->assertOk()->assertJsonPath('address', '123 Lacson Ave, Sampaloc, Manila');
    withSession($token)->patchJson("/api/v1/alumni/{$maria}", ['email' => 'other@example.com'])
        ->assertUnprocessable()->assertJsonPath('fields.email', 'This alumnus signs in with their own email; they can change it in their profile.');

    expect(DB::table('record_review')->where(['alumni_id' => $maria, 'action' => 'edit', 'note' => 'Updated by phone'])->exists())->toBeTrue();
});

it('flags with a note, notifies the alumnus, and archive removes the record from every count', function () {
    $token = signIn('admin@udmalumni.edu');
    $maria = alumniIdOf('maria.delacruz@udmalumni.edu');
    $userId = DB::table('alumnus')->where('alumni_id', $maria)->value('user_id');

    withSession($token)->postJson("/api/v1/alumni/{$maria}/status", ['action' => 'flag'])->assertUnprocessable()->assertJsonPath('fields.reason', fn ($m) => is_string($m));
    withSession($token)->postJson("/api/v1/alumni/{$maria}/status", ['action' => 'flag', 'reason' => 'Employer name missing'])
        ->assertOk()->assertJsonPath('status', 'flagged')->assertJsonPath('note', 'Employer name missing');
    expect(DB::table('notification')->where(['user_id' => $userId, 'type' => 'record_status'])->where('message', 'like', '%Employer name missing%')->exists())->toBeTrue();

    $population = DB::table('v_alumni_current')->count();
    withSession($token)->postJson("/api/v1/alumni/{$maria}/status", ['action' => 'archive'])->assertOk()->assertJsonPath('status', 'archived');
    expect(DB::table('v_alumni_current')->count())->toBe($population - 1)
        ->and(DB::table('v_alumni_current')->where('alumni_id', $maria)->exists())->toBeFalse();
    withSession($token)->postJson("/api/v1/alumni/{$maria}/status", ['action' => 'restore'])->assertOk()->assertJsonPath('status', 'flagged');
});

it('approves a pending registration when an admin verifies it, and only an admin can', function () {
    $paolo = alumniIdOf('paolo.mendoza@gmail.com');

    withSession(signIn('ccs.dean@udmalumni.edu'))->postJson("/api/v1/alumni/{$paolo}/status", ['action' => 'verify'])
        ->assertForbidden()->assertJsonPath('error', 'Only the Alumni Office Admin can approve a pending registration.');
    $this->postJson('/api/v1/auth/login', ['identifier' => 'paolo.mendoza@gmail.com', 'password' => 'demoPass123'])->assertForbidden();

    withSession(signIn('admin@udmalumni.edu'))->postJson("/api/v1/alumni/{$paolo}/status", ['action' => 'verify'])
        ->assertOk()->assertJsonPath('status', 'verified')->assertJsonPath('accountStatus', 'active');

    $userId = DB::table('user_account')->where('email', 'paolo.mendoza@gmail.com')->value('user_id');
    expect(DB::table('notification')->where(['user_id' => $userId, 'type' => 'account_approved'])->count())->toBe(1);
    $this->postJson('/api/v1/auth/login', ['identifier' => 'paolo.mendoza@gmail.com', 'password' => 'demoPass123'])->assertOk();
});

it('changes status in bulk, all or nothing', function () {
    $token = signIn('admin@udmalumni.edu');
    $ids = DB::table('alumnus')->where('verification_status', 'pending')->whereNull('archived_at')->whereNull('user_id')->orderBy('alumni_id')->limit(3)->pluck('alumni_id')->all();

    withSession($token)->postJson('/api/v1/alumni/bulk-status', ['ids' => $ids, 'action' => 'verify'])->assertOk()->assertJsonPath('count', 3);
    expect(DB::table('alumnus')->whereIn('alumni_id', $ids)->where('verification_status', 'verified')->count())->toBe(3);

    // One unknown id fails the request before anything changes.
    $more = DB::table('alumnus')->where('verification_status', 'pending')->whereNull('archived_at')->whereNull('user_id')->orderBy('alumni_id')->limit(2)->pluck('alumni_id')->all();
    withSession($token)->postJson('/api/v1/alumni/bulk-status', ['ids' => [...$more, 99999999], 'action' => 'verify'])->assertNotFound();
    expect(DB::table('alumnus')->whereIn('alumni_id', $more)->where('verification_status', 'verified')->count())->toBe(0);
});

it('merges a duplicate into the surviving record', function () {
    $token = signIn('admin@udmalumni.edu');
    $survivor = withSession($token)->postJson('/api/v1/alumni', ['name' => 'Lara Cruz', 'college' => 'CCS', 'course' => 'CCS-BSIT', 'year_graduated' => 2022])->json('id');
    $dup = withSession($token)->postJson('/api/v1/alumni', ['name' => 'Lara Cruz', 'college' => 'CCS', 'course' => 'CCS-BSIT', 'year_graduated' => 2022, 'student_no' => '22-11-111', 'employment' => 'employed', 'company' => 'BDO'])->json('id');
    $population = DB::table('v_alumni_current')->count();

    withSession($token)->postJson("/api/v1/alumni/{$dup}/merge", ['into_id' => $dup])->assertUnprocessable();
    withSession($token)->postJson("/api/v1/alumni/{$dup}/merge", ['into_id' => $survivor])->assertOk()
        ->assertJsonPath('studentNo', '22-11-111')->assertJsonPath('company', 'BDO');

    expect(DB::table('v_alumni_current')->count())->toBe($population - 1)
        ->and(DB::table('alumnus')->where('alumni_id', $dup)->value('merged_into_id'))->toBe($survivor)
        ->and(DB::table('employment_record')->where('alumni_id', $survivor)->where('is_current', true)->count())->toBe(1);
    withSession($token)->getJson('/api/v1/alumni?q=Lara%20Cruz')->assertJsonPath('meta.total', 1);
});

it('maps an unmapped program to a catalog program of the same college', function () {
    $token = signIn('admin@udmalumni.edu');
    $id = (int) DB::table('alumnus')->whereNull('program_id')->whereNull('merged_into_id')->orderBy('alumni_id')->value('alumni_id');
    $program = (int) DB::table('program')->where('code', 'CCS-BSIT')->value('program_id');

    withSession($token)->postJson("/api/v1/alumni/{$id}/map-program", ['program_id' => $program])->assertOk()
        ->assertJsonPath('unmapped', false)->assertJsonPath('program', 'BSIT');
    expect(DB::table('v_alumni_current')->where('alumni_id', $id)->value('is_unmapped'))->toBeFalse();

    // A dept user can only map to programs of their own college.
    $ccsUnmapped = withSession($token)->postJson('/api/v1/alumni', ['name' => 'Rico Tan', 'college' => 'CCS', 'course_other' => 'BS Game Design', 'year_graduated' => 2023])->json('id');
    withSession(signIn('ccs.dean@udmalumni.edu'))->postJson("/api/v1/alumni/{$ccsUnmapped}/map-program", ['program_id' => DB::table('program')->where('code', 'CHS-BSN')->value('program_id')])
        ->assertUnprocessable();
});

it('records a proof request and a composed email without sending anything', function () {
    Mail::fake();
    $token = signIn('ccs.dean@udmalumni.edu');
    $maria = alumniIdOf('maria.delacruz@udmalumni.edu');

    withSession($token)->postJson("/api/v1/alumni/{$maria}/request-proof", ['docs' => ['Certificate of Employment'], 'due_days' => 10])
        ->assertOk()->assertJsonPath('note', 'Awaiting proof: Certificate of Employment — due in 10 days.');
    withSession($token)->postJson("/api/v1/alumni/{$maria}/emails", ['subject' => 'Please update your survey'])->assertOk();

    expect(DB::table('proof_document')->where('alumni_id', $maria)->whereNull('uploaded_at')->count())->toBe(1)
        ->and(DB::table('record_review')->where('alumni_id', $maria)->where('note', 'Email composed: Please update your survey')->exists())->toBeTrue();
    Mail::assertNothingOutgoing();
});

it('audits staff reads of the record detail', function () {
    $token = signIn('admin@udmalumni.edu');
    $maria = alumniIdOf('maria.delacruz@udmalumni.edu');

    $r = withSession($token)->getJson("/api/v1/alumni/{$maria}")->assertOk();
    expect($r->json('birthDate'))->toBe('2002-03-14')->and($r->json('history'))->toBeArray()->and($r->json('links'))->not->toBeEmpty()
        ->and(DB::table('audit_log')->where(['action' => 'read_sensitive', 'entity_id' => $maria])->exists())->toBeTrue();
});

it('imports the registrar list, skipping known Alumni IDs and reporting bad rows', function () {
    $r = withSession(signIn('admin@udmalumni.edu'))->postJson('/api/v1/alumni/import', ['rows' => [
        ['first_name' => 'Ana', 'last_name' => 'Lim', 'college' => 'CCS', 'course' => 'BSIT', 'year_graduated' => 2025, 'student_no' => '25-01-001'],
        ['first_name' => 'Ben', 'last_name' => 'Go', 'college' => 'CCS', 'course' => 'BSIT', 'year_graduated' => 2025, 'student_no' => '24-05-567'],
        ['first_name' => 'Cy', 'last_name' => '', 'college' => 'CCS', 'course' => 'BSIT', 'year_graduated' => 2025],
    ]])->assertOk();

    expect($r->json('created'))->toBe(1)->and($r->json('skipped'))->toBe(1)->and($r->json('failed'))->toBe(1)
        ->and($r->json('errors.0.row'))->toBe(3)
        ->and(DB::table('alumnus')->where('student_no', '25-01-001')->value('record_source'))->toBe('import');
});

it('shows recent activity in scope only', function () {
    $rows = withSession(signIn('ccs.dean@udmalumni.edu'))->getJson('/api/v1/alumni/activity?limit=20')->assertOk()->json('data');
    $ccs = collegeId('CCS');

    foreach ($rows as $row) {
        $college = DB::selectOne('SELECT COALESCE(p.college_id, a.declared_college_id) AS c FROM alumnus a LEFT JOIN program p USING (program_id) WHERE a.alumni_id = ?', [$row['alumniId']])->c;
        expect($college)->toBe($ccs);
    }
});
