-- UDM Alumni Tracer schema (docs/plan-backend.md, "Data model").
-- IDs are bigint identity, enumerations are Postgres enums, free-form answers are jsonb, timestamps are timestamptz.
-- Every table has created_at; mutable tables also have updated_at, kept current by the set_updated_at() trigger.

-- Helpers ------------------------------------------------------------------------------------------
-- "Today" is Manila time (sync rule 6).
CREATE OR REPLACE FUNCTION app_today() RETURNS date LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'Asia/Manila')::date $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Enums --------------------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('alumni', 'dept', 'admin');
CREATE TYPE account_status AS ENUM ('pending', 'active', 'disabled');
CREATE TYPE tracer_form AS ENUM ('register', 'profile', 'both');
CREATE TYPE degree_level AS ENUM ('bachelor', 'master', 'doctorate', 'professional');
CREATE TYPE sex AS ENUM ('male', 'female', 'prefer_not_to_say');
CREATE TYPE civil_status AS ENUM ('single', 'married', 'separated', 'widowed');
CREATE TYPE pwd_type AS ENUM ('visual', 'hearing', 'speech_language', 'physical', 'intellectual', 'learning', 'psychosocial', 'mental', 'chronic_illness', 'others');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'flagged');
CREATE TYPE record_source AS ENUM ('self_registration', 'survey', 'alumni_update', 'admin_encoded', 'import');
CREATE TYPE social_platform AS ENUM ('facebook', 'messenger', 'twitter', 'instagram', 'linkedin', 'website');
CREATE TYPE credential_type AS ENUM ('honor', 'exam', 'certification');
CREATE TYPE cycle_status AS ENUM ('draft', 'open', 'closed');
CREATE TYPE response_status AS ENUM ('draft', 'submitted');
CREATE TYPE employment_status AS ENUM ('employed', 'self_employed', 'further_studies', 'not_employed');
CREATE TYPE job_status AS ENUM ('regular', 'temporary', 'casual', 'contractual', 'self_employed');
CREATE TYPE org_type AS ENUM ('private', 'government', 'non_profit', 'self_owned');
CREATE TYPE place_of_work AS ENUM ('local', 'abroad');
CREATE TYPE time_to_job AS ENUM ('lt_1m', 'm1_6', 'm7_11', 'y1_2', 'y2_3', 'y3_4', 'gt_4y');
CREATE TYPE course_relevance AS ENUM ('related', 'not_related');
CREATE TYPE review_action AS ENUM ('create', 'edit', 'verify', 'flag', 'unflag', 'archive', 'restore', 'merge', 'map_program');
CREATE TYPE outreach_method AS ENUM ('email', 'phone', 'facebook', 'messenger', 'linkedin');
CREATE TYPE outreach_outcome AS ENUM ('sent', 'reached', 'no_response', 'bounced');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'freelance');
CREATE TYPE posting_source AS ENUM ('admin', 'alumni');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE apply_channel AS ENUM ('messenger', 'email', 'website');
CREATE TYPE event_category AS ENUM ('event', 'career', 'community');
CREATE TYPE reg_status AS ENUM ('open', 'closed', 'full');
CREATE TYPE rsvp AS ENUM ('going', 'maybe');
CREATE TYPE announcement_kind AS ENUM ('notice', 'reminder', 'update');
CREATE TYPE report_type AS ENUM ('ched', 'employability', 'coverage', 'employer', 'inclusion');
CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv');
CREATE TYPE report_status AS ENUM ('ready', 'submitted', 'archived');

-- Academic -----------------------------------------------------------------------------------------
CREATE TABLE college (
  college_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        varchar(10) NOT NULL UNIQUE,
  name        varchar(120) NOT NULL UNIQUE,
  sort_order  smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE program (
  program_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  college_id    bigint NOT NULL REFERENCES college,
  code          varchar(20) NOT NULL UNIQUE,          -- unique across colleges, e.g. CCS-BSIT
  abbr          varchar(20) NOT NULL,                 -- display code, e.g. BSIT (repeats across colleges)
  name          varchar(160) NOT NULL,
  degree_level  degree_level NOT NULL DEFAULT 'bachelor',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, name)
);

-- Identity and access ------------------------------------------------------------------------------
CREATE TABLE user_account (
  user_id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email                 varchar(120) NOT NULL,
  password_hash         varchar(255) NOT NULL,
  role                  user_role NOT NULL,
  college_id            bigint REFERENCES college,
  display_name          varchar(120) NOT NULL,
  role_label            varchar(60),
  account_status        account_status NOT NULL DEFAULT 'active',
  must_change_password  boolean NOT NULL DEFAULT false,
  failed_login_count    smallint NOT NULL DEFAULT 0,
  locked_until          timestamptz,
  last_login_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dept_has_college CHECK (role <> 'dept' OR college_id IS NOT NULL)
);
CREATE UNIQUE INDEX user_account_email_uk ON user_account (lower(email));

CREATE TABLE auth_session (
  session_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  session_hash  char(64) NOT NULL UNIQUE,             -- SHA-256 (hex) of the cookie value
  user_agent    varchar(255),
  ip            varchar(64),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  revoked_at    timestamptz
);
CREATE INDEX auth_session_user_idx ON auth_session (user_id) WHERE revoked_at IS NULL;

CREATE TABLE password_reset (
  reset_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  token_hash  char(64) NOT NULL UNIQUE,
  code_hash   varchar(255) NOT NULL,
  sent_to     varchar(120) NOT NULL,
  attempts    smallint NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_user_idx ON password_reset (user_id, created_at DESC);

CREATE TABLE notification (
  notification_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          bigint NOT NULL REFERENCES user_account ON DELETE CASCADE,
  type             varchar(40) NOT NULL,
  title            varchar(160) NOT NULL,
  message          varchar(255) NOT NULL,
  link_url         varchar(255),                      -- a client screen id
  dedupe_key       varchar(120),
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX notification_user_idx ON notification (user_id, created_at DESC);

CREATE TABLE app_setting (
  key         varchar(60) PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_by  bigint REFERENCES user_account ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Admin edits to registration and survey questions. Only edits and added questions are stored;
-- the defaults stay in the client's data/formDefs.js.
CREATE TABLE tracer_question (
  question_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  field_id     varchar(60) NOT NULL UNIQUE,           -- the client's field id
  section      varchar(40) NOT NULL,
  form         tracer_form NOT NULL DEFAULT 'both',
  label        varchar(255),
  placeholder  varchar(255),
  type         varchar(20),
  options      jsonb,
  required     boolean,
  shown        boolean,
  sort         smallint,
  is_custom    boolean NOT NULL DEFAULT false,
  updated_by   bigint REFERENCES user_account ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- Core fields (names, email, college, program, year, password) cannot be hidden or made optional.
  CONSTRAINT tracer_core_fields CHECK (
    field_id NOT IN ('last_name', 'first_name', 'email', 'college', 'course', 'year_graduated', 'reg_pw', 'reg_pw2')
    OR (COALESCE(shown, true) AND COALESCE(required, true))
  ),
  CONSTRAINT tracer_custom_complete CHECK (NOT is_custom OR (label IS NOT NULL AND type IS NOT NULL))
);

-- Alumni profile -----------------------------------------------------------------------------------
CREATE TABLE alumnus (
  alumni_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id              bigint UNIQUE REFERENCES user_account ON DELETE SET NULL,  -- null for imported records
  membership_id        varchar(20) UNIQUE,            -- AM-YYYY-NNNNN
  student_no           varchar(9) UNIQUE,             -- the Alumni ID, YY-NN-NNN (YY = class year)
  program_id           bigint REFERENCES program,
  course_other         varchar(160),                  -- typed program when not in the catalog
  declared_college_id  bigint REFERENCES college,     -- only used while program_id is null
  year_graduated       smallint NOT NULL CHECK (year_graduated BETWEEN 1950 AND 2100),
  last_name            varchar(60) NOT NULL,
  first_name           varchar(60) NOT NULL,
  middle_name          varchar(60),
  suffix               varchar(10),
  married_name         varchar(120),
  birth_date           date,
  sex                  sex,
  civil_status         civil_status,
  present_address      text,
  permanent_address    text,
  mobile_no            varchar(12),                   -- normalized 639XXXXXXXXX
  contact_email        varchar(120),                  -- for records without a login; the login email wins
  is_indigenous        boolean NOT NULL DEFAULT false,
  indigenous_group     varchar(80),
  pwd_type             pwd_type,                      -- null = not PWD
  photo_url            varchar(255),
  industry             varchar(120),
  bio                  text,
  verification_status  verification_status NOT NULL DEFAULT 'pending',
  record_source        record_source NOT NULL DEFAULT 'self_registration',
  flag_note            text,
  merged_into_id       bigint REFERENCES alumnus,
  archived_at          timestamptz,
  privacy_consent_at   timestamptz,
  directory_opt_in     boolean NOT NULL DEFAULT false,
  show_email           boolean NOT NULL DEFAULT false,
  show_mobile          boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alumnus_membership_format CHECK (membership_id ~ '^AM-[0-9]{4}-[A-Z0-9]{5}$'),
  CONSTRAINT alumnus_student_no_format CHECK (student_no ~ '^[0-9]{2}-[0-9]{2}-[0-9]{3}$'),
  CONSTRAINT alumnus_mobile_format CHECK (mobile_no ~ '^639[0-9]{9}$'),
  -- Either a catalog program, or a typed program plus the college the registrant declared.
  CONSTRAINT alumnus_has_program CHECK (program_id IS NOT NULL OR (course_other IS NOT NULL AND declared_college_id IS NOT NULL)),
  CONSTRAINT alumnus_unmapped_only CHECK (program_id IS NULL OR (course_other IS NULL AND declared_college_id IS NULL)),
  CONSTRAINT alumnus_not_self_merged CHECK (merged_into_id IS NULL OR merged_into_id <> alumni_id)
);
CREATE INDEX alumnus_program_idx ON alumnus (program_id);
CREATE INDEX alumnus_batch_idx ON alumnus (year_graduated);
CREATE INDEX alumnus_name_idx ON alumnus (lower(last_name), lower(first_name));

CREATE TABLE social_link (
  link_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id   bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  platform    social_platform NOT NULL,
  url         varchar(255) NOT NULL,
  is_visible  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alumni_id, platform)
);

CREATE TABLE credential (
  credential_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id      bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  type           credential_type NOT NULL,
  name           varchar(160) NOT NULL,
  year           smallint,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credential_alumni_idx ON credential (alumni_id);

CREATE TABLE skill (
  skill_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(60) NOT NULL,
  category    varchar(40),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX skill_name_uk ON skill (lower(name));

CREATE TABLE alumni_skill (
  alumni_id   bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  skill_id    bigint NOT NULL REFERENCES skill ON DELETE CASCADE,
  is_top      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alumni_id, skill_id)
);

-- Tracer and verification --------------------------------------------------------------------------
CREATE TABLE survey_cycle (
  cycle_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(40) NOT NULL UNIQUE,
  status      cycle_status NOT NULL DEFAULT 'draft',
  opens_at    timestamptz NOT NULL,
  closes_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (closes_at IS NULL OR closes_at > opens_at)
);
CREATE UNIQUE INDEX survey_cycle_one_open ON survey_cycle ((true)) WHERE status = 'open';

CREATE TABLE survey_response (
  response_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id        bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  cycle_id         bigint NOT NULL REFERENCES survey_cycle,
  status           response_status NOT NULL DEFAULT 'draft',
  completion_pct   smallint NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  current_section  smallint NOT NULL DEFAULT 0,
  first_gen_grad   boolean,
  passed_udmcat    boolean,
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,  -- every answer keyed by field id
  submitted_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (alumni_id, cycle_id),
  CHECK (status = 'draft' OR submitted_at IS NOT NULL)
);

CREATE TABLE employment_record (
  employment_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id            bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  response_id          bigint REFERENCES survey_response ON DELETE SET NULL,
  employment_status    employment_status NOT NULL,
  job_title            varchar(120),
  employer_name        varchar(160),
  org_type             org_type,
  line_of_business     varchar(120),
  occupation_class     varchar(120),
  place_of_work        place_of_work,
  job_status           job_status,
  job_location         varchar(160),
  time_to_job_bucket   time_to_job,
  months_to_first_job  numeric(4,1),                  -- bucket midpoint
  course_relevance     course_relevance,
  is_current           boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX employment_one_current ON employment_record (alumni_id) WHERE is_current;

CREATE TABLE proof_document (
  document_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id     bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  storage_key   varchar(255),                         -- private prefix; null until uploaded
  mime          varchar(60),
  size_bytes    integer CHECK (size_bytes IS NULL OR size_bytes > 0),
  requested_by  bigint REFERENCES user_account ON DELETE SET NULL,
  requested_at  timestamptz,
  uploaded_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (uploaded_at IS NULL OR storage_key IS NOT NULL)
);
CREATE INDEX proof_document_alumni_idx ON proof_document (alumni_id);

CREATE TABLE record_review (
  review_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id    bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  reviewer_id  bigint REFERENCES user_account ON DELETE SET NULL,
  action       review_action NOT NULL,
  note         text,
  diff         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX record_review_alumni_idx ON record_review (alumni_id, created_at DESC);

CREATE TABLE outreach_contact (
  contact_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id     bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  contacted_by  bigint REFERENCES user_account ON DELETE SET NULL,
  method        outreach_method NOT NULL,
  message       text,
  note          text,
  outcome       outreach_outcome NOT NULL DEFAULT 'sent',
  contacted_at  timestamptz NOT NULL DEFAULT now(),
  removed_at    timestamptz,                          -- "Remove contacted mark"
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_alumni_idx ON outreach_contact (alumni_id, contacted_at DESC) WHERE removed_at IS NULL;

-- Jobs ---------------------------------------------------------------------------------------------
CREATE TABLE job_posting (
  job_id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  posted_by          bigint REFERENCES user_account ON DELETE SET NULL,
  reviewed_by        bigint REFERENCES user_account ON DELETE SET NULL,
  title              varchar(160) NOT NULL,
  company            varchar(160) NOT NULL,
  company_photo_url  varchar(255),
  location           varchar(120),
  employment_type    employment_type NOT NULL DEFAULT 'full_time',
  salary_range       varchar(60),
  salary_note        varchar(60),
  deadline           date,
  apply_via          varchar(255),                    -- email or careers URL
  messenger          varchar(255),                    -- page handle or link
  submitter_email    varchar(120),
  description        text,
  badge              varchar(60),
  note               varchar(160),
  source             posting_source NOT NULL,
  approval_status    approval_status NOT NULL DEFAULT 'pending',
  reject_reason      text,
  is_active          boolean NOT NULL DEFAULT true,
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);
CREATE INDEX job_posting_queue_idx ON job_posting (approval_status, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE job_skill (
  job_id      bigint NOT NULL REFERENCES job_posting ON DELETE CASCADE,
  skill_id    bigint NOT NULL REFERENCES skill ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE saved_job (
  alumni_id    bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  job_id       bigint NOT NULL REFERENCES job_posting ON DELETE CASCADE,
  saved_at     timestamptz,
  applied_at   timestamptz,
  applied_via  apply_channel,                         -- the portal only records how the alumnus applied
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alumni_id, job_id),
  CHECK (applied_at IS NULL OR applied_via IS NOT NULL)
);

-- Events -------------------------------------------------------------------------------------------
CREATE TABLE event (
  event_id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_by       bigint REFERENCES user_account ON DELETE SET NULL,
  title            varchar(160) NOT NULL,
  category         event_category NOT NULL DEFAULT 'event',
  organizer        varchar(120),
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz,
  venue            varchar(160),
  fee_text         varchar(120),
  capacity         integer CHECK (capacity IS NULL OR capacity > 0),
  cover_photo_url  varchar(255),
  highlights       jsonb NOT NULL DEFAULT '[]'::jsonb,
  teaser           varchar(255),
  body             text,
  reg_status       reg_status NOT NULL DEFAULT 'open',
  published_at     timestamptz,
  cancelled_at     timestamptz,
  ended_at         timestamptz,                       -- manually moved to past events
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE event_agenda_item (
  item_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id    bigint NOT NULL REFERENCES event ON DELETE CASCADE,
  starts_at   time,
  title       varchar(160) NOT NULL,
  sort        smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_reg_field (
  field_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id    bigint NOT NULL REFERENCES event ON DELETE CASCADE,
  field_key   varchar(40) NOT NULL,                   -- key of the answer in event_registration.answers
  label       varchar(120) NOT NULL,
  hint        varchar(160),
  type        varchar(20) NOT NULL DEFAULT 'choice',
  required    boolean NOT NULL DEFAULT true,
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort        smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, field_key)
);

CREATE TABLE event_registration (
  registration_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id         bigint NOT NULL REFERENCES event ON DELETE CASCADE,
  alumni_id        bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  rsvp             rsvp NOT NULL DEFAULT 'going',
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- UDM-XXXX-NNNNN, stable per event and recipient (entryPassCode() in the client). Not unique: the code is a
  -- 5-digit hash, so two registrants of a large event can share one.
  entry_pass       varchar(20) NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(), -- the client's rsvpAt
  updated_at       timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz,
  UNIQUE (event_id, alumni_id),
  CHECK (entry_pass ~ '^UDM-[A-Z0-9]{4}-[0-9]{5}$')
);
CREATE INDEX event_registration_pass_idx ON event_registration (event_id, entry_pass);

CREATE TABLE announcement (
  announcement_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id         bigint UNIQUE REFERENCES event ON DELETE CASCADE,  -- zero or one per event
  author_id        bigint REFERENCES user_account ON DELETE SET NULL,
  kind             announcement_kind NOT NULL DEFAULT 'notice',
  source           varchar(120),
  title            varchar(160) NOT NULL,
  body             text,
  is_hidden        boolean NOT NULL DEFAULT false,
  published_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Reporting and audit ------------------------------------------------------------------------------
CREATE TABLE audit_log (
  log_id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    bigint REFERENCES user_account ON DELETE SET NULL,
  action      varchar(60) NOT NULL,
  entity      varchar(40) NOT NULL,
  entity_id   bigint,
  diff        jsonb,
  ip          varchar(64),
  request_id  varchar(64),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id, created_at DESC);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

CREATE TABLE report_export (
  export_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type          report_type NOT NULL,
  format        report_format NOT NULL,
  filters       jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by  bigint REFERENCES user_account ON DELETE SET NULL,
  status        report_status NOT NULL DEFAULT 'ready',
  record_count  integer,
  scope_label   varchar(200),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers on every table that has the column.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema
    WHERE c.table_schema = current_schema() AND c.column_name = 'updated_at' AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t || '_updated_at', t);
  END LOOP;
END $$;
