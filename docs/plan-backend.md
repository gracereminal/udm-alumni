# plan-backend.md

Backend and deployment plan for the UDM Alumni Tracer. Replanned on 2026-10-18; updated on 2026-10-26 to match the code in `backend/` and the production setup (one Docker image on Render with Neon PostgreSQL). There is no staging environment: code is checked locally, then deployed to production.

**Production is a demo.** The deployed system runs the production build and configuration, but it holds **dummy data only** (`backend/dummy_data.sql`, see "Seed"). No real alumni, registrar masterlists or personal information are loaded into it, and alumni are not invited to use it. Everything in this plan about real users (DPO sign-off, university-owned accounts, imports of real masterlists) applies only if the system is ever taken live, which is not planned for this deployment.

The data model is defined in this file ("Data model"); there is no separate ERD document. The step-by-step production runbook is [deploy-notes.md](deploy-notes.md).

## Context
The UDM Alumni Tracer is a React/Vite SPA in `client/` running on a **Laravel REST API** in `backend/`. The API was built in phases 1–5 (`20e171b`) and the client was moved onto it in phase 6 (`3adec99`). In production, one Docker image serves both: Laravel answers `/api/v1/*` and returns the built client for every other path (see "Deployment"). The API is built so that:
1. Every screen's numbers come from the same tables. No stat is typed, stored or computed in the UI.
2. Contacts are fields on the same alumni record that Records, Directory, Profile and the Survey all use.
3. The client calls one REST contract (see "API"), including the features first built in the prototype: pending approval for self-registered alumni, the Admin Alumni Tracer question manager, Messenger/email contact hand-off for Outreach and job applications, a real reset code and password change, and shared email templates in `/emails` with an event-registration confirmation.
4. The same image and configuration that a live service would use run the demo deployment, so the demo shows the real system, only with dummy data (see "Deployment").

The backend is written in **PHP (Laravel)**. This plan is the spec.

## Current state (2026-10-26)
- **Backend:** Laravel API in `backend/` (PHP 8.4 in the image; Laravel Herd's PHP 8.5 on the Windows dev machine), PostgreSQL 16. `composer test` 170 tests (Pest), `composer lint` (Pint + Larastan) clean.
- **Client:** React 18 + Vite 5 + React Router 6 in `client/`. `client/src/lib/api.js` calls the same-origin `/api/v1` (override with `VITE_API_URL`) with the session cookie. `client/vite.config.js` proxies `/api` to `http://localhost:4000` (override with `VITE_API_PROXY`) and sets `server.fs.allow: ['..']` so the client can import the `/emails` templates. Client tests (Vitest, 160 tests) run against the `fetch` mock in `src/test/mockApi.js`. Only the unsent registration draft, the privacy consent and UI preferences stay in the browser.
- **Production (demo mode):** the root `Dockerfile` builds one image (client + API) that Render deploys from `main`, with Neon PostgreSQL, both in Singapore. (It moved from Railway after Railway's October 2026 environment-variable breach; every secret was reissued.) Commits `04073b4` (Docker deploy), `c6cca8d` (no config check during the build), `a159d3c` (Neon pooler fix, built-in admin on start), `b8e50e5` (stricter production config check) and `de3e4e4` (argon2id with rehash at sign-in). The database holds the dummy data from `backend/dummy_data.sql` (`52decf8`) and nothing real. The demo checklist below is still open.
- **Git:** branch `main`, pushed to `github.com/gracereminal/udm-alumni` (a personal account; fine for a demo, moved to the university only if the system goes live).
- **Old Vercel site:** `udm-alumni-demo.vercel.app` is still the frontend-only prototype (data in each visitor's `localStorage`). The root `vercel.json` and `client/vercel.json` only build that site; production does not use Vercel. Take it down or redirect it to the Render demo.
- **Local development:** `php artisan serve --port=4000` in `backend/` plus `npm run dev` at the root, against a local Postgres 16 on port `5433` (or a Neon dev branch). Details are in `backend/README.md`.

### Rules the server must repeat (from the client)
- **Registration** is Privacy Consent → Personal Information → Contact & Social Media → Educational Background → Account Password → Success. `POST /auth/register` receives every field of these steps at once. The password is sent once and only its hash is stored.
- **Validation** (`client/src/lib/validation.js`, repeated on the server in Form Requests and `app/Support/RegistrationRules.php`):
  - `last_name` and `first_name` required.
  - `dob` required and not in the future.
  - `present_address` and `permanent_address` required.
  - `gender`, `marital_status`, `indigenous` and `pwd` required. `married_name` is required when married, `indigenous_group` when indigenous, `pwd_type` when PWD.
  - `mobile` required, as `09XXXXXXXXX` or `639XXXXXXXXX` (normalized to `639…` before storing, `app/Support/Mobile.php`). `email` required and valid.
  - `college` required. `course` **or** `course_other` required.
  - `year_graduated` is a 4-digit year from 1999 to the current year.
  - The password has 8+ characters, a number and an uppercase letter (`AccountService::passwordOk()`).
  - Social handles (`facebook`, `twitter`, `instagram`, `linkedin`) accept a username or a URL with no spaces. The `facebook` value is what Outreach turns into a Messenger link (`messengerUrl()` in `lib/contact.js`, `app/Support/Contact.php` on the server; accepts a username, @handle, facebook.com / fb.com / m.me link or `profile.php?id=`).
  - Hidden or optional tracer questions lose their blank-field error, and questions the Admin made required gain one (`applyRules` in `lib/validation.js`, driven by `tracer_question`).
  - Job postings: "How to apply" (`apply_via`) is an email or a web address, and "Facebook / Messenger" (`messenger`) uses the same handle rules.
- **Survey** lives inside Edit Profile (`/alumni/profile/edit`; `/alumni/survey` redirects there). `completion_pct` uses the client's rule (`lib/profileProgress.js`, `app/Support/ProfileProgress.php`): answered ÷ **Required** visible questions, where program and "Others" count as one question. Answers use the field ids in `surveySectionDefs()`:
  - Education: `first_grad`, `udmcat`, `honors`, `prof_exams`.
  - Employment: `ever_employed`, plus `unemployed_reason` (multi) when the answer is No.
  - Job details: `job_name`, `job_address`, `employer`, `job_status` (Regular or Permanent / Temporary / Casual / Contractual / Self-employed), `org_type` (Private / Government / Non-profit / Self-owned business), `business_line`, `occ_class`, `place_of_work` (Local / Abroad), `time_to_job` (a range bucket), `job_related`, `still_working`, `stay_reasons`.
  - Self-employment: `se_years`, `se_nature`, `se_reason`, `se_related`, `se_other_job`.
  - Feedback: `fb_contribute`, `fb_activity`.
- **Reports** have five types: Form A (`ched`), Employability by Program (`employability`), Batch Coverage Audit (`coverage`), Employer & Industry Distribution (`employer`), Inclusion Profile, IP & PWD (`inclusion`).
- **Identifiers:** `membership_id` (`AM-YYYY-NNNNN`) and `student_no` (the Alumni ID the client shows and signs in with, `YY-NN-NNN` where `YY` is the last two digits of the class (graduation) year, so Class of 2024 starts with `24`, e.g. `24-17-057`; validated as `^\d{2}-\d{2}-\d{3}$`) are two different unique identifiers. Sign-in by "Alumni ID" looks up both. Staff accounts have no alumni record and sign in by email only.
- **Demo accounts** (password `demoPass123`, **local only**, from `DemoSeeder`): alumni `maria.delacruz@udmalumni.edu` (Alumni ID `24-05-567`, membership `AM-2024-00567`), college `ccs.dean@udmalumni.edu` (College of Computing Studies), admin `admin@udmalumni.edu`, and a pending self-registration `paolo.mendoza@gmail.com` (`AM-2026-N0001`, account `pending`). The Demo Access panel and the Sample Email inbox show only in dev or with `VITE_DEMO=true` (`client/src/data/demoAccounts.js`); the production image is built without it.
- **Dummy accounts in production** (from `backend/dummy_data.sql`, all `@example.com`): 4,000 alumni across all 10 colleges, each with an account, `firstname.lastname.N@example.com`, admin `admin@example.com`, and one college account per college, `<code>.dean@example.com` (`cas`, `cba`, `cbpm`, `ccs`, `ccj`, `coed`, `cet`, `chs`, `claw`, `gs`). The committed file has empty password hashes, so none can sign in. `backend/dummy_data_pass.sql`, run after it, sets the shared test passwords (one `UPDATE` per role); it stays local and git-ignored. Only `dummy_data.sql` and `wipe_data.sql` are committed.

## Stack
- **API:** PHP 8.4 + Laravel (current major) in `backend/`, API-only (no Blade views, no starter kit), REST + JSON under `routes/api.php` with the `api/v1` prefix. Validation with Form Requests and service-level rules. Logging with Monolog (Laravel's default), to `stderr` in production. Dependencies through Composer.
- **DB:** PostgreSQL 16 through PDO (`pdo_pgsql`). The schema is two plain SQL files, `database/sql/001_schema.sql` (enums, 29 tables, `set_updated_at()`, `app_today()`) and `002_views.sql` (the `v_*` views), each run with `DB::unprepared()` from one migration (`2026_10_19_000001_create_schema.php`, `2026_10_19_000002_create_views.php`), so the schema SQL stays readable. Stat and report queries are raw SQL (`DB::select`) in `app/Services/StatsService.php` and `ReportsService.php`; plain CRUD uses the query builder (only `Alumnus` and `UserAccount` have Eloquent models). IDs are `bigint generated always as identity`, enumerations are Postgres enums, free-form answers are `jsonb`, timestamps are `timestamptz` stored in UTC.
- **Two DB connections:** `pgsql` (the app, `DB_URL`) and `pgsql_direct` (migrations, `DB_URL_DIRECT`, falls back to `DB_URL` locally). `pgsql` sets `PDO::ATTR_EMULATE_PREPARES`, because Neon's PgBouncer pooler breaks PDO's server-side prepared statements (`SQLSTATE[25P02]`).
- **Local DB:** PostgreSQL 16 on port `5433`, or a personal Neon dev branch. Tests use a separate `udm_alumni_test` database, reset with `RefreshDatabase`.
- **Auth:** self-hosted in the API (see "Authentication and authorization"). No Sanctum, Breeze or Fortify.
- **Files:** Laravel `UploadedFile` with `file|mimes|max` validation. `app/Services/StorageService.php` uses the filesystem disk set by `FILESYSTEM_DISK=local|s3` (`league/flysystem-aws-s3-v3`).
- **Email:** Laravel Mail with `MAIL_MAILER=log|gmail|smtp`. `gmail` is a custom transport that calls the Gmail REST API with Laravel's HTTP client (see "Email"). Every email's markup, subject and sender come from the shared `/emails` templates (built for Gmail: inline styles and tables only), never from Blade views.
- **Tests:** Pest (on PHPUnit) feature and unit tests against a seeded test database. Lint and static analysis: Laravel Pint + Larastan (`composer lint`).
- **Hosting:** one Docker image (root `Dockerfile`) on Render serves the API and the built client from the same origin; Neon hosts PostgreSQL. Both in Singapore. Runs in demo mode with dummy data. See "Deployment".

## Data model
Table names are singular, snake_case. Every table has `created_at`; mutable tables also have `updated_at` (kept by the `set_updated_at()` trigger). The source of truth is `database/sql/001_schema.sql`.

### Identity and access
| Table | Purpose | Key columns and constraints |
|---|---|---|
| `user_account` | Sign-in for all roles | `email` unique (case-insensitive), `password_hash`, `role` (`alumni`/`dept`/`admin`), `college_id` FK (required when `role = 'dept'`), `display_name`, `account_status` (`pending`/`active`/`disabled`; self-registered alumni start `pending` and cannot sign in until an admin approves them), `must_change_password`, `failed_login_count`, `locked_until`, `last_login_at` |
| `auth_session` | Server-side sessions | `user_id` FK, `session_hash` unique (SHA-256 of the cookie value), `user_agent`, `ip`, `last_seen_at`, `expires_at`, `revoked_at` |
| `password_reset` | Reset links and codes | `user_id` FK, `token_hash` unique, `code_hash`, `sent_to`, `attempts`, `expires_at`, `used_at` |
| `notification` | Per-user bell items | `user_id` FK, `type`, `title`, `message`, `link_url` (a client screen id), `dedupe_key` (unique with `user_id`), `read_at` |
| `app_setting` | Tunables | `key` PK, `value jsonb`, `updated_by`: coverage target (60), employment target (80), outreach interval (7 days) |
| `tracer_question` | Admin edits to registration and survey questions (Alumni Tracer page) | `field_id` unique (the client's field id), `section`, `form` (`register`/`profile`/`both`), `label`, `placeholder`, `type`, `options jsonb`, `required`, `shown`, `sort`, `is_custom`, `updated_by`. Only edits and added questions are stored; defaults stay in the client's `data/formDefs.js`. Core fields (names, email, college, program, year, password) cannot be hidden or made optional |

### Academic
| Table | Purpose | Key columns |
|---|---|---|
| `college` | Colleges | `code` unique (e.g. `CCS`), `name` |
| `program` | Degree programs | `college_id` FK, `code` unique, `name`, `degree_level` |

The college of an alumnus always comes from `program.college_id`. There is no `college_id` on `alumnus`, except `declared_college_id` for registrants with an unmapped program. The catalog (11 colleges and their programs) is `database/seeders/data/catalog.php`.

### Alumni profile
| Table | Purpose | Key columns and constraints |
|---|---|---|
| `alumnus` | One row per person | `user_id` FK unique (nullable: imported records have no login), `membership_id` unique, `student_no` unique, `program_id` FK, `course_other` + `declared_college_id` (only while `program_id` is null; check: one of the two is set), `year_graduated`, name fields (`last_name`, `first_name`, `middle_name`, `suffix`, `married_name`), `birth_date`, `sex`, `civil_status`, `present_address`, `permanent_address`, `mobile_no`, `contact_email` (for records without a login), `is_indigenous`, `indigenous_group`, `pwd_type` (null = not PWD), `photo_url`, `industry`, `bio`, `verification_status` (`pending`/`verified`/`flagged`), `record_source`, `flag_note`, `merged_into_id` FK self, `archived_at`, `privacy_consent_at`, `directory_opt_in`, `show_email`, `show_mobile` |
| `social_link` | Contact channels | `alumni_id` FK, `platform` (`facebook`, `messenger`, `twitter`, `instagram`, `linkedin`, `website`), `url`, `is_visible`; unique `(alumni_id, platform)` |
| `credential` | Honors, exams, certifications | `alumni_id` FK, `type` (`honor`/`exam`/`certification`), `name`, `year` |
| `skill`, `alumni_skill` | Skills and job matching | `skill.name` unique; `alumni_skill(alumni_id, skill_id)` PK |

### Tracer and verification
| Table | Purpose | Key columns and constraints |
|---|---|---|
| `survey_cycle` | Tracer survey rounds | `name`, `status` (`draft`/`open`/`closed`), `opens_at`, `closes_at`; partial unique index: one `open` cycle |
| `survey_response` | One per alumnus per cycle | `alumni_id`, `cycle_id`, `status` (`draft`/`submitted`), `completion_pct` (0–100), `current_section`, `first_gen_grad`, `passed_udmcat`, `answers jsonb` (every answer keyed by field id; the source for re-rendering the form), `submitted_at`; unique `(alumni_id, cycle_id)` |
| `employment_record` | Employment derived from the survey or staff edits | `alumni_id`, `response_id`, `employment_status` (`employed`/`self_employed`/`further_studies`/`not_employed`), `job_title`, `employer_name`, `org_type`, `line_of_business`, `occupation_class`, `place_of_work`, `job_status`, `job_location`, `time_to_job_bucket`, `months_to_first_job` (bucket midpoint), `course_relevance` (`related`/`not_related`), `is_current`; partial unique index on `alumni_id WHERE is_current` |
| `proof_document` | Uploaded employment proof | `alumni_id`, `storage_key` (private prefix), `mime`, `size_bytes`, `requested_by`, `requested_at`, `uploaded_at` |
| `record_review` | History of staff actions on a record | `alumni_id`, `reviewer_id`, `action` (`create`, `edit`, `verify`, `flag`, `unflag`, `archive`, `restore`, `merge`, `map_program`), `note`, `diff jsonb` |
| `outreach_contact` | Each staff contact attempt | `alumni_id`, `contacted_by`, `method` (`email`, `phone`, `facebook`, `messenger`, `linkedin`), `message`, `note`, `outcome` (`sent`, `reached`, `no_response`, `bounced`), `contacted_at`, `removed_at` (the "Remove contacted mark" action) |

### Jobs
| Table | Purpose | Key columns |
|---|---|---|
| `job_posting` | Admin and alumni postings | `posted_by`, `reviewed_by`, `title`, `company`, `company_photo_url`, `location`, `employment_type`, `salary_range`, `deadline`, `apply_via` (email or careers URL), `messenger` (page handle or link), `submitter_email`, `description`, `source` (`admin`/`alumni`), `approval_status` (`pending`/`approved`/`rejected`), `reject_reason`, `is_active`, `published_at`, `deleted_at` |
| `job_skill` | Skills a job asks for | `(job_id, skill_id)` PK |
| `saved_job` | Saves and applications | `(alumni_id, job_id)` PK, `saved_at`, `applied_at`, `applied_via` (`messenger`/`email`/`website`; the alumnus applies through their own app, the portal only records it) |

### Events
| Table | Purpose | Key columns and constraints |
|---|---|---|
| `event` | Events | `title`, `category`, `organizer`, `starts_at`, `ends_at` (> `starts_at`), `venue`, `fee_text`, `capacity` (> 0 or null), `cover_photo_url`, `highlights jsonb`, `teaser`, `body`, `reg_status` (`open`/`closed`/`full`), `published_at`, `cancelled_at`, `ended_at`, `deleted_at` |
| `event_agenda_item` | Agenda lines | `event_id`, `starts_at`, `title`, `sort` |
| `event_reg_field` | Extra RSVP questions | `event_id`, `label`, `type`, `required`, `options jsonb`, `sort` |
| `event_registration` | RSVPs | `event_id`, `alumni_id`, `rsvp` (`going`/`maybe`), `answers jsonb`, `entry_pass` (`UDM-XXXX-NNNNN`, stable per event and recipient; `app/Support/EntryPass.php` matches `entryPassCode()` in `lib/emailTemplates.js`), `created_at` (dates the confirmation email), `cancelled_at`; unique `(event_id, alumni_id)`; count ≤ `event.capacity`, enforced in the RSVP transaction with `SELECT … FOR UPDATE` on the event |
| `announcement` | Event notices | `event_id` (nullable), `kind` (`notice`/`reminder`/`update`), `title`, `body`, `published_at` |

### Reporting and audit
| Table | Purpose | Key columns |
|---|---|---|
| `audit_log` | Every change, failed login and sensitive read | `actor_id`, `action`, `entity`, `entity_id`, `diff jsonb`, `ip`, `request_id` |
| `report_export` | Report history | `type`, `format` (`pdf`/`excel`/`csv`), `filters jsonb`, `generated_by`, `status` |

### Views
- `v_active_cycle`: the single open `survey_cycle`.
- `v_alumni_current`: the population (`archived_at IS NULL AND merged_into_id IS NULL`), each row joined to its college (`coalesce(program.college_id, declared_college_id)`), its submitted response for the active cycle and its current employment.
- `v_stats_grain`: college × program × batch × counts. Every aggregate sums this view, so screens agree by construction.
- `v_records_counters`, `v_unresponsive`, `v_directory`, `v_alumni_dashboard`, `v_event_stats`, `v_job_stats`.

## Form → column mapping
| Form / survey field | Column |
|---|---|
| `email` | `user_account.email` |
| `last_name`, `first_name`, `middle_name`, `suffix`, `married_name` | `alumnus` columns of the same name |
| `dob`, `gender`, `marital_status` | `alumnus.birth_date`, `sex`, `civil_status` |
| `indigenous` (+ `indigenous_group`) | `alumnus.is_indigenous` (+ `indigenous_group`) |
| `pwd` (+ `pwd_type`) | `alumnus.pwd_type` (null = not PWD) |
| `present_address`, `permanent_address` | `alumnus.present_address`, `permanent_address` |
| `mobile` | `alumnus.mobile_no` (normalized `639XXXXXXXXX`) |
| `facebook`, `twitter`, `instagram`, `linkedin` | `social_link(platform, url)` |
| `college`, `course` / `course_other`, `year_graduated` | `alumnus.program_id` (or `course_other` + `declared_college_id`), `year_graduated` |
| `first_grad`, `udmcat` | `survey_response.first_gen_grad`, `passed_udmcat` |
| `honors`, `prof_exams` | `credential` rows (`type` = honor / exam) |
| `job_name`, `employer`, `org_type`, `business_line`, `occ_class`, `place_of_work` | `employment_record.job_title`, `employer_name`, `org_type`, `line_of_business`, `occupation_class`, `place_of_work` |
| `job_status`, `job_address`, `time_to_job` | `employment_record.job_status`, `job_location`, `time_to_job_bucket` (+ derived `months_to_first_job`) |
| `job_related` / `se_related` | `employment_record.course_relevance` |
| everything else (`unemployed_reason`, `stay_reasons`, `se_*`, `fb_*`, `still_working`) | `survey_response.answers` only |

All answers are stored in `answers`; the typed columns used by stats are filled from it on submit, in the same transaction (`app/Support/SurveyMapping.php`, `SurveyService`).

## Sync rules
1. **One `alumnus` row per person.** Records, directory, contact modal, profile and survey are views of it. Duplicates are resolved with `merged_into_id`.
2. **Stats are SQL views** served by one `app/Services/StatsService.php`. The UI never counts.
3. **One definition per metric** (see "Metric definitions").
4. **Lookups are tables.** `college` and `program` are the only source of college/program names and codes, served by `GET /lookups`. Employment status and record status are single enums.
5. **Authorization in one place:** `Scope::for($user)` (`app/Support/Scope.php`) builds the row filter for every list and stat query. The client never sends a scope.
6. **"Today" is server `now()`**, with `Asia/Manila` for display and date cut-offs (`app_today()` in SQL). The database stores UTC.
7. **Every change to `alumnus` runs in a transaction** (`DB::transaction()`) that also writes `record_review` and `audit_log`.

## Authentication and authorization
- **Credentials:** email or Alumni ID + password, hashed with `argon2id` (`HASH_DRIVER=argon2id`, the default in `config/hashing.php`; production refuses any other driver). Older hashes (e.g. bcrypt) are upgraded at the next successful sign-in (`Hash::needsRehash` in `AuthController`). A generic "invalid credentials" message, per-account lockout after repeated failures, and `throttle:auth` (per IP, `AUTH_RATE_LIMIT` per minute, default 10) on register, login, forgot-password and the reset steps.
- **Sessions:** opaque server-side sessions, not JWTs, and not Laravel's built-in session (`SESSION_DRIVER=array`; the API routes run without `StartSession`). Login creates an `auth_session` row and sets the `udm_sid` cookie holding a random 32-byte id (only its SHA-256 hash is stored): `HttpOnly; Secure; SameSite=Lax; Path=/`. The cookie is excluded from `EncryptCookies`. A custom `SessionGuard` (`app/Auth/SessionGuard.php`, registered with `Auth::extend('auth_session', …)`) resolves the user from it, so `$request->user()` works everywhere. 14-day lifetime with a 12-hour sliding idle timeout (`SESSION_TTL_DAYS`, `SESSION_IDLE_HOURS`). Logout, a password reset or disabling the account revokes the rows, so the effect is immediate. `GET /auth/session` returns the signed-in user or 401. The cookie is `Secure` everywhere except `APP_ENV=local/testing`, and production refuses to start without it.
- **Password change:** `POST /auth/change-password` (signed in). Accounts with `must_change_password` (the built-in admin, `app:create-user` accounts) are sent there at first sign-in.
- **CSRF:** JSON bodies only (plus multipart for uploads), and every state-changing route requires the `X-Requested-With` header the client sends (`RequireXhr` middleware on the api group). Laravel's `VerifyCsrfToken` is not used, because the client sends no XSRF token. `/internal/jobs/*` is exempt (it uses `X-Cron-Secret`).
- **Roles:** `alumni`, `dept` (college) and `admin`. A `role:admin,dept` middleware (`RequireRole`) guards each route.
- **Row scope:** dept → `college_id = user.college_id`; alumni → their own `alumni_id` (and opted-in directory rows); admin → no filter.
- **Optional hardening (not built):** Postgres row-level security on `alumnus` and `survey_response` using `SET LOCAL app.user_id / app.college_id` per request.
- **Packages:** Laravel's own hashing, rate limiting and validation, plus a small `SecurityHeaders` middleware (the `helmet` equivalent: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS in production). No auth package, because Alumni-ID sign-in, the reset flow and the scope rules are all custom.

## Contacts
- The login email is `user_account.email`. Records without a login use `alumnus.contact_email`; the login email wins when both exist. Phone and addresses are on `alumnus`. Other channels are `social_link` rows.
- The directory and contact modal read `v_directory`: only opted-in alumni, only visible `social_link` rows, and email/mobile only when `show_email`/`show_mobile` is on.
- Editing a contact in Profile updates the same rows Records shows, and writes an audit row.

## Notifications
A notification is a `notification` row created in the same transaction as the change that causes it (`NotificationService`).

| Action (who) | Notifies | Link |
|---|---|---|
| Alumnus registers (account `pending`) | admin; dept users of that college | Records |
| Admin approves a pending account | that alumnus (in-app only; an email needs an `/emails` template first, see Open questions) | Sign In |
| Staff verifies, flags or archives a record | that alumnus | Profile |
| Coverage or response rate crosses a target (on survey submit) | admin; dept users of that college | Reports |
| Alumnus posts a job | admin | Jobs queue |
| Admin approves or rejects the job | the poster | Jobs |
| Job approved and active | alumni whose program or skills match | Jobs |
| Event published, changed or cancelled | all alumni, or those registered | Events |
| Alumnus RSVPs, or an event hits a capacity milestone | admin | Events |
| Alumnus registers for an event | that alumnus (confirmation email with entry pass) | Events |
| Batch coverage below target (scheduled job) | dept users of that college | Outreach |

Rules:
1. Recipients are resolved on the server from `role` and `college_id`.
2. Numbers in the text are computed from the views at creation time. Milestones are created once per crossing, via `dedupe_key`.
3. Read state is `read_at`, so it follows the user across devices.
4. Delivery is polling `GET /notifications` every 30–60 s; `POST /notifications/:id/read` and `/read-all` mark read.
5. Broadcasts write one row per recipient. The `notification-retention` job deletes read notifications after 90 days.

## Outreach (College dashboard)
The portal sends nothing itself ("contact offline"). Staff reach the alumnus from their own Messenger or mail app, and the API records the attempt (client: `OfflineContactModal`, `lib/contact.js`).
- **List:** `GET /stats/unresponsive` (from `v_unresponsive`, scoped and filtered by program/batch): alumni seeking work, with no survey response, or newly registered. Each row has `last_contacted_at`, `last_contacted_via`, `last_contact_id` (for removing the mark) and the channels on file (`facebook` → Messenger link, email). A dept user sees only alumni of their own college.
- **Contact:** the client opens `m.me/<handle>` (the message is copied to paste) or `mailto:` with subject and body, then calls `POST /outreach {alumni_id, method, message}`. The endpoint checks scope and inserts `outreach_contact` + `audit_log`. The row shows "Today · Messenger".
- **Remove mark:** `DELETE /outreach/:id` sets `removed_at` (the attempt stays in the audit log).
- **Outcome:** `PATCH /outreach/:id` sets `reached`, `no_response` or `bounced`.
- **Limits:** `throttle:outreach` (30 per minute per staff account) on `POST /outreach`. The client warns (it doesn't block) when the alumnus was contacted within the `app_setting` interval (default 7 days).
- Server-sent outreach email is optional later work. See Open questions.

## Metric definitions (the accuracy contract)
The population is `v_alumni_current`. Every metric is an aggregate of it.

| Metric | Definition |
|---|---|
| Total alumni | `count(*)` of the population |
| Traced / responded | has a `submitted` response for the active cycle |
| Coverage % | traced ÷ total |
| Completeness % | average `completion_pct` of responses |
| Employed | current `employment_status` in (`employed`, `self_employed`) (see Open questions) |
| Employment rate | employed ÷ traced |
| Degree-aligned % | `course_relevance = 'related'` ÷ employed |
| Months to first job | distribution of `time_to_job_bucket` among the employed; averages use `months_to_first_job` |
| First-generation % | `first_gen_grad` ÷ traced |
| Distinct employers | `count(distinct lower(trim(employer_name)))` among the employed |
| Sector mix | grouped by `line_of_business`, `org_type`, `occupation_class` |
| Inclusion (IP / PWD) | `is_indigenous`, `pwd_type IS NOT NULL` among traced, with the employment rate per group; counts only, never names |
| Pending verification | `verification_status = 'pending'` |
| Targets (60 / 80) | `app_setting`, not code |

Alumni with an unmapped program count once in their declared college under "Unmapped program" until staff map them.

## Email
- **Now:** the Gmail API as `udm.alumni.mailer@gmail.com` via OAuth (Google Cloud project `udm-alumni-mail`, `gmail.send` scope only, refresh token in `GOOGLE_OAUTH_*`). `app/Mail/GmailTransport.php` is a Symfony Mailer transport registered with `Mail::extend('gmail', …)`: it takes the MIME message Laravel builds and posts it to `users.messages.send` with Laravel's HTTP client (an OAuth refresh-token exchange, or a service-account JWT signed with `openssl_sign`; no `google/apiclient` dependency). A new refresh token comes from `php artisan app:google-oauth-token`; `php artisan app:mail-test <address>` sends a test email.
- **Later:** `no-reply@udmalumni.edu` through a Workspace service account with domain-wide delegation (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_IMPERSONATE_USER`). The transport uses OAuth whenever `GOOGLE_OAUTH_REFRESH_TOKEN` is set, so switching means setting the two variables and removing the refresh token. Needs SPF, DKIM and DMARC on `udmalumni.edu`.
- **Fallback:** `MAIL_MAILER=smtp`.
- **Development:** `MAIL_MAILER=log` writes each email (link and code) to `storage/logs`. Production refuses `log` and `array` (see "Production config check").
- Emails are sent synchronously inside the request (`QUEUE_CONNECTION=sync`, no queue worker), so a failed send can be reported to the caller.
- **Templates come from `/emails` at the repo root, not Blade.** The client's Sample Email inbox (dev only) renders the same files, so what the demo shows is what Gmail receives: `password-reset` (UDM header, Reset Password button, 6-digit code, "expires in 30 minutes and can only be used once", plain link `{APP_URL}/reset-password?token=…`) and `event-registration` (sent by `POST /events/:id/rsvp`: event details, the RSVP answers, entry pass code `UDM-XXXX-NNNNN`, "View event in portal" → `{APP_URL}/alumni/events?event=…`). The Mailables (`PasswordResetMail`, `EventRegistrationMail`) call `EmailTemplate::render()`, which also gives the From name/address from `emails/senders.json`. The template folder is `config('mail.templates_path')` (env `EMAIL_TEMPLATES_PATH`): it defaults to `base_path('../emails')` for local dev; the Docker image copies `/emails` into `/app/resources/emails` and sets the variable to that path.
- Other mail in the client (Records "send email" and "request proof") opens the staff member's mail app (`mailto:`, the body includes the portal sign-in link) and the record's history says "Email composed". The API records these (`record_review` + `audit_log`) without sending.
- **Calendar:** Add to Calendar is a client-side Google Calendar link (`googleCalendarUrl()` in `data/events.js`, Asia/Manila, linking back to `{APP_URL}/alumni/events?event=…`). No API endpoint or `.ics` file.

### Password reset flow
1. `POST /auth/forgot-password {identifier}`: looks up by email or Alumni ID, always returns the same 200 response, rate-limited. If the account exists, it creates a `password_reset` row (token and 6-digit code hashed, 30-minute expiry), invalidates earlier unused ones, sends the email and writes `audit_log` (with the address masked).
2. `GET /auth/reset-password/verify?token=` → `{valid, email}` or `{valid:false}` (the client shows "Link expired").
3. `POST /auth/reset-password/verify-code {identifier, code}`: at most 5 attempts, then the reset is invalidated.
4. `POST /auth/reset-password {token|resetSession, password}`: checks the password rules, sets the hash, marks `used_at`, revokes every session and writes `audit_log`. Single use.

## API (all under `/api/v1`)
A JSON REST API: resources are nouns, `GET` reads, `POST` creates or runs an action, `PATCH` changes part of a resource, `PUT` replaces, `DELETE` removes. Lists accept `page`, `per_page` (max 100), `sort` and filter query parameters and return `{ data, meta: { page, per_page, total } }` (`app/Support/Lists.php`). Routes are in `routes/api.php`, one controller per area in `app/Http/Controllers/Api/V1/`. Route parameters named `{id}` are numeric.

| Area | Endpoints | Access |
|---|---|---|
| Health | `GET /health` (`select 1`, logs the DB error on failure) | public |
| Lookups | `GET /lookups` (colleges, programs, skills, enums) | public |
| Auth | `GET /auth/session`, `POST /auth/register`, `/login`, `/logout`, `/forgot-password`, `GET /auth/reset-password/verify`, `POST /auth/reset-password/verify-code`, `POST /auth/reset-password`, `POST /auth/change-password` (signed in) | public |
| Alumni records | `GET /alumni` (filters incl. `batch_from` / `batch_to`, search, pagination), `POST /alumni`, `GET/PATCH /alumni/:id`, `POST /alumni/:id/status` (verify/flag/archive/restore; verifying a registrant also approves their `pending` account, admin only), `POST /alumni/bulk-status`, `POST /alumni/:id/merge`, `POST /alumni/:id/map-program`, `GET /alumni/:id/proofs`, `POST /alumni/:id/request-proof`, `POST /alumni/:id/emails` (records "Email composed"; sends nothing), `POST /alumni/import`, `GET /alumni/activity` | admin; dept scoped |
| Me | `GET/PATCH /me` (profile fields, `privacy` incl. link visibility, `skills`), `PUT /me/survey` (draft or submit), `POST/DELETE /me/photo`, `GET/POST /me/proofs` (employment proof upload) | alumni |
| Directory | `GET /directory`, `GET /directory/:id` | signed-in, masked |
| Stats | `GET /stats/summary`, `/stats/by-batch`, `/stats/by-program`, `/stats/sectors`, `/stats/inclusion`, `/stats/unresponsive`, `/stats/counters`, `/stats/benchmark` (university rates only, no counts) | admin all; dept own college |
| Reports | `GET /reports/types`, `GET /reports/:type?college_id&program_id&batch_from&batch_to` (default window: the last five batches), `GET/POST /reports/exports` | admin, dept |
| Outreach | `POST /outreach` (records a contact; sends nothing), `PATCH/DELETE /outreach/:id` | dept (own college), admin |
| Jobs | `GET /jobs?view=board\|all\|mine\|queue`, `GET /jobs/:id` (signed-in); `POST /jobs`, `PATCH/DELETE /jobs/:id`, `POST /jobs/:id/photo` (alumni, admin); `POST/DELETE /jobs/:id/save`, `POST /jobs/:id/apply {via}`, `DELETE /jobs/:id/apply` (alumni); `POST /jobs/:id/approve\|reject\|deactivate\|activate\|restore` (admin) | per role |
| Events | `GET /events`, `GET /events/:id` (signed-in; the email's deep link); `POST /events`, `PATCH/DELETE /events/:id`, `POST /events/:id/duplicate`, `POST/DELETE /events/:id/photo`, `POST /events/:id/cancel-event`, `GET /events/:id/registrations` (admin); `POST /events/:id/rsvp` (stores answers, issues the entry pass, sends the confirmation email), `POST /events/:id/cancel` (alumni) | per role |
| Announcements | `GET /announcements`, `POST /announcements`, `PATCH/DELETE /announcements/:id` | read: signed-in; write: admin |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` | own only |
| Users | `GET /users`, `POST /users`, `PATCH /users/:id` | admin |
| Settings / audit | `GET/PUT /settings`, `GET /audit` | admin |
| Tracer questions | `GET /tracer/questions` (the edits, applied by the client on top of `formDefs.js`), `PUT /tracer/questions/:field_id`, `POST /tracer/questions` (added question), `DELETE /tracer/questions/:field_id` (reset an edit or delete an added question), `DELETE /tracer/questions` (reset all), `PUT /tracer/sections/:section/order` | read: public (registration needs it); write: admin |
| Files | `GET /files/public/…` (photos, logos, covers), `GET /files/private/…` (proofs; short-lived signed link from `GET /alumni/:id/proofs` or `/me/proofs`; on S3 the bucket's presigned URL) | public / signed |
| Internal jobs | `POST /internal/jobs/:name` (`X-Cron-Secret` header; `coverage-alerts`, `notification-retention`, `token-cleanup`) | scheduler only |

**Error shape:** `{ error, code?, fields?, request_id }`, where `fields` maps form field ids to the first message (the client shows them inline). Every exception is rendered to this shape in `bootstrap/app.php` (`ApiException`, validation, 401, 403, 404, 429, other HTTP errors, 500). Status codes: 200/201/204 on success, 401 unauthenticated, 403 out of scope, 404, 409 conflict (e.g. a duplicate email), 413 JSON body over 1 MB, 422 validation, 429 rate limit. 401 on a non-auth route makes the client sign out. A pending account signing in gets 403 with `code: "account_pending"`, but only after the password matches. Unknown `/api/*` paths get a JSON 404, never the client page.

## Screen to data map
| Screen | Source |
|---|---|
| Admin dashboard | `/stats/*`, `/alumni/activity` |
| College dashboard / outreach | `/stats/*` (auto-scoped), `/stats/benchmark`, `/stats/unresponsive`, `/outreach` |
| Records | `/alumni`, `/stats/counters` |
| Reports | `/reports/types`, `/reports/:type`, `/reports/exports`; CSV/XLS/PDF are built client-side |
| Alumni dashboard / profile / survey | `/me`, `/me/survey` |
| Search overlay, contact modal, alumni card | `/directory` |
| Jobs / Events / Notifications | their endpoints |

## Folder layout (`backend/`)
```
backend/
├── app/
│   ├── Auth/                     SessionGuard (udm_sid cookie → auth_session)
│   ├── Console/Commands/         CreateUser, EnsureAdmin, GoogleOauthToken, MailTest, RunScheduledJob,
│   │                             CoverageAlerts, NotificationRetention, TokenCleanup
│   ├── Exceptions/               ApiException
│   ├── Http/
│   │   ├── Controllers/Api/V1/   one controller per API area
│   │   ├── Controllers/SpaController.php   returns the built client's index.html for non-API paths
│   │   ├── Middleware/           RequestId, RequireRole, RequireXhr, SecurityHeaders (+ 1 MB JSON limit)
│   │   └── Requests/Auth/        Form Requests for register, login, forgot and new password
│   ├── Mail/                     EmailTemplate, GmailTransport, PasswordResetMail, EventRegistrationMail
│   ├── Models/                   Alumnus, UserAccount
│   ├── Providers/                AppServiceProvider (guard, gmail transport, rate limiters, production config check)
│   ├── Services/                 Account, Alumni, Audit, Event, Job, Notification, PasswordReset, Profile,
│   │                             Registration, Reports, ScheduledJobs, Session, Settings, Stats, Storage,
│   │                             Survey, TracerQuestion
│   └── Support/                  Scope, SurveyMapping, Vocab, Mobile, Contact, EntryPass, Lists,
│                                 ProfileProgress, RegistrationRules
├── bootstrap/app.php             routing (api prefix api/v1, SPA fallback), middleware, exception rendering
├── config/                       Laravel config; env read only here
├── database/
│   ├── migrations/               two migrations that run the SQL files
│   ├── sql/                      001_schema.sql, 002_views.sql
│   └── seeders/                  LookupSeeder (all envs, data/catalog.php), DemoSeeder (local only)
├── docker/start.sh               container start: config:cache, migrate, LookupSeeder, ensure-admin, serve
├── routes/api.php, routes/console.php
├── tests/Feature, tests/Unit     Pest
├── .env.example
└── composer.json                 scripts: test, lint (pint + larastan)
```
The root `Dockerfile` and `.dockerignore` build the production image (see "Deployment").

Common commands (from `backend/`): `php artisan serve --port=4000`, `php artisan migrate`, `php artisan db:seed --class=LookupSeeder`, `php artisan db:seed --class=DemoSeeder`, `php artisan app:create-user`, `composer test`, `composer lint`. To rebuild the local database: `php artisan migrate:fresh --drop-views --drop-types --seed`.

## Seed
- **Lookups (every environment, every container start):** `college`, `program`, `skill`, `app_setting` defaults and the first `survey_cycle`, from `database/seeders/data/catalog.php`. Idempotent (upsert by `code` or `key`), and never overwrites a setting an admin changed.
- **Demo data (local only):** a few hundred realistic alumni across all colleges and programs for batches 2019–2026, with survey responses and current employment so the stats are real and checkable, plus the demo accounts. `DemoSeeder` refuses `APP_ENV=production`, a database that requires TLS, a non-local host (unless `ALLOW_DEMO_SEED=true`), or a database that already has alumni.
- **Production dummy data (demo mode):** `backend/dummy_data.sql`, run once by hand on branch `main` with `psql "<DB_URL_DIRECT>" -v ON_ERROR_STOP=1 -f backend/dummy_data.sql` (about 3 MB, likely too big for the SQL Editor; one transaction; it refuses to run if the alumni table isn't empty or `@example.com` accounts already exist). It creates 4,000 alumni across all 10 colleges (CAS 520, CBA 560, CBPM 400, CCS 480, CCJ 520, COED 520, CET 480, CHS 320, CLAW 80, GS 120; batches 2022–2026, each with an active alumni account), 2,680 survey responses with current employment, an admin, 10 college accounts, 2 events and 5 jobs. Every address is `@example.com`. `DemoSeeder` still refuses production; the SQL file is the only way dummy data gets there. To reset: run `backend/wipe_data.sql` in the SQL Editor (one transaction: every `alumnus` and alumni account, with their cascaded rows; the `@example.com` accounts; the dummy events and jobs matched by title; alumni job submissions; import batches; it keeps lookups, other staff and `audit_log`), then load the file again.
- **No real data in production.** Don't register real alumni, import a real masterlist or upload real documents. `@example.com` has no inbox, so reset, invite and RSVP emails to dummy accounts are never received, and `MFA_ENABLED` stays `false`.
- **Production users** are never seeded by PHP:
  - The built-in admin (`ADMIN_EMAIL`, default `admin@udmalumni.edu`) is created on container start by `php artisan app:ensure-admin` from `ADMIN_PASSWORD`, only if it is missing. It must change the password at first sign-in; an existing account is never touched. `ADMIN_PASSWORD` is removed from the host after that.
  - Other staff accounts: `php artisan app:create-user --role=admin|dept [--college=CCS] --email=… --name=…` from a shell on the service, which prints a one-time password that must be changed at first sign-in. Or through `/users`.
  - Outside the dummy data, alumni would come only through registration or Records import. In demo mode, only test registrations with made-up details.

## Deployment
```
Browser ──► Render web service (<name>.onrender.com, branch main, Singapore; demo mode)
              ├─ /api/v1/*  ──►  Laravel API (php artisan serve, 4 workers)
              │                    ├─► Neon PostgreSQL 16 (Singapore; pooled URL at runtime, direct URL for migrations; dummy data only)
              │                    ├─► uploads: S3-compatible bucket (e.g. Cloudflare R2)
              │                    └─► Gmail API (udm.alumni.mailer@gmail.com), templates from /emails
              └─ /*         ──►  built client (public/ assets as files; SpaController → index.html)
HTTP cron (daily) ──► POST /api/v1/internal/jobs/:name   (X-Cron-Secret header)
```
- **One image, one origin.** The root `Dockerfile` has three stages: build the client (`npm --prefix client ci && run build`, with `/emails` available), install Composer dependencies (`--no-dev`), then a `php:8.4-cli-bookworm` runtime with `pdo_pgsql`, `zip`, `intl`, `opcache` and `pcntl`. The built assets go into `public/`, `index.html` into `resources/spa/` (served by `SpaController` with `Cache-Control: no-cache`), and `/emails` into `resources/emails/`. Same origin means first-party cookies and no CORS. Build-time artisan runs with `APP_ENV=build`, so the production config check runs only at container start.
- **Image defaults:** `APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr`, `SESSION_SECURE_COOKIE=true`, `SPA_INDEX_PATH`, `EMAIL_TEMPLATES_PATH`, `PHP_CLI_SERVER_WORKERS=4`, `PORT=8080`.
- **Container start** (`backend/docker/start.sh`): `config:cache` → `migrate --force --database=pgsql_direct` → `db:seed --class=LookupSeeder --force` → `app:ensure-admin` → `php artisan serve --host=0.0.0.0 --port=$PORT --no-reload`. Any failure stops the container, and Render keeps the previous deploy running (traffic switches only when `/api/v1/health` passes). The start script never loads dummy data; that is a one-time manual step (see "Seed").
- **Proxy:** Render's edge terminates TLS, so `bootstrap/app.php` trusts the proxy headers (`trustProxies(at: '*')`) for the client IP and `https` scheme.
- **Web server:** `php artisan serve` with 4 workers is enough for demo traffic. Move to nginx + PHP-FPM if it ever serves real users.
- **Vercel is not used.** The old `udm-alumni-demo.vercel.app` prototype is taken down or redirected to the Render demo.

### Environments
| Env | App | DB | Data |
|---|---|---|---|
| Local | `npm run dev` (Vite on 5173, proxies `/api`) + `php artisan serve --port=4000` in `backend/` | local Postgres 16 (port 5433) or a personal Neon dev branch | lookups + `DemoSeeder` |
| Production (demo mode) | Render web service from `main` (the Docker image) | Neon project in Singapore, branch `main` (protected) | lookups + `dummy_data.sql` (dummy data only, no real people) |

There is no staging environment. To test a risky migration against the demo data, run it on a Neon branch of production from a local checkout (see "Release procedure").

### Environment variables (production)
Set on Render; secrets never go in the repo. `backend/.env.example` lists the local defaults.

| Variable | Notes |
|---|---|
| `APP_KEY` | `php artisan key:generate --show`; production only, never reused. Also signs private file URLs |
| `APP_URL` | public `https://` URL of the service, no trailing slash; used in email links and the email logo |
| `DB_CONNECTION`, `DB_URL`, `DB_URL_DIRECT` | `pgsql`; Neon pooled URL (`-pooler` host) for the app, direct URL for migrations; both `?sslmode=require` |
| `MAIL_MAILER`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | `gmail`; the from address must be the sending mailbox |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` | Gmail OAuth (now) |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_IMPERSONATE_USER` | Workspace service account (later) |
| `CRON_SECRET` | 24+ characters (`openssl rand -hex 32`); protects `/internal/jobs/*` |
| `ADMIN_PASSWORD` | only until the built-in admin has signed in and changed it; `ADMIN_EMAIL` optional (default `admin@udmalumni.edu`) |
| `FILESYSTEM_DISK`, `AWS_ENDPOINT`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_USE_PATH_STYLE_ENDPOINT` | `s3` and the bucket's settings (e.g. Cloudflare R2); the Render container has no persistent disk |
| `MFA_ENABLED` | `false` in demo mode: the sign-in code is emailed, and the dummy `@example.com` accounts have no inbox |
| `SESSION_TTL_DAYS`, `SESSION_IDLE_HOURS`, `AUTH_RATE_LIMIT` | optional; defaults `14`, `12`, `10` |

Not set on Render: `APP_ENV`, `APP_DEBUG`, `LOG_CHANNEL`, `SESSION_SECURE_COOKIE`, `EMAIL_TEMPLATES_PATH` (the image sets them), `HASH_DRIVER` (defaults to `argon2id`) and `ALLOW_DEMO_SEED`.

### Production config check
`AppServiceProvider::productionConfigProblems()` runs at boot when `APP_ENV=production` and refuses to start, naming every problem at once, unless:
- `APP_DEBUG` is false and `APP_KEY` is set;
- `APP_URL` is `https://` and not localhost;
- `DB_URL` is set, and `DB_URL_DIRECT` is set, differs from `DB_URL` and is not a `-pooler` host;
- `MAIL_MAILER` is not `log`/`array`, and `gmail` has a refresh token with its client ID and secret, or a service account with an impersonated user;
- `FILESYSTEM_DISK=s3` has its bucket, key, secret and region;
- the session cookie is `Secure`;
- `HASH_DRIVER` is `argon2id` and PHP supports it;
- `CRON_SECRET` has 24+ characters.

It cannot see whether a volume is mounted, so uploads are checked by hand after a redeploy. Tests: `tests/Unit/ProductionConfigTest.php`.

### Release procedure
1. Before merging to `main`: `composer test` and `composer lint` in `backend/`, `npm --prefix client test`, `npm --prefix client run lint` and `npm run build`.
2. Push or merge to `main`. Render rebuilds the image; the new container migrates, re-seeds the lookups and starts. Traffic switches once `/api/v1/health` passes.
3. Check the parts of the deploy-notes test checklist the release touches.
4. Migrations stay backward-compatible with the running code (add columns before the code uses them, drop them in a later release). A migration that has run is never rolled back in production; fix it with a new forward migration.
5. Before a risky migration: take a Neon branch of `main` as a snapshot, and run the migration first on a second branch from a local checkout (`DB_URL`/`DB_URL_DIRECT` pointed at it, `php artisan migrate --database=pgsql_direct`), then delete that branch.
6. Rollback: redeploy the previous build on Render (the database stays as it is).

### Scheduled jobs
No queue worker or long-running process. Each job is an Artisan command (`app:coverage-alerts`, `app:notification-retention`, `app:token-cleanup`), run in production by a daily external HTTP cron (e.g. cron-job.org) calling `POST /api/v1/internal/jobs/:name` with `X-Cron-Secret`. `routes/console.php` holds the same schedule for hosts with a shell cron running `php artisan schedule:run`; production uses the HTTP cron only, never both. Suggested times (Asia/Manila): coverage alerts 08:00, notification retention 02:00, token cleanup 02:30.

### Files
- The container disk is wiped on every deploy, so uploads go to an **S3-compatible bucket** (`FILESYSTEM_DISK=s3`, private, with a key limited to that bucket; e.g. Cloudflare R2). In demo mode, upload only sample images and documents, never real ones.
- Profile photos, job logos and event covers: public prefix, served through `GET /files/public/…`.
- `proof_document` files: private prefix, reachable only through short-lived signed URLs (`signed:relative` route, or `Storage::temporaryUrl()` on S3) issued after a scope check.
- Images up to 2 MB (jpeg/png/webp), proofs up to 5 MB (pdf/jpeg/png). MIME type checked by content (`fileinfo`). **To do:** the image doesn't set `upload_max_filesize` / `post_max_size` yet, so PHP's defaults (2 MB / 8 MB) reject proofs over 2 MB; add a `php.ini` with at least 6 MB / 8 MB to the `Dockerfile`.
- Replacing or removing an image deletes the old file unless another row (e.g. a duplicated event) still uses it.
- A Neon restore covers the database only; the volume or bucket needs its own backup.

### Database (Neon)
- Its own Neon project in Singapore, PostgreSQL 16; branch `main` is the production branch and is **protected**. A dedicated role and database for the app (not `neondb_owner` / `neondb`).
- Pooled connection for the app (`DB_URL`, emulated prepares), direct connection for migrations (`DB_URL_DIRECT`).
- Restore window (point-in-time history) of at least 7 days on a paid plan. A branch of `main` is taken before risky migrations or bulk imports; restores go first into a new branch and are checked there.
- Production data is changed through the app (so the audit log records it) or through forward migrations. The one exception is loading or resetting the dummy data (`dummy_data.sql`) in the SQL Editor.

### Security and data privacy
- **Demo mode keeps real personal data out.** The system is built for sensitive personal information (birth date, civil status, PWD and Indigenous status) under the Philippine Data Privacy Act (RA 10173), but the demo deployment holds only made-up people. If it ever takes real data, first confirm the retention period, the consent text (`privacy_consent_at`) and the breach procedure with UDM's Data Protection Officer.
- TLS everywhere (Render's edge, `sslmode=require` to Neon, HSTS), no publicly listable bucket or database.
- `SecurityHeaders`: a strict CSP on `/api/*` (`default-src 'none'`), a CSP for the client that allows only its own scripts and Google Fonts, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy`, and the 1 MB limit on JSON bodies. Rate limits on `/auth/*` and `POST /outreach`. `APP_DEBUG=false`, so errors never show stack traces.
- Exports show aggregated counts only. `audit_log` records every change, failed logins and staff reads of sensitive fields.
- Passwords, tokens and codes are never logged (`dontFlash` in `bootstrap/app.php`), and emails in audit entries are masked (`AuditService::maskEmail`). Every error response carries a `request_id` (`RequestId` middleware) to find it in the logs.
- The production image is built without `VITE_DEMO`, so no Demo Access panel or Sample Email inbox.

### Demo deployment checklist
- [x] Repo on GitHub; no `.env` file tracked (`backend/.env.example` only)
- [x] Single-host Docker image; production config check, built-in admin on start, Neon pooler fix
- [x] Render (app) and Neon (database) chosen, both in Singapore
- [x] Dummy data and wipe SQL committed without passwords (`backend/dummy_data.sql`, `backend/wipe_data.sql`); the passwords file (`dummy_data_pass.sql`) is git-ignored
- [ ] Production variables set on Render (unique `APP_KEY`, pooled + direct `DB_URL*`, Gmail OAuth, `CRON_SECRET`, `ADMIN_PASSWORD`, `MFA_ENABLED=false`); first deploy healthy at `/api/v1/health`
- [ ] Built-in admin signed in and changed the password; `ADMIN_PASSWORD` removed
- [ ] `dummy_data.sql` loaded on Neon `main`; the final row shows 4,000 alumni, 1 admin, 10 colleges, 2,680 surveys, 2 events, 5 jobs
- [ ] PHP upload limits raised in the image (see "Files")
- [ ] Uploads on an S3 bucket, and they survive a redeploy
- [ ] Reset and RSVP emails land in a Gmail inbox (not spam) for a test account with a real inbox; OAuth consent screen is "In production"
- [ ] Daily cron for the three jobs, each run once by hand
- [ ] Production test checklist (deploy-notes section 2) passed in a real browser with dummy accounts
- [ ] Old Vercel prototype taken down or redirected
- [ ] Old Railway project deleted

Only if the system ever goes live with real alumni: move the repo, Render, Neon and Google Cloud to university-owned accounts; remove the dummy data; set the Neon restore window and test a restore; add uptime and usage alerts; get the DPO sign-off on the privacy notice and retention.

## Phases
Each phase ends with `composer test` and `composer lint` passing; from phase 2 on, the matching client screens are checked against the local API.

1. ✅ (2026-10-19) **Scaffold and schema:** API-only Laravel, `routes/api.php` with the `api/v1` prefix (no Sanctum), Postgres connection, error rendering, `/health`, the schema and views, `LookupSeeder`, `DemoSeeder`.
2. ✅ (2026-10-19) **Auth:** register, login/logout, `/auth/session`, `SessionGuard`, lockout, rate limits, `Scope::for`, password reset, the Gmail transport with `/emails/password-reset`, `app:create-user`, `/lookups`.
3. ✅ (2026-10-19) **Records and profile:** `/alumni`, status, bulk status, merge, program mapping, proofs, import, activity; `/me`, photos and the storage disk; `/directory` with privacy masking.
4. ✅ (2026-10-19) **Survey and stats:** `PUT /me/survey` (answers → typed columns), the stat views, `/stats/*`, `/reports/*`.
5. ✅ (2026-10-19) **Jobs, events, notifications, outreach:** jobs and approval queue, events, RSVPs (confirmation from `/emails/event-registration`), announcements, notification fan-out, outreach, scheduled jobs, account approval, `/tracer/questions`.
6. ✅ (2026-10-19) **Reconnect the client:** `lib/api.js`, the Vite `/api` proxy and `src/test/mockApi.js`; every context on the API, keeping the prototype features.
7. 🟡 **Production (demo mode):** single-host Docker image, Render + Neon, production config check, built-in admin, argon2id, dummy data SQL (done); the demo deployment checklist above and a real-browser pass per role (open).

## Verification
- **Invariant tests** (seeded DB, `tests/Feature/InvariantTest.php`):
  - the sum of `v_stats_grain` = the population count;
  - admin total = sum of college totals = Records counter = Reports total;
  - traced ≤ total, and employed ≤ traced;
  - no alumnus has two current employment records;
  - merged or archived alumni appear in no count;
  - unmapped-program alumni are counted once in their declared college;
  - an event's registration count = its `event_registration` rows.
- **Scope tests:** a dept user cannot read or change another college's records; an alumnus cannot read or PATCH another alumnus, sees only opted-in directory entries, and sees masked contacts; a user cannot read another user's notifications.
- **Auth tests:** a self-registered account cannot sign in until approved, and the pending message appears only after a correct password; after logout, a reset or disabling the account, the old cookie gets 401 at once; lockout and rate limit trigger; a reset token works once, expires, and the code locks after 5 attempts; an unknown identifier gets the same response as a known one; old hashes are upgraded to argon2id at sign-in.
- **Feature tests:** registration notifies admin and that college only; approving a job notifies only the poster; milestones do not repeat; outreach writes one `outreach_contact` and sends no email, and a dept user cannot record outreach for another college; applying records `applied_via`; an RSVP sends one confirmation email (mocked mailer) with a stable entry pass; tracer question edits change which fields registration requires; the SPA fallback serves `index.html` but not for `/api/*`; `app:ensure-admin` creates the admin once and never changes it.
- **Config tests:** `ProductionConfigTest` covers every rule in "Production config check".
- **Manual end-to-end (local with demo data):**
  - Add one alumnus in Records. The Records counter, admin KPI, college dashboard and Reports each change by exactly 1.
  - Submit a survey. Coverage and employment change by exactly that person.
  - Hide a contact. The directory and the modal update.
- **Production test** (deploy-notes section 2, real browser, with the dummy accounts; any extra test accounts are made-up and archived afterwards): `/health` OK and deep links load; cookies `HttpOnly`, `Secure`, first-party; sign-in for each role; registration → pending → approval; the reset email arrives in a Gmail inbox, matches the template and its link works once; the RSVP confirmation shows the same entry pass as the portal; uploads survive a redeploy; cron jobs run.

## Open questions
- **Employment groups.** The survey has no full-time/part-time question and no "Business Owner" answer, but the Records labels include them. Proposal: self-employed = `job_status = Self-employed` or `org_type = Self-owned business`; further studies = `unemployed_reason` includes "Advance or further study" (decide whether it is excluded from the employment-rate denominator); either add a full-time/part-time question or drop Part-time and Business Owner from the labels.
- **Months to first job.** Averages from bucket midpoints, or only the bucket distribution (Form A uses buckets)?
- **Survey cycles.** One open cycle at a time (assumed), or do stats compare cycles?
- **Going live.** Will the system ever leave demo mode? If it does: who owns the GitHub repo, Render, Neon and Google Cloud (now personal accounts) and who pays; whether it moves to a UDM domain (e.g. `alumni.udm.edu.ph`) and a Workspace `no-reply@` sender; and whether the registrar provides a graduate list for import or all alumni self-register.
- **Server-sent outreach.** The portal hands contact off to staff's own Messenger or mail app. Should the API also send outreach, proof-request and custom staff emails from the system mailbox? That would need `/emails` templates, the send-interval limit and a 429 response.
- **Account-approval email.** Approving a pending account notifies in-app only. Sending an email too needs an `/emails/account-approved` template (`.html` + `.txt` + a `senders.json` entry) designed like the other two.
