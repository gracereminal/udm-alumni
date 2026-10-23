# Product Requirements Document — UDM Alumni Tracer

| | |
|---|---|
| **Product** | UDM Alumni Tracer (Alumni Portal) |
| **Owner** | UDM Alumni Relations Office |
| **Status** | v1.6, production. This document describes the production build only. All three roles run end to end on a Laravel API and Neon PostgreSQL, deployed as one Docker image on Railway (Singapore) from `main`. The service is up and the staff accounts exist. See section 1.1 for how production runs and 5.3 for what is left before alumni are invited. |
| **Last updated** | 2026-10-22 |

> **What changed in v1.6.** This document now covers production only. Demo Access, the Sample Email inbox, the demo seed and the old prototype history are gone. Changes in the product since v1.5:
> - **No account approval.** Self-registered alumni are active at once and can sign in straight away. Their record starts verified. The `pending` status no longer exists (a migration promoted old pending rows and blocks new ones).
> - **Change Password screen.** Accounts with a one-time or temporary password must set their own password before anything else. The API refuses every call except `/auth/*` until they do.
> - **AI Data Management** (Admin). Admins import the registrar's graduate masterlist (CSV or Excel), review the AI validation, then confirm, and the portal creates or updates the records. They can also roll back a batch, export records and view the audit log. New alumni from an import get an **account invite email** with a 7-day temporary password.
> - **Messages.** A Messages widget for one-to-one conversations between an alumnus and the Alumni Relations Office, an alumnus and their college, or a college and the office.
> - **Job board figures** are now computed on the server (open positions, employers, average salary, response rate). None are typed in any more.
> - **Privacy & My Data** page for alumni.
> - A k6 load test (`loadtest/`), run locally against 3,000 alumni.

---

## 1. Overview

UDM Alumni Tracer is a web portal for Universidad de Manila (UDM). It registers graduates and collects tracer-survey data on their employment and career outcomes. It gives colleges and the university administration the information they need to measure graduate employability, reach out to alumni, and report to stakeholders.

The portal serves three roles from one application: **Alumni**, **College / Department**, and **Admin**. Each role gets its own dashboard, navigation, and permissions. The front end is a React single-page app. The back end is a Laravel REST API under `/api/v1` on PostgreSQL. The server is the single source of truth and enforces each role's scope on every list, statistic and report.

### 1.1 Production at a glance

| Area | How production runs |
|---|---|
| **Hosting** | One Docker image (root `Dockerfile`) on **Railway**, region Singapore, deployed from the `main` branch (`udm-alumni-production.up.railway.app` until a UDM domain is set up). Laravel (PHP 8.4) serves the API under `/api/v1` and the built React client from the same origin (`SpaController` returns `index.html` for every client route). No CORS. `php artisan serve` with 4 workers. Healthcheck: `/api/v1/health`. |
| **Database** | **Neon** PostgreSQL 16, Singapore. The app uses the pooled URL (`DB_URL`, with emulated prepares because of the PgBouncer pooler). Migrations use the direct URL (`DB_URL_DIRECT`). Point-in-time restore is available. Risky migrations are tested on a Neon branch first. |
| **Start-up** | Every container start caches config, runs migrations, seeds lookups (colleges, programs, batches), creates the built-in admin if missing (`app:ensure-admin`), then serves. If any step fails, the container stops and Railway keeps the previous deploy running. |
| **Safety check** | With `APP_ENV=production` the app refuses to start on unsafe or missing configuration and names every problem in the deploy log (section 9). |
| **Data** | Real data only. The image is built without demo features, and `DemoSeeder` refuses to run in production. People come in three ways: alumni self-registration, a masterlist import in AI Data Management, and staff accounts made with `app:create-user`. |
| **Accounts** | The built-in admin (`admin@udmalumni.edu`) is created once from `ADMIN_PASSWORD`. Remove that variable after the first password change. Other admins, plus a College Dean and a Program Chair for each college, were created from a Railway shell with `app:create-user`. That command prints a one-time password, which must be changed at first sign-in. |
| **Email** | Gmail API (OAuth) as `udm.alumni.mailer@gmail.com`, limit about 500 emails a day. Three emails: password reset, event registration, and the account invite for imported alumni. The OAuth consent screen must stay *Published*, or the token expires after 7 days. A Workspace `no-reply@` sender comes later. |
| **Uploads** | A Railway volume at `/app/storage/app` or a private S3-compatible bucket. One of these is required because the container disk is wiped on each deploy. Proofs of employment are served only through signed links. |
| **Scheduled jobs** | A daily HTTP cron calls `POST /api/v1/internal/jobs/{coverage-alerts,notification-retention,token-cleanup}` with `X-Cron-Secret`. |
| **Releases** | Tests and lint pass locally, then the change is merged to `main`. Railway rebuilds, and traffic switches only after the healthcheck passes. Migrations must stay backward-compatible. Rollback means redeploying the previous build, then fixing forward with a new migration. |
| **Verification** | The production test checklist in `deploy-notes.md` section 2 covers platform, database, sign-in, registration, email, every role's features, cron and logs. Run it in a real browser on the production domain with test alumni, and archive them afterwards. |
| **Monitoring** | An uptime monitor on `/api/v1/health`, Railway and Neon usage alerts, a one-time restore test, a backup plan for uploads, and periodic checks of the Gmail account. |

**Production readiness.** Every feature in 5.1 is built and tested, and the service and staff accounts are live. **Before alumni are invited** (by registration link or masterlist import), production still needs:
- uploads storage attached;
- the daily cron;
- the checklist run in a real browser;
- the Data Protection Officer's sign-off;
- a plan for the Gmail daily limit when importing large masterlists.

Moving the repo and the accounts to the university, a UDM domain and a Workspace sender are planned but don't block launch. The full list is in 5.3.

## 2. Problem Statement

UDM has no single, reliable way to know where its graduates are or what they do after graduation.

- Tracer data is collected on paper or ad-hoc forms, so it is incomplete, outdated, and hard to aggregate.
- Colleges cannot easily see employment outcomes or course-to-job relevance for their own programs.
- The Alumni Relations Office has no up-to-date directory for outreach, event invitations, or job referrals.
- Accreditation and compliance reporting (employability, program relevance) needs data that is currently assembled by hand.
- Alumni have little reason to keep their information current because the university offers them little in return.

## 3. Goals and Success Metrics

| Goal | Metric (target to be confirmed with stakeholders) |
|---|---|
| Build a complete alumni database | Number of registered alumni; % of each graduating batch on file (registered or imported) |
| Capture tracer data | % of registered alumni who complete the tracer survey (coverage target: 60%) |
| Measure employability | Employment rate per program and college (target: 80%) |
| Keep records current | % of profiles updated within the last 12 months; average profile completion |
| Give alumni value in return | Job applications submitted; event registrations; returning-user rate |
| Support college decision-making | Reports generated per term; colleges actively using their dashboard |
| Reduce manual reporting effort | Time to produce an employability report (from days to minutes) |

## 4. Target Users and Personas

### 4.1 Alumni
UDM graduates (batches 1999 onward) across all colleges and graduate programs.
**Needs:** register once (or activate an account the office created), keep a profile, complete the tracer survey, find jobs, hear about events, and reach the office or their college.
**Pain points:** long forms, unclear data-privacy handling, no clear benefit to participating.

### 4.2 College / Department (e.g. College Dean, Program Chair)
Deans, program chairs and department heads. Each sees **only their own college**. The college comes from the signed-in account on the server, not from a UI choice. Accounts are created by an admin with `app:create-user --role=dept`. Each college currently has a College Dean and a Program Chair account.
**Needs:** know how their graduates are doing, find which programs lead to related jobs, and contact alumni for outreach.
**Pain points:** no program-level employment data; cannot reach their own graduates.

### 4.3 Admin (Alumni Relations Office / system administrator)
University-wide staff.
**Needs:** manage all alumni records, bring in the registrar's graduate lists, produce university-wide reports, run job postings and events, answer alumni messages, and maintain the tracer questions.
**Pain points:** manual consolidation of data; no single source of truth.

## 5. Scope

### 5.1 In Scope (v1) — built

#### A. Authentication and Registration
- **Sign In** with email or Alumni ID and password. Show/hide password, and a redirect to the dashboard for the user's role. A wrong email or password gets one generic message. Five failures lock the account for 15 minutes, and sign-in is rate-limited per IP. Footer links open Privacy, Terms of Use, and Contact dialogs.
- **Session.** An opaque server-side session in an `HttpOnly` cookie (`udm_sid`), checked on every request. The client and API share one origin, so the cookie is first-party. Logout, a password reset, a password change and disabling an account all revoke sessions at once.
- **Change Password.** An account flagged `must_change_password` is sent to the Change Password screen after sign-in and can't open any other page. The API refuses every call except `/auth/*` until the password is changed. This applies to staff created with `app:create-user` or `app:ensure-admin` and to alumni created by a masterlist import.
- **Forgot / reset password.** Three steps: enter email or Alumni ID, enter the 6-digit code from the email, then set a new password that meets the rules. The email contains a single-use, expiring Reset Password link and the code, both checked on the server. A spent or expired link shows the expired state. An unknown email still reaches the done screen, so the flow doesn't reveal which accounts exist.
- **Alumni self-registration:**
  1. Data Privacy Consent (required checkbox; registration routes stay locked until consent is given)
  2. Personal Information: name, birth date, present and permanent addresses ("Same as Present Address"), gender, marital status (name after marriage if married), IP group and PWD declarations with follow-up fields
  3. Contact and Social Media: mobile, email and Facebook/Messenger required; X/Twitter, Instagram, LinkedIn optional
  4. Educational Background: college/department, program (the list depends on the college; "Others" is free text), year graduated
  5. Account Password: 8+ characters, with a number and an uppercase letter, entered twice
  6. Registration Successful: shows the new Alumni ID and links to Sign In

  Each step is validated in the browser before moving on, and the server repeats every rule. Steps already passed can be revisited from the stepper. The email must not already belong to an account. The questions on steps 2–5 follow the Admin's Alumni Tracer settings (see D).
- **New accounts are active.** Registration creates an active account with an Alumni ID (`AM-YYYY-Nnnnn`) and a verified record. The alumnus signs in right away. The Admin and the registrant's college get a "new registration" notification. Staff can still flag, archive or merge a record that turns out to be wrong (D).
- **Accounts from a masterlist import** (AI Data Management, D) are active, with a temporary password emailed once in the account invite. The temporary password expires after 7 days. After that, sign-in says so and points to Forgot Password.
- **Staff accounts** are created from the command line (`app:create-user`), which prints a one-time password. The built-in admin is created on container start from `ADMIN_PASSWORD` when it doesn't exist yet (`app:ensure-admin`). An existing account is never changed.
- **Password storage.** argon2id. A hash made with bcrypt or older argon2id settings is upgraded on the next successful sign-in.
- **Protected routes.** Each role's pages are behind a role guard in the client and role middleware on the API. Signed-in users are sent away from Sign In and Forgot Password, and unknown paths go to the user's home.

#### B. Alumni Portal
| Feature | Description |
|---|---|
| Dashboard | Profile summary and completion, survey status, announcements and events feed, open job postings (with an empty state when there are none), calls to action |
| Profile | Read-only summary of the alumnus' answers grouped as Personal, Contact, Education, Employment & Career, and Alumni Feedback, with the profile photo, completion, and an Edit action |
| Edit Profile (includes the tracer survey) | `/alumni/profile/edit` (`/alumni/survey` redirects here). Shows one section per tab, with Back / Continue and explicit **Save Changes / Cancel**. Covers the registration answers plus the rest of the tracer survey: Educational Background (first-generation graduate, UDMCAT, honors, professional exams), Employment Information, Employment Details (shown if ever employed), Self-Employment (shown if self-employed), and Alumni Feedback. Photo upload and remove (JPG/PNG/WebP, max 2 MB) are part of the draft, so Cancel undoes them. Unsaved changes trigger a leave warning, and a server field error opens the right tab. The server computes profile completion as answered ÷ required questions, following the Admin's edits. Dashboard, Profile and the alumnus' record all show that figure. |
| Privacy & My Data | `/alumni/privacy`. Shows what the portal holds and who can see the record. Directory and per-channel contact visibility switches save at once and start hidden. **Download a copy** of the record as JSON (`GET /me/export`). The rights under RA 10173 are listed with actions (correct via Edit Profile; object, withdraw consent or request erasure by email to the office), along with Data Protection Officer and National Privacy Commission contacts. |
| Proof of employment | When staff request proof, the alumnus gets a notice and uploads the document. Proofs are private files served only through signed links. |
| Jobs | Job board with search and filters, a details view, save, and **Post a job**, which sends the posting to the Admin review queue. The stat strip comes from the server: open positions, distinct employers, average disclosed salary range, and the share of postings with applications. **Apply** opens a dialog with an editable application message, prefilled from the profile (name, program, batch, current job, email and mobile). The dialog lists only the channels the posting provides: Facebook Messenger (opens `m.me`, with the message copied to paste), email (opens the mail app with subject and message), or the careers page. The alumnus then marks the job as applied, and the listing shows the channel ("Application sent via Email"). Applying again withdraws. |
| Events | Event cards with date, time, location and status. A registration dialog asks the event's custom questions, and registration can be cancelled. Registering sends a confirmation email with the event details, the answers and an entry pass code (`UDM-XXXX-NNNNN`). A full event refuses new registrations. **Add to Calendar** opens a Google Calendar event prefilled with the time (Asia/Manila), the venue and a link back to the event. `/alumni/events?event=<id>` opens a single event. |
| Messages | Floating Messages widget. The alumnus can message the Alumni Relations Office and their own college staff. Threads show unread counts. |
| Alumni search | Global "Search for an Alumni" overlay (Ctrl+K or "/"). The directory shows only alumni who opted in, and only the contact channels each made visible, with a profile card and contact sheet. |

#### C. College / Department Portal
Limited to the account's own college. The API applies the scope to every query; the client never sends it.
| Feature | Description |
|---|---|
| Dashboard | KPIs, an employment-status donut and employability insights for the college, filterable by program and batch range. The comparison with the whole university shows rates only, never counts. The Export report button opens Reports with the same filters. |
| Alumni Records | The college's records only, with program and batch filters, search, sorting and pagination. Read-only apart from verifying a record from the quick view. No add, edit, bulk actions or import. |
| Outreach | Unresponsive and untraced alumni of the college. **Contact** opens a dialog with an editable message and the channels the alumnus gave at registration. Facebook Messenger opens `m.me/<handle>` in a new tab and copies the message to paste. Email opens the staff member's mail app with subject and body. The portal sends nothing itself. Confirming records the contact with the date and channel ("Today · Messenger"), and the mark can be removed. A warning shows if the alumnus was contacted recently. |
| Messages | Conversations with the college's own alumni and with the Alumni Relations Office. |
| Reports | The same report builder as Admin, locked to the college. |

#### D. Admin Portal
| Feature | Description |
|---|---|
| Admin Dashboard | System-wide KPIs (alumni, registrations, employment, coverage) and employability and graduate-outcome charts, filterable by batch range, plus recent registrations. Export report hands the current scope to Reports. |
| Alumni Records | Table with search, filters (college, program, batch, status, source), sorting, server-side pagination and KPI cards by status (verified, flagged, archived). Quick-view drawer. Add, edit and delete records, and bulk verify, flag, delete or export (CSV). Per-record actions: send email and request proof of employment (documents and due date). Both open the staff member's mail app with the composed message and the portal sign-in link, and are logged as "Email composed". Staff can also reassign program/batch with a reason, archive or restore with a reason, merge a duplicate into another record, and view the change history. |
| AI Data Management | `/admin/ai-data`. **Import masterlist:** upload a CSV or `.xlsx` file (max 5 MB, 2,000 rows) in the template's columns: student no., full name, college, program, year graduated, personal email / mobile. The header row is found by name, so extra columns and a title row are fine. **Run AI validation** is a rule-based check that runs on the server, and no data is sent to an outside AI service. It cleans names and suffixes, maps each program to its college, checks the year (1999 onward), finds duplicates and existing records, flags missing contacts, scores each row and suggests a fix. The admin accepts, keeps, edits or rejects each flagged row, and can undo a decision. Every flagged row needs a decision before the batch can be confirmed. **Confirm** creates new records and accounts (Alumni ID, active, temporary password) and updates matching records. New alumni get the account invite email. Nothing is written before Confirm. **Roll back** removes what a batch created and restores what it updated, but only while none of its new alumni has signed in. **Export records:** verified or flagged records by college and batch, as CSV or Excel, in the import template's columns, so a file can be re-imported. **Audit log:** every upload, validation, decision, sync, rollback and export, with the number of invite emails sent and failed. |
| Reports | Five report types: **UDM Alumni Survey — Form A**, **Employability by Program**, **Batch Coverage Audit**, **Employer & Industry Distribution**, and **Inclusion Profile (IP & PWD)**. Filter by college, program and batch range; choose sections (KPIs, chart, table, findings); preview; export to PDF (browser print), Excel (`.xls`) or CSV. Every export is logged on the server and shown in the report history. Figures match the dashboards for the same scope because the server computes them all from the same views. |
| Jobs Management | Post, edit, deactivate, reactivate, delete and restore job postings, with a cover photo. The job form includes "How to apply" (an email or careers-page address) and "Facebook / Messenger", both validated. Alumni submissions include them too. Approve or decline postings submitted by alumni from the review queue. Approval publishes the job and notifies only the poster. |
| Events Management | Create, edit, duplicate and delete events and set their status (including Full and Past). Each event has a cover photo (shared, not copied, when the event is duplicated), an agenda and custom registration fields. Download the registration list. Publishing, changing or cancelling an event notifies registrants. Each event has a linked Dashboard announcement that can be removed or restored, and standalone announcements are also supported. |
| Messages | The office side of every alumnus conversation (shared by all admins) and of every college conversation. |
| Alumni Tracer | `/admin/tracer`. Manages every question on the Register form and Edit Profile in nine sections (Personal, Contact, Education, Additional Education, Account Password, Employment, Employment Details, Self-Employment, Feedback), with All / Register / Edit Profile tabs. Admins can edit the question text, placeholder and options, set Required or Shown, and reorder questions. They can also add questions (short text, long text, single choice, dropdown, multi-select), delete added questions, and reset one question or everything. Core fields (names, email, college, program, year, passwords) can't be hidden or made optional. The options of questions that feed the statistics, and of linked fields (college, program, year), can't be changed. Validation on client and server follows these settings, and so does profile completion. Completion counts only Required questions and is recalculated for every alumnus after an edit. |

#### E. Cross-cutting
- Role-based navigation: the sidebar is built from one definition per role.
- Responsive layout, with the phone layout at 760 px and below.
- UDM visual identity (green and gold palette, UDM and Alumni logos), matching the design file.
- **Notifications** generated by the server for the right recipients. Examples: new registrations (Admin sees all, a college sees its own), job submitted for review, job approved or declined, job matches by skill, event changes, proof requests, and coverage milestones. Read state is stored per user, so it follows the user across devices.
- **Messages.** One-to-one threads only, so alumni never message each other: alumnus ↔ office, alumnus ↔ their college, college ↔ office. Sending is limited to 30 messages a minute per account.
- **Email.** The password-reset, event-registration and account-invite emails are built from shared templates in `/emails` (HTML and plain text, senders in `senders.json`) and sent through the Gmail API. A failed confirmation or invite email is logged and does not undo the registration or the import. The import's audit entry records how many invites failed.
- **Contact hand-off.** Outreach and job applications use a shared "contact offline" dialog. It lists only the channels on file, opens them in the user's own Messenger, mail app or browser, and then records the channel used.
- **Files.** Profile photos and job and event covers are public files. Proofs of employment are private and served only through signed links. Uploads go to a mounted volume or an S3-compatible bucket.
- **Audit log** of sign-ins, failed sign-ins, sensitive reads, record changes, report exports, and every AI Data Management step.
- **Scheduled jobs** (daily): coverage alerts, notification retention, and expired token and session cleanup. They run through a cron call protected by a shared secret.
- Toasts (some with Undo), confirmation dialogs, the global search overlay, and a contact modal.
- Data Privacy Act-aligned consent at registration. The alumni directory is opt-in, with per-channel contact visibility.

### 5.2 Out of Scope (v1)

- Native mobile apps (iOS/Android). The web app is responsive only.
- Social networking: alumni-to-alumni messaging, feeds, or groups. Messages are only between an alumnus and the office or their college. The alumni directory is search-only, opt-in, and limited to signed-in users.
- Online payments, donations, or fundraising.
- Alumni ID cards, certificates, or transcript and document requests.
- Employer self-service portal. Jobs are posted by Admin, or submitted by alumni and approved by Admin.
- Applicant tracking beyond saved/applied status. No interview scheduling or resume parsing.
- Automated job matching beyond basic filtering, skills and program relevance.
- Third-party single sign-on (Google, Facebook) for login.
- Bulk email or SMS campaign tooling. Outreach and custom emails go to individual alumni, sent by staff from their own Messenger or mail app. The only bulk email is the one-time account invite from a masterlist import.
- Sending alumni data to an outside AI service. The masterlist validation is rule-based and runs on the server.
- Multi-language support. English only.
- Live integration with the university's student information system or registrar. Masterlist files are imported by hand in AI Data Management.
- Advanced analytics and predictive models.

### 5.3 Remaining Work

**Before alumni are invited**
- **Uploads storage.** Attach a Railway volume at `/app/storage/app` or an S3 bucket, then redeploy and check that a photo and a proof still load.
- **Daily cron** for the three scheduled jobs (section 1.1).
- **Production test checklist.** Run `deploy-notes.md` section 2 in a real browser on the production domain. Include the new-tab and mail-app hand-offs, uploads that survive a redeploy, the Change Password screen, Messages between all three pairs, a small masterlist import (validate, confirm, receive the invite, sign in with the temporary password, roll back), keyboard use in dialogs, the phone layouts, and the received reset, RSVP and invite emails. The checklist's registration section still describes the old approval step and needs updating.
- **Gmail daily limit and imports.** The account sends about 500 emails a day, but one import can create up to 2,000 accounts, each with an invite. The invites are also sent during the Confirm request. Until the Workspace sender exists, import large masterlists in batches of a few hundred spread over days, or move the invites to a queue.
- **Staff password changes.** Every staff member signs in once and replaces their one-time password. Then remove `ADMIN_PASSWORD` from Railway.
- **Privacy sign-off** from UDM's Data Protection Officer (RA 10173) on the privacy notice, retention, the breach procedure, and the masterlist import (alumni receive an account they didn't ask for).
- **Retire the old Vercel prototype** (`udm-alumni-demo.vercel.app`). It still keeps data in each visitor's browser, so people could register there by mistake.

**Can follow soon after launch**
- **Account and settings screens.** The API already manages staff accounts (create, disable with immediate sign-out, reset password), app settings (coverage and employment targets) and the full audit log. There are no client screens for these yet, so staff accounts are managed from a Railway shell. Placeholder staff names are also changed there until the screen exists.
- **University ownership.** Move the GitHub repo to the university org, and move Railway, Neon and Google to university accounts with billing in the university's name.
- **UDM domain and Workspace email.** Set up a custom domain (e.g. `alumni.udm.edu.ph`) and update `APP_URL`. Send email as `no-reply@` through a Workspace service account with domain-wide delegation, with SPF, DKIM and DMARC.
- **Monitoring.** Uptime monitor, Railway and Neon usage alerts, a restore test, and a backup for the uploads.
- **Capacity.** A local load test with 3,000 alumni and about 100 users had no errors but queued behind a single PHP worker. Production has 4 workers. Repeat the test against a staging copy before a big launch push, and move to nginx + PHP-FPM if it queues.
- Smaller items: expected 401s from the session check are logged as errors; the Forgot Password step 3 inputs have no labels; the registration success screen still has an unused pending branch; the very large view files (`AdminPostsView`, `RecordsView`) should be split.

## 6. Roles and Permissions

| Capability | Alumni | College / Dept | Admin |
|---|:---:|:---:|:---:|
| Sign in / reset / change password | ✔ | ✔ | ✔ |
| Edit own profile, photo and survey answers | ✔ | — | — |
| Download own data, set directory visibility | ✔ | — | — |
| Upload requested proof of employment | ✔ | — | — |
| Browse, save, and apply to jobs | ✔ | — | — |
| Submit a job posting for review | ✔ | — | — |
| Browse and register for events | ✔ | — | — |
| Messages | With the office and own college | With own college's alumni and the office | All alumni and colleges (as the office) |
| Search alumni | Opt-in directory | Own records | Verified records |
| View alumni records | — | Own college only | All |
| Verify a record | — | Own college | ✔ |
| Add, edit, delete, bulk-update, export records | — | — | ✔ |
| Import masterlists, roll back imports (AI Data Management) | — | — | ✔ |
| Mark alumni as contacted (outreach) | — | Own college only | — |
| View and export reports | — | College-level | System-wide |
| Manage and approve job postings | — | — | ✔ |
| Manage events, registrations, announcements | — | — | ✔ |
| Manage tracer questions (Alumni Tracer) | — | — | ✔ |
| Manage staff accounts and settings (API and command line; no screens yet) | — | — | ✔ |

College users must never have Admin permissions. These rules are enforced on the server for every list, statistic and report. The client never sends its own scope, and the route guards only shape the UI.

## 7. Key User Flows

1. **Register:** Sign In → Register as Alumni → Privacy Consent → Personal Information → Contact and Social Media → Educational Background → Account Password → success screen with the Alumni ID → Sign In → Dashboard. The Admin and the college are notified.
2. **Import a masterlist (admin):** AI Data Management → upload the CSV or Excel file → Run AI validation → review flagged rows (accept, keep, edit or reject) → preview → Confirm → records are created or updated and new alumni are emailed an invite → the audit log shows the batch. If needed, Roll back before any of its alumni signs in.
3. **First sign-in with a temporary or one-time password:** open the invite (alumni) or receive the printed password (staff) → Sign In → Change Password → the user's dashboard.
4. **Complete tracer:** Dashboard prompt → Profile → Edit → step through the sections (the employment sections depend on the answers) → Save Changes. Completion, the alumnus' record and the statistics update.
5. **Apply to job:** Jobs → search or filter → job details → Apply → edit the prefilled message → open Messenger, email or the careers page → mark as applied → "Application sent via …" shown on the listing.
6. **Submit a job (alumni):** Jobs → Post a job → Admin review queue → Admin approves (published) or declines → the poster is notified.
7. **Generate report:** Reports → select type → filter by college, program and batch range → choose sections → preview → export (PDF, Excel, or CSV) → the export is logged and appears in the report history.
8. **Outreach (college):** Outreach → unresponsive alumni → Contact → edit the message → open Messenger or email → mark as contacted (date and channel shown; the mark can be removed).
9. **Message the office or college:** Messages widget → pick the office or the college (alumni), or a conversation (staff) → send. The other side sees an unread count.
10. **Edit the tracer (admin):** Alumni Tracer → pick a section → edit, reorder, require, hide or add questions → the Register form and Edit Profile change right away, and completion is recalculated.
11. **Reset password:** Sign In → Forgot password → enter email or Alumni ID → open the email → Reset Password link or the 6-digit code → set new password → sign in with the new password. Other sessions are signed out. A used or expired link shows the error state.
12. **Register for an event:** Events → event → Register → answer the event's questions → registered banner and confirmation email with the entry pass → Add to Calendar opens Google Calendar.
13. **Request proof (admin):** Alumni Records → record → Request proof → the mail app opens with the message, and the alumnus gets an in-app notice → the alumnus uploads the document → staff open it through a signed link.

## 8. Functional Requirements (summary)

Status: ✔ built and covered by automated tests · ◐ partly built · ○ not built.

| ID | Requirement | Status |
|---|---|:---:|
| FR-1 | Sign-in identifies the user's role and redirects to the matching dashboard. | ✔ |
| FR-2 | A user cannot reach another role's routes. Unauthorized access redirects in the UI and is rejected by the API. | ✔ |
| FR-3 | Registration cannot proceed without privacy consent and valid required fields. The server repeats every validation rule. | ✔ |
| FR-4 | Colleges and programs come from one catalog that feeds registration, profile, filters, masterlist import and reports. | ✔ |
| FR-5 | The survey shows or hides sections and questions conditionally (marital status, IP/PWD, employed or unemployed, still working, self-employed). | ✔ |
| FR-6 | Profile and survey answers are pre-filled from registration and saved per alumnus. | ✔ |
| FR-7 | Admin and College record tables support search, filters, sorting and pagination. | ✔ server-side |
| FR-8 | College users only see data for their assigned college. Benchmarks against the university show rates only. | ✔ |
| FR-9 | Admin can create, edit and delete jobs and events, change their status, and approve or reject alumni job submissions. | ✔ |
| FR-10 | Reports respect the selected college, program and batch scope and can be exported to PDF, Excel or CSV. Each export is logged. | ✔ |
| FR-11 | All buttons, filters, forms, modals and navigation items are functional, and no figure is typed into the UI. | ✔ |
| FR-12 | Every statistic is computed from the same data. Admin total = sum of college totals = Records count = Reports total. | ✔ |
| FR-13 | Each alumnus has one record. Duplicates can be merged (and are detected on import), and archived or deleted records leave the counts. | ✔ |
| FR-14 | Notifications are generated for the right recipients and roles, and read state is stored per user. | ✔ |
| FR-15 | Logout, a password reset, a password change, or disabling an account revokes existing sessions immediately. | ✔ (no disable screen in the client yet) |
| FR-16 | The directory shows only alumni who opted in, and only the contact channels they made visible. | ✔ |
| FR-17 | Self-registered accounts are active at once, and their record starts verified. | ✔ |
| FR-18 | Admin can edit, require, hide, reorder and add tracer questions. Registration, Edit Profile, validation and progress follow the configuration; core fields stay required and shown. | ✔ |
| FR-19 | All users and devices read the same server data; a change saved by one user is what every other user sees next. | ✔ |
| FR-20 | Password reset accepts only the code or link that was sent (single use, expiring), changes the stored password, and never reveals whether an account exists. | ✔ |
| FR-21 | System emails (password reset, event registration, account invite) are sent from the shared `/emails` templates. | ✔ (to verify in production) |
| FR-22 | Outreach and job applications offer only the contact channels on file (Messenger, email, careers page), hand off to the user's own app, and record the channel used. | ✔ |
| FR-23 | Staff can request proof of employment; the alumnus uploads it, and only authorized staff can open it through a signed link. | ✔ |
| FR-24 | Users with a one-time or temporary password must set their own password before using the portal; the API refuses everything but `/auth/*` until they do. | ✔ |
| FR-25 | Production refuses to start with missing or unsafe configuration and names every problem. | ✔ |
| FR-26 | A masterlist import writes nothing until an admin confirms it; every flagged row needs a decision first; a batch can be rolled back until one of its alumni signs in; every step is audited. | ✔ |
| FR-27 | Temporary passwords from an import are hashed, emailed once, never stored in plain text, returned or logged, and expire after 7 days. | ✔ |
| FR-28 | Messages are one-to-one between an alumnus and the office or their college, or a college and the office. Alumni can't message each other, and colleges see only their own alumni's threads. | ✔ |
| FR-29 | Alumni can download a copy of their own record. | ✔ |

## 9. Non-Functional Requirements

- **Privacy and compliance:** Collect explicit consent before storing personal data, in line with the Philippine Data Privacy Act of 2012. Collect only the data the tracer needs. Restrict sensitive fields (IP/PWD status) to authorized roles. The Inclusion report shows aggregated counts only, and the Employer report shows no named alumni. Sensitive reads are audited. Masterlist validation runs on the server, and no alumni data is sent to outside AI services. Alumni can see, download and correct their data, and request erasure, from Privacy & My Data.
- **Security:** Authorization and row scope are enforced on the server (`Scope::for` on every query). Passwords are hashed with argon2id (pinned in `config/hashing.php`), and older hashes are upgraded at sign-in. Sessions are opaque server sessions in `HttpOnly; Secure; SameSite=Lax` cookies. State-changing API calls must carry `X-Requested-With`. Reset tokens are single-use and expire. Sign-in has rate limiting and a lockout, messages and uploads are rate-limited, and responses carry security headers. Uploads are checked for size and type. Secrets live only in host variables, and logs must not contain passwords, tokens, reset codes or cookies.
- **Production config check** (`AppServiceProvider::productionConfigProblems`, unit-tested). The app refuses to boot if any of these is wrong:
  - `APP_DEBUG` must be off, and `APP_KEY` must be set.
  - `APP_URL` must be a public `https://` address.
  - `DB_URL` must be set, with a separate non-pooler `DB_URL_DIRECT`.
  - The mailer can't be `log` or `array`, and Gmail needs complete OAuth or service-account credentials.
  - S3 storage needs its bucket, key, secret and region.
  - The session cookie must be `Secure`.
  - Hashing must be argon2id, on a PHP build that supports it.
  - `CRON_SECRET` needs 24+ characters.

  The check can't see whether an uploads volume is mounted, so the post-deploy checklist covers that.
- **Reliability:** Each deploy migrates, seeds lookups and makes sure the built-in admin exists before taking traffic. A failed start keeps the previous deploy running. Migrations must stay backward-compatible, and rollback means redeploying the previous build. The database has point-in-time restore (Neon). An import is confirmed in one database transaction, and invite emails are sent after it commits.
- **Responsiveness:** Usable at mobile, tablet and desktop widths. Phone layout at 760 px and below.
- **Accessibility:** Keyboard-navigable forms, modals and clickable rows (shared `lib/a11y.js` helpers); sufficient color contrast; `jsx-a11y` lint rules; `vitest-axe` checks.
- **Performance:** Initial load under 3 seconds on a typical broadband connection. Routes are code-split. App and database are both in Singapore. Load-test thresholds (`loadtest/k6-alumni.js`): under 1% errors, p95 under 1.5 s overall, under 1 s for alumni pages and under 2 s for sign-in.
- **Maintainability:** Modular React components. Form questions are defined once in `data/formDefs.js`, and navigation in `data/navigation.js`. Statistics are raw SQL in one service (`StatsService`) over database views. Lint is clean on both sides (ESLint; Pint + Larastan level 6).
- **Testability:** Client: Vitest + Testing Library against a `fetch` mock, including page-level tests. Backend: Pest feature and unit tests against a real PostgreSQL test database. They cover scope, invariants, auth (including the hash upgrade, forced password change and temporary password expiry), records, stats, reports, jobs, events, outreach, messages, imports and exports, notifications, the deploy commands, the SPA fallback and the production config check.
- **Browser support:** Current versions of Chrome, Edge, Firefox and Safari.

## 10. Design Principles

- `docs/UDM Alumni.dc.html` is the source of truth for UI and UX. The application must not be redesigned into a generic admin template.
- Preserve the UDM green and gold palette, off-white backgrounds, typography, card styling, sidebar, status badges and progress indicators.
- Reuse existing terminology from the design file.
- Known deviations in Alumni Tracer: Employment and Employment Details stay separate sections; core fields can't be hidden or made optional; added questions count toward progress only when required; saving empty text or fewer than two options shows an inline error.

## 11. Technical Overview

| Layer | Production build |
|---|---|
| Front end | React 18 + Vite 5, React Router 6, React Context for state; `lib/api.js` calls `/api/v1` on the same origin |
| Styling | Custom CSS following the design file |
| API | Laravel (PHP 8.4) REST API under `/api/v1`; lists return `{ data, meta }`, errors `{ error, code?, fields? }` |
| Database | Neon PostgreSQL 16 (pooled URL for the app, direct URL for migrations); schema and stat views in SQL; `LookupSeeder` on every start |
| Browser storage | Only the unsent registration draft, the privacy consent and UI preferences |
| Auth | Server-side sessions (`udm_sid` cookie), argon2id password hashes, forced password change, lockout, rate limits, reset tokens |
| Email | Gmail API (OAuth as `udm.alumni.mailer@gmail.com`; Workspace `no-reply@` later), templates from `/emails`. Outreach, record emails and job applications hand off to the user's own Messenger or mail app. |
| Imports | `Masterlist` reads CSV and `.xlsx` (no extra libraries); `ImportService` validates, syncs and rolls back; `RecordExportService` writes CSV or Excel in the same template |
| Calendar | Google Calendar "create event" link |
| Files | `FILESYSTEM_DISK`: a mounted volume or an S3-compatible bucket; private files behind signed links |
| Exports | Reports generated in the browser (print-to-PDF, HTML-based `.xls`, UTF-8 CSV) and logged on the server; record exports generated on the server |
| Scheduled jobs | Daily cron call to `POST /api/v1/internal/jobs/:name` with `X-Cron-Secret` |
| Tests | Vitest + Testing Library + jsdom; Pest against PostgreSQL; k6 load test (`loadtest/`, never against production) |
| Hosting | One Docker image on Railway (Singapore, branch `main`): Laravel serves the API and the built client (`SpaController`), so there is no CORS or proxy rewrite. Start script `backend/docker/start.sh`; runbook `docs/deploy-notes.md` |

## 12. Delivery Phases

| Phase | Deliverable | Status |
|---|---|---|
| 1–6 | Laravel API, PostgreSQL schema and views, auth, records, survey, statistics, reports, jobs, events, notifications, outreach, tracer questions, and the client on the API | Done (2026-10-19) |
| 7 | Deploy image and checks: Docker image, start script, Neon pooler fix, built-in admin, production config check, argon2id | Done (2026-10-20) |
| 8a | Production service on Railway + Neon from `main`, staff accounts, Change Password screen, no account approval | Done (2026-10-20) |
| 8b | Messages, AI Data Management (masterlist import, record export, audit log, account invite), computed job stats, Privacy & My Data, load test | Done (2026-10-22) |
| 8c | Uploads, cron, real-browser checklist, Gmail-limit plan for imports, DPO sign-off, go-live | In progress |
| 9 | University ownership, UDM domain, Workspace email, account and settings screens, monitoring | Not started |

## 13. Assumptions, Dependencies and Risks

**Assumptions**
- UDM will provide official lists of colleges, programs and graduating batches, and graduate masterlists for import.
- Alumni have an email address and a mobile number.
- One survey cycle is open at a time.
- Employment rate = employed ÷ (traced − further studies).

**Dependencies**
- University-owned GitHub, Railway, Neon and Google accounts (planned soon after launch, section 5.3).
- A Google Workspace mailbox (`no-reply@…`) with domain-wide delegation for system email, plus SPF, DKIM and DMARC on the domain.
- A production domain, since email links and the email logo depend on `APP_URL`.
- Persistent storage for uploads (a Railway volume or an S3 bucket) and its backup.

**Risks**
| Risk | Mitigation |
|---|---|
| Low alumni participation | Give alumni something in return (jobs, events, messages with the office); import masterlists so graduates get an account without registering; keep forms short and mobile-friendly; let Admin trim or reorder questions in Alumni Tracer; promote through colleges; outreach |
| Data privacy breach | Consent, opt-in directory, server-side role scope, audit log, private files behind signed links, no outside AI service; DPO sign-off before launch |
| Someone registers who isn't a UDM graduate | Registration no longer needs approval, so staff check new-registration notifications and flag, archive or merge suspicious records; masterlist imports give a trusted source to match against |
| Inaccurate or duplicate records | Unique Alumni IDs; duplicate detection on import and merging in Records; validation on client and server; import review before confirm, and rollback |
| A large import goes over the Gmail daily limit | Import in batches of a few hundred; failed invites are counted in the audit log, and those alumni can use Forgot Password; move to a Workspace sender or a mail queue |
| Imported alumni miss the invite and the temporary password expires | Sign-in explains the expiry and points to Forgot Password, which works for every account |
| Uploads lost on redeploy | Volume or S3 required before real use (section 5.3); checked in the post-deploy checklist |
| Single-process server under load | `php artisan serve` with 4 workers suits a light load; the load test showed queueing on one worker; move to nginx + PHP-FPM if traffic grows |
| Email stops without warning | Keep the OAuth consent screen *Published*; don't change the mailer account's password; test with `app:mail-test` after changes; move to a Workspace service account |
| Systems on personal accounts | Keep the repo private and limit access; transfer the repo and hosting to the university soon after launch |

## 14. Open Questions

1. Without account approval, how and how often does staff review new self-registrations for people who aren't UDM graduates?
2. Can one college have more staff accounts than the Dean and Program Chair, and who requests and approves them?
3. What data-retention period applies to alumni records, and how are erasure requests handled?
4. What are the official numeric targets for survey completion and registration? (Defaults: 60% coverage, 80% employment.)
5. Does accreditation need report formats or fields beyond the current Form A, Excel and CSV exports?
6. Will employers ever post jobs directly, or will alumni submissions with admin approval remain the only path?
7. How often will the registrar send masterlists, and can they follow the import template?
8. Should Admin changes to tracer questions be versioned per survey cycle, so answers collected under an older question set stay interpretable?
9. What production domain will be used (e.g. `alumni.udm.edu.ph`), and who in the university owns the hosting and email accounts?
10. Should the portal ever send outreach email itself, or does contact stay with staff's own Messenger and mail app?
11. Who answers Messages for the Alumni Relations Office, and what response time should alumni expect?
