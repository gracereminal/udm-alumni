<?php

use Illuminate\Support\Facades\DB;

/*
| Messages widget: one-to-one threads between an alumnus and the Alumni Office or their college, and between college
| staff and the office. Visibility and writes are decided on the server; alumni never reach each other.
*/

function mariaAlumniId(): int
{
    return (int) DB::table('alumnus')->join('user_account', 'user_account.user_id', '=', 'alumnus.user_id')
        ->where('user_account.email', 'maria.delacruz@udmalumni.edu')->value('alumnus.alumni_id');
}

function threadsOf(string $token): array
{
    return withSession($token)->getJson('/api/v1/messages/threads')->assertOk()->json();
}

it('lists the seeded conversations for each side', function () {
    $maria = threadsOf(signIn('maria.delacruz@udmalumni.edu'));
    expect(collect($maria['data'])->pluck('channel')->sort()->values()->all())->toBe(['college', 'office'])
        // The college's last message is Maria's own, so only the office's last reply is unread.
        ->and($maria['meta']['unread'])->toBe(1)
        ->and(collect($maria['data'])->firstWhere('channel', 'college')['unread'])->toBe(0);

    $admin = collect(threadsOf(signIn('admin@udmalumni.edu'))['data']);
    expect($admin->pluck('channel')->sort()->values()->all())->toBe(['admin', 'office'])
        ->and($admin->firstWhere('channel', 'office')['alumnus']['name'])->toBe('Maria Dela Cruz')
        ->and($admin->firstWhere('channel', 'admin')['staff']['collegeCode'])->toBe('CCS');

    $dean = collect(threadsOf(signIn('ccs.dean@udmalumni.edu'))['data']);
    expect($dean->pluck('channel')->sort()->values()->all())->toBe(['admin', 'college'])
        ->and($dean->firstWhere('channel', 'college')['alumnus']['meta'])->toBe('BSIT · Batch 2024');
});

it('delivers an alumnus message to the office, marks it unread there, and read once opened', function () {
    $maria = signIn('maria.delacruz@udmalumni.edu');
    $thread = withSession($maria)->postJson('/api/v1/messages/threads', ['channel' => 'office'])->assertOk()->json();
    withSession($maria)->postJson("/api/v1/messages/threads/{$thread['id']}/messages", ['body' => '  Is the homecoming open to guests?  '])
        ->assertCreated()->assertJsonPath('body', 'Is the homecoming open to guests?')->assertJsonPath('mine', true);

    $admin = signIn('admin@udmalumni.edu');
    $row = collect(threadsOf($admin)['data'])->firstWhere('id', $thread['id']);
    expect($row['unread'])->toBe(1)->and($row['lastMessage'])->toMatchArray(['body' => 'Is the homecoming open to guests?', 'mine' => false]);

    $open = withSession($admin)->getJson("/api/v1/messages/threads/{$thread['id']}")->assertOk();
    expect(collect($open->json('messages'))->last())->toMatchArray(['from' => 'alumni', 'mine' => false]);
    expect(collect(threadsOf($admin)['data'])->firstWhere('id', $thread['id'])['unread'])->toBe(0);

    withSession($admin)->postJson("/api/v1/messages/threads/{$thread['id']}/messages", ['body' => 'Yes, guests are welcome.'])->assertCreated();
    expect(collect(threadsOf($maria)['data'])->firstWhere('id', $thread['id'])['unread'])->toBe(1);
});

it('lets college staff reach only their own college’s alumni', function () {
    $dean = signIn('ccs.dean@udmalumni.edu');
    $ccs = DB::table('college')->where('code', 'CCS')->value('college_id');
    $other = (int) DB::table('v_alumni_current')->where('college_id', '<>', $ccs)->value('alumni_id');

    withSession($dean)->postJson('/api/v1/messages/threads', ['channel' => 'college', 'alumni_id' => $other])->assertForbidden();
    $mine = withSession($dean)->postJson('/api/v1/messages/threads', ['channel' => 'college', 'alumni_id' => mariaAlumniId()])->assertOk()->json();
    expect($mine['channel'])->toBe('college')->and($mine['messages'])->toHaveCount(2);

    // The college thread is not the office's: the admin can't read it.
    withSession(signIn('admin@udmalumni.edu'))->getJson("/api/v1/messages/threads/{$mine['id']}")->assertForbidden();
});

it('rejects threads outside the viewer’s side', function () {
    $officeThread = (int) DB::table('message_thread')->where('channel', 'office')->value('thread_id');
    $adminThread = (int) DB::table('message_thread')->where('channel', 'admin')->value('thread_id');
    $maria = signIn('maria.delacruz@udmalumni.edu');

    withSession(signIn('ccs.dean@udmalumni.edu'))->getJson("/api/v1/messages/threads/{$officeThread}")->assertForbidden();
    withSession($maria)->getJson("/api/v1/messages/threads/{$adminThread}")->assertForbidden();
    withSession($maria)->postJson("/api/v1/messages/threads/{$adminThread}/messages", ['body' => 'hi'])->assertForbidden();
    withSession($maria)->postJson('/api/v1/messages/threads', ['channel' => 'admin'])->assertStatus(422);
    withSession(signIn('admin@udmalumni.edu'))->postJson('/api/v1/messages/threads', ['channel' => 'admin'])->assertStatus(422);
    withSession($maria)->getJson('/api/v1/messages/threads/999999')->assertNotFound();
    withSession('')->getJson('/api/v1/messages/threads')->assertUnauthorized();
});

it('validates the message body', function () {
    $maria = signIn('maria.delacruz@udmalumni.edu');
    $id = withSession($maria)->postJson('/api/v1/messages/threads', ['channel' => 'college'])->assertOk()->json('id');

    withSession($maria)->postJson("/api/v1/messages/threads/{$id}/messages", ['body' => '   '])->assertStatus(422);
    withSession($maria)->postJson("/api/v1/messages/threads/{$id}/messages", ['body' => str_repeat('a', 2001)])->assertStatus(422);
});
