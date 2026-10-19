<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/*
| /me (profile, privacy, skills, photo, proofs) and /directory: one alumnus row behind every screen (sync rule 1),
| privacy masking, and private files behind signed links.
*/

function mariaId(): int
{
    return (int) DB::table('alumnus as a')->join('user_account as u', 'u.user_id', '=', 'a.user_id')->where('u.email', 'maria.delacruz@udmalumni.edu')->value('a.alumni_id');
}

it('returns the profile, survey and record of the signed-in alumnus', function () {
    $r = withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/me')->assertOk();

    expect($r->json('a.email'))->toBe('maria.delacruz@udmalumni.edu')
        ->and($r->json('a.college'))->toBe('College of Computing Studies')
        ->and($r->json('a.mobile'))->toBe('0917 123 4567')
        ->and($r->json('a.ever_employed'))->toBe('Yes')
        ->and($r->json('survey.submitted'))->toBeTrue()
        ->and($r->json('record.studentNo'))->toBe('24-05-567')
        ->and($r->json('progress.total'))->toBeGreaterThan(20)
        ->and($r->json('dashboard.savedJobs'))->toBe(3)
        ->and($r->json('skills'))->not->toBeEmpty();
});

it('keeps staff out of /me', function () {
    withSession(signIn('admin@udmalumni.edu'))->getJson('/api/v1/me')->assertForbidden();
});

it('saves Edit Profile into the same row Records shows, with history', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');
    $me = withSession($token)->getJson('/api/v1/me')->json('a');

    withSession($token)->patchJson('/api/v1/me', array_merge($me, [
        'present_address' => '45 España Blvd, Sampaloc, Manila', 'permanent_same' => true, 'mobile' => '09181112222', 'linkedin' => 'linkedin.com/in/maria-dc',
    ]))->assertOk()->assertJsonPath('a.mobile', '0918 111 2222');

    $admin = signIn('admin@udmalumni.edu');
    $record = withSession($admin)->getJson('/api/v1/alumni/'.mariaId())->assertOk();
    expect($record->json('address'))->toBe('45 España Blvd, Sampaloc, Manila')
        ->and($record->json('permanentAddress'))->toBe('45 España Blvd, Sampaloc, Manila')
        ->and($record->json('mobile'))->toBe('0918 111 2222')
        ->and(collect($record->json('links'))->firstWhere('platform', 'linkedin')['url'])->toBe('linkedin.com/in/maria-dc')
        ->and(DB::table('record_review')->where(['alumni_id' => mariaId(), 'note' => 'Profile update'])->exists())->toBeTrue();

    // Sensitive values never reach the change log.
    $diff = json_decode((string) DB::table('record_review')->where(['alumni_id' => mariaId(), 'note' => 'Profile update'])->value('diff'), true);
    expect($diff['mobile'])->toBe(['changed' => true]);
});

it('validates Edit Profile like registration, without the password', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');

    withSession($token)->patchJson('/api/v1/me', ['mobile' => '12345', 'dob' => '2999-01-01'])->assertUnprocessable()
        ->assertJsonPath('fields.mobile', 'Enter a valid mobile number (e.g. 09XX XXX XXXX).')
        ->assertJsonPath('fields.dob', 'Date of birth cannot be in the future.')
        ->assertJsonMissingPath('fields.reg_pw');
    withSession($token)->patchJson('/api/v1/me', ['email' => 'admin@udmalumni.edu'])->assertStatus(409)->assertJsonPath('code', 'email_taken');
});

it('changes the sign-in email from the profile', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');
    withSession($token)->patchJson('/api/v1/me', ['email' => 'maria.dc@example.com'])->assertOk()->assertJsonPath('user.email', 'maria.dc@example.com');

    $this->postJson('/api/v1/auth/login', ['identifier' => 'maria.dc@example.com', 'password' => 'demoPass123'])->assertOk();
});

it('applies privacy to the directory and the contact card', function () {
    $token = signIn('maria.delacruz@udmalumni.edu');
    $staff = signIn('admin@udmalumni.edu');
    $id = mariaId();

    // Opted in, email hidden, LinkedIn visible, Facebook hidden.
    $card = withSession($staff)->getJson("/api/v1/directory/{$id}")->assertOk();
    expect($card->json('profile.contacts'))->toHaveKey('linkedin')->not->toHaveKey('facebook')->not->toHaveKey('email');

    withSession($token)->patchJson('/api/v1/me', ['privacy' => ['showEmail' => true, 'links' => ['linkedin' => false]]])->assertOk();
    $card = withSession($staff)->getJson("/api/v1/directory/{$id}")->assertOk();
    expect($card->json('profile.contacts'))->toHaveKey('email')->not->toHaveKey('linkedin');

    withSession($token)->patchJson('/api/v1/me', ['privacy' => ['directoryOptIn' => false]])->assertOk();
    withSession($staff)->getJson("/api/v1/directory/{$id}")->assertNotFound();
    expect(collect(withSession($staff)->getJson('/api/v1/directory?q=Dela%20Cruz')->json('data'))->pluck('id'))->not->toContain($id);

    withSession($token)->patchJson('/api/v1/me', ['privacy' => ['showEmail' => 'yes']])->assertUnprocessable();
});

it('lists only opted-in alumni, for any signed-in user', function () {
    $r = withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/directory?per_page=100')->assertOk();

    expect($r->json('meta.total'))->toBe(DB::table('alumnus')->where('directory_opt_in', true)->whereNull('archived_at')->whereNull('merged_into_id')->count())
        ->and($r->json('data.0'))->toHaveKeys(['id', 'name', 'degree', 'batch', 'skills', 'profile']);
    withSession('')->getJson('/api/v1/directory')->assertUnauthorized();
});

it('saves skills with the first three as top skills', function () {
    $r = withSession(signIn('maria.delacruz@udmalumni.edu'))->patchJson('/api/v1/me', ['skills' => ['dbt', 'Airflow', 'SQL', 'Python']])->assertOk();

    expect(collect($r->json('skills'))->where('isTop', true)->pluck('name')->sort()->values()->all())->toBe(['Airflow', 'SQL', 'dbt']);
});

it('uploads, replaces and removes the profile photo', function () {
    Storage::fake();
    $token = signIn('maria.delacruz@udmalumni.edu');

    $first = withSession($token)->post('/api/v1/me/photo', ['photo' => UploadedFile::fake()->image('me.jpg', 200, 200)])->assertOk()->json('photoUrl');
    $key = substr($first, strlen('/api/v1/files/'));
    Storage::assertExists($key);
    $this->get($first)->assertOk()->assertHeader('Content-Type', 'image/jpeg');

    $second = withSession($token)->post('/api/v1/me/photo', ['photo' => UploadedFile::fake()->image('me2.png', 100, 100)])->assertOk()->json('photoUrl');
    Storage::assertMissing($key);

    withSession($token)->deleteJson('/api/v1/me/photo')->assertOk()->assertJsonPath('photoUrl', null);
    Storage::assertMissing(substr($second, strlen('/api/v1/files/')));
});

it('refuses files that are not images or are too large', function () {
    Storage::fake();
    $token = signIn('maria.delacruz@udmalumni.edu');

    withSession($token)->post('/api/v1/me/photo', ['photo' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf')])
        ->assertUnprocessable()->assertJsonPath('fields.photo', 'Upload a JPG, PNG or WebP image.');
    withSession($token)->post('/api/v1/me/photo', ['photo' => UploadedFile::fake()->image('big.jpg')->size(3000)])
        ->assertUnprocessable()->assertJsonPath('fields.photo', 'File is too large (max 2 MB).');
});

it('keeps proof documents private behind short-lived signed links', function () {
    Storage::fake();
    $maria = signIn('maria.delacruz@udmalumni.edu');
    $id = mariaId();

    withSession(signIn('admin@udmalumni.edu'))->postJson("/api/v1/alumni/{$id}/request-proof", ['docs' => ['Certificate of Employment']])->assertOk();
    $pdf = UploadedFile::fake()->createWithContent('coe.pdf', "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
    withSession($maria)->post('/api/v1/me/proofs', ['file' => $pdf])->assertCreated()->assertJsonPath('mime', 'application/pdf');
    expect(DB::table('proof_document')->where('alumni_id', $id)->whereNotNull('uploaded_at')->count())->toBe(1);

    // The dean of another college cannot list them; the admin gets a signed link.
    $dean = DB::table('user_account')->insertGetId(['email' => 'chs.dean@example.com', 'password_hash' => Hash::make('demoPass123'), 'role' => 'dept', 'college_id' => DB::table('college')->where('code', 'CHS')->value('college_id'), 'display_name' => 'CHS Dean'], 'user_id');
    withSession(signIn('chs.dean@example.com'))->getJson("/api/v1/alumni/{$id}/proofs")->assertForbidden();

    $url = withSession(signIn('admin@udmalumni.edu'))->getJson("/api/v1/alumni/{$id}/proofs")->assertOk()->json('data.0.url');
    expect($url)->toStartWith('/api/v1/files/private/');
    $this->get($url)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    $this->get(preg_replace('/signature=[0-9a-f]+/', 'signature=deadbeef', $url))->assertForbidden();
    $this->get(strtok($url, '?'))->assertForbidden();
    expect($dean)->toBeInt();
});
