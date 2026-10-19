<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/*
| Outreach (records the hand-off, sends nothing), notifications (own only), the Alumni Tracer question manager,
| staff accounts, settings, the audit log and the scheduled jobs.
*/

function ccsUnresponsive(): int
{
    return (int) DB::table('v_unresponsive')->where('college_id', DB::table('college')->where('code', 'CCS')->value('college_id'))->orderByDesc('alumni_id')->value('alumni_id');
}

it('records one outreach contact, sends no email, and marks the outreach row', function () {
    Mail::fake();
    $token = signIn('ccs.dean@udmalumni.edu');
    $id = ccsUnresponsive();

    $r = withSession($token)->postJson('/api/v1/outreach', ['alumni_id' => $id, 'method' => 'messenger', 'message' => 'Hi! Please answer the tracer survey.'])->assertCreated();
    expect($r->json('method'))->toBe('messenger')->and($r->json('outcome'))->toBe('sent')->and($r->json('outreachIntervalDays'))->toBe(7)
        ->and(DB::table('outreach_contact')->where('alumni_id', $id)->whereNull('removed_at')->count())->toBe(1);
    Mail::assertNothingOutgoing();

    $row = collect(withSession($token)->getJson('/api/v1/stats/unresponsive?per_page=100')->json('data'))->firstWhere('id', $id);
    expect($row['lastContactedVia'])->toBe('messenger')->and($row['lastContactedAt'])->not->toBeNull()
        // The client removes the mark with DELETE /outreach/:id, so the row carries that id.
        ->and($row['lastContactId'])->toBe($r->json('id'));

    // A second contact within the interval is recorded too, with a warning for the client.
    $again = withSession($token)->postJson('/api/v1/outreach', ['alumni_id' => $id, 'method' => 'email'])->assertCreated();
    expect($again->json('recentlyContactedAt'))->not->toBeNull();

    withSession($token)->patchJson('/api/v1/outreach/'.$again->json('id'), ['outcome' => 'reached'])->assertOk()->assertJsonPath('outcome', 'reached');
    withSession($token)->deleteJson('/api/v1/outreach/'.$again->json('id'))->assertOk()->assertJsonPath('removedAt', fn ($v) => $v !== null);
    $row = collect(withSession($token)->getJson('/api/v1/stats/unresponsive?per_page=100')->json('data'))->firstWhere('id', $id);
    expect($row['lastContactedVia'])->toBe('messenger')->and($row['lastContactId'])->toBe($r->json('id'));
});

it('stops a dept user from recording outreach for another college', function () {
    $other = (int) DB::table('v_unresponsive')->where('college_id', '<>', DB::table('college')->where('code', 'CCS')->value('college_id'))->value('alumni_id');
    $token = signIn('ccs.dean@udmalumni.edu');

    withSession($token)->postJson('/api/v1/outreach', ['alumni_id' => $other, 'method' => 'email'])->assertForbidden();
    $contact = DB::table('outreach_contact')->insertGetId(['alumni_id' => $other, 'method' => 'email'], 'contact_id');
    withSession($token)->deleteJson("/api/v1/outreach/{$contact}")->assertForbidden();
    withSession(signIn('maria.delacruz@udmalumni.edu'))->postJson('/api/v1/outreach', ['alumni_id' => $other, 'method' => 'email'])->assertForbidden();
});

it('shows only the user\'s own notifications and keeps read state on the server', function () {
    $maria = signIn('maria.delacruz@udmalumni.edu');
    $list = withSession($maria)->getJson('/api/v1/notifications')->assertOk();
    $mariaId = DB::table('user_account')->where('email', 'maria.delacruz@udmalumni.edu')->value('user_id');

    expect($list->json('meta.total'))->toBe(DB::table('notification')->where('user_id', $mariaId)->count())
        ->and($list->json('meta.unread'))->toBe($list->json('meta.total'))
        ->and($list->json('data.0'))->toHaveKeys(['id', 'type', 'title', 'body', 'to', 'read']);

    $first = $list->json('data.0.id');
    withSession($maria)->postJson("/api/v1/notifications/{$first}/read")->assertOk()->assertJsonPath('read', true);
    expect(withSession($maria)->getJson('/api/v1/notifications?unread=1')->json('meta.total'))->toBe($list->json('meta.total') - 1);

    $adminNote = DB::table('notification')->where('user_id', DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('user_id'))->value('notification_id');
    withSession($maria)->postJson("/api/v1/notifications/{$adminNote}/read")->assertNotFound();

    withSession($maria)->postJson('/api/v1/notifications/read-all')->assertOk();
    expect(withSession($maria)->getJson('/api/v1/notifications')->json('meta.unread'))->toBe(0);
});

it('notifies admin and that college only when an alumnus registers', function () {
    $this->postJson('/api/v1/auth/register', [
        'last_name' => 'Uy', 'first_name' => 'Ben', 'dob' => '2000-01-01', 'gender' => 'Male', 'marital_status' => 'Single',
        'present_address' => '1 Mabini St., Brgy. 2, Manila', 'permanent_same' => true, 'indigenous' => 'No', 'pwd' => 'No',
        'mobile' => '09170000001', 'email' => 'ben.uy@example.com', 'facebook' => 'ben.uy', 'college' => 'CHS', 'course' => 'CHS-BSN',
        'year_graduated' => '2024', 'reg_pw' => 'Password1', 'reg_pw2' => 'Password1', 'privacy_consent' => true,
    ])->assertCreated();

    $to = DB::table('notification as n')->join('user_account as u', 'u.user_id', '=', 'n.user_id')
        ->where('n.type', 'registration')->where('n.message', 'like', 'Ben Uy%')->get(['u.role', 'u.college_id']);
    expect($to->where('role', 'admin'))->not->toBeEmpty()
        ->and($to->where('role', 'dept')->pluck('college_id')->unique()->all())->not->toContain(DB::table('college')->where('code', 'CCS')->value('college_id'));
});

it('manages tracer questions in the client\'s config shape', function () {
    $admin = signIn('admin@udmalumni.edu');
    expect($this->getJson('/api/v1/tracer/questions')->assertOk()->json())->toBe(['ov' => [], 'custom' => [], 'order' => []]);

    withSession($admin)->putJson('/api/v1/tracer/questions/twitter', ['section' => 'contact', 'hidden' => true, 'label' => 'X (Twitter)'])->assertOk()
        ->assertJsonPath('ov.twitter', ['label' => 'X (Twitter)', 'hidden' => true]);
    $added = withSession($admin)->postJson('/api/v1/tracer/questions', ['section' => 'feedback', 'label' => 'Would you mentor students?', 'type' => 'choice', 'options' => ['Yes', 'No']])->assertCreated();
    $id = $added->json('id');
    expect($id)->toStartWith('custom_')->and($added->json('custom.0'))->toBe(['id' => $id, 'sec' => 'feedback', 'label' => 'Would you mentor students?', 'type' => 'choice', 'options' => ['Yes', 'No']]);

    withSession($admin)->putJson('/api/v1/tracer/sections/contact/order', ['ids' => ['email', 'mobile', 'facebook']])->assertOk()->assertJsonPath('order.contact', ['email', 'mobile', 'facebook']);

    // Core fields cannot be hidden or made optional; stat questions keep their options.
    withSession($admin)->putJson('/api/v1/tracer/questions/email', ['section' => 'contact', 'required' => false])->assertUnprocessable();
    withSession($admin)->putJson('/api/v1/tracer/questions/job_status', ['section' => 'details', 'options' => ['A', 'B']])->assertUnprocessable();
    withSession($admin)->postJson('/api/v1/tracer/questions', ['section' => 'feedback', 'label' => 'Pick', 'type' => 'choice', 'options' => ['Only one']])->assertUnprocessable()->assertJsonPath('fields.options', 'Add at least 2 options.');
    withSession(signIn('maria.delacruz@udmalumni.edu'))->putJson('/api/v1/tracer/questions/twitter', ['section' => 'contact', 'hidden' => false])->assertForbidden();

    // Added answers are kept with the survey; resetting removes the edit or the added question.
    withSession(signIn('maria.delacruz@udmalumni.edu'))->putJson('/api/v1/me/survey', ['answers' => [$id => 'Yes', 'ever_employed' => 'Yes']])->assertOk()->assertJsonPath("a.{$id}", 'Yes');
    withSession($admin)->deleteJson('/api/v1/tracer/questions/twitter')->assertOk()->assertJsonMissingPath('ov.twitter');
    withSession($admin)->deleteJson("/api/v1/tracer/questions/{$id}")->assertOk()->assertJsonPath('custom', []);
    withSession($admin)->deleteJson('/api/v1/tracer/questions')->assertOk()->assertExactJson(['ov' => [], 'custom' => [], 'order' => []]);
});

it('makes registration follow the tracer question edits', function () {
    $admin = signIn('admin@udmalumni.edu');
    $body = [
        'last_name' => 'Go', 'first_name' => 'Ana', 'dob' => '2000-01-01', 'gender' => 'Female', 'marital_status' => 'Single',
        'present_address' => '1 Mabini St., Brgy. 2, Manila', 'permanent_same' => true, 'indigenous' => 'No', 'pwd' => 'No',
        'mobile' => '09170000002', 'email' => 'ana.go@example.com', 'college' => 'CCS', 'course' => 'CCS-BSIT',
        'year_graduated' => '2024', 'reg_pw' => 'Password1', 'reg_pw2' => 'Password1', 'privacy_consent' => true,
    ];
    $this->postJson('/api/v1/auth/register', $body)->assertUnprocessable()->assertJsonPath('fields.facebook', fn ($m) => is_string($m));

    withSession($admin)->putJson('/api/v1/tracer/questions/facebook', ['section' => 'contact', 'required' => false])->assertOk();
    withSession($admin)->putJson('/api/v1/tracer/questions/middle_name', ['section' => 'personal', 'required' => true])->assertOk();
    $this->postJson('/api/v1/auth/register', $body)->assertUnprocessable()->assertJsonMissingPath('fields.facebook')->assertJsonPath('fields.middle_name', 'This field is required.');
    $this->postJson('/api/v1/auth/register', $body + ['middle_name' => 'Cruz'])->assertCreated();
});

it('creates staff accounts with a one-time password and signs a disabled account out at once', function () {
    $admin = signIn('admin@udmalumni.edu');
    $ccs = DB::table('college')->where('code', 'CCS')->value('college_id');

    withSession($admin)->postJson('/api/v1/users', ['email' => 'dept2@example.com', 'name' => 'Staff', 'role' => 'dept'])->assertUnprocessable()->assertJsonPath('fields.college_id', 'Select the college.');
    $r = withSession($admin)->postJson('/api/v1/users', ['email' => 'dept2@example.com', 'name' => 'CCS Staff', 'role' => 'dept', 'college_id' => $ccs])->assertCreated();
    expect($r->json('user.mustChangePassword'))->toBeTrue()->and(strlen($r->json('oneTimePassword')))->toBe(16);
    withSession($admin)->postJson('/api/v1/users', ['email' => 'DEPT2@example.com', 'name' => 'x', 'role' => 'admin'])->assertStatus(409);

    $token = signIn('dept2@example.com', $r->json('oneTimePassword'));
    withSession($token)->getJson('/api/v1/auth/session')->assertOk();
    withSession($admin)->patchJson('/api/v1/users/'.$r->json('user.id'), ['status' => 'disabled'])->assertOk()->assertJsonPath('user.status', 'disabled');
    withSession($token)->getJson('/api/v1/auth/session')->assertUnauthorized();

    $self = DB::table('user_account')->where('email', 'admin@udmalumni.edu')->value('user_id');
    withSession($admin)->patchJson("/api/v1/users/{$self}", ['status' => 'disabled'])->assertUnprocessable();
    withSession(signIn('ccs.dean@udmalumni.edu'))->getJson('/api/v1/users')->assertForbidden();
});

it('changes settings that the stats read', function () {
    $admin = signIn('admin@udmalumni.edu');

    withSession($admin)->putJson('/api/v1/settings', ['coverage_target' => 120])->assertUnprocessable();
    withSession($admin)->putJson('/api/v1/settings', ['coverage_target' => 65, 'outreach_interval_days' => 10])->assertOk()
        ->assertJsonPath('coverage_target', 65)->assertJsonPath('outreach_interval_days', 10);
    expect(withSession($admin)->getJson('/api/v1/stats/summary')->json('targets.coverage'))->toBe(65);

    $log = withSession($admin)->getJson('/api/v1/audit?action=settings_update')->assertOk();
    expect($log->json('meta.total'))->toBe(1)->and($log->json('data.0.diff'))->toBe(['coverage_target' => 65, 'outreach_interval_days' => 10]);
});

it('runs the scheduled jobs from Artisan and from the cron endpoint, idempotently', function () {
    config(['app.cron_secret' => str_repeat('s', 32)]);
    $alerts = DB::table('notification')->where('type', 'coverage_alert');

    expect(Artisan::call('app:coverage-alerts'))->toBe(0);
    $first = (clone $alerts)->count();
    expect($first)->toBeGreaterThan(0);
    Artisan::call('app:coverage-alerts');
    expect((clone $alerts)->count())->toBe($first);

    $this->postJson('/api/v1/internal/jobs/token-cleanup')->assertUnauthorized();
    $this->withHeaders(['X-Cron-Secret' => str_repeat('s', 32)])->postJson('/api/v1/internal/jobs/bogus')->assertNotFound();
    DB::table('notification')->update(['read_at' => now()->subDays(120)]);
    $r = $this->withHeaders(['X-Cron-Secret' => str_repeat('s', 32), 'X-Requested-With' => ''])->postJson('/api/v1/internal/jobs/notification-retention')->assertOk();
    expect($r->json('result.deleted'))->toBeGreaterThan(0)->and(DB::table('notification')->count())->toBe(0);
});
