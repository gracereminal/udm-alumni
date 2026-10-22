<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Mail\AccountInviteMail;
use App\Models\UserAccount;
use App\Support\Masterlist;
use App\Support\Mobile;
use App\Support\Scope;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * AI Data Management (UDM Alumni.dc.html): masterlist import as upload → AI review → preview & confirm → synced, plus
 * roll back and the audit feed. The "AI" is a rule-based validator, so no alumni data leaves the server: it cleans
 * names, maps programs to colleges, checks the year, finds duplicates and missing contacts, scores each row and
 * suggests a fix. It never writes on its own: rows reach alumnus / user_account only when an admin confirms the
 * batch, and every step is written to audit_log (entity import_batch). Temporary passwords are hashed, emailed once
 * and never stored, returned or logged.
 */
class ImportService
{
    public const MIN_YEAR = 1999;

    public const TEMP_PASSWORD_DAYS = 7;

    public const EDIT_FIELDS = ['name', 'student_no', 'college', 'program', 'year', 'email', 'mobile'];

    private const FIELD_LABEL = [
        'name' => 'FULL NAME', 'student_no' => 'STUDENT NO.', 'college' => 'COLLEGE', 'program' => 'PROGRAM',
        'year' => 'YEAR GRADUATED', 'email' => 'PERSONAL EMAIL', 'mobile' => 'MOBILE',
    ];

    private const SUFFIX = ['jr' => 'Jr.', 'sr' => 'Sr.', 'ii' => 'II', 'iii' => 'III', 'iv' => 'IV', 'v' => 'V'];

    private const PARTICLES = ['de', 'del', 'dela', 'delos', 'san', 'sta.', 'santa', 'sto.', 'santo', 'dos', 'das', 'van', 'von', 'la', 'los'];

    /** Lighter argon2id for temporary passwords (OWASP minimum); the sign-in rehash upgrades them to config/hashing.php. */
    private const TEMP_HASH = ['memory' => 19456, 'time' => 2, 'threads' => 1];

    public function __construct(
        private readonly AuditService $audit,
        private readonly AlumniService $alumni,
    ) {}

    // --- Batches ---------------------------------------------------------------------------------------

    /** The newest batch still in review (the page resumes it), or null. */
    public function current(): ?array
    {
        $id = DB::table('import_batch')->where('status', 'review')->orderByDesc('created_at')->orderByDesc('batch_id')->value('batch_id');

        return $id === null ? null : $this->show((int) $id);
    }

    /** Step 1: reads the file and stores it as a batch in review. Nothing is validated or written to records yet. */
    public function upload(UploadedFile $file, UserAccount $actor): array
    {
        $name = mb_substr(basename((string) $file->getClientOriginalName()) ?: 'masterlist', 0, 200);
        $sheet = Masterlist::read((string) $file->getRealPath(), (string) $file->getClientOriginalExtension());

        $batchId = DB::transaction(function () use ($name, $sheet, $actor) {
            DB::statement('SELECT pg_advisory_xact_lock(hashtext(?))', ['import_batch']);
            $year = (int) now('Asia/Manila')->year;
            $last = DB::selectOne("SELECT max(substring(code from 12)::int) AS n FROM import_batch WHERE code ~ ('^BATCH-' || ? || '-[0-9]{4}$')", [$year])->n;
            $code = sprintf('BATCH-%d-%04d', $year, ((int) $last) + 1);
            $batchId = (int) DB::table('import_batch')->insertGetId([
                'code' => $code, 'file_name' => $name, 'columns' => json_encode($sheet['columns']), 'created_by' => $actor->user_id,
            ], 'batch_id');
            foreach (array_chunk($sheet['rows'], 500) as $chunk) {
                DB::table('import_row')->insert(array_map(fn ($r) => [
                    'batch_id' => $batchId, 'row_no' => $r['row_no'], 'source' => json_encode($r['source']),
                ], $chunk));
            }
            $this->audit->log('import', 'import_batch', $batchId, $actor->user_id, ['code' => $code, 'file' => $name, 'rows' => count($sheet['rows'])]);

            return $batchId;
        });

        return $this->show($batchId);
    }

    /** "Run AI validation": the review opens (the analysis itself is recomputed on every read). */
    public function validate(int $batchId, UserAccount $actor): array
    {
        DB::transaction(function () use ($batchId, $actor) {
            $b = $this->lockReview($batchId);
            if ($b->validated_at === null) {
                $a = $this->analyzeBatch($batchId);
                DB::update('UPDATE import_batch SET validated_at = now() WHERE batch_id = ?', [$batchId]);
                $this->audit->log('ai_validate', 'import_batch', $batchId, $actor->user_id, [
                    'code' => $b->code, 'rows' => count($a), 'flagged' => count(array_filter($a, fn ($x) => $x['orig']['flag'] !== null)),
                ]);
            }
        });

        return $this->show($batchId);
    }

    public function show(int $batchId): array
    {
        $b = DB::table('import_batch')->where('batch_id', $batchId)->first() ?? throw ApiException::notFound();
        $out = [
            'id' => (int) $b->batch_id, 'code' => $b->code, 'fileName' => $b->file_name, 'status' => $b->status,
            'columns' => json_decode((string) $b->columns, true),
            'rowCount' => DB::table('import_row')->where('batch_id', $batchId)->count(),
            'validated' => $b->validated_at !== null,
            'createdAt' => $b->created_at, 'confirmedAt' => $b->confirmed_at, 'rolledBackAt' => $b->rolled_back_at,
            'confirmedBy' => $b->confirmed_by === null ? null : DB::table('user_account')->where('user_id', $b->confirmed_by)->value('display_name'),
            'result' => $b->result === null ? null : json_decode((string) $b->result, true),
        ];
        if ($b->status !== 'review') {
            return $out + ['stats' => null, 'rows' => $this->syncedRows($batchId)];
        }
        if ($b->validated_at === null) {
            return $out + ['stats' => null, 'rows' => []];
        }
        $a = $this->analyzeBatch($batchId);

        return $out + ['stats' => self::stats($a), 'rows' => array_map(self::rowOut(...), $a)];
    }

    /**
     * An admin decision on one row: accept (the AI suggestion), keep (the alternative, e.g. "create as a new record"),
     * edit (a field typed by the admin), reject (skip the row) or undo.
     *
     * @param  array{action: string, field?: string|null, value?: string|null}  $b
     */
    public function decide(int $batchId, int $rowId, array $b): array
    {
        DB::transaction(function () use ($batchId, $rowId, $b) {
            $batch = $this->lockReview($batchId);
            if ($batch->validated_at === null) {
                throw ApiException::conflict('Run the AI validation first.');
            }
            $row = DB::selectOne('SELECT row_id, edits FROM import_row WHERE row_id = ? AND batch_id = ? FOR UPDATE', [$rowId, $batchId]) ?? throw ApiException::notFound();
            $edits = json_decode((string) $row->edits, true) ?: [];
            $flag = $this->analyzeBatch($batchId, $rowId)[0]['cur']['flag'];

            [$edits, $decision] = match ($b['action']) {
                'accept' => [array_merge($edits, $flag['suggestion']['patch'] ?? throw ApiException::conflict('This row has no AI suggestion to accept.')), 'accept'],
                'keep' => [array_merge($edits, $flag['keep']['patch'] ?? throw ApiException::conflict('This row has no alternative to keep.')), 'keep'],
                'edit' => [array_merge($edits, [$b['field'] => self::editValue((string) $b['field'], (string) ($b['value'] ?? ''))]), 'edit'],
                'reject' => [$edits, 'reject'],
                default => [[], null], // undo
            };
            DB::update('UPDATE import_row SET edits = ?::jsonb, decision = ? WHERE row_id = ?', [json_encode((object) $edits), $decision, $rowId]);
        });

        return $this->show($batchId);
    }

    /** "Replace file": a batch still in review is dropped (its rows never reached the records). */
    public function discard(int $batchId, UserAccount $actor): void
    {
        DB::transaction(function () use ($batchId, $actor) {
            $b = $this->lockReview($batchId);
            DB::table('import_batch')->where('batch_id', $batchId)->delete();
            $this->audit->log('import_discard', 'import_batch', $batchId, $actor->user_id, ['code' => $b->code, 'file' => $b->file_name]);
        });
    }

    /**
     * "Confirm & sync": creates the new records with their sign-in accounts (temporary password, must change it on
     * first sign-in, expires in 7 days) and updates the matched ones, all or nothing. The emails go out after commit.
     */
    public function confirm(int $batchId, UserAccount $actor): array
    {
        set_time_limit(0);
        $mail = [];
        $result = DB::transaction(function () use ($batchId, $actor, &$mail) {
            $b = $this->lockReview($batchId);
            if ($b->validated_at === null) {
                throw ApiException::conflict('Run the AI validation first.');
            }
            $a = $this->analyzeBatch($batchId);
            $open = count(array_filter($a, fn ($x) => $x['status'] === 'pending'));
            if ($open > 0) {
                throw ApiException::conflict($open.' flagged row'.($open > 1 ? 's need' : ' needs').' a decision before syncing.');
            }
            $scope = Scope::for($actor);
            $created = $updated = 0;
            $ids = [];
            foreach ($a as $x) {
                $r = $x['cur'];
                $outcome = match (true) {
                    $x['status'] === 'rejected' => ['kind' => 'rejected', 'reason' => $x['orig']['flag']['message'] ?? 'Rejected by the admin'],
                    $r['kind'] === 'same' => ['kind' => 'same', 'membershipId' => $r['target']->membership_id],
                    default => null,
                };
                if ($outcome !== null) {
                    DB::update('UPDATE import_row SET outcome = ?::jsonb WHERE row_id = ?', [json_encode($outcome), $x['row']->row_id]);

                    continue;
                }
                if ($r['kind'] === 'new') {
                    [$alumniId, $userId, $membershipId, $password] = $this->createRecord($r, $b->code, $actor, $scope);
                    $mail[] = [$r['email'], $r['first'], $password, $membershipId];
                    $ids[] = $membershipId;
                    $created++;
                    DB::update('UPDATE import_row SET outcome = ?::jsonb, alumni_id = ?, user_id = ? WHERE row_id = ?', [
                        json_encode(['kind' => 'new', 'membershipId' => $membershipId]), $alumniId, $userId, $x['row']->row_id,
                    ]);
                } else {
                    $before = $this->updateRecord($r, $b->code, $actor);
                    $updated++;
                    DB::update('UPDATE import_row SET outcome = ?::jsonb, alumni_id = ?, before = ?::jsonb WHERE row_id = ?', [
                        json_encode(['kind' => 'update', 'membershipId' => $r['target']->membership_id, 'changes' => $r['changes']]),
                        $r['target']->alumni_id, json_encode($before), $x['row']->row_id,
                    ]);
                }
            }
            if ($created + $updated === 0) {
                throw new ApiException(422, 'Nothing to sync: every row was rejected or is already on file.', 'nothing_to_sync');
            }
            $count = fn (string $s) => count(array_filter($a, fn ($x) => $x['status'] === $s));
            $result = [
                'created' => $created, 'updated' => $updated, 'rejected' => $count('rejected'),
                'unchanged' => count(array_filter($a, fn ($x) => $x['status'] !== 'rejected' && $x['cur']['kind'] === 'same')),
                'firstId' => $ids[0] ?? null, 'lastId' => $ids === [] ? null : $ids[count($ids) - 1],
            ];
            DB::update("UPDATE import_batch SET status = 'synced', confirmed_by = ?, confirmed_at = now(), result = ?::jsonb WHERE batch_id = ?", [$actor->user_id, json_encode($result), $batchId]);
            $this->audit->log('import_ids', 'import_batch', $batchId, $actor->user_id, ['code' => $b->code, 'count' => $created, 'first' => $result['firstId'], 'last' => $result['lastId']]);
            $this->audit->log('import_accounts', 'import_batch', $batchId, $actor->user_id, ['code' => $b->code] + $result);

            return $result + ['code' => $b->code];
        });

        $sent = 0;
        foreach ($mail as [$to, $first, $password, $membershipId]) {
            try {
                Mail::to($to)->send(new AccountInviteMail($first, $to, $password, $membershipId, self::TEMP_PASSWORD_DAYS));
                $sent++;
            } catch (Throwable $err) {
                Log::error('Import account email failed', ['batch_id' => $batchId, 'membership_id' => $membershipId, 'error' => $err->getMessage()]);
            }
        }
        $failed = count($mail) - $sent;
        DB::transaction(function () use ($batchId, $actor, $result, $sent, $failed) {
            DB::update('UPDATE import_batch SET result = result || ?::jsonb WHERE batch_id = ?', [json_encode(['emailed' => $sent, 'emailFailed' => $failed]), $batchId]);
            $this->audit->log('import_passwords', 'import_batch', $batchId, $actor->user_id, ['code' => $result['code'], 'issued' => $result['created'], 'emailed' => $sent, 'failed' => $failed]);
        });

        return $this->show($batchId);
    }

    /**
     * "Roll back this batch": removes the records and accounts it created and restores the ones it updated. Refused
     * once any of its alumni has signed in (archive those records in Alumni Records instead).
     */
    public function rollback(int $batchId, UserAccount $actor): array
    {
        DB::transaction(function () use ($batchId, $actor) {
            $b = DB::selectOne('SELECT batch_id, code, status FROM import_batch WHERE batch_id = ? FOR UPDATE', [$batchId]) ?? throw ApiException::notFound();
            if ($b->status !== 'synced') {
                throw ApiException::conflict($b->status === 'rolled_back' ? 'This batch was already rolled back.' : 'Only a synced batch can be rolled back.');
            }
            $rows = DB::table('import_row')->where('batch_id', $batchId)->whereNotNull('alumni_id')->get(['row_id', 'outcome', 'alumni_id', 'user_id', 'before']);
            $new = $rows->filter(fn ($r) => (json_decode((string) $r->outcome, true)['kind'] ?? '') === 'new');
            $userIds = $new->pluck('user_id')->filter()->map(fn ($v) => (int) $v)->values()->all();
            $alumniIds = $new->pluck('alumni_id')->map(fn ($v) => (int) $v)->values()->all();

            $signedIn = DB::table('user_account')->whereIn('user_id', $userIds)
                ->where(fn ($q) => $q->whereNotNull('last_login_at')->orWhere('must_change_password', false))->count();
            if ($signedIn > 0) {
                throw ApiException::conflict($signedIn.' alumni from this batch already signed in, so it can no longer be rolled back. Archive individual records in Alumni Records instead.');
            }
            if (DB::table('alumnus')->whereIn('merged_into_id', $alumniIds)->exists()) {
                throw ApiException::conflict('Another record was merged into one from this batch, so it can no longer be rolled back.');
            }

            $restored = 0;
            foreach ($rows->filter(fn ($r) => $r->before !== null) as $r) {
                DB::table('alumnus')->where('alumni_id', $r->alumni_id)->update(json_decode((string) $r->before, true));
                DB::table('record_review')->insert([
                    'alumni_id' => $r->alumni_id, 'reviewer_id' => $actor->user_id, 'action' => 'edit',
                    'note' => "Masterlist {$b->code} rolled back", 'diff' => json_encode(['kind' => 'import_rollback', 'batch' => $b->code]),
                ]);
                $restored++;
            }
            DB::table('alumnus')->whereIn('alumni_id', $alumniIds)->delete();
            DB::table('user_account')->whereIn('user_id', $userIds)->delete();
            DB::update("UPDATE import_batch SET status = 'rolled_back', rolled_back_at = now() WHERE batch_id = ?", [$batchId]);
            $this->audit->log('import_rollback', 'import_batch', $batchId, $actor->user_id, ['code' => $b->code, 'removed' => count($alumniIds), 'restored' => $restored]);
        });

        return $this->show($batchId);
    }

    /**
     * The Audit log tab: import, validation, ID / account / password, export and roll-back entries, newest first.
     *
     * @return list<array{id: int, at: string, tag: string, text: string, who: string}>
     */
    public function log(int $limit): array
    {
        $rows = DB::select(
            "SELECT l.log_id, l.action, l.diff, l.created_at, COALESCE(u.display_name, 'System') AS who
               FROM audit_log l LEFT JOIN user_account u ON u.user_id = l.actor_id
              WHERE l.entity IN ('import_batch', 'alumni_export')
              ORDER BY l.created_at DESC, l.log_id DESC LIMIT ?",
            [$limit],
        );

        return array_map(function ($r) {
            $d = $r->diff === null ? [] : (json_decode((string) $r->diff, true) ?: []);
            $n = fn (string $k) => number_format((int) ($d[$k] ?? 0));
            $s = fn (string $k, string $one, string $many) => ((int) ($d[$k] ?? 0)) === 1 ? $one : $many;
            [$tag, $text] = match ($r->action) {
                'import' => ['Import', "Masterlist {$d['file']} imported · {$n('rows')} ".$s('rows', 'row', 'rows')],
                'import_discard' => ['Import', "Masterlist {$d['file']} discarded before review"],
                'ai_validate' => ['AI', "AI validated {$n('rows')} ".$s('rows', 'row', 'rows')." · {$n('flagged')} flagged for review"],
                'import_ids' => ['ID', (int) ($d['count'] ?? 0) > 0 ? "{$n('count')} Alumni ".$s('count', 'ID', 'IDs')." assigned ({$d['first']} to {$d['last']})" : 'No new Alumni IDs assigned'],
                'import_accounts' => ['Account', "{$n('created')} ".$s('created', 'account', 'accounts')." created · {$n('updated')} updated · batch {$d['code']} confirmed"],
                'import_passwords' => ['Password', "{$n('issued')} temporary ".$s('issued', 'password', 'passwords').' issued (hashed) · '.((int) ($d['failed'] ?? 0) > 0 ? "{$n('emailed')} emailed, {$n('failed')} could not be sent" : 'emailed to personal addresses')],
                'import_rollback' => ['Rollback', "Batch {$d['code']} rolled back · {$n('removed')} ".$s('removed', 'record', 'records').' and accounts removed'.((int) ($d['restored'] ?? 0) > 0 ? ", {$n('restored')} restored" : '')],
                'records_export' => ['Export', "Exported {$n('count')} ".($d['status'] ?? 'verified')." records · {$d['college']} · {$d['batch']} · {$d['format']}"],
                default => ['Import', (string) $r->action],
            };

            return ['id' => (int) $r->log_id, 'at' => $r->created_at, 'tag' => $tag, 'text' => $text, 'who' => $r->action === 'ai_validate' ? 'AI assistant' : $r->who];
        }, $rows);
    }

    // --- Sync ------------------------------------------------------------------------------------------

    /** @return array{0: int, 1: int, 2: string, 3: string} alumni_id, user_id, membership ID, the temporary password */
    private function createRecord(array $r, string $code, UserAccount $actor, Scope $scope): array
    {
        $alumniId = $this->alumni->create(array_filter([
            'first_name' => $r['first'], 'middle_name' => $r['middle'], 'last_name' => $r['last'],
            'college' => $r['college']->code,
            'course' => $r['program']?->abbr, 'course_other' => $r['program'] === null ? $r['typed'] : null,
            'year_graduated' => $r['year'], 'student_no' => $r['studentNo'], 'mobile' => $r['mobile'], 'email' => $r['email'],
        ], fn ($v) => $v !== null), $actor, $scope, 'import');

        $password = self::tempPassword();
        $userId = (int) DB::table('user_account')->insertGetId([
            'email' => $r['email'], 'password_hash' => Hash::make($password, self::TEMP_HASH), 'role' => 'alumni',
            'display_name' => trim($r['first'].' '.$r['last']), 'account_status' => 'active', 'must_change_password' => true,
            'temp_password_expires_at' => now()->addDays(self::TEMP_PASSWORD_DAYS),
        ], 'user_id');
        DB::update('UPDATE alumnus SET user_id = ?, suffix = ? WHERE alumni_id = ?', [$userId, $r['suffix'], $alumniId]);
        DB::update("UPDATE record_review SET note = ? WHERE alumni_id = ? AND action = 'create'", ["Imported from masterlist {$code}", $alumniId]);
        $this->audit->log('import_account', 'user', $userId, $actor->user_id, ['batch' => $code, 'email' => AuditService::maskEmail($r['email'])]);

        return [$alumniId, $userId, (string) DB::table('alumnus')->where('alumni_id', $alumniId)->value('membership_id'), $password];
    }

    /** @return array<string, mixed> the replaced column values */
    private function updateRecord(array $r, string $code, UserAccount $actor): array
    {
        $t = $r['target'];
        $set = [];
        foreach ($r['changes'] as $c) {
            match ($c['field']) {
                'name' => $set += ['first_name' => $r['first'], 'middle_name' => $r['middle'], 'last_name' => $r['last'], 'suffix' => $r['suffix']],
                'program' => $set += $r['program'] !== null
                    ? ['program_id' => $r['program']->program_id, 'course_other' => null, 'declared_college_id' => null]
                    : ['program_id' => null, 'course_other' => $r['typed'], 'declared_college_id' => $r['college']->college_id],
                'year' => $set['year_graduated'] = $r['year'],
                'student_no' => $set['student_no'] = $r['studentNo'],
                'mobile' => $set['mobile_no'] = $r['mobile'],
                'email' => $set['contact_email'] = $r['email'],
            };
        }
        $cols = array_keys($set);
        $before = (array) DB::selectOne('SELECT '.implode(', ', $cols).' FROM alumnus WHERE alumni_id = ? FOR UPDATE', [$t->alumni_id]);
        DB::table('alumnus')->where('alumni_id', $t->alumni_id)->update($set);
        $fields = array_column($r['changes'], 'field');
        DB::table('record_review')->insert([
            'alumni_id' => $t->alumni_id, 'reviewer_id' => $actor->user_id, 'action' => 'edit',
            'note' => "Updated from masterlist {$code}", 'diff' => json_encode(['kind' => 'import', 'batch' => $code, 'fields' => $fields]),
        ]);
        $this->audit->log('import_update', 'alumnus', (int) $t->alumni_id, $actor->user_id, ['batch' => $code, 'fields' => $fields]);

        return $before;
    }

    /** 12 random characters that always pass the password rules (an uppercase letter and a digit included). */
    public static function tempPassword(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        $chars = [chr(random_int(65, 90)), (string) random_int(2, 9)];
        while (count($chars) < 12) {
            $chars[] = $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        for ($i = count($chars) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$chars[$i], $chars[$j]] = [$chars[$j], $chars[$i]];
        }

        return implode('', $chars);
    }

    // --- Analysis ("AI review") ------------------------------------------------------------------------

    /**
     * Every row (or one) of a batch: `orig` = the source as uploaded, `cur` = with the admin's edits, and the status
     * (ready | pending | resolved | rejected). In-file duplicates are checked across the whole batch.
     *
     * @return list<array{row: object, orig: array<string, mixed>, cur: array<string, mixed>, status: string}>
     */
    private function analyzeBatch(int $batchId, ?int $onlyRowId = null): array
    {
        $rows = DB::select('SELECT row_id, row_no, source, edits, decision FROM import_row WHERE batch_id = ? ORDER BY row_no', [$batchId]);
        $prep = [];
        foreach ($rows as $row) {
            $src = json_decode((string) $row->source, true) ?: [];
            $edits = json_decode((string) $row->edits, true) ?: [];
            $eff = array_merge($src, $edits);
            if (array_key_exists('name', $edits)) {
                unset($eff['last_name'], $eff['first_name'], $eff['middle_name']);
            }
            $prep[] = ['row' => $row, 'src' => self::basics($src), 'eff' => self::basics($eff)];
        }
        $ctx = $this->context(array_merge(array_column($prep, 'src'), array_column($prep, 'eff')));

        // First row with each student no. / email wins; rejected rows don't count.
        $firstOf = function (string $side) use ($prep) {
            $sn = $em = [];
            foreach ($prep as $p) {
                if ($p['row']->decision === 'reject') {
                    continue;
                }
                $b = $p[$side];
                if ($b['studentNo'] !== null) {
                    $sn[$b['studentNo']] ??= (int) $p['row']->row_no;
                }
                if ($b['email'] !== null) {
                    $em[$b['email']] ??= (int) $p['row']->row_no;
                }
            }

            return ['sn' => $sn, 'email' => $em];
        };
        $origFirst = $firstOf('src');
        $curFirst = $firstOf('eff');

        $out = [];
        foreach ($prep as $p) {
            if ($onlyRowId !== null && (int) $p['row']->row_id !== $onlyRowId) {
                continue;
            }
            $rowNo = (int) $p['row']->row_no;
            $orig = $this->analyze($p['src'], $ctx, $origFirst, $rowNo);
            $cur = $this->analyze($p['eff'], $ctx, $curFirst, $rowNo);
            $status = match (true) {
                $p['row']->decision === 'reject' => 'rejected',
                $cur['flag'] !== null => 'pending',
                $orig['flag'] !== null => 'resolved',
                default => 'ready',
            };
            $out[] = ['row' => $p['row'], 'orig' => $orig, 'cur' => $cur, 'status' => $status];
        }

        return $out;
    }

    /**
     * The raw cells split and lightly normalized (no lookups yet).
     *
     * @param  array<string, mixed>  $v
     * @return array<string, mixed>
     */
    private static function basics(array $v): array
    {
        $s = fn (string $k) => trim((string) ($v[$k] ?? ''));
        $parts = [$s('last_name'), $s('first_name'), $s('middle_name')];
        $raw = $s('name') !== '' ? $s('name') : trim($parts[0].($parts[0] !== '' && $parts[1].$parts[2] !== '' ? ', ' : '').trim($parts[1].' '.$parts[2]));
        $spacing = preg_match('/\s{2,}|\s,/u', $s('name').'|'.implode('|', $parts)) === 1;
        [$first, $middle, $last, $suffix, $cased] = self::splitName($raw);
        $email = $s('email') === '' ? null : mb_strtolower($s('email'));
        $yearRaw = $s('year');
        preg_match_all('/\b(?:19|20)\d{2}\b/', $yearRaw, $years);

        return [
            'raw' => $raw, 'first' => $first, 'middle' => $middle, 'last' => $last, 'suffix' => $suffix,
            'nameNote' => match (true) {
                $spacing && $cased => 'Extra spacing and casing fixed',
                $spacing => 'Extra spacing fixed',
                $cased => 'Name casing fixed',
                default => null,
            },
            'studentNoRaw' => $s('student_no'),
            'studentNo' => preg_match('/^\d{2}-\d{2}-\d{3}$/', $s('student_no')) === 1 ? $s('student_no') : null,
            'yearRaw' => $yearRaw, 'year' => $years[0] === [] ? null : (int) end($years[0]),
            'collegeRaw' => $s('college'), 'programRaw' => $s('program'),
            'emailRaw' => $s('email'), 'email' => $email,
            'mobileRaw' => $s('mobile'), 'mobile' => $s('mobile') === '' ? null : Mobile::normalize($s('mobile')),
            'keepTyped' => ! empty($v['keep_typed']), 'matchId' => (int) ($v['match_id'] ?? 0) ?: null,
            'notDuplicate' => ! empty($v['not_duplicate']), 'matchConfirmed' => ! empty($v['match_confirmed']),
        ];
    }

    /**
     * "DELA CRUZ, JUAN M." / "maria l. santos" / "Juan Dela Cruz Jr." → first, middle (initials), last, suffix, and
     * whether the casing was fixed (only all-caps or all-lowercase names are re-cased, so "McArthur" stays).
     *
     * @return array{0: string, 1: ?string, 2: string, 3: ?string, 4: bool}
     */
    private static function splitName(string $raw): array
    {
        $s = trim((string) preg_replace('/\s+/u', ' ', str_replace(' ,', ',', $raw)));
        $letters = (string) preg_replace('/[^\p{L}]/u', '', $s);
        $cased = mb_strlen($letters) > 1 && ($letters === mb_strtoupper($letters) || $letters === mb_strtolower($letters));
        if ($cased) {
            $s = mb_convert_case(mb_strtolower($s), MB_CASE_TITLE, 'UTF-8');
        }
        $suffix = null;
        $takeSuffix = function (array $w) use (&$suffix): array {
            $k = count($w) > 1 ? strtolower(rtrim((string) end($w), '.')) : '';
            if (isset(self::SUFFIX[$k])) {
                $suffix = self::SUFFIX[$k];
                array_pop($w);
            }

            return $w;
        };
        $words = fn (string $x) => array_values(array_filter(explode(' ', trim($x)), fn ($w) => $w !== ''));

        if (str_contains($s, ',')) {
            [$lastPart, $rest] = array_map('trim', explode(',', $s, 2));
            $last = $takeSuffix($words($lastPart));
            $given = $takeSuffix($words(str_replace(',', ' ', $rest)));
        } else {
            $w = $takeSuffix($words($s));
            $i = count($w) - 1;
            while ($i > 1 && in_array(mb_strtolower($w[$i - 1]), self::PARTICLES, true)) {
                $i--;
            }
            $last = count($w) < 2 ? [] : array_slice($w, $i);
            $given = count($w) < 2 ? $w : array_slice($w, 0, $i);
        }
        // Trailing initials of the given names are the middle name: "Juan M." → Juan + M.
        $middle = [];
        while (count($given) > 1 && preg_match('/^\p{L}\.?$/u', (string) end($given)) === 1) {
            array_unshift($middle, mb_strtoupper(rtrim((string) array_pop($given), '.')).'.');
        }

        return [implode(' ', $given), $middle === [] ? null : implode(' ', $middle), implode(' ', $last), $suffix, $cased];
    }

    /**
     * Catalog and the existing records the batch could touch, loaded once per analysis.
     *
     * @param  list<array<string, mixed>>  $basics
     * @return array<string, mixed>
     */
    private function context(array $basics): array
    {
        $sns = array_values(array_unique(array_filter(array_column($basics, 'studentNo'))));
        $emails = array_values(array_unique(array_filter(array_column($basics, 'email'))));
        $names = array_values(array_unique(array_filter(array_map(fn ($b) => $b['first'] !== '' && $b['last'] !== '' ? self::nameKey($b['first'], $b['last']) : null, $basics))));
        $ids = array_values(array_unique(array_filter(array_column($basics, 'matchId'))));

        $records = DB::select(
            "SELECT a.alumni_id, a.membership_id, a.student_no, a.first_name, a.middle_name, a.last_name, a.suffix, a.program_id,
                    a.course_other, COALESCE(p.college_id, a.declared_college_id) AS college_id, a.year_graduated, a.mobile_no,
                    a.contact_email, a.user_id, u.email AS login_email, p.abbr AS program_abbr, c.code AS college_code,
                    lower(regexp_replace(a.first_name || ' ' || a.last_name, '\\s+', ' ', 'g')) AS name_key
               FROM alumnus a
               LEFT JOIN program p ON p.program_id = a.program_id
               LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
               LEFT JOIN user_account u ON u.user_id = a.user_id
              WHERE a.merged_into_id IS NULL AND (
                    a.student_no IN (SELECT jsonb_array_elements_text(?::jsonb))
                 OR lower(regexp_replace(a.first_name || ' ' || a.last_name, '\\s+', ' ', 'g')) IN (SELECT jsonb_array_elements_text(?::jsonb))
                 OR a.alumni_id IN (SELECT jsonb_array_elements_text(?::jsonb)::bigint))
              ORDER BY a.alumni_id",
            [json_encode($sns), json_encode($names), json_encode($ids)],
        );
        $ctx = ['bySn' => [], 'byName' => [], 'byId' => [], 'year' => (int) now('Asia/Manila')->year];
        foreach ($records as $r) {
            $ctx['byId'][(int) $r->alumni_id] = $r;
            if ($r->student_no !== null) {
                $ctx['bySn'][$r->student_no] = $r;
            }
            $ctx['byName'][$r->name_key][] = $r;
        }
        $ctx['emails'] = DB::table('user_account')->whereIn(DB::raw('lower(email)'), $emails)->selectRaw('lower(email) AS e, user_id')->pluck('user_id', 'e')->map(fn ($v) => (int) $v)->all();
        $ctx['colleges'] = DB::table('college')->orderBy('sort_order')->get(['college_id', 'code', 'name'])->all();
        $ctx['programs'] = DB::table('program as p')->join('college as c', 'c.college_id', '=', 'p.college_id')->where('p.is_active', true)
            ->orderBy('p.program_id')->get(['p.program_id', 'p.college_id', 'p.abbr', 'p.name', 'p.code', 'c.code as college_code', 'c.name as college_name'])->all();

        return $ctx;
    }

    /**
     * One row through the checks. The first problem found becomes the flag (with the AI suggestion and the field the
     * admin can edit); smaller fixes become notes. Confidence comes from the flag, else from how much was fixed.
     *
     * @param  array<string, mixed>  $b  basics()
     * @param  array<string, mixed>  $ctx  context()
     * @param  array{sn: array<string, int>, email: array<string, int>}  $first
     * @return array<string, mixed>
     */
    private function analyze(array $b, array $ctx, array $first, int $rowNo): array
    {
        $flag = null;
        $raise = function (string $code, string $message, ?string $field, int $conf, ?array $suggestion = null, ?array $keep = null) use (&$flag) {
            $flag ??= ['code' => $code, 'message' => $message, 'field' => $field, 'conf' => $conf,
                'suggestion' => $suggestion === null ? null : ['text' => $suggestion[0], 'patch' => $suggestion[1]],
                'keep' => $keep === null ? null : ['text' => $keep[0], 'patch' => $keep[1]]];
        };
        $notes = [];
        $penalty = 0;
        if ($b['nameNote'] !== null) {
            $notes[] = $b['nameNote'];
            $penalty += 2;
        }

        // Name
        if ($b['first'] === '' || $b['last'] === '') {
            $raise('name_missing', $b['raw'] === '' ? 'Full name is missing' : 'Enter both the first and last name', 'name', 20);
        }

        // Student no.
        $sn = $b['studentNo'];
        if ($b['studentNoRaw'] !== '' && $sn === null) {
            $d = (string) preg_replace('/\D/', '', $b['studentNoRaw']);
            $fix = strlen($d) === 7 ? substr($d, 0, 2).'-'.substr($d, 2, 2).'-'.substr($d, 4) : null;
            $raise('student_no_format', "Student no. “{$b['studentNoRaw']}” is not in the YY-NN-NNN format", 'student_no', 50, $fix ? ["Change to {$fix}", ['student_no' => $fix]] : null);
        }
        if ($sn !== null && ($first['sn'][$sn] ?? $rowNo) !== $rowNo) {
            $raise('student_no_repeat', "Same student no. as row {$first['sn'][$sn]} of this file", 'student_no', 40);
        }

        // Year graduated
        $year = $b['year'];
        $snYear = $sn === null ? null : 2000 + (int) substr($sn, 0, 2);
        $yearFix = $snYear !== null && $snYear >= self::MIN_YEAR && $snYear <= $ctx['year'] && $snYear !== $year
            ? ["Change to {$snYear} (matches the ".substr($sn, 0, 2).'- student number prefix)', ['year' => (string) $snYear]] : null;
        if ($year === null) {
            $raise('year_missing', $b['yearRaw'] === '' ? 'Year graduated is missing' : "Year graduated “{$b['yearRaw']}” is not a year", 'year', 40, $yearFix);
        } elseif ($year < self::MIN_YEAR || $year > $ctx['year']) {
            $raise('year_range', "Year graduated {$year} is outside ".self::MIN_YEAR." – {$ctx['year']}", 'year', 42, $yearFix);
        }

        // College and program
        [$college, $program, $typed] = $this->placeProgram($b, $ctx, $raise, $notes, $penalty);

        // Contacts
        if ($b['email'] !== null && (preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $b['email']) !== 1 || strlen($b['email']) > 120)) {
            $raise('email_invalid', "Email “{$b['emailRaw']}” is not a valid address", 'email', 35);
        }
        if ($b['mobileRaw'] !== '' && $b['mobile'] === null) {
            $raise('mobile_invalid', "Mobile “{$b['mobileRaw']}” is not a valid PH mobile number", 'mobile', 70, ['Leave the mobile number blank', ['mobile' => '']]);
        }

        // New record or an update of one on file?
        $target = $b['matchId'] !== null ? ($ctx['byId'][$b['matchId']] ?? null) : null;
        $name = self::display($b['first'], $b['middle'], $b['last'], $b['suffix']);
        if ($target === null && $sn !== null && isset($ctx['bySn'][$sn])) {
            $t = $ctx['bySn'][$sn];
            if ($b['matchConfirmed'] || $b['last'] === '' || self::sameLastName($t->last_name, $b['last'])) {
                $target = $t;
            } else {
                $who = self::display($t->first_name, $t->middle_name, $t->last_name, $t->suffix);
                $raise('student_no_taken', "Student no. {$sn} already belongs to {$who} · {$t->membership_id}", 'student_no', 55,
                    ["Update {$t->membership_id} with this row (the masterlist is correct)", ['match_confirmed' => true]]);
            }
        }
        if ($target === null && $flag === null && ! $b['notDuplicate'] && $b['first'] !== '' && $b['last'] !== '') {
            $c = collect($ctx['byName'][self::nameKey($b['first'], $b['last'])] ?? [])
                ->first(fn ($c) => $sn === null || $c->student_no === null || $c->student_no === $sn);
            if ($c !== null) {
                $extra = $year !== null && (int) $c->year_graduated !== $year ? " and update year graduated {$c->year_graduated} → {$year}" : '';
                $raise('possible_duplicate', 'Possible duplicate of '.self::display($c->first_name, $c->middle_name, $c->last_name, $c->suffix)." · {$c->membership_id}", null, 61,
                    ["Merge into {$c->membership_id}{$extra}", ['match_id' => (int) $c->alumni_id]], ['Create as a new record', ['not_duplicate' => true]]);
            }
        }

        $changes = [];
        if ($target === null) {
            $kind = 'new';
            if ($b['email'] === null) {
                $raise('email_missing', 'Missing personal email — temporary password cannot be delivered', 'email', 30);
            } elseif (($first['email'][$b['email']] ?? $rowNo) !== $rowNo) {
                $raise('email_repeat', "Same email as row {$first['email'][$b['email']]} of this file", 'email', 40);
            } elseif (isset($ctx['emails'][$b['email']])) {
                $raise('email_taken', "{$b['email']} already signs in to another portal account", 'email', 45);
            }
        } else {
            $add = function (string $field, string $label, ?string $from, ?string $to) use (&$changes) {
                $changes[] = ['field' => $field, 'label' => $label, 'from' => $from ?? '—', 'to' => $to ?? '—'];
            };
            $was = self::display($target->first_name, $target->middle_name, $target->last_name, $target->suffix);
            if ($b['first'] !== '' && $b['last'] !== '' && mb_strtolower($was) !== mb_strtolower($name)) {
                $add('name', 'NAME', $was, $name);
            }
            $wasProgram = $target->program_abbr ?? $target->course_other;
            if ($program !== null && (int) $program->program_id !== (int) $target->program_id) {
                $add('program', 'PROGRAM', $wasProgram, $program->abbr);
            } elseif ($program === null && $typed !== null && ($target->program_id !== null || strcasecmp($typed, (string) $target->course_other) !== 0)) {
                $add('program', 'PROGRAM', $wasProgram, $typed);
            }
            if ($year !== null && $year !== (int) $target->year_graduated) {
                $add('year', 'YEAR', (string) $target->year_graduated, (string) $year);
            }
            if ($sn !== null && $target->student_no === null) {
                $add('student_no', 'STUDENT NO.', null, $sn);
            }
            if ($b['mobile'] !== null && $b['mobile'] !== $target->mobile_no) {
                $add('mobile', 'MOBILE', Mobile::display($target->mobile_no) ?: null, Mobile::display($b['mobile']));
            }
            if ($b['email'] !== null && $target->user_id === null && $b['email'] !== mb_strtolower((string) $target->contact_email)) {
                $add('email', 'EMAIL', $target->contact_email, $b['email']);
            } elseif ($b['email'] !== null && $target->user_id !== null && $b['email'] !== mb_strtolower((string) $target->login_email)) {
                $notes[] = 'Sign-in email kept (the alumnus changes it in their profile)';
            }
            $kind = $changes === [] ? 'same' : 'update';
        }

        return [
            'first' => $b['first'], 'middle' => $b['middle'], 'last' => $b['last'], 'suffix' => $b['suffix'], 'name' => $name,
            'studentNo' => $sn, 'year' => $year, 'email' => $b['email'], 'mobile' => $b['mobile'],
            'college' => $college, 'program' => $program, 'typed' => $typed,
            'kind' => $kind, 'target' => $target, 'changes' => $changes, 'notes' => $notes, 'flag' => $flag,
            'confidence' => $flag['conf'] ?? max(60, ($kind === 'new' ? 99 : 96) - $penalty),
            'values' => [
                'name' => $b['raw'], 'student_no' => $b['studentNoRaw'], 'college' => $b['collegeRaw'], 'program' => $b['programRaw'],
                'year' => $b['yearRaw'], 'email' => $b['emailRaw'], 'mobile' => $b['mobileRaw'],
            ],
        ];
    }

    /**
     * College + program → [college, catalog program | null, typed program | null]. Exact match on code, abbreviation or
     * name (ignoring spaces and punctuation: "BS Crim" = BSCrim); otherwise the closest catalog entry is suggested.
     *
     * @return array{0: ?object, 1: ?object, 2: ?string}
     */
    private function placeProgram(array $b, array $ctx, callable $raise, array &$notes, int &$penalty): array
    {
        $colIn = $b['collegeRaw'];
        $progIn = $b['programRaw'];
        $n = self::norm($progIn);
        $college = null;
        if ($colIn !== '') {
            $college = collect($ctx['colleges'])->first(fn ($c) => self::norm($c->code) === self::norm($colIn) || self::norm($c->name) === self::norm($colIn));
        }
        $matches = $n === '' ? [] : array_values(array_filter($ctx['programs'], fn ($p) => in_array($n, [self::norm($p->abbr), self::norm($p->name), self::norm($p->code)], true)));
        $collegeOf = fn (object $p) => collect($ctx['colleges'])->firstWhere('college_id', $p->college_id);

        if ($colIn !== '' && $college === null) {
            $owners = array_values(array_unique(array_map(fn ($p) => (int) $p->college_id, $matches)));
            $sug = count($owners) === 1 ? collect($ctx['colleges'])->firstWhere('college_id', $owners[0]) : self::closest($colIn, $ctx['colleges'], fn ($c) => [$c->code, $c->name], 70);
            $raise('college_unknown', "College “{$colIn}” is not in the catalog", 'college', 55, $sug ? ["Change to {$sug->code} · {$sug->name}", ['college' => $sug->code]] : null);

            return [null, null, null];
        }
        if ($n === '') {
            $raise('program_missing', 'Program is missing', 'program', 50);

            return [$college, null, null];
        }
        $inCollege = $college === null ? $matches : array_values(array_filter($matches, fn ($p) => (int) $p->college_id === (int) $college->college_id));

        if (count($inCollege) === 1) {
            $program = $inCollege[0];
            if ($college === null) {
                $college = $collegeOf($program);
                $notes[] = "College taken from the program ({$college->code})";
                $penalty += 4;
            }
            if ($progIn !== $program->abbr && strcasecmp($progIn, $program->name) !== 0) {
                $notes[] = "“{$progIn}” mapped to {$program->abbr} · {$college->name}";
                $penalty += 10;
            }

            return [$college, $program, null];
        }
        if (count($inCollege) > 1) {
            $codes = implode(' and ', array_unique(array_map(fn ($p) => $p->college_code, $inCollege)));
            $raise('program_ambiguous', "{$progIn} is offered by {$codes} — choose the college", 'college', 58);

            return [null, null, null];
        }
        if ($college !== null && $b['keepTyped']) {
            $notes[] = 'Kept as a typed program — map it later in Alumni Records';
            $penalty += 3;

            return [$college, null, $progIn];
        }
        $keep = $college === null ? null : ["Keep “{$progIn}” as a typed program under {$college->code}", ['keep_typed' => true]];
        if ($matches !== []) {
            $owners = array_values(array_unique(array_map(fn ($p) => $p->college_code, $matches)));
            $raise('program_other_college', "{$matches[0]->abbr} is not offered by {$college->code}", 'college', 55,
                count($owners) === 1 ? ["Change the college to {$owners[0]} · {$matches[0]->college_name}", ['college' => $owners[0]]] : null, $keep);

            return [$college, null, null];
        }
        $pool = $college === null ? $ctx['programs'] : array_values(array_filter($ctx['programs'], fn ($p) => (int) $p->college_id === (int) $college->college_id));
        $best = self::closest($progIn, $pool, fn ($p) => [$p->abbr, $p->name], 80);
        $raise('program_unknown', "Program “{$progIn}” is not in the catalog", 'program', 50,
            $best ? ["Map to {$best->abbr} · {$best->name}", ['program' => $best->abbr, 'college' => $best->college_code]] : null, $keep);

        return [$college, null, null];
    }

    /** The catalog entry most similar to `$text` (by its code / name), if at least `$min` percent similar. */
    private static function closest(string $text, array $items, callable $keys, float $min): ?object
    {
        $n = self::norm($text);
        $best = null;
        $score = $min;
        foreach ($items as $item) {
            foreach ($keys($item) as $k) {
                similar_text($n, self::norm((string) $k), $pct);
                if ($pct >= $score) {
                    [$best, $score] = [$item, $pct];
                }
            }
        }

        return $best;
    }

    // --- Shapes and helpers ----------------------------------------------------------------------------

    /** @return array<string, mixed> a row as the review screen shows it */
    private static function rowOut(array $x): array
    {
        $cur = $x['cur'];
        $flag = $x['status'] === 'pending' ? $cur['flag'] : $x['orig']['flag'];
        $t = $cur['target'];

        return [
            'id' => (int) $x['row']->row_id, 'rowNo' => (int) $x['row']->row_no,
            'raw' => $x['orig']['values']['name'], 'name' => $cur['name'],
            'studentNo' => $cur['studentNo'],
            'program' => $cur['program']->abbr ?? $cur['typed'] ?? $cur['values']['program'],
            'college' => $cur['college']->code ?? $cur['values']['college'],
            'year' => $cur['year'] ?? $cur['values']['year'],
            'email' => $cur['email'], 'mobile' => Mobile::display($cur['mobile']) ?: null,
            'kind' => $cur['kind'],
            'target' => $t === null ? null : ['id' => (int) $t->alumni_id, 'membershipId' => $t->membership_id, 'name' => self::display($t->first_name, $t->middle_name, $t->last_name, $t->suffix)],
            'changes' => array_map(fn ($c) => ['label' => $c['label'], 'from' => $c['from'], 'to' => $c['to']], $cur['changes']),
            'notes' => $cur['notes'],
            'confidence' => $x['orig']['confidence'],
            'flag' => $flag === null ? null : [
                'message' => $flag['message'], 'field' => $flag['field'], 'fieldLabel' => $flag['field'] ? self::FIELD_LABEL[$flag['field']] : null,
                'suggestion' => $flag['suggestion']['text'] ?? null, 'keep' => $flag['keep']['text'] ?? null,
            ],
            'values' => $cur['values'],
            'status' => $x['status'], 'decision' => $x['row']->decision,
        ];
    }

    /** @return array<string, int> */
    private static function stats(array $a): array
    {
        $s = fn (callable $f) => count(array_filter($a, $f));
        $in = fn ($x) => in_array($x['status'], ['ready', 'resolved'], true);

        return [
            'rows' => count($a),
            'ready' => $s(fn ($x) => $x['orig']['flag'] === null),
            'flagged' => $s(fn ($x) => $x['orig']['flag'] !== null),
            'open' => $s(fn ($x) => $x['status'] === 'pending'),
            'new' => $s(fn ($x) => $in($x) && $x['cur']['kind'] === 'new'),
            'update' => $s(fn ($x) => $in($x) && $x['cur']['kind'] === 'update'),
            'unchanged' => $s(fn ($x) => $in($x) && $x['cur']['kind'] === 'same'),
            'rejected' => $s(fn ($x) => $x['status'] === 'rejected'),
        ];
    }

    /** Rows of a synced / rolled-back batch, from what confirm stored (the records have changed since). */
    private function syncedRows(int $batchId): array
    {
        return DB::table('import_row')->where('batch_id', $batchId)->orderBy('row_no')->get(['row_id', 'row_no', 'source', 'outcome'])
            ->map(function ($r) {
                $src = json_decode((string) $r->source, true) ?: [];
                $o = json_decode((string) $r->outcome, true) ?: [];
                $b = self::basics($src);

                return [
                    'id' => (int) $r->row_id, 'rowNo' => (int) $r->row_no, 'raw' => $b['raw'], 'program' => $b['programRaw'], 'year' => $b['yearRaw'],
                    'kind' => $o['kind'] ?? null, 'membershipId' => $o['membershipId'] ?? null,
                    'status' => ($o['kind'] ?? '') === 'rejected' ? 'rejected' : 'synced', 'reason' => $o['reason'] ?? null,
                ];
            })->all();
    }

    private function lockReview(int $batchId): object
    {
        $b = DB::selectOne('SELECT batch_id, code, file_name, status, validated_at FROM import_batch WHERE batch_id = ? FOR UPDATE', [$batchId]) ?? throw ApiException::notFound();
        if ($b->status !== 'review') {
            throw ApiException::conflict('This batch was already synced. Start a new import.');
        }

        return $b;
    }

    /** A manual edit, checked before it is stored (the analysis then decides whether the row is clean). */
    private static function editValue(string $field, string $value): string
    {
        $v = trim($value);
        $year = (int) now('Asia/Manila')->year;
        $error = match ($field) {
            'year' => preg_match('/^\d{4}$/', $v) === 1 && (int) $v >= self::MIN_YEAR && (int) $v <= $year ? null : 'Enter a 4-digit year between '.self::MIN_YEAR." and {$year}.",
            'email' => preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $v) === 1 && strlen($v) <= 120 ? null : 'Enter a valid email address.',
            'student_no' => preg_match('/^\d{2}-\d{2}-\d{3}$/', $v) === 1 ? null : 'Use the format YY-NN-NNN (e.g. 21-05-123).',
            'mobile' => $v === '' || Mobile::normalize($v) !== null ? null : 'Enter a valid mobile number (e.g. 09XX XXX XXXX), or leave it blank.',
            'name', 'college', 'program' => $v !== '' && mb_strlen($v) <= 160 ? null : 'Enter a value.',
            default => 'This field cannot be edited.',
        };
        if ($error !== null) {
            throw new ApiException(422, $error, 'validation', ['value' => $error]);
        }

        return $v;
    }

    private static function display(?string $first, ?string $middle, ?string $last, ?string $suffix): string
    {
        return implode(' ', array_filter([$first, $middle, $last, $suffix], fn ($p) => $p !== null && $p !== ''));
    }

    private static function nameKey(string $first, string $last): string
    {
        return mb_strtolower((string) preg_replace('/\s+/u', ' ', trim($first.' '.$last)));
    }

    private static function sameLastName(string $a, string $b): bool
    {
        return self::norm($a) === self::norm($b);
    }

    private static function norm(string $s): string
    {
        return strtolower((string) preg_replace('/[^a-z0-9]/i', '', $s));
    }
}
