# plan-backend.md

Backend and deployment plan for the UDM Alumni Tracer. Last checked against the code and `docs/UDM Alumni ERD.dc.html` on 2026-10-14.

## Context
The UDM Alumni Tracer is a React/Vite SPA with no backend. All state sits in React context plus `localStorage`, and every statistic is fake or hardcoded: the `3482` literals in `data/records.js` and `lib/adminDash.js`, the hash-based `repStat()` in `lib/analytics.js`, and the hand-typed `DEPT_COURSE_DATA` in `lib/collegeDash.js`. The staff records, public directory, registrations, job queue and RSVP lists contain overlapping people with conflicting IDs.

`docs/UDM Alumni ERD.dc.html` (26 entities, 35 relationships) is the agreed data model. This plan builds the backend on that ERD so that:
1. Every screen's numbers come from the same tables. No stat is typed, stored or computed in the UI.
2. Contacts are fields on the same alumni record that Records, Directory, Profile and the Survey all use.
3. The API, database, file storage and email run in production next to the existing Vercel frontend (see "Deployment").

## Current frontend state (as of 2026-10-14)
- `client/` is a working React 18 + Vite 5 + React Router 6 SPA, deployed to Vercel (project `udm-alumni-demo`) with `npx vercel --prod --yes`. The root `vercel.json` installs and builds `client/`, serves `client/dist` and rewrites all routes to `index.html`. `client/vercel.json` holds a duplicate rewrite that is not used, because the Vercel project root is the repo root. `backend/` holds only `.gitkeep`, so nothing in this plan is built yet. The project is **not a git repository**.
- All three roles (alumni, college/department, admin) are implemented against React context + `localStorage`: Records, Reports, Jobs and Events management, outreach, notifications, the search overlay and the contact modal.
- Registration is Privacy Consent → Personal Information → **Contact & Social Media** → Educational Background → **Account Password** → Success (`data/formDefs.js` `regStepDefs` + `regPasswordStep`). `POST /auth/register` must accept all of these fields (see ERD gap 9). The password step (`reg_pw`, `reg_pw2`) is held in component state only and never persisted today. The API receives it once and stores only the password hash.
- Registration validation lives in `lib/validation.js` (`validateRegStep`, `validateProfile`). The server must repeat every rule with `zod`:
  - `last_name` and `first_name` required.
  - `dob` required and not in the future.
  - `present_address` and `permanent_address` required.
  - `gender`, `marital_status`, `indigenous` and `pwd` required. `married_name` is required when married, `indigenous_group` when indigenous, and `pwd_type` when PWD.
  - `mobile` required, as `09XXXXXXXXX` or `639XXXXXXXXXX` (normalize before storing). `email` required and valid.
  - `college` required. `course` **or** `course_other` required.
  - `year_graduated` is a 4-digit year from 1999 to the current year.
  - The password has 8+ characters, a number and an uppercase letter.
  - Social handles (`facebook`, `twitter`, `instagram`, `linkedin`) accept a username or a URL with no spaces.
- There is no separate survey page. `/alumni/survey` redirects to `/alumni/profile`, and the survey lives in `ProfileContext` (draft key `udm.tracer.draft.v1`). The unused `pages/alumni/AlumniSurvey.jsx` was deleted on 2026-10-14.
- Reports have five types (`REPORT_TYPES` in `lib/analytics.js`): Form A (`ched`), Employability by Program (`employability`), Batch Coverage Audit (`coverage`), Employer & Industry Distribution (`employer`), and Inclusion Profile, IP & PWD (`inclusion`). The 80% (employment) and 60% (coverage) targets are literals in `lib/analytics.js`. The report history (`BASE_HISTORY` in `hooks/useReportsPage.js`) and the "last run" dates in `REPORT_TYPES` are typed.
- Record IDs in the UI (`sid`, e.g. `AM-2024-00891`) use the `membership_id` format. No record carries a `student_no`.
- Survey answers are stored under the field ids in `surveySectionDefs()`:
  - Education: `first_grad`, `udmcat`, `honors`, `prof_exams`.
  - Employment: `ever_employed`, plus `unemployed_reason` (multi) when the answer is No.
  - Job details: `job_name`, `job_address`, `employer`, `job_status` (Regular or Permanent / Temporary / Casual / Contractual / Self-employed), `org_type` (Private / Government / Non-profit / NGO / Self-owned business, four options), `business_line`, `occ_class`, `place_of_work` (Local / Abroad), `time_to_job` (a range bucket), `job_related` (Yes/No), `still_working`, `stay_reasons`.
  - Self-employment: `se_years`, `se_nature`, `se_reason`, `se_related`, `se_other_job`.
  - Feedback: `fb_contribute`, `fb_activity`.

  `SURVEY_RESPONSE` and `EMPLOYMENT_RECORD` must hold these answers (see ERD gap 12).
- Employment labels used by Records (`EMP` in `hooks/useRecordsPage.js`) are Employed Full-time, Employed Part-time, Self-Employed / Freelancer, Business Owner, Further studies, and Not yet employed. The admin charts group them as full-time, part-time, self-employed, further studies, and not yet employed. **The survey does not ask full-time vs part-time.** `RecordsContext` derives only Self-Employed / Freelancer (`job_status = Self-employed`), Employed Full-time (any other employed answer) and Not yet employed. Part-time and Business Owner exist only in seed data. The backend needs an explicit rule (see Open questions).
- The college role is hardcoded to the College of Computing Studies (`DEPT_COLLEGE` in `lib/collegeDash.js`, also used by `hooks/useReportsPage.js`). The backend replaces this with `USER_ACCOUNT.college_id`.
- Vitest is set up (`client/src/test`, `npm run test`), along with the `lint`, `audit` and `build:analyze` scripts.
- The demo accounts (password `demoPass123`, `data/demoAccounts.js`) become seed users for **demo and staging only**: alumni `maria.delacruz@udmalumni.edu`, college `ccs.dean@udmalumni.edu` (College of Computing Studies), and admin `admin@udmalumni.edu`.
- The demo IDs `2024-00567-AT`, `CCS-DEAN-01` and `ADMIN-001` match neither ERD format (`AM-YYYY-NNNNN`, `YYYY-NNNNN-UDM`). The demo alumna's record already uses `AM-2024-00567` in `RecordsContext`, so the seed gives her `membership_id = AM-2024-00567` and `student_no = 2024-00567-UDM`. Sign-in by "Alumni ID" must look up both `student_no` and `membership_id`. Staff accounts have no alumni record and sign in by email only.

## Stack
- **API:** Node.js 20 LTS + Express in `backend/` (ES modules), REST + JSON, validation with `zod`, logging with `pino`.
- **DB:** PostgreSQL 16, migrations with `node-pg-migrate`, queries with `pg` (so the stat SQL stays visible). ERD types map as follows: `INT PK` → `bigint generated always as identity`, `ENUM` → Postgres enum, `JSON` → `jsonb`, `TINYINT` → `smallint`, `YEAR` → `smallint`, `DATETIME/TIMESTAMP` → `timestamptz`, `CHAR(64)` hashes → `text`.
- **Auth:** self-hosted in the Express API (no managed auth service: the scope rules, Alumni-ID sign-in, the custom reset flow and the privacy requirements all live in our own Postgres). Email or Alumni ID + password, hashed with `argon2id` (or `bcrypt` cost 12). Sessions are **opaque server-side sessions**, not JWTs: login creates an `AUTH_SESSION` row and sets one httpOnly cookie holding a random 32-byte session id (only its SHA-256 hash is stored). Logout, a password reset or disabling an account revokes the rows, so the effect is immediate. Sessions last 14 days with a sliding idle timeout. This replaces `data/demoAccounts.js`. Password reset uses `PASSWORD_RESET`. See "Authentication and authorization design".
- **CSRF and brute force:** cookie is `HttpOnly; Secure; SameSite=Lax; Path=/`, bodies are JSON only, and state-changing routes require a custom header (`X-Requested-With`). `express-rate-limit` on `/auth/*`, per-account lockout after repeated failures, and a generic "invalid credentials" message.
- **Files:** `multer` (memory storage, size and MIME limits) for `photo_url` and `PROOF_DOCUMENT`. A `services/storage.js` driver switches with `STORAGE_DRIVER=local|s3`: local disk in development, S3-compatible object storage in production.
- **Tests:** Vitest + Supertest on a throwaway seeded database.
- **Hosting:** the frontend stays on Vercel. The API, Postgres and object storage are hosted separately and reached through a Vercel rewrite, so the browser sees a single origin (see "Deployment").

## Authentication and authorization design
- **Roles:** `alumni`, `dept` (college) and `admin`, stored in `USER_ACCOUNT.role`. A `requireRole(...)` middleware guards each route.
- **Row scope:** `scopeFor(user)` returns the SQL filter used by every list and stat query: dept → `college_id = user.college_id`; alumni → their own `alumni_id` (and opted-in directory rows only); admin → no filter. The client never sends a scope.
- **Defense in depth (optional, from phase 2):** Postgres row-level security on `ALUMNUS` and `SURVEY_RESPONSE`, using `SET LOCAL app.user_id / app.college_id` per request, so a missed `WHERE` cannot leak another college's rows.
- **Audit:** failed logins, sensitive reads and every change write to `AUDIT_LOG`.
- **Libraries:** `argon2` (or `bcrypt`), `cookie-parser`, `helmet`, `express-rate-limit`, `zod`. No auth framework. Better Auth is the closest alternative, but it would still need custom Alumni-ID sign-in and the custom reset flow.
- **Tests:** after logout, a password reset or disabling the account, the old cookie gets 401 at once; a dept user cannot read another college; an alumnus cannot read or PATCH another alumnus; rate limit and lockout trigger on repeated failures; cookie flags are present on staging.

## Sync rules
1. **One `ALUMNUS` row per person.** Records, directory, contact modal, profile and survey are views of it. Duplicates are resolved by `merged_into_id`, never by keeping parallel lists.
2. **Stats are only SQL views over the ERD tables** and are served by one `services/stats.js`. The UI never counts. These are deleted:
   - `repStat`, `FULL_TOTALS`, `CCS_TOTALS`, `DEPT_COURSE_DATA`, `BB`, `SF`, `RAW_REGS`, `JOB_QUEUE`, `DEPT_COLLEGE`, `outRows`, `BASE_HISTORY`
   - the "last run" strings in `REPORT_TYPES`
   - the `3482` / `3483` literals in `adminDash.js`
   - the hardcoded `'Oct 05, 2026'` update date in `useRecordsPage.js`
3. **One definition per metric** (see the table below).
4. **Lookups are tables.** `COLLEGE` and `PROGRAM` replace the duplicated college and program mappings: `data/colleges.js`, `lib/colleges.js` (incl. `BY_SID`/`LEGACY`), `courseCode`/`progCode`, `repAbbr` and the sector regexes. Employment status and record status are single enums. They replace the three label spellings and the four copies of status colors.
5. **Authorization in one place:** the `scopeFor(user)` middleware, used by every list and stat query. A dept user's scope is `USER_ACCOUNT.college_id`. The UI never supplies the scope.
6. **"Today" is server `now()`** (`Asia/Manila` for display and date cut-offs), replacing `TODAY_ISO` in `data/events.js`.
7. **Every change to `ALUMNUS` happens in a transaction that writes `RECORD_REVIEW`/`AUDIT_LOG`.** This replaces the `log[sid]` overlay.

## ERD to feature map (existing entities)
| Domain | Tables | Powers |
|---|---|---|
| Identity & access | `USER_ACCOUNT`, `PASSWORD_RESET`, `NOTIFICATION` | sign-in, forgot password, topbar bell |
| Academic | `COLLEGE`, `PROGRAM` | every college/program filter and label |
| Alumni profile | `ALUMNUS`, `SOCIAL_LINK`, `CREDENTIAL`, `ALUMNI_SKILL`, `SKILL` | Records, Profile, Directory, contact modal, alumni card |
| Tracer & verification | `SURVEY_CYCLE`, `SURVEY_RESPONSE`, `EMPLOYMENT_RECORD`, `PROOF_DOCUMENT`, `RECORD_REVIEW`, `OUTREACH_CONTACT` | survey, coverage, employment stats, verification queue, outreach |
| Jobs | `JOB_POSTING`, `JOB_SKILL`, `SAVED_JOB` | alumni Jobs, admin Jobs + approval queue |
| Events | `EVENT`, `EVENT_AGENDA_ITEM`, `EVENT_REG_FIELD`, `EVENT_REGISTRATION`, `ANNOUNCEMENT` | alumni/admin Events, RSVPs |
| Reporting & audit | `AUDIT_LOG`, `REPORT_EXPORT` | reports history, audit trail |

**Identifier note:** the ERD resolves the old ID conflict. `ALUMNUS.membership_id` (`AM-YYYY-NNNNN`) and `ALUMNUS.student_no` (`YYYY-NNNNN-UDM`) are both unique columns, so they are two different identifiers, not two spellings of one. Seed data must use each one consistently.

## Form → column mapping
| Form / survey field | Column |
|---|---|
| `email` | `USER_ACCOUNT.email` |
| `last_name`, `first_name`, `middle_name`, `suffix`, `married_name` | `ALUMNUS` columns of the same name |
| `dob`, `gender`, `marital_status` | `ALUMNUS.birth_date`, `sex`, `civil_status` |
| `indigenous` (+ `indigenous_group`) | `ALUMNUS.is_indigenous` (+ new `indigenous_group`) |
| `pwd` (+ `pwd_type`) | `ALUMNUS.pwd_type` (null = not PWD) |
| `present_address`, `permanent_address` | new `ALUMNUS.present_address`, `permanent_address` (replace `address`) |
| `mobile` | `ALUMNUS.mobile_no` (normalized `639XXXXXXXXX`) |
| `facebook`, `twitter`, `instagram`, `linkedin` | `SOCIAL_LINK(platform, url)` |
| `college`, `course` / `course_other`, `year_graduated` | `ALUMNUS.program_id` (or new `course_other` + `declared_college_id`), `year_graduated` |
| `first_grad`, `udmcat` | `SURVEY_RESPONSE.first_gen_grad`, `passed_udmcat` |
| `honors`, `prof_exams` | `CREDENTIAL` rows (`type` = honor / exam) |
| `job_name`, `employer`, `org_type`, `business_line`, `occ_class`, `place_of_work` | `EMPLOYMENT_RECORD.job_title`, `employer_name`, `org_type`, `line_of_business`, `occupation_class`, `place_of_work` |
| `job_status`, `job_address`, `time_to_job` | new `EMPLOYMENT_RECORD.job_status`, `job_location`, `time_to_job_bucket` (+ derived `months_to_first_job`) |
| `job_related` / `se_related` | `EMPLOYMENT_RECORD.course_relevance` (`related` / `not_related`) |
| everything else (`unemployed_reason`, `stay_reasons`, `se_*`, `fb_*`, `still_working`) | new `SURVEY_RESPONSE.answers jsonb`, keyed by field id |

## Contacts: how they work
- The login and primary email live in `USER_ACCOUNT.email`. `ALUMNUS.mobile_no` and the two address columns hold phone and address. Other channels live in `SOCIAL_LINK(platform, url, is_visible)`: Facebook, Messenger, X/Twitter, Instagram, LinkedIn and website.
- The directory and contact modal read the `v_directory` view (the modal's `CONTACT_TYPES` are email, Messenger, LinkedIn and website). The view returns only alumni who opted in, only `SOCIAL_LINK` rows with `is_visible`, and email/mobile only when their visibility flag is on.
- Editing a contact in Profile updates the same rows that Records shows, and writes an audit row. There is one copy.
- `OUTREACH_CONTACT` records each staff contact attempt. It feeds the "unresponsive/contacted" lists.

## Notifications (synced across Alumni, College and Admin)
Today `data/notifications.js` returns a fixed list per role (`notifDefs(role)`). The text and numbers are typed ("14 new alumni registrations", "61.8%", "412 alumni have RSVP'd"), admin and college share the same copies, and read state is kept in `localStorage` (`udm.notif.read.v1`). Nothing reacts to what another role does.

With the backend, a notification is a `NOTIFICATION` row created by the same transaction that changes the data, so every role's bell reflects what the other roles did.

| Action (who) | Notifies | Link |
|---|---|---|
| Alumnus registers (alumni) | admin; college users of that alumnus's college | Records |
| Staff verifies, flags or archives a record | that alumnus | Profile |
| Alumnus submits the survey | college users of their college (only on a milestone, such as coverage crossing the target) | Reports |
| Coverage or response rate crosses a target (system, on survey submit) | admin; college users of that college | Reports |
| Alumnus posts a job (alumni) | admin | Jobs queue |
| Admin approves or rejects the job | the poster | Jobs |
| Job approved and active | alumni whose program or skills match (`JOB_SKILL`) | Jobs |
| Event published, changed or cancelled (admin) | all alumni, or those registered for it | Events |
| Alumnus RSVPs, or an event reaches a capacity milestone | admin | Events |
| Staff sends an outreach email | the alumnus, as an in-app copy of the email | Profile / survey |
| Batch coverage falls below target (scheduled job) | college users of that college | Outreach |

Rules:
1. **Recipients are resolved on the server** from `USER_ACCOUNT.role` and `college_id`, never by the client. A college user only gets notifications about their own college. An alumnus only gets their own.
2. **Numbers in the text are computed from the views at creation time** (`v_stats_grain`, `v_event_stats`), never typed. Milestone alerts are created once per crossing. Store the milestone in `dedupe_key` so it is not repeated.
3. **Read state is a column** (`read_at`) on `NOTIFICATION`, so it follows the user across devices. `localStorage` is no longer used.
4. **Delivery:** `GET /notifications?unread=` with polling every 30–60 seconds (server-sent events can come later), so the bell updates without a refresh. `POST /notifications/:id/read` and `POST /notifications/read-all` replace the local `markAll`.
5. **Fan-out for broadcasts** writes one row per recipient, in the same transaction as the event change. A scheduled retention job deletes read notifications after 90 days.
6. **Columns:** the ERD already has `type`, `message`, `link_url` and `is_read`. Add `title` (the UI shows a title and a body), `dedupe_key` (unique with `user_id`), and `read_at`, which replaces `is_read`. `link_url` stores the screen id used by `screenPath`. The `time` shown in the UI is rendered from `created_at`.
7. **Tests:**
   - Registering as an alumnus creates one notification for admin and for that college's users, and none for other colleges.
   - Approving a job notifies only the poster.
   - Reading in one session shows as read in another.
   - A milestone does not repeat.
   - A user cannot read another user's notification.

## Outreach (College dashboard)
Today the **Contact** button in the Outreach list only flips a local `contacted` flag in `pages/college/CollegeDashboard.jsx` and shows the toast "Outreach email sent to {name}." Nothing is sent. The list is hand-typed in `lib/collegeDash.js` (`outRows`), and "Last contacted" is a string literal.

With the backend:
- **List:** `GET /stats/unresponsive` (from `v_unresponsive`, scoped to the user's college and the selected course/batch). Rows are alumni who are seeking work, have no survey response, or have just registered. Each row carries `last_contacted_at` from the latest `OUTREACH_CONTACT.contacted_at`. The "N of M" counters come from the same query.
- **Contact:** `POST /outreach {alumni_id, method, template}` does three things in one request:
  1. It checks that the alumnus is in the caller's college scope.
  2. It sends a real email through `services/mailer.js` (the same Google driver as password reset, `MAIL_DRIVER=console|google`) to the alumnus's `USER_ACCOUNT.email`.
  3. It inserts an `OUTREACH_CONTACT` row (`contacted_by`, `alumni_id`, `method`, `template`, `contacted_at`, `outcome`) and an `AUDIT_LOG` row.

  The toast shows only after the API confirms the send. A failed send shows an error and records nothing.
- **Email content:** the survey follow-up message, with a link to the alumni sign-in or the survey. The email goes out from the server, so no address is exposed to the client, and staff never see an email address that the alumnus has hidden.
- **Mark removal:** the current "Contact mark removed" toggle goes away. A contact attempt is a log entry and is not undone. Staff can set an outcome (`reached`, `no_response`, `bounced`) via `PATCH /outreach/:id`.
- **Limits:** one outreach email per alumnus per 7 days (configurable in `APP_SETTING`), plus a rate limit per staff user, so the button cannot be used to spam.
- **Other channels:** if the alumnus shows their mobile or a social link in the directory, the modal shows it so staff can make contact by hand. Logging that contact with `method = phone|facebook|...` still goes through `POST /outreach`, without an email.
- **Tests:**
  - A dept user cannot contact an alumnus from another college.
  - A successful call writes exactly one `OUTREACH_CONTACT` and calls the mailer once with the right recipient (mock the Google client).
  - A failed send writes nothing.
  - The 7-day limit returns 429.
  - `last_contacted_at` in the list matches the table.

## Metric definitions (the accuracy contract)
The population is every `ALUMNUS` with `archived_at IS NULL AND merged_into_id IS NULL`. A single view, `v_alumni_current`, joins each alumnus to:
- their college, as `coalesce(PROGRAM.college_id, ALUMNUS.declared_college_id)`;
- their latest **submitted** `SURVEY_RESPONSE` for the active `SURVEY_CYCLE`;
- their one `EMPLOYMENT_RECORD` with `is_current`.

Every metric below is an aggregate of that view.

| Metric | Definition |
|---|---|
| Total alumni | `count(*)` of the population |
| Traced / responded | has a `SURVEY_RESPONSE` with `status = 'submitted'` for the cycle |
| Coverage % | traced ÷ total |
| Completeness % | average `completion_pct` of responses |
| Employed | `ever_employed = Yes` and the current `employment_status` is in the "employed" group (see Open questions for part-time, business owner and further studies) |
| Employment rate | employed ÷ traced |
| Degree-aligned % | `course_relevance = 'related'` (from `job_related`, or `se_related` for the self-employed) ÷ employed |
| Months to first job | distribution of `time_to_job_bucket` among the employed; any average uses the bucket midpoint stored in `months_to_first_job` |
| First-generation % | `first_gen_grad` ÷ traced |
| Distinct employers | `count(distinct lower(trim(employer_name)))` among the employed |
| Sector mix | grouped by `line_of_business` (industry), `org_type` and `occupation_class` |
| Inclusion (IP / PWD) | `is_indigenous`, `pwd_type IS NOT NULL` among traced, with the employment rate per group; counts only |
| Pending verification | `verification_status = 'pending'` |
| Coverage/employment targets (60 / 80) | `APP_SETTING`, not code |

Views: `v_alumni_current` (base), `v_stats_grain` (college × program × batch × counts; every aggregate sums this view, so the screens agree by construction), `v_records_counters`, `v_unresponsive`, `v_directory`, `v_alumni_dashboard`, `v_event_stats`, `v_job_stats`.

## ERD gaps to fix first (changes to the ERD and the schema)
Found by comparing the UI with the ERD columns:
1. **Add `APP_SETTING(key PK, value JSON, updated_by, updated_at)`** for the 80% / 60% targets, the outreach limit and other tunables that are hardcoded today.
2. **Contact visibility:** add `ALUMNUS.directory_opt_in`, `show_email` and `show_mobile` (the UI's opt-in directory and `CONTACT_TYPES` need them). The ERD does not list `SOCIAL_LINK.platform` values. Define them as `facebook`, `messenger`, `twitter`, `instagram`, `linkedin` and `website`.
3. **Directory profile fields:** industry and bio ("more") have no column. Add `ALUMNUS.industry` and `ALUMNUS.bio`.
4. **Integrity constraints missing from the ERD:**
   - `SURVEY_RESPONSE` unique on `(alumni_id, cycle_id)`.
   - A partial unique index on `EMPLOYMENT_RECORD(alumni_id) WHERE is_current`. This prevents double-counting an employed person.
   - `EVENT_REGISTRATION` unique on `(event_id, alumni_id)`.
   - A check `completion_pct BETWEEN 0 AND 100`.
   - The `EVENT_REGISTRATION` count must stay ≤ `EVENT.capacity`, enforced in the RSVP transaction with `SELECT ... FOR UPDATE` on the event.
   - `PASSWORD_RESET.token_hash` unique.
   - Only one `SURVEY_CYCLE` with `status = 'open'` (partial unique index).
5. **Broadcast notifications:** `NOTIFICATION` is per user, so announcements fan out one row per recipient. Numbers in the text are generated from the views, never typed.
6. **"Add to calendar"** needs no table (it is generated client-side from the event). This is noted so it isn't mistaken for a gap.
7. **`ALUMNUS` has no `college_id`.** The college comes from `PROGRAM`, which is the single source and removes the `BY_SID`/`LEGACY` patches. The exception is a registrant who typed `course_other`: they have no `program_id`. For them, add `ALUMNUS.course_other` and `declared_college_id` (FK `COLLEGE`, nullable, only used while `program_id` is null). Staff map them to a `PROGRAM` from Records. Until then they count in their college's totals under "Unmapped program".
8. **`PASSWORD_RESET` already supports links and codes:** the ERD has `code_hash`, `token_hash`, `sent_to`, `attempts`, `expires_at` and `used_at`. Add only `created_at` and the unique index from gap 4.
9. **Registration fields partly missing.** The ERD already has `married_name`, `birth_date`, `sex`, `civil_status`, `is_indigenous` and `pwd_type`. Still missing:
   - `indigenous_group`.
   - The address split: the form has `present_address` and `permanent_address`, while the ERD has one `address`. Replace it with two columns.
   - `course_other` / `declared_college_id` (gap 7).
   - The `twitter` and `instagram` platforms (gap 2).
10. **`NOTIFICATION`:** add `title`, `dedupe_key` and `read_at`, and drop `is_read` (see Notifications rule 6).
11. **`OUTREACH_CONTACT`:** the ERD has `contacted_by`, `method`, `note` and `contacted_at`. Add `template` and `outcome` (`sent`, `reached`, `no_response`, `bounced`), and define the `method` values as `email`, `phone`, `facebook`, `messenger` and `linkedin`.
12. **Survey answers:** the ERD columns cover only part of the survey. Add:
    - `SURVEY_RESPONSE.answers jsonb`, which holds every answer keyed by its `surveySectionDefs()` id (the source of truth for re-rendering the form).
    - `EMPLOYMENT_RECORD.job_status` (Regular or Permanent / Temporary / Casual / Contractual / Self-employed), `job_location` and `time_to_job_bucket`.

    `SURVEY_RESPONSE.reason_udm` and `reason_program` are not asked by the current survey. Keep them nullable. The typed columns used by stats are filled from `answers` on submit.
13. **Sessions:** server-side sessions and "other active sessions have been signed out" need a table. Add `AUTH_SESSION(session_id PK, user_id FK, session_hash UK, user_agent, ip, created_at, last_seen_at, expires_at, revoked_at)`.
14. **Update the ERD** (`docs/UDM Alumni ERD.dc.html`): entities 26 → 28 (`APP_SETTING`, `AUTH_SESSION`), relationships 35 → 37 (`AUTH_SESSION.user_id → USER_ACCOUNT`, `ALUMNUS.declared_college_id → COLLEGE`).

## Password reset email (Google integration)
The frontend currently ships a simulated "Sample Email Inbox" (`client/src/pages/auth/ResetInbox.jsx`, route `/forgot-password/inbox`, state in `context/ResetFlowContext.jsx`). It is a prototype stand-in only. Once the backend exists, reset emails are delivered for real to the user's own inbox (Gmail or any other provider), and the demo inbox is removed.

**Sending**
- `services/mailer.js` is shared by password reset and outreach emails. It sends through the Gmail API as the Google Workspace sender `no-reply@udmalumni.edu` (decided). It authenticates with a Workspace service account using domain-wide delegation, impersonating that address with the `gmail.send` scope only. Google SMTP with an app password is the fallback if delegation is not available.
- The credentials (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_IMPERSONATE_USER=no-reply@udmalumni.edu`, `MAIL_FROM`) are host environment variables, listed in `backend/.env.example` and never sent to the client.
- Setup needed from the UDM Workspace admin:
  - Create the `no-reply@udmalumni.edu` mailbox.
  - Create a service account in Google Cloud and enable the Gmail API.
  - Grant domain-wide delegation for the `https://www.googleapis.com/auth/gmail.send` scope.
  - Set SPF, DKIM and DMARC for `udmalumni.edu`, so reset emails reach inboxes and not spam.

  Workspace sending limits (about 2,000 messages per day per user) are far above the expected reset and outreach volume.
- Until the credentials exist, `MAIL_DRIVER=console` logs each email (including the link and the code) to the server console. This mode is allowed only when `NODE_ENV !== 'production'`, and the API refuses to start in production with the console driver.
- The sample inbox page is a design reference only. In production there is no in-app inbox. `ResetInbox.jsx` (`buildMessages`) is the template source for the HTML email; once the email is built, the page is removed.
- The email matches the mockup: the UDM header, "Reset your password" with a **Reset Password** button, the 6-digit code, the steps, "expires in 30 minutes and can only be used once", and the plain link `{APP_URL}/reset-password?token=...`.

**Flow**
1. `POST /auth/forgot-password {identifier}` looks the account up by email or Alumni ID. It always responds 200 with the same message (no account enumeration) and is rate-limited per IP and per account. If the account exists, it creates a `PASSWORD_RESET` row with `token_hash` (SHA-256 of a random 32-byte token), `code_hash` (6 digits), `sent_to`, `expires_at` (30 min) and `attempts`, then sends the email.
2. **Link path:** `GET /auth/reset-password/verify?token=` returns `{valid, email}` or `{valid:false}`. A valid token shows "Reset link verified for ..." on the set-password step. An invalid, used or expired token shows the **Link expired** screen with "Request a New Reset Link".
3. **Code path:** `POST /auth/reset-password/verify-code {identifier, code}`, with a maximum of 5 attempts. After that the reset is invalidated.
4. `POST /auth/reset-password {token|resetSession, password}` validates the password rules (8+ characters, one number, one uppercase letter). It sets the hash, marks `used_at`, revokes every `AUTH_SESSION` ("other active sessions have been signed out") and writes `AUDIT_LOG`. A token works once.
5. Requesting a new reset invalidates earlier unused ones for that account.

**Frontend changes when this lands**
- Add the route `/reset-password`, which reads `?token=`, calls verify, and renders step 3 (valid) or step 5 (expired) of `ForgotPassword`. It must sit outside `PublicOnly` or work while signed out, and the existing SPA rewrite already serves it.
- `ForgotPassword` calls the endpoints above instead of accepting any 6 digits. Remove the "Prototype: any 6 digits will work" hint.
- Delete `ResetInbox.jsx`, its route `/forgot-password/inbox`, the "Demo / Open the sample inbox to view the reset email" row and `goInbox` in `ForgotPasswordView`/`ForgotPassword`, and the `linkUsed`/`sentAt` demo fields in `ResetFlowContext`.

**Tests:**
- A token is single-use.
- An expired token is rejected.
- A wrong code increments `attempts` and locks the reset at 5.
- An unknown identifier gets the same response as a known one.
- A password change revokes sessions.
- The mailer is called with the right recipient (mock the Google client).

## API (all under `/api/v1`)
| Area | Endpoints | Access |
|---|---|---|
| Health | `GET /health` (checks the DB with `select 1`) | public |
| Auth | `POST /auth/register` (creates the user, alumnus, consent and password hash in one transaction), `/login`, `/logout`, `/forgot-password`, `/reset-password/verify`, `/reset-password/verify-code`, `/reset-password` | public |
| Alumni records | `GET /alumni` (filters, search, pagination), `GET/PATCH /alumni/:id`, `POST /alumni`, `POST /alumni/:id/status` (verify/flag/archive), `POST /alumni/:id/merge`, `POST /alumni/:id/map-program`, `POST /alumni/import` | admin; dept scoped |
| Me | `GET/PATCH /me`, `PUT /me/survey` (draft/submit), `POST/DELETE /me/employment`, `PATCH /me/privacy`, `POST /me/photo`, `/me/links`, `/me/credentials`, `/me/skills` | alumni |
| Directory | `GET /directory`, `GET /directory/:id` | signed-in, masked |
| Stats | `GET /stats/summary`, `/stats/by-batch`, `/stats/by-program`, `/stats/sectors`, `/stats/unresponsive`, `/stats/counters` | admin all; dept own college |
| Reports | `GET /reports/:type?college&course&year` (`type` ∈ `ched`, `employability`, `coverage`, `employer`, `inclusion`), `GET /reports/exports`, `POST /reports/exports` (logs `REPORT_EXPORT`) | admin, dept |
| Outreach | `POST /outreach` (sends the email and logs it), `PATCH /outreach/:id` (outcome), list via `GET /stats/unresponsive` | dept (own college), admin |
| Jobs | `GET/POST /jobs`, `PATCH/DELETE /jobs/:id`, `POST /jobs/:id/approve\|reject\|deactivate`, `/save`, `/apply` | per role |
| Events | CRUD, `POST /events/:id/duplicate`, `POST /events/:id/rsvp\|cancel`, `POST /events/:id/cancel-event`, `GET /events/:id/registrations`, announcements CRUD | per role |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all` | signed-in (own only) |
| Users | `GET/POST/PATCH /users` (create dept/admin accounts, set `college_id`, disable accounts) | admin |
| Settings / audit | `GET/PUT /settings`, `GET /audit` | admin |
| Internal jobs | `POST /internal/jobs/:name` (needs the `CRON_SECRET` header) | scheduler only |

There is no admin screen for user management yet. Until one is built, staff accounts are created with `npm run create-user` (see Deployment).

## Screen to data map
| Screen | Source |
|---|---|
| Admin dashboard | `/stats/*`; recent registrations from `/alumni?sort=created_at` |
| College dashboard / outreach | `/stats/*` (auto-scoped), `/stats/unresponsive`, `/outreach` |
| Records | `/alumni` + `/stats/counters` |
| Reports (5 types: ched, employability, coverage, employer, inclusion) | `/reports/:type` over `v_stats_grain`; history from `/reports/exports`; CSV/XLS/PDF are still built client-side |
| Alumni dashboard / profile (the survey is inside the profile) | `/me` |
| Search overlay, contact modal, alumni card | `/directory` |
| Jobs / Events / Notifications | their endpoints; counts come from the tables |

## Frontend integration (order)
1. Add `client/src/lib/api.js` (fetch wrapper with `credentials: 'include'`, the `X-Requested-With` header, a redirect to sign-in on 401, error mapping). The base URL is `import.meta.env.VITE_API_URL || '/api/v1'`. In development, `vite.config.js` gets `server.proxy['/api'] → http://localhost:4000`, so dev runs on one origin just like production.
2. Point `AuthContext` at `/auth/*` and `/me`.
3. Point `RecordsContext` at `/alumni`, and delete the overlay state (`statusOv`, `added`, `deleted`, `log`).
4. Replace the stat logic in `lib/analytics.js`, `lib/adminDash.js` and `lib/collegeDash.js` with fetchers. Keep only the chart shaping.
5. Point `SearchContext` at `/directory`.
6. Move `JobsContext`, `EventsContext` and notifications to the API.
7. Remove the `localStorage` persistence (keys `udm.auth.v1`, `udm.records.v1`, `udm.jobs.v1`, `udm.events.v1`, `udm.notif.read.v1`), except the unsent survey draft `udm.tracer.draft.v1`. On first load after the swap, delete those old keys from the browser so stale demo state cannot leak into the UI.
8. Delete the dead code: `TODAY_ISO`, all hardcoded totals, `data/demoAccounts.js` (keep `ROLE_HOME` elsewhere) and the demo inbox. `pages/alumni/AlumniSurvey.jsx` is already deleted.

## Folder layout (`backend/`)
```
backend/
├── src/
│   ├── app.js            express app (helmet, json, cookies, routes, error handler)
│   ├── server.js         listen on PORT
│   ├── config/           env parsing with zod; fails fast on missing vars
│   ├── db/               pg pool, transaction helper
│   ├── middleware/       auth, scope, validate, rateLimit, error
│   ├── routes/           one file per API area, plus health and internal jobs
│   ├── services/         stats, alumni, survey, jobs, events, notifications, outreach, mailer, storage
│   └── jobs/             coverageAlerts, notificationRetention, expiredTokenCleanup
├── migrations/           node-pg-migrate (schema + views)
├── seed/                 lookups.js (all envs), demo.js (demo/staging only)
├── scripts/              create-user.js
├── tests/
├── .env.example
└── package.json          scripts: dev, start, migrate, seed:lookups, seed:demo, create-user, test, lint
```

## Seed
- **Lookups (every environment, including production):** `COLLEGE`, `PROGRAM`, `SKILL`, `APP_SETTING` defaults (targets 80 / 60, outreach every 7 days) and the first `SURVEY_CYCLE`. The script is idempotent (upsert by `code` or `key`).
- **Demo data (local, preview and staging only; the script refuses to run when `NODE_ENV=production`):** one script replaces every conflicting demo dataset. Overlapping people (Angela Mae Dizon, Maria Santos, etc.) become single `ALUMNUS` rows with both `membership_id` and `student_no`. It generates a few hundred realistic alumni across all colleges and programs for the batches the reports use (2019–2026), with survey responses and current employment, so the stats are real and checkable. It also seeds the three demo accounts with password `demoPass123`.
- **Production users** are never seeded with known passwords. The first admin is created with `npm run create-user -- --role admin --email ...`, which prints a one-time password that must be changed at first sign-in. College accounts are then created the same way (with `--college CCS`) or through `/users`.

## Deployment

### Target topology
```
Browser ──► Vercel (udm-alumni-demo)
              ├─ /api/*  ──rewrite──►  API (Node/Express, container or web service)
              │                          ├─► PostgreSQL 16 (managed, TLS, daily backups)
              │                          ├─► Object storage (S3-compatible: photos, proof documents)
              │                          └─► Gmail API (no-reply@udmalumni.edu)
              └─ /*      ──rewrite──►  client/dist/index.html
Scheduler (host cron) ──► POST /api/v1/internal/jobs/:name
```
- **Recommended hosts (to confirm, see Open questions):** the API on Render (Web Service, Node 20) and Postgres on Neon. Place both in the **Singapore** region, the closest to Manila, and keep them in the same region to avoid cross-region query latency. Railway (API + Postgres together) is the alternative. Object storage: Cloudflare R2 or any S3-compatible bucket.
- **Same origin through Vercel.** The browser calls `/api/v1/...` on the Vercel domain, and Vercel proxies it to the API. As a result:
  - auth cookies are first-party (`HttpOnly; Secure; SameSite=Lax; Path=/`), so they are not blocked as third-party cookies;
  - production needs no CORS, and `CORS_ORIGIN` is only used if the API is ever called directly.
- The root `vercel.json` gains an API rewrite **before** the SPA catch-all:
  ```json
  {
    "installCommand": "npm --prefix client install",
    "buildCommand": "npm run build",
    "outputDirectory": "client/dist",
    "rewrites": [
      { "source": "/api/(.*)", "destination": "https://<api-host>/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
  Delete `client/vercel.json` so there is only one config.
- **Behind a proxy:** set `app.set('trust proxy', true)` so the client IP is read from `X-Forwarded-For` for rate limiting and `AUTH_SESSION.ip`. During staging, verify that the IP arriving through the Vercel rewrite is the real client IP. If it is not, rate-limit by identifier and account only.

### Environments
| Env | Frontend | API | DB | Data |
|---|---|---|---|---|
| Local | `npm run dev` (Vite, proxy `/api` → `:4000`) | `npm --prefix backend run dev` | local Postgres 16 (or Docker) | lookups + demo seed |
| Staging / preview | Vercel preview deployment | separate API service | separate DB (or a Neon branch) | lookups + demo seed |
| Production | Vercel production (`udm-alumni-demo`) | production API service | production DB | lookups + real accounts only |

Vercel preview deployments must point their `/api` rewrite (or `VITE_API_URL`) at staging, never at production.

### Environment variables
| Variable | Where | Notes |
|---|---|---|
| `NODE_ENV` | API | `production` in prod; turns off the console mailer and the demo seed |
| `PORT` | API | set by the host |
| `DATABASE_URL` | API | must use `sslmode=require` in prod; pooled URL for the app, direct URL for migrations (`DATABASE_URL_DIRECT`) if the host uses a pooler |
| `SESSION_TTL_DAYS`, `SESSION_IDLE_HOURS` | API | e.g. `14`, `12` |
| `APP_URL` | API | public frontend URL, used in email links (`https://<vercel-domain>`) |
| `CORS_ORIGIN` | API | only if the API is called cross-origin; otherwise unset |
| `MAIL_DRIVER`, `MAIL_FROM` | API | `google` in prod; `MAIL_FROM="UDM Alumni <no-reply@udmalumni.edu>"` |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_IMPERSONATE_USER` | API | secret; whole JSON in one variable |
| `STORAGE_DRIVER`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | API | `s3` in prod; host disks are ephemeral, so never use `local` there |
| `CRON_SECRET` | API + scheduler | protects `/internal/jobs/*` |
| `VITE_API_URL` | Vercel (build) | optional; default `/api/v1` (same origin) |

`config/` validates all of these at startup and exits with a clear error if any is missing. Secrets live only in the host's and Vercel's environment settings. `.gitignore` already excludes `.env*`. The current root `.env.local` holds a Vercel OIDC token and must not be committed or shared.

### Release procedure
1. **Source control first.** Run `git init`, make a baseline commit, and push to a private GitHub repo. Render, Railway and Vercel's Git integration deploy from it, and migrations need history. Until then, Vercel keeps deploying with `npx vercel --prod --yes`.
2. **Migrations run before the new code starts:** the host's pre-deploy command is `npm --prefix backend run migrate up`. Migrations must be backward-compatible with the running version (add columns before code uses them, drop them in a later release). Views are recreated in migrations.
3. **Lookups:** `npm --prefix backend run seed:lookups` runs after migrations. It is idempotent.
4. **Deploy order:** API first, then check `GET /api/v1/health`, then the frontend (Vercel). Rollback: redeploy the previous API build. A migration that has run is only reversed with a new forward migration.
5. **Health check:** the host polls `/api/v1/health`, and an external uptime check alerts on failure.

### Scheduled jobs
In-process timers are not used, because instances may sleep or run as several copies. The host's cron (Render Cron Job or Railway cron) calls `POST /api/v1/internal/jobs/:name` with `CRON_SECRET`:
- `coverage-alerts`: daily; notifies college users when batch coverage is below target (deduped by `dedupe_key`).
- `notification-retention`: daily; deletes read notifications older than 90 days.
- `token-cleanup`: daily; deletes expired `PASSWORD_RESET` and `AUTH_SESSION` rows.

### Files
- Profile photos and job/event images go to a bucket path served through the API or a public-read prefix.
- `PROOF_DOCUMENT` files sit in a **private** prefix and are only reachable through short-lived signed URLs issued after a scope check.
- Limits: images up to 2 MB (jpeg/png/webp), proofs up to 5 MB (pdf/jpeg/png). The MIME type is checked by content, not by extension.

### Security and data privacy
- The data includes personal and sensitive personal information (birth date, civil status, PWD and Indigenous status), which falls under the Philippine Data Privacy Act of 2012 (RA 10173). Before go-live, confirm with UDM's Data Protection Officer the retention period, the consent text (already captured as `privacy_consent_at`) and the breach procedure.
- TLS everywhere (Vercel, API host, `sslmode=require` to Postgres). Bucket and DB are not publicly listable.
- `helmet`, a JSON body limit (e.g. 1 MB), `express-rate-limit` on `/auth/*` and `/outreach`, argon2id (or bcrypt cost 12) password hashing, generic login errors, and account lockout after repeated failures.
- Exports and reports show aggregated counts only. The Inclusion report never lists names.
- `AUDIT_LOG` records staff reads of sensitive fields in Records as well as every change.

### Backups and monitoring
- Daily automated DB backups with point-in-time recovery if the plan offers it. Test a restore into staging before go-live and then once per term.
- Structured `pino` logs, with no passwords, tokens, codes or full emails in the logs. Request ids are returned in error responses.
- Optional error tracking (e.g. Sentry) for the API and the client.

### Cutover from the demo
- Demo data currently lives in each visitor's `localStorage` and is not migrated. Real alumni register again, or staff import them with `POST /alumni/import` from the registrar's graduate list.
- Ship the frontend swap (Frontend integration steps 1–8) in one release, after the production API is live, seeded with lookups and has its admin account.
- Remove the demo accounts and the "Demo" hints from the production build. Keep them only in staging.

### Go-live checklist
- [ ] Git repo created; `.env.local` and other secrets not committed
- [ ] Hosts chosen; API and DB in the same region (Singapore)
- [ ] Production env vars set; the API starts with `NODE_ENV=production`
- [ ] Migrations and `seed:lookups` applied; first admin created with `create-user`
- [ ] `vercel.json` `/api` rewrite deployed; `client/vercel.json` removed
- [ ] Google Workspace delegation granted; SPF/DKIM/DMARC pass; reset email received in a Gmail inbox
- [ ] Bucket created with a private prefix for proofs
- [ ] Scheduled jobs configured and run once by hand
- [ ] Backup restore tested; uptime check on `/health`
- [ ] Invariant tests pass against staging (see Verification)
- [ ] DPO sign-off on privacy notice and retention

## Phases
0. Git repo, hosting accounts, staging DB and API service with the health endpoint deployed (so every later phase is deployed to staging as it lands)
1. Scaffold, ERD gap fixes, migrations, lookups, demo seed
2. Auth + `AUTH_SESSION` + `scopeFor` + middleware + password reset (mailer with the console stub, then the Google driver) + `create-user`
3. Alumni CRUD, review/audit, merge/archive, program mapping, directory + privacy, file storage
4. Survey/employment, stat views, `/stats`, `/reports`
5. Jobs, events, announcements, notifications, outreach, scheduled jobs
6. Frontend swap and removal of the fake-stat code (on staging)
7. Production: go-live checklist, cutover, and monitoring

## Verification
- **Invariant tests** (Supertest on a seeded DB):
  - the sum of `v_stats_grain` = the population count;
  - admin total = sum of college totals = Records counter = Reports total;
  - traced ≤ total, and employed ≤ traced;
  - no alumnus has two current employment records;
  - merged or archived alumni appear in no count;
  - alumni with an unmapped program are still counted once in their declared college;
  - the event registration count in the API = the rows in `EVENT_REGISTRATION`.
- **Scope tests:** a dept user cannot read another college. An alumnus cannot PATCH another alumnus's row, sees only opted-in directory entries, and sees masked contacts.
- **Manual end-to-end (staging):**
  - Add one alumnus in Records. The Records counter, the admin KPI, the college dashboard and Reports each change by exactly 1.
  - Submit a survey. Coverage and employment change by exactly that person.
  - Hide a contact. The directory and the modal update.
  - Request a password reset. The email arrives in a real Gmail inbox, and the link works once.
- **Deployment smoke test** after each production deploy: `/health` is OK, sign-in works, one dashboard loads, and the cookies are set as `Secure` and first-party.
- Extend the existing Vitest/axe setup to cover the API client.

## Open questions
- **Employment groups.** The survey asks `ever_employed` and `job_status` (Regular or Permanent / Temporary / Casual / Contractual / Self-employed), but not full-time vs part-time, and it has no "Business Owner" answer. Proposals:
  - employed = `ever_employed = Yes` (with `still_working` or any current job);
  - self-employed = `job_status = Self-employed` or `org_type = Self-owned business`;
  - further studies = `unemployed_reason` includes "Advance or further study", excluded from the employment-rate denominator or not (to decide);
  - either add a full-time/part-time question to the survey, or drop Part-time and Business Owner from the labels.
- **Months to first job.** Use the range midpoint (e.g. "1 to 6 months" → 3.5) for averages, or report only the bucket distribution (Form A uses buckets)?
- **Survey cycles.** Is there one active `SURVEY_CYCLE` at a time (assumed), or do stats compare cycles?
- **Hosting.** Confirm Render + Neon (Singapore) or Railway, and who owns the hosting accounts and billing (the university, not a personal account).
- **Domain.** Will the production frontend stay on the `*.vercel.app` domain or move to a UDM domain (e.g. `alumni.udm.edu.ph`)? `APP_URL` and the email links depend on it.
- **Google Workspace.** Resolved: reset emails are sent from `no-reply@udmalumni.edu` via a service account. Still needed: confirmation that the UDM Workspace admin will create the mailbox and grant domain-wide delegation.
- **Initial data.** Will the registrar provide a graduate list for import (format and fields), or do all alumni self-register?
