# UDM-AMES (UDM Alumni Tracer) — Design, Development, Implementation and Research Specs

*UDM-AMES: A Data-Driven Approach to Graduate Employability Tracking.*

Source of truth: `backend/database/sql/001–004_*.sql`, `backend/routes/api.php`, `backend/app/Services/*`,
`client/src/routes/AppRoutes.jsx`, `docs/product-req-document.md`, `docs/deploy-notes.md`, `backend/tests/`,
`loadtest/`, `docs/evaluation/iso25010-evaluation-form.gs`.
Use these specs as the input for drawing each diagram. Styling hint: group entities and processes by the
colored "domain" listed for each one.

| Manuscript section | Where it is in this file |
|---|---|
| Design of Software, Systems, Products and/or Processes | System summary + §1 ERD |
| Context Flow Diagram of the System | §2 |
| Data Flow Diagram of the System | §3 |
| Use Case Diagram of the System | §4 |
| Activity Diagram of the System | §5 |
| Wireframe of the System | §6 |
| Development and Testing · Test Plan/Case | §7 |
| Implementation Plan | §8 |
| Methodology (Agile-Scrum) | §12.1.1 |
| Network Architecture · Network Model · Deployment Diagram | §9, §10, §11 |
| Research Design · Locale and Respondents · Data Gathering · Data Analysis | §12 |

## System summary

- **What it is:** Universidad de Manila (UDM) Alumni Tracer, a web portal that tracks graduates for CHED
  tracer-study reporting and gives alumni jobs, events, a directory and messaging.
- **Stack:** React SPA (`client/`) → Laravel REST API (`/api/v1`) → PostgreSQL. Files on S3-compatible
  object storage. Email through the Gmail API (Google OAuth). A cron scheduler calls internal jobs.
- **Roles (`user_role`):** `alumni` (graduate), `dept` (college/department staff, pinned to one college),
  `admin` (Alumni Office).

---

## 1. ERD (Entity Relationship Diagram)

Notation: PK = primary key, FK = foreign key, UQ = unique. All tables also have `created_at` and
(if mutable) `updated_at`. Use crow's-foot notation.

### 1.1 Entities by domain

**Academic (blue)**

| Entity | Key attributes |
|---|---|
| `college` | PK college_id · code UQ · name UQ · sort_order |
| `program` | PK program_id · FK college_id · code UQ · abbr · name · degree_level (bachelor/master/doctorate/professional) · is_active |

**Identity & access (purple)**

| Entity | Key attributes |
|---|---|
| `user_account` | PK user_id · email · password_hash · role (alumni/dept/admin) · FK college_id (required when role = dept) · display_name · account_status (active/disabled) · must_change_password · failed_login_count · locked_until · last_login_at |
| `auth_session` | PK session_id · FK user_id · session_hash UQ · user_agent · ip · last_seen_at · expires_at · revoked_at |
| `password_reset` | PK reset_id · FK user_id · token_hash UQ · code_hash · sent_to · attempts · expires_at · used_at |
| `notification` | PK notification_id · FK user_id · type · title · message · link_url · dedupe_key · read_at |

**Alumni profile (green)**

| Entity | Key attributes |
|---|---|
| `alumnus` | PK alumni_id · FK user_id UQ (nullable) · membership_id UQ (`AM-YYYY-XXXXX`) · student_no UQ (`NN-NN-NNN`) · FK program_id · course_other + FK declared_college_id (only when program is unmapped) · year_graduated · name fields · birth_date · sex · civil_status · addresses · mobile_no · contact_email · is_indigenous · indigenous_group · pwd_type · photo_url · industry · bio · verification_status (pending/verified/flagged) · record_source (self_registration/survey/alumni_update/admin_encoded/import) · flag_note · FK merged_into_id (self) · archived_at · privacy_consent_at · directory_opt_in · show_email · show_mobile |
| `social_link` | PK link_id · FK alumni_id · platform · url · is_visible · UQ(alumni_id, platform) |
| `credential` | PK credential_id · FK alumni_id · type (honor/exam/certification) · name · year |
| `skill` | PK skill_id · name · category |
| `alumni_skill` | PK(alumni_id, skill_id) · is_top — *associative* |
| `proof_document` | PK document_id · FK alumni_id · storage_key · mime · size_bytes · FK requested_by → user_account · requested_at · uploaded_at |

**Tracer survey (orange)**

| Entity | Key attributes |
|---|---|
| `survey_cycle` | PK cycle_id · name UQ · status (draft/open/closed) · opens_at · closes_at |
| `survey_response` | PK response_id · FK alumni_id · FK cycle_id · status (draft/submitted) · completion_pct · current_section · first_gen_grad · passed_udmcat · answers (jsonb) · submitted_at · UQ(alumni_id, cycle_id) |
| `employment_record` | PK employment_id · FK alumni_id · FK response_id · employment_status · job_title · employer_name · org_type · line_of_business · occupation_class · place_of_work · job_status · time_to_job_bucket · months_to_first_job · course_relevance · is_current |
| `tracer_question` | PK question_id · field_id UQ · section · form (register/profile/both) · label · type · options (jsonb) · required · shown · sort · is_custom · FK updated_by → user_account |

**Records management (red)**

| Entity | Key attributes |
|---|---|
| `record_review` | PK review_id · FK alumni_id · FK reviewer_id → user_account · action (create/edit/verify/flag/unflag/archive/restore/merge/map_program) · note · diff |
| `outreach_contact` | PK contact_id · FK alumni_id · FK contacted_by → user_account · method · message · note · outcome (sent/reached/no_response/bounced) · contacted_at · removed_at |
| `import_batch` | PK batch_id · code UQ · file_name · columns · status (review/synced/rolled_back) · FK created_by · FK confirmed_by → user_account · validated_at · confirmed_at · rolled_back_at · result |
| `import_row` | PK row_id · FK batch_id · row_no · source · edits · decision (accept/edit/keep/reject) · outcome · FK alumni_id · FK user_id · before · UQ(batch_id, row_no) |

**Jobs (teal)**

| Entity | Key attributes |
|---|---|
| `job_posting` | PK job_id · FK posted_by · FK reviewed_by → user_account · title · company · location · employment_type · salary_range · deadline · apply_via · description · source (admin/alumni) · approval_status (pending/approved/rejected) · reject_reason · is_active · published_at · deleted_at |
| `job_skill` | PK(job_id, skill_id) — *associative* |
| `saved_job` | PK(alumni_id, job_id) · saved_at · applied_at · applied_via (messenger/email/website) — *associative* |

**Events & announcements (yellow)**

| Entity | Key attributes |
|---|---|
| `event` | PK event_id · FK created_by → user_account · title · category (event/career/community) · organizer · starts_at · ends_at · venue · fee_text · capacity · cover_photo_url · reg_status (open/closed/full) · published_at · cancelled_at · deleted_at |
| `event_agenda_item` | PK item_id · FK event_id · starts_at · title · sort |
| `event_reg_field` | PK field_id · FK event_id · field_key · label · type · required · options · UQ(event_id, field_key) |
| `event_registration` | PK registration_id · FK event_id · FK alumni_id · rsvp (going/maybe) · answers · entry_pass (`UDM-XXXX-NNNNN`) · cancelled_at · UQ(event_id, alumni_id) |
| `announcement` | PK announcement_id · FK event_id UQ (nullable) · FK author_id → user_account · kind (notice/reminder/update) · title · body · is_hidden · published_at |

**Messaging (pink)**

| Entity | Key attributes |
|---|---|
| `message_thread` | PK thread_id · channel (office/college/admin) · FK alumni_id · FK staff_user_id → user_account · last_message_at — *channel admin ⇒ staff_user_id set; otherwise alumni_id set* |
| `message` | PK message_id · FK thread_id · FK sender_id → user_account · sender_role · body (1–2000 chars) |
| `message_read` | PK(thread_id, user_id) · last_read_id · read_at |

**System & reporting (gray)**

| Entity | Key attributes |
|---|---|
| `app_setting` | PK key · value (jsonb) · FK updated_by → user_account |
| `audit_log` | PK log_id · FK actor_id → user_account · action · entity · entity_id · diff · ip · request_id |
| `report_export` | PK export_id · type (ched/employability/coverage/employer/inclusion) · format (pdf/excel/csv) · filters · FK generated_by → user_account · status · record_count · scope_label |

### 1.2 Relationships (cardinality)

| From | To | Cardinality | Notes |
|---|---|---|---|
| college | program | 1 : N | |
| college | user_account | 1 : N (optional) | dept staff belong to one college |
| college | alumnus | 1 : N (optional) | `declared_college_id`, unmapped programs only |
| program | alumnus | 1 : N (optional) | |
| user_account | alumnus | 1 : 0..1 | alumni login; imported/encoded records may have no account |
| user_account | auth_session / password_reset / notification | 1 : N | cascade delete |
| alumnus | alumnus | N : 0..1 (self) | `merged_into_id` (duplicate merged into survivor) |
| alumnus | social_link / credential / proof_document | 1 : N | |
| alumnus ↔ skill | via `alumni_skill` | M : N | |
| survey_cycle | survey_response | 1 : N | |
| alumnus | survey_response | 1 : N | max one per cycle |
| alumnus | employment_record | 1 : N | one with `is_current = true` |
| survey_response | employment_record | 1 : N (optional) | |
| alumnus | record_review / outreach_contact | 1 : N | performed by user_account (reviewer / contacted_by) |
| import_batch | import_row | 1 : N | |
| import_row | alumnus / user_account | N : 0..1 | record created/updated by the import |
| user_account | job_posting | 1 : N | posted_by, reviewed_by |
| job_posting ↔ skill | via `job_skill` | M : N | |
| alumnus ↔ job_posting | via `saved_job` | M : N | save / apply |
| event | event_agenda_item / event_reg_field | 1 : N | |
| alumnus ↔ event | via `event_registration` | M : N | |
| event | announcement | 1 : 0..1 | auto announcement for an event |
| alumnus | message_thread | 1 : N | channels office / college |
| user_account | message_thread | 1 : N | channel admin (dept staff ↔ office) |
| message_thread | message | 1 : N | sender = user_account |
| message_thread ↔ user_account | via `message_read` | M : N | |
| user_account | audit_log / report_export / app_setting / tracer_question / import_batch | 1 : N | actor / author |

### 1.3 Database views (optional, draw as dashed boxes)

`v_active_cycle`, `v_alumni_current` (non-archived, non-merged alumni + current response + current job),
`v_stats_grain` (college × program × batch aggregates), `v_records_counters`, `v_unresponsive`,
`v_directory` (privacy-masked), `v_alumni_dashboard`, `v_event_stats`, `v_job_stats`.

---

## 2. Context Flow Diagram (CLD / DFD Level 0)

One central process: **0 — UDM Alumni Tracer System**. External entities and the data flows to/from it:

| External entity | Data flows INTO the system | Data flows OUT of the system |
|---|---|---|
| **Alumnus** | registration details, login credentials, profile updates, tracer survey answers, proof documents, photo, job posts, job save/apply, event RSVP, messages | account session, profile & membership ID, survey progress, job listings, event details & entry pass, announcements, directory listings, notifications, messages, personal data export |
| **Department (college) staff** | login, record edits/verify/flag, outreach logs, proof requests, messages, report requests | college-scoped alumni records, stats dashboards, unresponsive list, reports, notifications, messages |
| **Alumni Office (admin)** | staff accounts, tracer questions, settings, masterlist file (CSV/Excel), import decisions, job approvals, events & announcements, record merges/mapping | all alumni records, university-wide stats, CHED/employability/coverage/employer/inclusion reports, audit log, import results, records export |
| **Gmail API (Google)** | delivery status | account invites (temporary password), password reset codes, event registration confirmations, composed emails to alumni |
| **Object storage (S3)** | stored file / signed URL | photos, proof documents, job & event images, report files |
| **Scheduler (cron)** | job trigger (`X-Cron-Secret`): coverage-alerts, notification-retention, token-cleanup | job result counts |
| **CHED** (optional, receives reports offline) | — | tracer-study reports (PDF/Excel/CSV) |

---

## 3. DFD (Level 1)

### 3.1 Processes

| # | Process | Main actors | Reads / writes stores |
|---|---|---|---|
| 1.0 | **Authenticate & manage accounts** — register, login, logout, lockout, change/reset password, staff account creation | Alumnus, Dept, Admin, Gmail | D1, D2, D3, D4 |
| 2.0 | **Manage alumni profile** — view/update own profile, photo, social links, skills, credentials, proofs, privacy, data export | Alumnus, Storage | D4, D5, D12 |
| 3.0 | **Conduct tracer survey** — load questions for the open cycle, save draft, submit, update current employment | Alumnus, Admin (questions) | D6, D7, D4 |
| 4.0 | **Manage alumni records** — list/search, create, edit, verify/flag, archive/restore, merge duplicates, map programs, request proof, email alumni | Dept (own college), Admin, Gmail | D4, D5, D8, D12 |
| 5.0 | **AI data management (masterlist import)** — upload file → rule-based AI validation → row decisions → confirm (create accounts + send invites) → roll back; records export | Admin, Gmail | D9, D4, D1, D12 |
| 6.0 | **Track & reach out** — unresponsive list, log outreach contacts, coverage alerts | Dept, Admin, Scheduler | D4, D7, D8, D3 |
| 7.0 | **Generate statistics & reports** — dashboards, benchmarks, by batch/program, sectors, inclusion; CHED and other report exports | Dept (scoped), Admin, CHED | D4, D6, D7, D13 |
| 8.0 | **Manage jobs** — post (alumni posts need approval), approve/reject, browse, save, apply | Alumnus, Admin | D10, D4, D3 |
| 9.0 | **Manage events & announcements** — create/publish/cancel events, RSVP with entry pass, registrations list, announcements | Admin, Alumnus, Gmail, Storage | D11, D4, D3 |
| 10.0 | **Messaging & notifications** — one-to-one threads (alumnus↔office, alumnus↔college, college↔office), notifications | All roles | D14, D3 |
| 11.0 | **Administer system** — settings, tracer questions, audit log, scheduled maintenance (token cleanup, notification retention) | Admin, Scheduler | D2, D3, D6, D12 |
| 12.0 | **Alumni directory** — browse opted-in alumni with masked contact fields | All roles | D4 |

### 3.2 Data stores

| ID | Store | Tables |
|---|---|---|
| D1 | User Accounts | user_account |
| D2 | Sessions & Resets | auth_session, password_reset |
| D3 | Notifications | notification |
| D4 | Alumni Records | alumnus, social_link, credential, alumni_skill, skill, college, program |
| D5 | Proof Documents | proof_document (+ files in object storage) |
| D6 | Survey Setup | survey_cycle, tracer_question, app_setting |
| D7 | Survey Responses & Employment | survey_response, employment_record |
| D8 | Reviews & Outreach | record_review, outreach_contact |
| D9 | Import Batches | import_batch, import_row |
| D10 | Jobs | job_posting, job_skill, saved_job |
| D11 | Events | event, event_agenda_item, event_reg_field, event_registration, announcement |
| D12 | Audit Log | audit_log |
| D13 | Report Exports | report_export |
| D14 | Messages | message_thread, message, message_read |

### 3.3 Key flows (draw as labelled arrows)

1. Alumnus → 1.0: registration data → D1 (account) + D4 (alumnus, status pending) → Alumnus: session + membership ID.
2. Admin → 1.0: new staff account → D1 → Gmail → Staff: invite with one-time password (must change on first login).
3. User → 1.0: forgot password → D2 (reset code) → Gmail → User: code → User: new password → D1.
4. Alumnus → 3.0: survey answers → D7 (draft → submitted, completion %) and current employment → D7; reads questions from D6.
5. Dept/Admin → 4.0: verify/flag/merge/edit → D4 updated, action + diff → D8 (record_review) and D12 (audit_log).
6. Dept/Admin → 4.0: proof request → D5 + D3 (notification) → Alumnus uploads → 2.0 → Storage + D5.
7. Admin → 5.0: masterlist file → D9 (batch + rows) → AI validation flags/suggestions → Admin decisions → confirm → D4 + D1 (new accounts) → Gmail invites; rollback restores from `import_row.before`.
8. Scheduler → 6.0: coverage-alerts → reads v_stats_grain (D4 + D7) → D3 notifications to staff for batches below target.
9. Dept/Admin → 7.0: report request → reads D4 + D7 → file → D13 → Staff (download) → CHED.
10. Alumnus → 8.0: job post → D10 (pending) → Admin approve/reject → D10 → D3 notification → visible to alumni.
11. Admin → 9.0: event → D11 (+ announcement) → Alumnus RSVP → D11 (entry pass) → Gmail confirmation.
12. Any user → 10.0: message → D14 → D3 notification to the other party.

### 3.4 Business rules worth annotating

- Dept staff only see and change data for their own college (scope enforced in the API).
- Each alumnus has at most one survey response per cycle; only one cycle is `open` at a time.
- An alumnus has either a mapped `program_id` or an unmapped `course_other` + declared college, never both.
- Merged and archived alumni are excluded from all stats (`v_alumni_current`).
- Directory shows only alumni with `directory_opt_in`; email/mobile only if `show_email`/`show_mobile`.
- The "AI" import validator is rule-based on the server; no alumni data leaves the system.
- Every state-changing admin action is written to `audit_log`.

---

## 4. Use Case Diagram

System boundary: **UDM-AMES**. Primary actors on the left, secondary (system) actors on the right.
Generalization: **User** (abstract) ← Alumnus, Department Staff, Admin. Every use case except Register and
Reset Password `<<include>>` **Sign In**.

### 4.1 Actors

| Actor | Type | Description |
|---|---|---|
| User | Abstract primary | Any signed-in person (parent of the three roles) |
| Alumnus | Primary | UDM graduate |
| Department Staff | Primary | College Dean / Program Chair, limited to one college |
| Admin | Primary | Alumni Relations Office |
| Gmail API | Secondary | Sends invite, reset and event emails |
| Scheduler (cron) | Secondary | Triggers the daily jobs |

### 4.2 Use cases by actor

**User (all roles):** Sign In · Sign Out · Change Password · Reset Password (`<<include>>` Verify Email Code) ·
View Notifications · Send/Read Messages · Search Alumni Directory.

**Alumnus:**
- Register Account (`<<include>>` Give Data Privacy Consent; `<<include>>` Fill Registration Steps)
- View Dashboard · View Profile
- Update Profile & Tracer Survey (`<<include>>` Upload Photo; `<<extend>>` Answer Employment Sections, when employed / self-employed)
- Manage Privacy & Download My Data
- Browse Jobs · Save Job · Apply to Job · Post a Job
- Browse Events · Register for Event (`<<include>>` Receive Entry Pass) · Cancel Registration

**Department Staff:**
- View College Dashboard
- View College Alumni Records (`<<extend>>` Verify Record)
- Track Outreach (`<<include>>` View Unresponsive Alumni; `<<include>>` Record Contact)
- Generate College Report (`<<include>>` Export Report)

**Admin:**
- View Admin Dashboard
- Manage Alumni Records (`<<extend>>` Verify/Flag · Archive/Restore · Merge Duplicates · Map Program · Bulk Update · Request Proof · Email Alumnus)
- Import Masterlist (`<<include>>` Run AI Validation; `<<include>>` Review Flagged Rows; `<<include>>` Confirm Import; `<<extend>>` Roll Back Import)
- Export Records · View Audit Log
- Generate Reports (CHED Form A, Employability, Coverage, Employer, Inclusion) (`<<include>>` Export Report)
- Manage Jobs (`<<include>>` Approve/Reject Alumni Postings)
- Manage Events & Announcements (`<<include>>` View Registrations)
- Manage Tracer Questions
- Manage Staff Accounts & Settings

**Gmail API** is associated with: Register for Event, Reset Password, Confirm Import (invites).
**Scheduler** is associated with: Send Coverage Alerts, Clean Up Expired Sessions/Tokens, Purge Old Notifications.

---

## 5. Activity Diagrams

Use swimlanes per actor (columns: Actor | System | External). Start = filled circle, end = bullseye,
decisions = diamonds (◇).

### 5.1 Alumni registration
Lanes: Alumnus | System.
1. Alumnus opens Sign In → clicks *Register as Alumni*.
2. System shows Data Privacy Consent. ◇ Consent checked? No → stay on consent. Yes → continue.
3. Alumnus fills Personal Information → Contact & Social → Educational Background → Account Password.
   After each step: ◇ Valid? No → show field errors, stay on step. Yes → next step.
4. System (server) re-validates all fields. ◇ Email already registered? Yes → return error to the step.
   ◇ Program in chosen college? No → error. "Others" → store as unmapped program.
5. System creates an active `user_account` + verified `alumnus` record, generates the Alumni ID (`AM-YYYY-NNNNN`),
   notifies Admin and the alumnus' college.
6. System shows Registration Successful with the Alumni ID → Alumnus goes to Sign In. (end)

### 5.2 Sign in (with lockout and forced password change)
Lanes: User | System.
1. User enters email/Alumni ID + password.
2. ◇ Rate limit exceeded? Yes → "Too many attempts". ◇ Account locked? Yes → refuse.
3. ◇ Credentials valid? No → increment failures, audit, generic error; ◇ 5 failures? Yes → lock 15 min.
4. ◇ Temporary password expired (import accounts, 7 days)? Yes → point to Forgot Password.
5. Create session (HttpOnly cookie), audit the sign-in.
6. ◇ `must_change_password`? Yes → Change Password screen → set new password → continue.
7. Redirect by role → Alumni / College / Admin dashboard. (end)

### 5.3 Forgot / reset password
Lanes: User | System | Gmail.
1. User enters email or Alumni ID.
2. System: ◇ Account exists? Yes → create single-use token + 6-digit code; Gmail sends the email.
   Either way the user sees the same "check your email" screen.
3. User enters the code or opens the link. ◇ Valid and not expired? No → expired state.
4. User sets a new password (rules checked).
5. System updates the hash and revokes all other sessions. (end)

### 5.4 Update profile and tracer survey
Lanes: Alumnus | System.
1. Dashboard prompt → Edit Profile.
2. System loads the questions (Admin's Alumni Tracer settings) and the current answers.
3. Alumnus moves through the tabs. ◇ Employed / self-employed? → show Employment Details / Self-Employment tabs.
4. Save Changes → server validation. ◇ Errors? Yes → open the tab with the error.
5. System saves the survey response and current employment record, recomputes completion %; statistics update. (end)

### 5.5 Masterlist import (AI Data Management)
Lanes: Admin | System | Gmail.
1. Upload CSV/XLSX (≤ 5 MB, ≤ 2,000 rows). ◇ Template columns found? No → error.
2. Run AI validation → System cleans names, maps programs to colleges, checks years, detects duplicates and
   existing records, scores rows, suggests fixes.
3. For each flagged row the Admin decides Accept / Keep / Edit / Reject (can undo).
   ◇ All flagged rows decided? No → loop.
4. Confirm → one database transaction: create records + accounts (temporary passwords), update matched records, audit.
5. After commit: Gmail sends the invites; failures are counted in the audit entry.
6. ◇ Roll back needed? Yes → ◇ Any new alumnus already signed in? No → remove/restore; Yes → refused. (end)

### 5.6 Job posting and approval
Lanes: Alumnus | Admin | System.
1. Alumnus: Post a job → System saves it as *pending* and notifies the Admin.
2. Admin reviews: ◇ Approve? Yes → published; poster notified; skill-matched alumni notified.
   No → rejected with reason; poster notified.
3. Alumni browse → Apply → choose channel (Messenger / email / careers page) → mark as applied. (end)

### 5.7 Event registration
Lanes: Admin | Alumnus | System | Gmail.
1. Admin creates/publishes the event (agenda, custom fields, capacity) → linked announcement created.
2. Alumnus opens the event → Register → answers the custom fields. ◇ Event full or closed? Yes → refuse.
3. System creates the registration with entry pass `UDM-XXXX-NNNNN` → Gmail sends the confirmation.
4. ◇ Cancel? Yes → registration cancelled. (end)

### 5.8 Generate report
Lanes: Staff | System.
1. Reports → choose type.
2. Set filters (college locked for Dept; program; batch range) and sections.
3. System computes the figures from the shared views → preview.
4. Export PDF / Excel / CSV → logged in `report_export` and shown in history. (end)

### 5.9 Outreach (college)
Lanes: Dept Staff | System.
1. Outreach → list of unresponsive/untraced alumni of the college.
2. Contact → edit message → choose a channel on file. ◇ Contacted recently? Yes → show warning.
3. Messenger or email opens in the staff member's own app.
4. Confirm → record the contact (date + channel). ◇ Undo? Yes → remove the mark. (end)

---

## 6. Wireframes

Common shell for signed-in pages: **left sidebar** (UDM + Alumni logos, role-based nav, sign-out) · **top bar**
(page title, global search "Search for an Alumni" Ctrl+K, notifications bell, avatar menu) · **content area** ·
**floating Messages widget** (bottom right). Palette: UDM green and gold. Phone layout ≤ 760 px: the sidebar becomes
a drawer and tables become cards.

| # | Screen (route) | Key layout elements |
|---|---|---|
| W1 | Sign In (`/signin`) | Split layout: brand panel (logos, tagline) · form card: Email or Alumni ID, Password (show/hide), Sign In, Forgot password?, Register as Alumni · footer links Privacy / Terms / Contact |
| W2 | Forgot / Reset Password (`/forgot-password`, `/reset-password`) | 3-step card: identifier → 6-digit code boxes → new password ×2 with rule checklist · done / expired states |
| W3 | Data Privacy Consent (`/register/consent`) | Scrollable RA 10173 notice · required checkbox · Continue |
| W4 | Registration (`/register/details`) | Stepper (Personal → Contact & Social → Education → Password) · form grid per step · Back / Continue · inline errors |
| W5 | Registration Success (`/register/success`) | Check icon · Alumni ID badge · Go to Sign In |
| W6 | Change Password (`/change-password`) | Card: current/temporary password, new ×2, rules · no sidebar |
| W7 | Alumni Dashboard (`/alumni/dashboard`) | Profile summary card + completion ring · survey status CTA · announcements/events feed · open jobs list |
| W8 | Alumni Profile / Edit (`/alumni/profile`, `/alumni/profile/edit`) | Photo + name header · grouped read-only sections · Edit: tabs per section, Back/Continue, Save Changes/Cancel |
| W9 | Alumni Jobs (`/alumni/jobs`) | Stat strip (open positions, employers, avg salary, % applied) · search + filters · job cards (save, details) · Post a job · Apply dialog with channels |
| W10 | Alumni Events (`/alumni/events`) | Event cards (cover, date, venue, status) · detail with agenda · Register dialog (custom questions) · entry pass + Add to Calendar |
| W11 | Privacy & My Data (`/alumni/privacy`) | Directory opt-in and per-channel toggles · Download a copy · rights list + DPO contacts |
| W12 | College Dashboard (`/college/dashboard`) | Filters (program, batch range) · KPI cards · employment-status donut · insights · rate benchmark vs university · Export report |
| W13 | Outreach (`/college/outreach`) | Table of unresponsive alumni · Contact button → contact dialog · last-contacted badge |
| W14 | Admin Dashboard (`/admin/dashboard`) | KPI row (alumni, registrations, employment, coverage) · charts (employability, outcomes, by batch/program) · recent registrations |
| W15 | Alumni Records (`/admin/records`, `/college/records`) | Status KPI cards · search + filters (college, program, batch, status, source) · sortable paginated table with bulk bar · quick-view drawer (actions, history) |
| W16 | AI Data Management (`/admin/ai-data`) | Stepper Upload → AI Review → Preview & Confirm → Synced · dropzone · flagged-row table with score, issue, suggestion and Accept/Keep/Edit/Reject · Export records panel · Audit log feed |
| W17 | Reports (`/admin/reports`, `/college/reports`) | Report-type cards · filters + section checkboxes · live preview (KPIs, chart, table, findings) · Export PDF/Excel/CSV · history list |
| W18 | Jobs / Events Management (`/admin/jobs`, `/admin/events`) | Tabs (active, pending review, inactive) · table/cards · create/edit modal (cover photo, fields) · approve/reject · registrations download |
| W19 | Alumni Tracer (`/admin/tracer`) | Tabs All / Register / Edit Profile · section list · question rows (reorder, Required/Shown toggles, edit, delete) · Add question |

---

## 7. Development and Testing

### 7.1 Development tools and stack

| Layer | Technology |
|---|---|
| Front end | React 18, Vite 5, React Router 6, CSS (UDM theme) |
| Back end | Laravel (PHP 8.4) REST API `/api/v1` |
| Database | PostgreSQL 16 (Neon), SQL views for statistics |
| Email / files | Gmail API (OAuth), S3-compatible storage or Railway volume |
| Testing | Pest (backend, real PostgreSQL test DB), Vitest + Testing Library + vitest-axe (client), k6 (load) |
| Quality | ESLint 9 (+ jsx-a11y), Pint, Larastan level 6, npm/composer audit |
| Version control / deploy | Git + GitHub, Docker, Railway |

### 7.2 Test plan

| Item | Plan |
|---|---|
| Objective | Verify that every functional requirement (FR-1 to FR-29 in the PRD) works per role and that the system meets the ISO/IEC 25010 quality characteristics |
| Scope | Authentication, registration, profile/survey, records, AI import, stats & reports, jobs, events, messaging, notifications, outreach, scope/security, deployment config |
| Levels | Unit (support classes, mail, config) → Feature/API (Pest) → Component/Page (Vitest) → Load (k6) → User acceptance (ISO 25010 evaluation) |
| Environment | Local: Windows, PHP 8.4, PostgreSQL 16 (`udm_alumni_test`), Node 22 · Staging: Railway + Neon branch · Browsers: Chrome, Edge, Firefox, Safari |
| Test data | Seeders (`LookupSeeder`, `DemoSeeder` with `DEMO_ALUMNI=3000`) |
| Entry criteria | Feature merged to a branch, lint clean |
| Exit criteria | All automated tests pass, lint clean, k6 thresholds met (< 1% errors, p95 < 1.5 s overall, < 1 s alumni pages, < 2 s sign-in) |
| Baseline (2026-10-20) | Pest 203/203 (1,306 assertions) · Vitest 193/193 · ESLint, Pint, Larastan clean. Re-run before final submission. |

### 7.3 Test cases

Add an *Actual result* and *Status* column with the latest run (all were passing in the baseline).

| ID | Module | Test case | Expected result | Automated in |
|---|---|---|---|---|
| TC-01 | Auth | Sign in each role by email | HttpOnly session cookie set; role dashboard | AuthTest |
| TC-02 | Auth | Sign in alumnus by Alumni ID | Signed in | AuthTest |
| TC-03 | Auth | Wrong password / unknown account | Same generic message; both audited | AuthTest |
| TC-04 | Auth | 5 failed attempts | Account locked 15 min even with the right password | AuthTest |
| TC-05 | Auth | Too many requests from one IP | 429 rate-limited | AuthTest |
| TC-06 | Auth | Logout, then reuse the cookie | 401 | AuthTest |
| TC-07 | Auth | Open another role's route | 401 signed out / 403 wrong role | AuthTest, guards.test |
| TC-08 | Auth | Password storage | argon2id; bcrypt hash upgraded at sign-in | AuthTest |
| TC-09 | Auth | Change password | Other sessions revoked, this one kept | AuthTest |
| TC-10 | Auth | Staff with one-time password | Every API except `/auth/*` refused until changed | AuthTest, ChangePassword.test |
| TC-11 | Security | POST without `X-Requested-With` | Rejected | AuthTest |
| TC-12 | Security | Response headers | Security headers present | AuthTest |
| TC-13 | Registration | Valid registration | Active account + verified record, Alumni ID issued | RegistrationTest |
| TC-14 | Registration | Duplicate email (any case) | Refused | RegistrationTest |
| TC-15 | Registration | Program not in the chosen college | Field error | RegistrationTest |
| TC-16 | Registration | Program "Others" | Stored as an unmapped program | RegistrationTest |
| TC-17 | Registration | Admin made a question required/hidden | Validation follows the setting | RegistrationTest |
| TC-18 | Registration | New registration | Only admins and that college notified | RegistrationTest |
| TC-19 | Password reset | Request for an unknown email | Same done screen, no email | PasswordResetTest |
| TC-20 | Password reset | Valid code / link | Password changed, sessions revoked | PasswordResetTest |
| TC-21 | Password reset | Used or expired link | Expired state | PasswordResetTest |
| TC-22 | Profile | Save survey sections | Answers + current employment saved; completion recomputed | ProfileTest |
| TC-23 | Profile | Photo > 2 MB / wrong type | Rejected | ProfileTest |
| TC-24 | Profile | Download my data | JSON export of own record | ProfileTest |
| TC-25 | Scope | Dept user lists records/stats | Own college only | ScopeTest, StatsTest |
| TC-26 | Records | Verify / flag / archive / restore | Status changes; review + audit logged | RecordsTest |
| TC-27 | Records | Merge a duplicate | Duplicate merged and removed from counts | RecordsTest, InvariantTest |
| TC-28 | Stats | Admin total vs college totals vs Records vs Reports | All equal | InvariantTest, StatsTest |
| TC-29 | Reports | Export a report | File generated, export logged | StatsTest |
| TC-30 | Import | Upload a masterlist | Rows read, fixes proposed, nothing written | ImportsTest |
| TC-31 | Import | Confirm with undecided flagged rows | Refused | ImportsTest |
| TC-32 | Import | Confirm | Accounts with emailed temporary passwords; updates; audit | ImportsTest |
| TC-33 | Import | Roll back after an imported alumnus signed in | Refused | ImportsTest |
| TC-34 | Import | Temporary password older than 7 days | Sign-in refused, points to reset | ImportsTest |
| TC-35 | Jobs | Alumnus posts a job | Pending; Admin notified | JobsEventsTest |
| TC-36 | Jobs | Admin approves / rejects | Published / rejected; poster notified | JobsEventsTest |
| TC-37 | Events | Register for an event | Entry pass + confirmation email | JobsEventsTest |
| TC-38 | Events | Register for a full event | Refused | JobsEventsTest |
| TC-39 | Messages | Alumnus tries to message another alumnus | Not possible (threads only with office/college) | MessagesTest |
| TC-40 | Messages | Dept opens another college's thread | Refused | MessagesTest |
| TC-41 | Outreach | Record a contact / remove the mark | Saved with date + channel / removed | OutreachAdminTest |
| TC-42 | Proof | Staff requests proof; alumnus uploads | Private file, opened only through a signed link | RecordsTest, ProfileTest |
| TC-43 | Deploy | Production config missing/unsafe | App refuses to boot and lists the problems | ProductionConfigTest |
| TC-44 | Client | Page accessibility | No axe violations | vitest-axe tests |
| TC-45 | Load | ~100 concurrent users (k6 load profile) | < 1% errors, p95 within thresholds | loadtest/k6-alumni.js |

---

## 8. Implementation Plan

### 8.1 Strategy
**Phased (pilot → full) rollout** on the production deployment (Railway + Neon, Singapore).

| Phase | Activities | Output |
|---|---|---|
| 1. Preparation | Create the production Neon project and Railway service; set variables; configure the Gmail API sender `udm.alumni.mailer@gmail.com`; set the cron for daily jobs | Production running at the Railway domain |
| 2. Data loading | Import registrar graduate masterlists per college and batch through AI Data Management; review flagged rows; confirm | Alumni records + invite emails |
| 3. Account setup | Dean and Program Chair accounts per college (`app:create-user --role=dept`); built-in admin from `ADMIN_PASSWORD` | Staff accounts (forced password change on first sign-in) |
| 4. Training / orientation | Walkthrough for admin and college staff; demo videos for alumni | Trained users |
| 5. Pilot | One or two colleges and recent batches; collect issues | Fixes, pilot feedback |
| 6. Full launch | Open the tracer survey cycle; announce through UDM channels and email | University-wide use |
| 7. Evaluation | ISO/IEC 25010 survey with alumni, college staff, admin and IT evaluators | Weighted-mean results |
| 8. Maintenance | Monitor `/api/v1/health`, logs and daily jobs; Neon point-in-time restore; roll back by redeploying the previous build | Stable operation |

### 8.2 Hardware and software requirements

| | Server (hosted) | Client (users) |
|---|---|---|
| Hardware | Railway container (Docker); Neon PostgreSQL ≥ 0.25 CU | Any desktop/laptop, tablet or smartphone |
| Software | Docker image: PHP 8.4 (pdo_pgsql, intl, opcache), Laravel, built React client; PostgreSQL 16 | Current Chrome, Edge, Firefox or Safari |
| Network | HTTPS, public domain | Internet connection (broadband or mobile data) |

---

## 9. Network Architecture

**Three-tier, cloud-hosted client–server architecture** over the Internet (HTTPS only).

| Tier | Component | Location | Notes |
|---|---|---|---|
| Presentation | Web browser running the React SPA | User devices (campus LAN/Wi-Fi, home broadband, mobile data) | Same origin; Secure HttpOnly cookie |
| Application | Railway service: Docker container with the Laravel API (`/api/v1`) + static client, 4 PHP workers, port 8080 | Railway, Southeast Asia (Singapore) | Health check `/api/v1/health`; TLS terminated at the Railway edge |
| Data | Neon PostgreSQL 16 (pooled through PgBouncer for the app, direct for migrations) | AWS ap-southeast-1 (Singapore) | `sslmode=require` |
| External services | Gmail API (HTTPS/OAuth); S3-compatible bucket or Railway volume; cron caller | Google / provider cloud | Cron sends the `X-Cron-Secret` header |

Drawing guide: Users (Alumni, College, Admin icons) → "Internet" cloud → Railway edge (HTTPS 443) → App container →
(TLS 5432) Neon pooler → Neon PostgreSQL. Side arrows from the App container to the Gmail API (HTTPS 443) and Object
storage (HTTPS 443). Cron → App container (HTTPS POST `/api/v1/internal/jobs/:name`).

---

## 10. Network Model

- **Model:** client–server over TCP/IP. The system is a public web application on the Internet (WAN), not a
  local-network system.
- **Topology (user side):** star. Each client connects on its own to the cloud server through its ISP or the UDM campus
  network (access point/router → ISP → Internet).
- **Protocols per layer (TCP/IP model):**

| Layer | Protocols / elements |
|---|---|
| Application | HTTPS (REST/JSON `/api/v1`), OAuth 2.0 (Gmail API), PostgreSQL wire protocol, S3 API, DNS |
| Transport | TCP (443 for HTTPS, 5432 for PostgreSQL) with TLS encryption |
| Internet | IPv4 / IPv6 |
| Network access | Ethernet / Wi-Fi / cellular on the user side; cloud data-center network on the server side |

---

## 11. Deployment Diagram (UML)

Nodes (3-D boxes) with the artifacts inside them:

- **«device» User Device** → «execution environment» Web Browser → artifact `React SPA (client/dist)`.
- **«node» Railway Cloud (Singapore)** → «execution environment» Docker container `php:8.4-cli` →
  artifacts `Laravel API (backend/)`, `public/ assets`, `resources/spa/index.html`, `resources/emails/` templates,
  `docker/start.sh` (config:cache → migrate → seed lookups → ensure-admin → serve). Optional «device» Railway Volume
  `/app/storage/app` (uploads).
- **«node» Neon Cloud (AWS Singapore)** → «execution environment» PostgreSQL 16 → artifacts `001_schema.sql`,
  `002_views.sql`, `003_messages.sql`, `004_imports.sql`; «component» PgBouncer pooler.
- **«node» Google Cloud** → «service» Gmail API.
- **«node» Object Storage (S3-compatible)** → bucket (photos, proofs, covers); alternative to the volume.
- **«node» Scheduler** (cron service) → daily jobs.
- **«node» GitHub** → repository, branch `main` (Railway builds from it).

Communication paths: Browser —HTTPS→ Docker container · Container —TLS/5432→ PgBouncer → PostgreSQL ·
Container —HTTPS/OAuth→ Gmail API · Container —HTTPS (S3 API)→ Object Storage · Scheduler —HTTPS POST→ Container ·
GitHub —push to `main` triggers build→ Railway.

---

## 12. Research Design

> Fill in the bracketed names and numbers.

### 12.1 Research design
**Descriptive–developmental research.** *Developmental*: the researchers designed, built and tested UDM-AMES using the
**Agile-Scrum** methodology. *Descriptive*: users evaluated the finished system through a survey based on
**ISO/IEC 25010** (Functional Suitability, Reliability, Performance Efficiency, Usability, Security, Portability).

### 12.1.1 Agile-Scrum methodology
Scrum builds the system in short, fixed-length **sprints**. Each sprint delivers a working, tested increment that the
stakeholders review, and their feedback goes back into the product backlog.

**Scrum roles**

| Role | Who | Responsibility |
|---|---|---|
| Product Owner | [Alumni Relations Office representative / adviser] | Owns the product backlog, sets priorities, accepts increments |
| Scrum Master | [team member] | Runs the Scrum events, removes blockers, keeps the process on track |
| Development Team | [team members] | Designs, codes, tests and deploys each increment |
| Stakeholders | Alumni, college deans/program chairs, Alumni Relations Office | Give requirements and feedback at sprint reviews |

**Scrum artifacts**

| Artifact | In this project |
|---|---|
| Product Backlog | Functional requirements FR-1 to FR-29 and non-functional requirements (`docs/product-req-document.md`) |
| Sprint Backlog | The requirements picked for the sprint, broken into tasks (`track-progress.md`) |
| Increment | A working build that passes the automated tests and lint, deployed to Railway from `main` |
| Definition of Done | Feature works per role, Pest and Vitest tests pass, ESLint/Pint/Larastan clean, deployed and health check passes |

**Scrum events:** Sprint Planning (pick backlog items) → Daily Scrum (progress, blockers) → development and testing →
Sprint Review (demo to the stakeholders) → Sprint Retrospective (what to improve) → next sprint.

**Sprints / increments**

| Sprint | Increment delivered |
|---|---|
| 1 | Requirements gathering, PostgreSQL schema and views, Laravel API base, authentication and sessions |
| 2 | Alumni registration with privacy consent, profile and tracer survey, alumni records |
| 3 | Statistics, college and admin dashboards, reports and exports |
| 4 | Jobs, events, announcements, notifications, outreach, tracer question manager |
| 5 | Security hardening, forced password change, production deployment (Docker, Railway, Neon, Gmail API) |
| 6 | Alumni messaging, load testing (k6) |
| 7 | AI Data Management: masterlist import, records export, audit log |
| 8 | ISO/IEC 25010 evaluation, fixes from the feedback |

Diagram (for the manuscript): circular flow **Product Backlog → Sprint Planning → Sprint Backlog → Sprint
([n] weeks, with Daily Scrum loop) → Increment → Sprint Review → Sprint Retrospective →** back to the Product Backlog.

### 12.2 Research locale and respondents
- **Locale:** Universidad de Manila (UDM), City of Manila: the Alumni Relations Office and the colleges/departments.
- **Respondents** (purposive sampling):

| Group | Description | n |
|---|---|---|
| Alumni | UDM graduates (batch 1999 onward) who used the system | [ ] |
| College / Department staff | Deans, Program Chairs | [ ] |
| Admin | Alumni Relations Office personnel | [ ] |
| IT professionals / evaluators | IT faculty or practitioners assessing technical quality | [ ] |
| **Total** | | [ ] |

### 12.3 Data gathering techniques
1. **Interviews and consultation** with the Alumni Relations Office and college staff about requirements and the
   current tracer process (paper/ad-hoc forms, manual consolidation).
2. **Document analysis** of the existing tracer form (CHED Graduate Tracer Study / UDM Alumni Survey Form A),
   registrar masterlists and reporting requirements.
3. **Observation and system testing**: automated tests (Pest, Vitest), load test (k6) and system logs.
4. **Survey questionnaire**: a Google Form built from `docs/evaluation/iso25010-evaluation-form.gs`. It covers the
   respondent profile (device, browser, respondent type), Functional Suitability per role, then the other five
   characteristics, each statement rated on a **5-point Likert scale**. Respondents use the production system or
   watch the demo videos first. A consent statement is included and no personal identifiers are collected.

### 12.4 Data analysis
- **Frequency and percentage** for the respondent profile: `P = (f / n) × 100`.
- **Weighted mean** per statement, sub-characteristic and characteristic:
  `WM = Σ(f × w) / n`, where *f* = frequency of each rating, *w* = weight (1–5), *n* = number of respondents.
- **Overall mean** = average of the six characteristic means.
- **Interpretation scale:**

| Weight | Range | Verbal interpretation |
|---|---|---|
| 5 | 4.21 – 5.00 | Strongly Agree (Excellent) |
| 4 | 3.41 – 4.20 | Agree (Very Good) |
| 3 | 2.61 – 3.40 | Neutral (Good) |
| 2 | 1.81 – 2.60 | Disagree (Fair) |
| 1 | 1.00 – 1.80 | Strongly Disagree (Poor) |

- **System-side metrics** are reported alongside: test pass rate, k6 error rate and p95 response times against the
  thresholds in §7.2.
