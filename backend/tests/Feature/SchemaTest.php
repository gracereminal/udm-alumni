<?php

use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

const TABLES = [
    'user_account', 'auth_session', 'password_reset', 'notification', 'app_setting', 'tracer_question', 'college', 'program',
    'alumnus', 'social_link', 'credential', 'skill', 'alumni_skill', 'survey_cycle', 'survey_response', 'employment_record',
    'proof_document', 'record_review', 'outreach_contact', 'job_posting', 'job_skill', 'saved_job', 'event',
    'event_agenda_item', 'event_reg_field', 'event_registration', 'announcement', 'audit_log', 'report_export',
    'message_thread', 'message', 'message_read',
];

const VIEWS = [
    'v_active_cycle', 'v_alumni_current', 'v_stats_grain', 'v_records_counters', 'v_unresponsive', 'v_directory',
    'v_alumni_dashboard', 'v_event_stats', 'v_job_stats',
];

function relations(string $type): array
{
    return collect(DB::select('SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = ?', [$type]))
        ->pluck('table_name')->all();
}

it('creates every table and view in the data model', function () {
    expect(relations('BASE TABLE'))->toContain(...TABLES)
        ->and(relations('VIEW'))->toContain(...VIEWS);
});

it('rolls back and re-applies the migrations on an empty database', function () {
    Artisan::call('migrate:rollback', ['--force' => true]);
    expect(array_intersect(TABLES, relations('BASE TABLE')))->toBe([])
        ->and(relations('VIEW'))->toBe([]);

    Artisan::call('migrate', ['--force' => true]);
    expect(relations('BASE TABLE'))->toContain(...TABLES)
        ->and(DB::table('alumnus')->count())->toBe(0)
        ->and(DB::table('v_alumni_current')->count())->toBe(0);
});

it('rejects a second open survey cycle', function () {
    expect(fn () => DB::insert("INSERT INTO survey_cycle (name, status, opens_at) VALUES ('Second', 'open', now())"))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('requires a college for dept accounts', function () {
    expect(fn () => DB::table('user_account')->insert(['email' => 'dept@x.test', 'password_hash' => 'x', 'role' => 'dept', 'display_name' => 'D']))
        ->toThrow(QueryException::class, 'dept_has_college');
});

it('treats emails as case-insensitively unique', function () {
    expect(fn () => DB::table('user_account')->insert(['email' => 'ADMIN@udmalumni.edu', 'password_hash' => 'x', 'role' => 'admin', 'display_name' => 'A']))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('enforces the identifier formats', function (array $row, string $constraint) {
    $base = ['year_graduated' => 2024, 'last_name' => 'X', 'first_name' => 'Y', 'program_id' => DB::table('program')->value('program_id')];

    expect(fn () => DB::table('alumnus')->insert($row + $base))->toThrow(QueryException::class, $constraint);
})->with([
    'Alumni ID' => [['student_no' => '24-005-67'], 'alumnus_student_no_format'],
    'membership ID' => [['membership_id' => 'AM-24-1'], 'alumnus_membership_format'],
    'mobile' => [['mobile_no' => '09171234567'], 'alumnus_mobile_format'],
]);

it('requires a program or a typed program with its college', function () {
    expect(fn () => DB::table('alumnus')->insert(['year_graduated' => 2024, 'last_name' => 'X', 'first_name' => 'Y', 'course_other' => 'BS Something']))
        ->toThrow(QueryException::class, 'alumnus_has_program');
});

it('keeps core tracer questions shown and required', function () {
    // A savepoint, so the failed insert does not abort the test transaction.
    expect(fn () => DB::transaction(fn () => DB::table('tracer_question')->insert(['field_id' => 'email', 'section' => 'contact', 'shown' => false])))
        ->toThrow(QueryException::class, 'tracer_core_fields');

    DB::table('tracer_question')->insert(['field_id' => 'facebook', 'section' => 'contact', 'required' => false]);
    expect(DB::table('tracer_question')->where('field_id', 'facebook')->value('required'))->toBeFalse();
});

it('keeps updated_at current on update', function () {
    $alumnus = DB::table('alumnus')->first();
    DB::table('alumnus')->where('alumni_id', $alumnus->alumni_id)->update(['bio' => 'Updated']);

    $updated = DB::selectOne('SELECT updated_at > ?::timestamptz AS moved FROM alumnus WHERE alumni_id = ?', [$alumnus->updated_at, $alumnus->alumni_id]);
    expect($updated->moved)->toBeTrue();
});
