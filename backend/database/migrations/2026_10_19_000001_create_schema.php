<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Tables, enums and helper functions. The SQL lives in database/sql/ so the schema stays readable.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(file_get_contents(database_path('sql/001_schema.sql')));
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP TABLE IF EXISTS report_export, audit_log, announcement, event_registration, event_reg_field,
              event_agenda_item, event, saved_job, job_skill, job_posting, outreach_contact, record_review,
              proof_document, employment_record, survey_response, survey_cycle, alumni_skill, skill, credential,
              social_link, alumnus, tracer_question, app_setting, notification, password_reset, auth_session,
              user_account, program, college CASCADE;
            DROP TYPE IF EXISTS user_role, account_status, tracer_form, degree_level, sex, civil_status, pwd_type,
              verification_status, record_source, social_platform, credential_type, cycle_status, response_status,
              employment_status, job_status, org_type, place_of_work, time_to_job, course_relevance, review_action,
              outreach_method, outreach_outcome, employment_type, posting_source, approval_status, apply_channel,
              event_category, reg_status, rsvp, announcement_kind, report_type, report_format, report_status;
            DROP FUNCTION IF EXISTS set_updated_at(), app_today();
            SQL);
    }
};
