<?php

use App\Mail\EventRegistrationMail;
use App\Support\EntryPass;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/*
| Jobs (board, approval queue, saves, applications) and events (CRUD, RSVP with capacity and the confirmation email,
| cancellations, notices). Plan-backend "Feature tests": approving a job notifies only the poster; applying records
| applied_via; an RSVP sends one confirmation email with a stable entry pass; an event's count = its registrations.
*/

/** An approved admin posting; the demo board itself holds only UDM's own openings. */
function adminJob(array $fields = []): int
{
    return (int) withSession(signIn('admin@udmalumni.edu'))->postJson('/api/v1/jobs', $fields + [
        'title' => 'Instructor', 'company' => 'Test Employer', 'type' => 'Full-time', 'applyVia' => 'hr@test-employer.ph',
    ])->assertCreated()->json('id');
}

function upcomingEventId(?int $capacity = null): int
{
    return (int) DB::table('v_event_stats')->where('status_key', 'open')->when($capacity, fn ($q) => $q->whereNotNull('capacity'))->orderBy('event_id')->value('event_id');
}

it('shows the job board with the viewer\'s own saves and applications', function () {
    $total = DB::table('job_posting')->where('approval_status', 'approved')->count();
    $brightline = adminJob(['company' => 'Brightline Tech', 'messenger' => 'brightlinetech']);
    adminJob(['company' => 'Nimbus Systems']);
    $token = signIn('maria.delacruz@udmalumni.edu');
    withSession($token)->postJson("/api/v1/jobs/{$brightline}/save")->assertOk();
    withSession($token)->postJson("/api/v1/jobs/{$brightline}/apply", ['via' => 'email'])->assertOk();

    $r = withSession($token)->getJson('/api/v1/jobs')->assertOk();
    $byCompany = collect($r->json('data'))->keyBy('company');

    expect($r->json('meta.total'))->toBe($total + 2)
        ->and($byCompany['Brightline Tech']['saved'])->toBeTrue()
        ->and($byCompany['Brightline Tech']['applied']['via'])->toBe('email')
        ->and($byCompany['Brightline Tech']['messenger'])->toBe('brightlinetech')
        ->and($byCompany['Nimbus Systems']['saved'])->toBeFalse()
        ->and($byCompany['Brightline Tech'])->not->toHaveKey('saves');
});

it('summarizes the open postings for the board tiles', function () {
    $before = withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/jobs/stats')->assertOk()->json();
    $a = adminJob(['company' => 'Acme Corp', 'salary' => '₱30,000 - ₱50,000']);
    adminJob(['company' => 'acme corp ', 'salary' => '₱40k']);
    $hidden = adminJob(['company' => 'Hidden Co', 'salary' => '₱900,000']);
    withSession(signIn('admin@udmalumni.edu'))->postJson("/api/v1/jobs/{$hidden}/deactivate")->assertOk();
    $token = signIn('maria.delacruz@udmalumni.edu');
    withSession($token)->postJson("/api/v1/jobs/{$a}/apply", ['via' => 'email'])->assertOk();

    $s = withSession($token)->getJson('/api/v1/jobs/stats')->assertOk();
    $open = $before['open'] + 2;
    expect($s->json('open'))->toBe($open)
        ->and($s->json('employers'))->toBe($before['employers'] + 1)
        ->and($s->json('applications'))->toBe($before['applications'] + 1)
        ->and($s->json('responseRate'))->toBe((int) round(100 * (DB::table('v_job_stats as s')->join('job_posting as j', 'j.job_id', '=', 's.job_id')
        ->where(['j.approval_status' => 'approved', 'j.is_active' => true])->whereNull('j.deleted_at')->where('s.applications', '>', 0)->count()) / $open));
    if ($before['salary'] === null) {
        expect($s->json('salary'))->toBe(['low' => 35000, 'high' => 45000, 'disclosed' => 2]);
    }
});

it('keeps the approval queue for the admin', function () {
    $maria = signIn('maria.delacruz@udmalumni.edu');
    withSession($maria)->postJson('/api/v1/jobs', ['title' => 'QA Engineer', 'company' => 'Seaboard Digital', 'applyVia' => 'careers@seaboard.ph'])->assertCreated();

    withSession($maria)->getJson('/api/v1/jobs?view=queue')->assertForbidden();
    $queue = withSession(signIn('admin@udmalumni.edu'))->getJson('/api/v1/jobs?view=queue')->assertOk();

    expect($queue->json('meta.total'))->toBe(1)->and($queue->json('data.0.email'))->toBe('maria.delacruz@udmalumni.edu');
});

it('queues an alumni posting, notifies the admins, and approval notifies only the poster', function () {
    $maria = signIn('maria.delacruz@udmalumni.edu');
    $admin = signIn('admin@udmalumni.edu');
    $adminId = DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('user_id');
    $mariaUser = DB::table('user_account')->where('email', 'maria.delacruz@udmalumni.edu')->value('user_id');

    withSession($maria)->postJson('/api/v1/jobs', ['title' => 'Data Engineer', 'company' => 'Acme', 'applyVia' => 'not an address'])
        ->assertUnprocessable()->assertJsonPath('fields.applyVia', 'Enter an email address or a website for applications.');
    $job = withSession($maria)->postJson('/api/v1/jobs', [
        'title' => 'Data Engineer', 'company' => 'Acme Data', 'type' => 'Full-time', 'applyVia' => 'jobs@acme.ph', 'messenger' => 'facebook.com/acmedata', 'tags' => ['SQL', 'dbt'],
    ])->assertCreated()->assertJsonPath('approvalStatus', 'pending');
    $id = $job->json('id');
    expect(DB::table('notification')->where(['user_id' => $adminId, 'type' => 'job_submitted'])->where('message', 'like', '%Data Engineer%')->exists())->toBeTrue();

    // Not on the board until approved; the poster can still edit it while pending.
    expect(collect(withSession($maria)->getJson('/api/v1/jobs')->json('data'))->pluck('id'))->not->toContain($id);
    withSession($maria)->patchJson("/api/v1/jobs/{$id}", ['salary' => '₱60,000'])->assertOk()->assertJsonPath('salary', '₱60,000');

    $before = DB::table('notification')->where('type', 'job_decision')->count();
    withSession($admin)->postJson("/api/v1/jobs/{$id}/approve")->assertOk()->assertJsonPath('approvalStatus', 'approved');
    expect(DB::table('notification')->where('type', 'job_decision')->count())->toBe($before + 1)
        ->and(DB::table('notification')->where('type', 'job_decision')->orderByDesc('notification_id')->value('user_id'))->toBe($mariaUser);

    // Approved: the poster can no longer edit it; skill matches (Maria has SQL) were told once.
    withSession($maria)->patchJson("/api/v1/jobs/{$id}", ['salary' => '₱1'])->assertForbidden();
    expect(DB::table('notification')->where(['type' => 'job_match', 'dedupe_key' => "job_match:{$id}"])->where('user_id', $mariaUser)->count())->toBe(1);
    withSession($admin)->postJson("/api/v1/jobs/{$id}/approve")->assertOk();
    expect(DB::table('notification')->where('type', 'job_decision')->count())->toBe($before + 1)
        ->and(DB::table('notification')->where('dedupe_key', "job_match:{$id}")->where('user_id', $mariaUser)->count())->toBe(1);
});

it('rejects with a reason sent to the poster', function () {
    $id = withSession(signIn('maria.delacruz@udmalumni.edu'))->postJson('/api/v1/jobs', ['title' => 'IT Support', 'company' => 'Coastal Bank', 'applyVia' => 'hr@coastalbank.ph'])
        ->assertCreated()->json('id');
    $poster = DB::table('job_posting')->where('job_id', $id)->value('posted_by');

    withSession(signIn('admin@udmalumni.edu'))->postJson("/api/v1/jobs/{$id}/reject", ['reason' => 'Missing salary details'])->assertOk()->assertJsonPath('approvalStatus', 'rejected');
    expect(DB::table('notification')->where(['user_id' => $poster, 'type' => 'job_decision'])->where('message', 'like', '%Missing salary details%')->exists())->toBeTrue();
});

it('saves, applies through a listed channel, and withdraws', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');
    $nimbus = adminJob(['company' => 'Nimbus Systems']); // email only, no Messenger
    $alumni = (int) DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')->where('u.email', 'maria.delacruz@udmalumni.edu')->value('a.alumni_id');

    withSession($token)->postJson("/api/v1/jobs/{$nimbus}/save")->assertOk()->assertJsonPath('saved', true);
    withSession($token)->postJson("/api/v1/jobs/{$nimbus}/apply", ['via' => 'messenger'])->assertUnprocessable()->assertJsonPath('fields.via', 'This posting does not take applications that way.');
    withSession($token)->postJson("/api/v1/jobs/{$nimbus}/apply", ['via' => 'email'])->assertOk()->assertJsonPath('applied.via', 'email');
    expect(DB::table('saved_job')->where(['alumni_id' => $alumni, 'job_id' => $nimbus])->value('applied_via'))->toBe('email');

    withSession($token)->deleteJson("/api/v1/jobs/{$nimbus}/apply")->assertOk()->assertJsonPath('applied', null);
    withSession($token)->deleteJson("/api/v1/jobs/{$nimbus}/save")->assertOk()->assertJsonPath('saved', false);
    expect(DB::table('saved_job')->where(['alumni_id' => $alumni, 'job_id' => $nimbus])->exists())->toBeFalse();

    $veyra = adminJob(['company' => 'Veyra Analytics', 'applyVia' => 'https://veyra.ai/careers']); // a careers page
    withSession($token)->postJson("/api/v1/jobs/{$veyra}/apply", ['via' => 'website'])->assertOk()->assertJsonPath('applied.via', 'website');
});

it('recommends open postings that match the alumnus\' course and skills, best first', function () {
    // Maria Dela Cruz: BSIT, skills Python, Spark, SQL, Power BI, Excel.
    $data = adminJob(['title' => 'Data Analyst', 'company' => 'Insight Labs', 'tags' => ['SQL', 'Power BI'], 'desc' => 'Build dashboards and reports from sales data.']);
    $dev = adminJob(['title' => 'Junior Developer', 'company' => 'Code Co', 'desc' => 'Open to graduates of IT and Computer Science programs.']);
    $nurse = adminJob(['title' => 'Staff Nurse', 'company' => 'City Hospital', 'desc' => 'Provide nursing care in the medical-surgical ward.']);
    $token = signIn('maria.delacruz@udmalumni.edu');

    $r = withSession($token)->getJson('/api/v1/jobs/recommended')->assertOk();
    $ids = array_column($r->json('data'), 'id');
    expect(array_search($data, $ids))->toBeLessThan(array_search($dev, $ids))
        ->and($ids)->not->toContain($nurse)
        ->and($r->json('data.0.match.terms'))->not->toBeEmpty()
        ->and($r->json('data.0'))->toHaveKeys(['title', 'company', 'saved', 'match']);

    withSession($token)->postJson("/api/v1/jobs/{$data}/apply", ['via' => 'email'])->assertOk();
    expect(array_column(withSession($token)->getJson('/api/v1/jobs/recommended')->json('data'), 'id'))->not->toContain($data);

    withSession(signIn('admin@udmalumni.edu'))->getJson('/api/v1/jobs/recommended')->assertForbidden();
});

it('lets the admin deactivate, delete and restore a posting', function () {
    $admin = signIn('admin@udmalumni.edu');
    $maria = signIn('maria.delacruz@udmalumni.edu');
    $id = adminJob(['company' => 'Northpoint Cloud']);

    withSession($admin)->postJson("/api/v1/jobs/{$id}/deactivate")->assertOk()->assertJsonPath('status', 'inactive');
    withSession($maria)->getJson("/api/v1/jobs/{$id}")->assertNotFound();
    withSession($admin)->postJson("/api/v1/jobs/{$id}/activate")->assertOk()->assertJsonPath('status', 'active');
    withSession($admin)->deleteJson("/api/v1/jobs/{$id}")->assertOk();
    withSession($admin)->getJson("/api/v1/jobs/{$id}")->assertNotFound();
    withSession($admin)->postJson("/api/v1/jobs/{$id}/restore")->assertOk()->assertJsonPath('id', $id);
    withSession($maria)->postJson("/api/v1/jobs/{$id}/approve")->assertForbidden();
});

it('lists events with counts equal to their registrations', function () {
    $events = withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/events')->assertOk()->json('data');

    expect($events)->toHaveCount(5);
    foreach ($events as $e) {
        expect($e['regCount'])->toBe(DB::table('event_registration')->where('event_id', $e['id'])->whereNull('cancelled_at')->count());
    }
    $mentor = collect($events)->firstWhere('capacity', 80);
    expect($mentor['statusKey'])->toBe('full')->and(collect($events)->where('statusKey', 'past'))->toHaveCount(1);
});

it('registers for an event with one confirmation email and a stable entry pass', function () {
    Mail::fake();
    $token = signIn('maria.delacruz@udmalumni.edu');
    $id = (int) DB::table('event')->where('title', 'like', 'Merlion Run%')->value('event_id');
    $before = DB::table('v_event_stats')->where('event_id', $id)->value('registered');

    withSession($token)->postJson("/api/v1/events/{$id}/rsvp", ['answers' => ['dist' => '5K · ₱650']])->assertUnprocessable()->assertJsonPath('fields.size', 'Select an option.');
    withSession($token)->postJson("/api/v1/events/{$id}/rsvp", ['answers' => ['dist' => '42K', 'size' => 'M']])->assertUnprocessable()->assertJsonPath('fields.dist', 'Select a listed option.');

    $r = withSession($token)->postJson("/api/v1/events/{$id}/rsvp", ['answers' => ['dist' => '5K · ₱650', 'size' => 'M']])->assertOk();
    $pass = EntryPass::code($id, 'maria.delacruz@udmalumni.edu');
    expect($r->json('registered'))->toBeTrue()->and($r->json('myEntryPass'))->toBe($pass)->and($r->json('emailSent'))->toBeTrue()
        ->and($r->json('regCount'))->toBe($before + 1);

    Mail::assertSent(EventRegistrationMail::class, 1);
    Mail::assertSent(EventRegistrationMail::class, function (EventRegistrationMail $mail) use ($pass) {
        $html = $mail->render();

        return $mail->hasTo('maria.delacruz@udmalumni.edu') && str_contains($html, $pass)
            && str_contains($html, '5K · ₱650 · M') && str_starts_with((string) $mail->subject, 'You’re registered: Merlion Run');
    });

    withSession($token)->postJson("/api/v1/events/{$id}/rsvp", ['answers' => ['dist' => '3K · ₱500', 'size' => 'S']])->assertStatus(409)->assertJsonPath('code', 'already_registered');

    // Cancel and register again: the same pass.
    withSession($token)->postJson("/api/v1/events/{$id}/cancel")->assertOk()->assertJsonPath('registered', false)->assertJsonPath('regCount', $before);
    withSession($token)->postJson("/api/v1/events/{$id}/rsvp", ['answers' => ['dist' => '3K · ₱500', 'size' => 'S']])->assertOk()->assertJsonPath('myEntryPass', $pass);
});

it('refuses RSVPs once an event is full, and tells the admins once', function () {
    Mail::fake();
    $admin = signIn('admin@udmalumni.edu');
    $id = withSession($admin)->postJson('/api/v1/events', [
        'title' => 'Small Workshop', 'kind' => 'CAREER', 'dateISO' => now('Asia/Manila')->addDays(5)->toDateString(), 'timeStart' => '09:00', 'timeEnd' => '11:00',
        'venue' => 'Room 101', 'capacity' => 1, 'body' => 'Hands-on session.',
    ])->assertCreated()->json('id');

    withSession(signIn('maria.delacruz@udmalumni.edu'))->postJson("/api/v1/events/{$id}/rsvp")->assertOk()->assertJsonPath('statusKey', 'full');
    $adminId = DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('user_id');
    expect(DB::table('notification')->where(['user_id' => $adminId, 'dedupe_key' => "rsvp_full:{$id}"])->count())->toBe(1);

    DB::table('user_account')->where('email', 'maria.santos@udm.edu.ph')->update(['password_hash' => Hash::make('demoPass123')]);
    withSession(signIn('maria.santos@udm.edu.ph'))->postJson("/api/v1/events/{$id}/rsvp")->assertStatus(409)->assertJsonPath('error', 'This event is full.');
});

it('publishes an event to all alumni once, and changes or cancellation reach the registrants', function () {
    Mail::fake();
    $admin = signIn('admin@udmalumni.edu');
    $alumni = DB::table('user_account')->where('role', 'alumni')->where('account_status', 'active')->count();

    withSession($admin)->postJson('/api/v1/events', ['title' => 'Past', 'dateISO' => '2020-01-01', 'timeStart' => '09:00', 'venue' => 'Gym', 'body' => 'x'])
        ->assertUnprocessable()->assertJsonPath('fields.dateISO', 'Choose a date that hasn’t passed.');
    $draft = withSession($admin)->postJson('/api/v1/events', [
        'title' => 'Batch Reunion', 'dateISO' => now('Asia/Manila')->addDays(20)->toDateString(), 'timeStart' => '18:00', 'venue' => 'UDM Gym', 'body' => 'Dinner.', 'publish' => false,
        'agenda' => [['time' => '18:00', 'label' => 'Dinner']], 'regFields' => [['key' => 'guests', 'label' => 'Guests', 'options' => ['0', '1']]],
    ])->assertCreated();
    $id = $draft->json('id');
    expect($draft->json('published'))->toBeFalse()->and($draft->json('agenda.0.label'))->toBe('Dinner')
        ->and(DB::table('notification')->where('dedupe_key', "event_pub:{$id}")->count())->toBe(0);
    withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson("/api/v1/events/{$id}")->assertNotFound();

    withSession($admin)->patchJson("/api/v1/events/{$id}", ['publish' => true])->assertOk()->assertJsonPath('published', true);
    withSession($admin)->patchJson("/api/v1/events/{$id}", ['publish' => true])->assertOk();
    expect(DB::table('notification')->where('dedupe_key', "event_pub:{$id}")->count())->toBe($alumni);

    withSession(signIn('maria.delacruz@udmalumni.edu'))->postJson("/api/v1/events/{$id}/rsvp", ['answers' => ['guests' => '1']])->assertOk();
    $maria = DB::table('user_account')->where('email', 'maria.delacruz@udmalumni.edu')->value('user_id');
    withSession($admin)->patchJson("/api/v1/events/{$id}", ['venue' => 'Function Room 2'])->assertOk();
    withSession($admin)->postJson("/api/v1/events/{$id}/cancel-event")->assertOk()->assertJsonPath('statusKey', 'cancelled');
    expect(DB::table('notification')->where('user_id', $maria)->where('title', 'Event updated: Batch Reunion')->count())->toBe(1)
        ->and(DB::table('notification')->where('user_id', $maria)->where('dedupe_key', "event_cancel:{$id}")->count())->toBe(1)
        ->and(DB::table('notification')->where('dedupe_key', "event_cancel:{$id}")->count())->toBe(1);

    $regs = withSession($admin)->getJson("/api/v1/events/{$id}/registrations")->assertOk();
    expect($regs->json('active'))->toBe(1)->and($regs->json('data.0.answers'))->toBe(['guests' => '1']);
});

it('duplicates an event as a draft sharing the cover, and keeps the file until its last user is gone', function () {
    Storage::fake();
    $admin = signIn('admin@udmalumni.edu');
    $id = upcomingEventId();
    $cover = withSession($admin)->post("/api/v1/events/{$id}/photo", ['photo' => UploadedFile::fake()->image('cover.jpg')])->assertOk()->json('photo');
    $key = substr($cover, strlen('/api/v1/files/'));

    $copy = withSession($admin)->postJson("/api/v1/events/{$id}/duplicate")->assertCreated();
    expect($copy->json('photo'))->toBe($cover)->and($copy->json('published'))->toBeFalse()->and($copy->json('title'))->toEndWith('(copy)');

    withSession($admin)->deleteJson("/api/v1/events/{$id}/photo")->assertOk()->assertJsonPath('photo', null);
    Storage::assertExists($key);
    withSession($admin)->deleteJson('/api/v1/events/'.$copy->json('id').'/photo')->assertOk();
    Storage::assertMissing($key);
});

it('serves notices to everyone and edits them as admin', function () {
    $admin = signIn('admin@udmalumni.edu');
    $maria = signIn('maria.delacruz@udmalumni.edu');

    $id = withSession($admin)->postJson('/api/v1/announcements', ['kind' => 'Reminder', 'title' => 'Survey closes soon', 'body' => 'Answer by Nov 15.', 'hidden' => true])->assertCreated()->json('id');
    expect(collect(withSession($maria)->getJson('/api/v1/announcements')->json('data'))->pluck('id'))->not->toContain($id);
    withSession($admin)->patchJson("/api/v1/announcements/{$id}", ['hidden' => false])->assertOk()->assertJsonPath('kind', 'Reminder');
    expect(collect(withSession($maria)->getJson('/api/v1/announcements')->json('data'))->pluck('id'))->toContain($id);
    withSession($maria)->postJson('/api/v1/announcements', ['title' => 'x', 'body' => 'y'])->assertForbidden();
    withSession($admin)->deleteJson("/api/v1/announcements/{$id}")->assertOk();
});
