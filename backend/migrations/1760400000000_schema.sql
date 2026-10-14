-- Up Migration
-- UDM Alumni Tracer schema: the 26 ERD entities (docs/UDM Alumni ERD.dc.html) + APP_SETTING and AUTH_SESSION,
-- with the "ERD gaps to fix first" from docs/plan-backend.md applied.
-- Type mapping: INT PK -> bigint identity, ENUM -> Postgres enum, JSON -> jsonb, TINYINT/YEAR -> smallint, TIMESTAMP -> timestamptz.

-- Enums --------------------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('alumni', 'dept', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'disabled');
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
CREATE TYPE how_found AS ENUM ('referral', 'job_fair', 'online', 'walk_in', 'other');
CREATE TYPE course_relevance AS ENUM ('related', 'not_related');
CREATE TYPE review_action AS ENUM ('create', 'edit', 'verify', 'flag', 'unflag', 'archive', 'restore', 'merge', 'map_program');
CREATE TYPE outreach_method AS ENUM ('email', 'phone', 'facebook', 'messenger', 'linkedin');
CREATE TYPE outreach_outcome AS ENUM ('sent', 'reached', 'no_response', 'bounced');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'freelance');
CREATE TYPE posting_source AS ENUM ('admin', 'alumni');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE event_category AS ENUM ('event', 'career', 'community');
CREATE TYPE reg_status AS ENUM ('open', 'closed', 'full');
CREATE TYPE rsvp AS ENUM ('going', 'maybe');
CREATE TYPE announcement_kind AS ENUM ('notice', 'reminder', 'update');
CREATE TYPE report_type AS ENUM ('ched', 'employability', 'coverage', 'employer', 'inclusion');
CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv');
CREATE TYPE report_status AS ENUM ('ready', 'submitted', 'archived');

-- "Today" is Manila time (sync rule 6).
CREATE FUNCTION app_today() RETURNS date LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'Asia/Manila')::date $$;

-- Academic -----------------------------------------------------------------------------------------
CREATE TABLE college (
  college_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code           varchar(10) NOT NULL UNIQUE,
  name           varchar(120) NOT NULL UNIQUE,
  is_historical  boolean NOT NULL DEFAULT false,
  sort_order     smallint NOT NULL DEFAULT 0
);

CREATE TABLE program (
  program_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  college_id    bigint NOT NULL REFERENCES college,
  code          varchar(20) NOT NULL UNIQUE,          -- unique across colleges, e.g. CCS-BSIT
  abbr          varchar(20) NOT NULL,                 -- display code, e.g. BSIT (may repeat across colleges)
  name          varchar(160) NOT NULL,
  degree_level  degree_level NOT NULL DEFAULT 'bachelor',
  is_active     boolean NOT NULL DEFAULT true,
  UNIQUE (college_id, name)
);

-- Identity & access ------------------------------------------------------------------------------
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
  session_hash  text NOT NULL UNIQUE,                 -- SHA-256 of the cookie value
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
  code_hash   text NOT NULL,
  token_hash  text NOT NULL UNIQUE,
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
  link_url         varchar(255),                      -- screen id resolved by screenPath(role, id)
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
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Alumni profile ---------------------------------------------------------------------------------
CREATE SEQUENCE membership_seq START 10000;

CREATE TABLE alumnus (
  alumni_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id              bigint UNIQUE REFERENCES user_account ON DELETE SET NULL,
  membership_id        varchar(20) UNIQUE,            -- AM-YYYY-NNNNN
  student_no           varchar(20) UNIQUE,            -- YYYY-NNNNN-UDM
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
  mobile_no            varchar(15),                   -- normalized 639XXXXXXXXX
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
  marketing_opt_in     boolean NOT NULL DEFAULT false,
  directory_opt_in     boolean NOT NULL DEFAULT false,
  show_email           boolean NOT NULL DEFAULT false,
  show_mobile          boolean NOT NULL DEFAULT false,
  profile_saved_at     timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alumnus_has_college CHECK (program_id IS NOT NULL OR declared_college_id IS NOT NULL),
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
  UNIQUE (alumni_id, platform)
);

CREATE TABLE credential (
  credential_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id      bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  type           credential_type NOT NULL,
  title          varchar(160) NOT NULL,
  issuer         varchar(120),
  date_taken     date,
  rating         varchar(20)
);
CREATE INDEX credential_alumni_idx ON credential (alumni_id);

CREATE TABLE skill (
  skill_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      varchar(60) NOT NULL,
  category  varchar(40)
);
CREATE UNIQUE INDEX skill_name_uk ON skill (lower(name));

CREATE TABLE alumni_skill (
  alumni_id  bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  skill_id   bigint NOT NULL REFERENCES skill ON DELETE CASCADE,
  is_top     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (alumni_id, skill_id)
);

-- Tracer & verification --------------------------------------------------------------------------
CREATE TABLE survey_cycle (
  cycle_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  label      varchar(40) NOT NULL UNIQUE,
  opens_on   date NOT NULL,
  closes_on  date,
  status     cycle_status NOT NULL DEFAULT 'draft'
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
  reason_udm       jsonb,
  reason_program   jsonb,
  feedback         text,
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb, -- keyed by surveySectionDefs() field id
  saved_at         timestamptz NOT NULL DEFAULT now(),
  submitted_at     timestamptz,
  UNIQUE (alumni_id, cycle_id)
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
  is_self_employed     boolean NOT NULL DEFAULT false,
  time_to_job_bucket   time_to_job,
  months_to_first_job  numeric(4,1),                  -- bucket midpoint (open question: averages vs buckets)
  how_found            how_found,
  course_relevance     course_relevance,
  is_current           boolean NOT NULL DEFAULT true,
  reported_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX employment_one_current ON employment_record (alumni_id) WHERE is_current;

CREATE TABLE proof_document (
  document_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employment_id  bigint NOT NULL REFERENCES employment_record ON DELETE CASCADE,
  file_name      varchar(160) NOT NULL,
  file_url       varchar(255) NOT NULL,               -- storage key in the private prefix
  mime_type      varchar(60) NOT NULL,
  file_size      integer NOT NULL,
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE record_review (
  review_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id    bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  reviewer_id  bigint REFERENCES user_account ON DELETE SET NULL,
  action       review_action NOT NULL,
  from_status  varchar(20),
  to_status    varchar(20),
  changes      jsonb,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX record_review_alumni_idx ON record_review (alumni_id, created_at DESC);

CREATE TABLE outreach_contact (
  contact_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alumni_id     bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  contacted_by  bigint REFERENCES user_account ON DELETE SET NULL,
  method        outreach_method NOT NULL,
  template      varchar(40),
  note          text,
  outcome       outreach_outcome NOT NULL DEFAULT 'sent',
  contacted_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_alumni_idx ON outreach_contact (alumni_id, contacted_at DESC);

-- Jobs ------------------------------------------------------------------------------------------
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
  how_to_apply       text,
  description        text,
  badge              varchar(60),
  note               varchar(160),
  source             posting_source NOT NULL,
  approval_status    approval_status NOT NULL DEFAULT 'pending',
  is_active          boolean NOT NULL DEFAULT true,
  reject_reason      text,
  published_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

CREATE TABLE job_skill (
  job_id    bigint NOT NULL REFERENCES job_posting ON DELETE CASCADE,
  skill_id  bigint NOT NULL REFERENCES skill ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE saved_job (
  alumni_id   bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  job_id      bigint NOT NULL REFERENCES job_posting ON DELETE CASCADE,
  saved_at    timestamptz,
  applied_at  timestamptz,
  PRIMARY KEY (alumni_id, job_id)
);

-- Events & announcements -------------------------------------------------------------------------
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
  start_time  time,
  label       varchar(160) NOT NULL,
  sort_order  smallint NOT NULL DEFAULT 0
);

CREATE TABLE event_reg_field (
  field_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id    bigint NOT NULL REFERENCES event ON DELETE CASCADE,
  field_key   varchar(40) NOT NULL,
  label       varchar(120) NOT NULL,
  hint        varchar(160),
  options     jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order  smallint NOT NULL DEFAULT 0,
  UNIQUE (event_id, field_key)
);

CREATE TABLE event_registration (
  registration_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id         bigint NOT NULL REFERENCES event ON DELETE CASCADE,
  alumni_id        bigint NOT NULL REFERENCES alumnus ON DELETE CASCADE,
  rsvp             rsvp NOT NULL DEFAULT 'going',
  answers          jsonb NOT NULL DEFAULT '{}'::jsonb,
  registered_at    timestamptz NOT NULL DEFAULT now(),
  cancelled_at     timestamptz,
  UNIQUE (event_id, alumni_id)
);

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
  updated_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz
);

-- Reporting & audit ------------------------------------------------------------------------------
CREATE TABLE audit_log (
  log_id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id          bigint REFERENCES user_account ON DELETE SET NULL,
  entity_type       varchar(40) NOT NULL,
  entity_id         bigint,
  action            varchar(60) NOT NULL,
  details           jsonb,
  ip                varchar(64),
  created_at        timestamptz NOT NULL DEFAULT now(),
  reversible_until  timestamptz
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

CREATE TABLE report_export (
  export_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  generated_by  bigint REFERENCES user_account ON DELETE SET NULL,
  report_type   report_type NOT NULL,
  filters       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections      jsonb NOT NULL DEFAULT '[]'::jsonb,
  format        report_format NOT NULL,
  file_size     integer,
  record_count  integer,
  scope_label   varchar(200),
  status        report_status NOT NULL DEFAULT 'ready',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE IF EXISTS report_export, audit_log, announcement, event_registration, event_reg_field, event_agenda_item, event,
  saved_job, job_skill, job_posting, outreach_contact, record_review, proof_document, employment_record, survey_response,
  survey_cycle, alumni_skill, skill, credential, social_link, alumnus, app_setting, notification, password_reset,
  auth_session, user_account, program, college CASCADE;
DROP SEQUENCE IF EXISTS membership_seq;
DROP FUNCTION IF EXISTS app_today();
DROP TYPE IF EXISTS user_role, account_status, degree_level, sex, civil_status, pwd_type, verification_status, record_source,
  social_platform, credential_type, cycle_status, response_status, employment_status, job_status, org_type, place_of_work,
  time_to_job, how_found, course_relevance, review_action, outreach_method, outreach_outcome, employment_type, posting_source,
  approval_status, event_category, reg_status, rsvp, announcement_kind, report_type, report_format, report_status;
