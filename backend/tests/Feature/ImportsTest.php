<?php

use App\Mail\AccountInviteMail;
use App\Support\Masterlist;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/*
| AI Data Management: a masterlist goes upload → AI review → preview & confirm → synced. The validator only proposes;
| records and accounts are written when the admin confirms, and the batch can be rolled back until someone signs in.
*/

const MASTERLIST = <<<'CSV'
Student no.,Full name,College,Program,Year graduated,Personal email / mobile
24-09-901,"QUIMPO, ZYREX M.",CCS,BSIT,2024,zyrex.quimpo@gmail.com / 0917 555 0101
24-05-567,"Dela Cruz, Maria",CCS,BSIT,2024,maria.dlc.personal@gmail.com 0928 555 0187
,"Santos, Maria L.",CCS,BSIT,2023,maria.ls@gmail.com
21-09-902,"Bautista, Pacifico R.",CCS,BSIT,2031,pacifico.bautista@gmail.com
24-09-903,"Tan, Lizbeth",CCS,BSIT,2024,
24-09-904,"MENDOZA, CARLITA",,BS Crim,2024,carlita.mendoza@gmail.com
24-09-905,xandro  villaflor,CCS,BSIT,2024,xandro.villaflor@gmail.com
CSV;

function adminSession(): string
{
    return signIn('admin@udmalumni.edu');
}

function uploadList(string $token, string $csv = MASTERLIST, string $name = 'CCS_Masterlist_2024.csv'): array
{
    return withSession($token)->post('/api/v1/imports', ['file' => UploadedFile::fake()->createWithContent($name, $csv)], ['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
        ->assertCreated()->json();
}

function rowNamed(array $batch, string $raw): array
{
    return collect($batch['rows'])->firstWhere('raw', $raw) ?? throw new RuntimeException("No row {$raw}");
}

function decide(string $token, array $batch, string $raw, array $body): mixed
{
    return withSession($token)->postJson("/api/v1/imports/{$batch['id']}/rows/".rowNamed($batch, $raw)['id'], $body);
}

/** Uploads, validates and resolves the three flagged rows (merge, accept the year, reject). */
function reviewedBatch(string $token): array
{
    $b = uploadList($token);
    $b = withSession($token)->postJson("/api/v1/imports/{$b['id']}/validate")->assertOk()->json();
    $b = decide($token, $b, 'Santos, Maria L.', ['action' => 'accept'])->assertOk()->json();
    $b = decide($token, $b, 'Bautista, Pacifico R.', ['action' => 'accept'])->assertOk()->json();

    return decide($token, $b, 'Tan, Lizbeth', ['action' => 'reject'])->assertOk()->json();
}

it('is for admins only', function () {
    withSession(signIn('ccs.dean@udmalumni.edu'))->getJson('/api/v1/imports')->assertForbidden();
    withSession(signIn('maria.delacruz@udmalumni.edu'))->getJson('/api/v1/imports/export')->assertForbidden();
});

it('reads the masterlist, checks the template and proposes fixes without touching the records', function () {
    $admin = adminSession();
    $before = DB::table('alumnus')->count();
    $b = uploadList($admin);
    expect($b['rowCount'])->toBe(7)->and($b['validated'])->toBeFalse()->and($b['rows'])->toBe([])
        ->and(collect($b['columns'])->every(fn ($c) => $c['found']))->toBeTrue();

    $b = withSession($admin)->postJson("/api/v1/imports/{$b['id']}/validate")->assertOk()->json();
    expect($b['stats'])->toMatchArray(['rows' => 7, 'ready' => 4, 'flagged' => 3, 'open' => 3]);

    $zyrex = rowNamed($b, 'QUIMPO, ZYREX M.');
    expect($zyrex)->toMatchArray(['name' => 'Zyrex M. Quimpo', 'kind' => 'new', 'status' => 'ready', 'email' => 'zyrex.quimpo@gmail.com', 'mobile' => '0917 555 0101'])
        ->and($zyrex['notes'])->toBe(['Name casing fixed']);
    expect(rowNamed($b, 'xandro  villaflor'))->toMatchArray(['name' => 'Xandro Villaflor', 'notes' => ['Extra spacing and casing fixed']]);

    $carlita = rowNamed($b, 'MENDOZA, CARLITA');
    expect($carlita)->toMatchArray(['program' => 'BSCrim', 'college' => 'CCJ', 'status' => 'ready'])
        ->and($carlita['notes'])->toContain('College taken from the program (CCJ)', '“BS Crim” mapped to BSCrim · College of Criminal Justice')
        ->and($carlita['confidence'])->toBeLessThan($zyrex['confidence']);

    $maria = rowNamed($b, 'Dela Cruz, Maria');
    expect($maria)->toMatchArray(['kind' => 'update', 'status' => 'ready', 'target' => ['id' => $maria['target']['id'], 'membershipId' => 'AM-2024-00567', 'name' => 'Maria Dela Cruz']])
        ->and(collect($maria['changes'])->firstWhere('label', 'MOBILE')['to'])->toBe('0928 555 0187')
        ->and($maria['notes'])->toContain('Sign-in email kept (the alumnus changes it in their profile)');

    expect(rowNamed($b, 'Santos, Maria L.')['flag'])->toMatchArray(['message' => 'Possible duplicate of Maria Santos · AM-2023-04128', 'suggestion' => 'Merge into AM-2023-04128', 'keep' => 'Create as a new record', 'field' => null]);
    expect(rowNamed($b, 'Bautista, Pacifico R.')['flag'])->toMatchArray(['field' => 'year', 'suggestion' => 'Change to 2021 (matches the 21- student number prefix)']);
    expect(rowNamed($b, 'Tan, Lizbeth'))->toMatchArray(['confidence' => 30])
        ->and(rowNamed($b, 'Tan, Lizbeth')['flag'])->toMatchArray(['message' => 'Missing personal email — temporary password cannot be delivered', 'field' => 'email']);

    expect(DB::table('alumnus')->count())->toBe($before);
    withSession($admin)->postJson("/api/v1/imports/{$b['id']}/confirm")->assertStatus(409)->assertJsonPath('error', '3 flagged rows need a decision before syncing.');
});

it('checks manual edits and lets the admin undo a decision', function () {
    $admin = adminSession();
    $b = uploadList($admin);
    $b = withSession($admin)->postJson("/api/v1/imports/{$b['id']}/validate")->json();

    decide($admin, $b, 'Bautista, Pacifico R.', ['action' => 'edit', 'field' => 'year', 'value' => '2035'])->assertStatus(422)->assertJsonPath('fields.value', 'Enter a 4-digit year between 1999 and '.now('Asia/Manila')->year.'.');
    $b = decide($admin, $b, 'Bautista, Pacifico R.', ['action' => 'edit', 'field' => 'year', 'value' => '2022'])->assertOk()->json();
    expect(rowNamed($b, 'Bautista, Pacifico R.'))->toMatchArray(['status' => 'resolved', 'decision' => 'edit', 'year' => 2022]);

    $b = decide($admin, $b, 'Tan, Lizbeth', ['action' => 'edit', 'field' => 'email', 'value' => 'zyrex.quimpo@gmail.com'])->assertOk()->json();
    expect(rowNamed($b, 'Tan, Lizbeth'))->toMatchArray(['status' => 'pending'])
        ->and(rowNamed($b, 'Tan, Lizbeth')['flag']['message'])->toStartWith('Same email as row 2');

    $b = decide($admin, $b, 'Tan, Lizbeth', ['action' => 'undo'])->assertOk()->json();
    expect(rowNamed($b, 'Tan, Lizbeth'))->toMatchArray(['status' => 'pending', 'decision' => null])
        ->and($b['stats']['open'])->toBe(2);
});

it('syncs the confirmed batch: accounts with emailed temporary passwords, updates, audit trail', function () {
    Mail::fake();
    $admin = adminSession();
    $b = reviewedBatch($admin);
    expect($b['stats'])->toMatchArray(['open' => 0, 'new' => 4, 'update' => 2, 'rejected' => 1]);

    $b = withSession($admin)->postJson("/api/v1/imports/{$b['id']}/confirm")->assertOk()->json();
    expect($b['status'])->toBe('synced')
        ->and($b['result'])->toMatchArray(['created' => 4, 'updated' => 2, 'rejected' => 1, 'emailed' => 4, 'emailFailed' => 0]);

    $passwords = [];
    Mail::assertSent(AccountInviteMail::class, 4);
    Mail::assertSent(AccountInviteMail::class, function (AccountInviteMail $m) use (&$passwords) {
        $passwords[$m->email] = $m->tempPassword;

        return true;
    });
    $zyrex = DB::table('alumnus')->join('user_account', 'user_account.user_id', '=', 'alumnus.user_id')->where('alumnus.student_no', '24-09-901')->first();
    expect($zyrex)->not->toBeNull()
        ->and($zyrex->email)->toBe('zyrex.quimpo@gmail.com')
        ->and($zyrex->record_source)->toBe('import')
        ->and($zyrex->must_change_password)->toBeTrue()
        ->and($zyrex->temp_password_expires_at)->not->toBeNull()
        ->and($zyrex->membership_id)->toMatch('/^AM-2024-\d{5}$/')
        ->and($zyrex->mobile_no)->toBe('639175550101');
    expect(DB::table('alumnus')->where('student_no', '24-05-567')->value('mobile_no'))->toBe('639285550187')
        ->and(DB::table('alumnus')->where('membership_id', 'AM-2023-04128')->value('middle_name'))->toBe('L.')
        ->and(DB::table('alumnus')->where('student_no', '24-09-903')->exists())->toBeFalse();

    // Passwords are hashed, emailed once and never logged.
    $audit = DB::table('audit_log')->whereNotNull('diff')->pluck('diff')->implode(' ');
    foreach ($passwords as $pw) {
        expect(strlen($pw))->toBe(12)->and($audit)->not->toContain($pw);
    }

    $log = withSession($admin)->getJson('/api/v1/imports/log')->assertOk()->json('data');
    expect(collect($log)->pluck('tag')->take(5)->all())->toBe(['Password', 'Account', 'ID', 'AI', 'Import'])
        ->and($log[0]['text'])->toBe('4 temporary passwords issued (hashed) · emailed to personal addresses')
        ->and($log[3]['who'])->toBe('AI assistant');

    // The first sign-in works with the temporary password and must replace it.
    test()->postJson('/api/v1/auth/login', ['identifier' => '24-09-901', 'password' => $passwords['zyrex.quimpo@gmail.com']])
        ->assertOk()->assertJsonPath('user.mustChangePassword', true);
    withSession($admin)->postJson("/api/v1/imports/{$b['id']}/rollback")->assertStatus(409);
});

it('rolls a batch back until one of its alumni signs in', function () {
    Mail::fake();
    $admin = adminSession();
    $mobile = DB::table('alumnus')->where('student_no', '24-05-567')->value('mobile_no');
    $users = DB::table('user_account')->count();
    $b = reviewedBatch($admin);
    withSession($admin)->postJson("/api/v1/imports/{$b['id']}/confirm")->assertOk();

    $b = withSession($admin)->postJson("/api/v1/imports/{$b['id']}/rollback")->assertOk()->json();
    expect($b['status'])->toBe('rolled_back')
        ->and(DB::table('alumnus')->where('student_no', '24-09-901')->exists())->toBeFalse()
        ->and(DB::table('user_account')->count())->toBe($users)
        ->and(DB::table('alumnus')->where('student_no', '24-05-567')->value('mobile_no'))->toBe($mobile)
        ->and(DB::table('alumnus')->where('membership_id', 'AM-2023-04128')->value('middle_name'))->toBeNull();
    expect(withSession($admin)->getJson('/api/v1/imports/log')->json('data.0.text'))->toBe("Batch {$b['code']} rolled back · 4 records and accounts removed, 2 restored");
    withSession($admin)->postJson("/api/v1/imports/{$b['id']}/rollback")->assertStatus(409);
});

it('refuses an expired temporary password', function () {
    Mail::fake();
    $admin = adminSession();
    $b = reviewedBatch($admin);
    withSession($admin)->postJson("/api/v1/imports/{$b['id']}/confirm")->assertOk();
    $pw = null;
    Mail::assertSent(AccountInviteMail::class, function (AccountInviteMail $m) use (&$pw) {
        $pw ??= $m->email === 'xandro.villaflor@gmail.com' ? $m->tempPassword : null;

        return true;
    });
    DB::update("UPDATE user_account SET temp_password_expires_at = now() - interval '1 minute' WHERE email = 'xandro.villaflor@gmail.com'");

    test()->postJson('/api/v1/auth/login', ['identifier' => 'xandro.villaflor@gmail.com', 'password' => $pw])
        ->assertStatus(401)->assertJsonPath('code', 'temp_password_expired');
});

it('renders the account email from the shared template', function () {
    $html = (new AccountInviteMail('Zyrex', 'zyrex.quimpo@gmail.com', 'Ab3defGhjk9m', 'AM-2024-00042', 7))->render();
    expect($html)->toContain('Hi Zyrex,', 'Ab3defGhjk9m', 'AM-2024-00042', '7 days', '/signin');
});

it('rejects files without the template columns and lets a batch in review be replaced', function () {
    $admin = adminSession();
    withSession($admin)->post('/api/v1/imports', ['file' => UploadedFile::fake()->createWithContent('list.csv', "Name,Email\nJuan,juan@gmail.com")], ['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
        ->assertStatus(422)->assertJsonPath('code', 'invalid_file');
    withSession($admin)->post('/api/v1/imports', ['file' => UploadedFile::fake()->createWithContent('list.xls', 'x')], ['X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json'])
        ->assertStatus(422);

    $b = uploadList($admin);
    expect(withSession($admin)->getJson('/api/v1/imports')->json('data.id'))->toBe($b['id']);
    withSession($admin)->deleteJson("/api/v1/imports/{$b['id']}")->assertOk();
    expect(withSession($admin)->getJson('/api/v1/imports')->json('data'))->toBeNull()
        ->and(DB::table('import_row')->where('batch_id', $b['id'])->count())->toBe(0);
});

it('exports verified records in the import template, as CSV and as an Excel file that imports back', function () {
    $admin = adminSession();
    $ccs = (int) DB::table('college')->where('code', 'CCS')->value('college_id');
    $p = withSession($admin)->getJson("/api/v1/imports/export?college_id={$ccs}&batch=2024")->assertOk()->json();
    $expected = DB::table('v_alumni_current')->count() > 0
        ? DB::table('alumnus as a')->join('program as p', 'p.program_id', '=', 'a.program_id')
            ->where('p.college_id', $ccs)->where('a.year_graduated', 2024)->where('a.verification_status', 'verified')
            ->whereNull('a.archived_at')->whereNull('a.merged_into_id')->count()
        : 0;
    expect($p['total'])->toBe($expected)->toBeGreaterThan(0)
        ->and(count($p['rows']))->toBe(min(5, $expected))
        ->and(collect($p['colleges'])->pluck('code'))->toContain('CCS');

    $csv = withSession($admin)->get("/api/v1/imports/export?college_id={$ccs}&batch=2024&format=csv")->assertOk();
    expect($csv->headers->get('Content-Disposition'))->toContain('UDM_Alumni_Export_CCS_2024.csv')
        ->and($csv->getContent())->toContain('"Student no.","Full name","College","Program","Year graduated","Personal email","Mobile","Membership ID"')
        ->and($csv->getContent())->toContain('"24-05-567","Dela Cruz, Maria","College of Computing Studies","BSIT","2024"');

    $xlsx = withSession($admin)->get("/api/v1/imports/export?college_id={$ccs}&batch=2024&format=xlsx")->assertOk();
    $path = tempnam(sys_get_temp_dir(), 'udmt');
    file_put_contents($path, $xlsx->getContent());
    $sheet = Masterlist::read($path, 'xlsx');
    @unlink($path);
    expect(count($sheet['rows']))->toBe($expected)
        ->and(collect($sheet['rows'])->firstWhere('source.student_no', '24-05-567')['source'])->toMatchArray(['name' => 'Dela Cruz, Maria', 'program' => 'BSIT', 'year' => '2024']);

    expect(withSession($admin)->getJson('/api/v1/imports/log')->json('data.0'))->toMatchArray(['tag' => 'Export', 'text' => "Exported {$expected} verified records · CCS · 2024 · Excel"]);
});
