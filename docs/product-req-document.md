# Product Requirements Document — UDM Alumni Tracer

| | |
|---|---|
| **Product** | UDM Alumni Tracer (Alumni Portal) |
| **Owner** | UDM Alumni Relations Office |
| **Status** | Draft v1.5. All three roles work end to end on a Laravel API and PostgreSQL database. The production deploy (one Docker image on Railway, Neon PostgreSQL, Singapore) is being set up and verified. See section 1.1 for a production summary and 5.3 for what is left before launch. |
| **Last updated** | 2026-10-20 |

> **What changed in v1.5.** The plan now goes straight to a production deploy on Railway + Neon from `main`, with no separate staging step. Production has no demo data, and `docs/deploy-notes.md` is its runbook. Passwords are now hashed with **argon2id** by default. Older bcrypt hashes are upgraded at the next sign-in, and production refuses to boot with any other hashing driver, so the `HASH_DRIVER` item is gone from 5.3. The production config check is stricter (section 9). Each container start applies migrations and lookups and creates the built-in admin if it is missing. The Neon connection pooler crash is fixed. New section 1.1 summarizes production. Section 5.3 is now split into what blocks launch and what can follow. A new blocker: staff can't change their one-time password in the client.
>
> **What changed in v1.4.** The backend is built. A Laravel (PHP 8.4) REST API on PostgreSQL 16 now backs every screen. The client no longer keeps data in `localStorage`. Accounts, sessions, records, survey answers, statistics, reports, jobs, events, notifications, outreach marks and tracer questions are now stored on the server. Only the unsent registration draft, the privacy consent and UI preferences stay in the browser. Password reset and event confirmation emails are sent through the Gmail API from the shared `/emails` templates. Demo Access and the Sample Email inbox now appear only in demo builds. The app ships as one Docker image that serves the API and the client from the same origin. Section 5.3 now lists what is left before launch.
>
> **What changed in v1.3.** Contact actions hand off to the user's own channels: Messenger, email or the employer's careers page, with the channel recorded. Password reset uses a random code. Emails use shared templates in `/emails`. Event registration produces a confirmation email with an entry pass. Add to Calendar opens Google Calendar.
>
> **What changed in v1.2.** Account approval for self-registered alumni, the Admin **Alumni Tracer** question manager, a separate Edit Profile page and a mobile preview mode.

---

## 1. Overview

UDM Alumni Tracer is a web portal for Universidad de Manila (UDM). It registers graduates and collects tracer-survey data on their employment and career outcomes. It gives colleges and the university administration the information they need to measure graduate employability, reach out to alumni, and report to stakeholders.

The portal serves three roles from one application: **Alumni**, **College / Department**, and **Admin**. Each role gets its own dashboard, navigation, and permissions. The front end is a React single-page app. The back end is a Laravel REST API under `/api/v1` on PostgreSQL. The server is the single source of truth and enforces each role's scope on every list, statistic and report.

### 1.1 Production at a glance

| Area | How production runs |
|---|---|
| **Hosting** | One Docker image (root `Dockerfile`) on **Railway**, region Singapore, deployed from the `main` branch. Laravel (PHP 8.4) serves the API under `/api/v1` and the built React client from the same origin (`SpaController` returns `index.html` for every client route). No CORS, no Vercel rewrite. `php artisan serve` with 4 workers. Healthcheck: `/api/v1/health`. |
| **Database** | **Neon** PostgreSQL 16, Singapore. The app uses the pooled URL (`DB_URL`, emulated prepares because of the PgBouncer pooler). Migrations use the direct URL (`DB_URL_DIRECT`). Point-in-time restore is available, and risky migrations are tested on a Neon branch first. |
| **Start-up** | Every container start caches config, runs migrations, seeds lookups (colleges, programs, batches), creates the built-in admin if missing (`app:ensure-admin`), then serves. Any failure stops the container, and Railway keeps the previous deploy running. |
| **Safety check** | With `APP_ENV=production` the app refuses to start on unsafe or missing configuration and names every problem in the deploy log (section 9). |
| **Data** | Real data only. No `DemoSeeder` (it refuses production), no Demo Access panel and no Sample Email inbox (the image is built without `VITE_DEMO`). People come in only through alumni registration plus admin approval, and staff accounts made with `app:create-user`. |
| **Accounts** | The built-in admin (`admin@udmalumni.edu`) is created once from `ADMIN_PASSWORD`. That variable is removed after the first sign-in. Other admins and one dept account per college are created from a Railway shell with `app:create-user`, which prints a one-time password. |
| **Email** | Gmail API (OAuth) as `udm.alumni.mailer@gmail.com`, about 500 emails a day. It sends two emails: password reset and event registration. The OAuth consent screen must stay *Published*, or the token expires after 7 days. A Workspace `no-reply@` sender comes later. |
| **Uploads** | A Railway volume at `/app/storage/app` or an S3-compatible private bucket. Required, because the container disk is wiped on each deploy. Proofs of employment are served only through signed links. |
| **Scheduled jobs** | A daily HTTP cron calls `POST /api/v1/internal/jobs/{coverage-alerts,notification-retention,token-cleanup}` with `X-Cron-Secret`. |
| **Releases** | Tests and lint pass locally, then merge to `main`. Railway rebuilds, and traffic switches only after the healthcheck passes. Migrations must stay backward-compatible. Rollback means redeploying the previous build and fixing forward with a new migration. |
| **Verification** | The production test checklist in `deploy-notes.md` section 2: platform, database, sign-in, registration and approval, email, every role's features, and cron and logs. It runs in a real browser on the production domain with test alumni who are archived afterwards. |
| **Monitoring** | An uptime monitor on `/api/v1/health`, Railway and Neon usage alerts, a one-time restore test, a backup plan for the uploads volume, and periodic checks of the Gmail account. |

**Production readiness.** The code is ready: every feature in 5.1 is built and tested, and the deploy image, start script, config check and admin bootstrap are done. **Before real users sign in**, production still needs: the Railway service live and passing its healthcheck; uploads storage attached; the daily cron; the change-password screen (staff otherwise keep their printed one-time password); the checklist run in a real browser; and the Data Protection Officer's sign-off. Moving the repo and the hosting, database and email accounts to the university, and using a UDM domain and Workspace sender, are planned but don't block a first launch. The full list is in 5.3.

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
| Build a complete alumni database | Number of registered alumni; % of each graduating batch registered |
| Capture tracer data | % of registered alumni who complete the tracer survey (coverage target: 60%) |
| Measure employability | Employment rate per program and college (target: 80%) |
| Keep records current | % of profiles updated within the last 12 months; average profile completion |
| Give alumni value in return | Job applications submitted; event registrations; returning-user rate |
| Support college decision-making | Reports generated per term; colleges actively using their dashboard |
| Reduce manual reporting effort | Time to produce an employability report (from days to minutes) |

## 4. Target Users and Personas

### 4.1 Alumni
UDM graduates (batches 1999 onward) across all colleges and graduate programs.
**Needs:** register once, keep a profile, complete the tracer survey, find jobs, and hear about events.
**Pain points:** long forms, unclear data-privacy handling, no clear benefit to participating.

### 4.2 College / Department (e.g. College Dean)
Deans and department heads. Each sees **only their own college**. The college comes from the signed-in account on the server, not from a UI choice. Each college needs its own account, created by an admin with `app:create-user --role=dept`.
**Needs:** know how their graduates are doing, find which programs lead to related jobs, and contact alumni for outreach.
**Pain points:** no program-level employment data; cannot reach their own graduates.

### 4.3 Admin (Alumni Relations Office / system administrator)
University-wide staff.
**Needs:** manage all alumni records, approve new registrations, produce university-wide reports, run job postings and events, and maintain the tracer questions.
**Pain points:** manual consolidation of data; no single source of truth.

## 5. Scope

### 5.1 In Scope (v1) — built

#### A. Authentication and Registration
- **Sign In** with email or Alumni ID and password. Show/hide password, and a redirect to the dashboard for the user's role. A wrong email or password gets one generic message. Five failures lock the account for 15 minutes, and sign-in is rate-limited per IP. Footer links open Privacy, Terms of Use, and Contact dialogs.
- **Session.** An opaque server-side session in an `HttpOnly` cookie (`udm_sid`), checked on every request. The client and API share one origin, so the cookie is first-party. Logout, a password reset, a password change and disabling an account all revoke sessions at once.
- **Demo Access panel** on Sign In with four accounts that fill in the form: Alumni, Admin, Dept (College Dean), and **Registered Alumni · Pending**. All use the password `demoPass123`. The panel shows only in dev builds or with `VITE_DEMO=true`. The accounts exist only where the demo seed ran (local development). Production has no demo data, and the demo seed refuses to run there.
- **Forgot / reset password.** Three steps: enter email or Alumni ID, enter the 6-digit code from the email, then set a new password that meets the rules. The API sends the email from the shared `/emails` template. The email contains a single-use, expiring Reset Password link and the code, both checked on the server. A spent or expired link shows the expired state. An unknown email still reaches the done screen, so the flow doesn't reveal which accounts exist.
- **Alumni self-registration:**
  1. Data Privacy Consent (required checkbox; registration routes stay locked until consent is given)
  2. Personal Information: name, birth date, present and permanent addresses ("Same as Present Address"), gender, marital status (name after marriage if married), IP group and PWD declarations with follow-up fields
  3. Contact and Social Media: mobile, email and Facebook/Messenger required; X/Twitter, Instagram, LinkedIn optional
  4. Educational Background: college/department, program (the list depends on the college; "Others" is free text), year graduated
  5. Account Password: 8+ characters, with a number and an uppercase letter, entered twice
  6. Registration Successful: says the account is **pending approval** and links back to Sign In

  Each step is validated in the browser before moving on, and the server repeats every rule. Steps already passed can be revisited from the stepper. The email must not already belong to an account. The questions on steps 2–5 follow the Admin's Alumni Tracer settings (see D).
- **Account approval.** A new registration creates a **pending** account with an Alumni ID (`AM-YYYY-Nnnnn`) and does not sign the person in. Sign In refuses a pending account with a "pending approval" message, but only after the password has matched, so it doesn't reveal which emails are registered. The Admin and the registrant's college get a notification. An Admin approves the account by verifying the registrant's record in Alumni Records, and the alumnus is notified. College users cannot approve accounts.
- **Staff accounts** are created from the command line (`app:create-user`), which prints a one-time password. The built-in admin is created on container start from `ADMIN_PASSWORD` when it doesn't exist yet (`app:ensure-admin`). An existing account is never changed. These accounts are flagged to change their password, but the client has no screen for it yet (5.3).
- **Password storage.** argon2id. A hash made with bcrypt or older argon2id settings is upgraded on the next successful sign-in.
- **Protected routes.** Each role's pages are behind a role guard in the client and role middleware on the API. Signed-in users are sent away from Sign In and Forgot Password, and unknown paths go to the user's home.

#### B. Alumni Portal
| Feature | Description |
|---|---|
| Dashboard | Profile summary and completion, survey status, announcements and events feed, job matches, calls to action |
| Profile | Read-only summary of the alumnus' answers grouped as Personal, Contact, Education, Employment & Career, and Alumni Feedback, with the profile photo, completion, and an Edit action |
| Edit Profile (includes the tracer survey) | `/alumni/profile/edit` (`/alumni/survey` redirects here). One section per tab with Back / Continue and explicit **Save Changes / Cancel**. Covers the registration answers plus the rest of the tracer survey: Educational Background (first-generation graduate, UDMCAT, honors, professional exams), Employment Information, Employment Details (shown if ever employed), Self-Employment (shown if self-employed), and Alumni Feedback. Photo upload and remove (JPG/PNG/WebP, max 2 MB) are part of the draft, so Cancel undoes them. Unsaved changes trigger a leave warning. Server field errors open the right tab. The server computes profile completion (answered ÷ required questions, following Admin edits). Dashboard, Profile and the alumnus' record all show that figure. |
| Proof of employment | When staff request proof, the alumnus gets a notice and uploads the document. Proofs are private files served only through signed links. |
| Jobs | Job board with search and filters, a details view, save, and **Post a job**, which sends the posting to the Admin review queue. **Apply** opens a dialog with an editable application message, prefilled from the profile (name, program, batch, current job, email and mobile). The dialog lists only the channels the posting provides: Facebook Messenger (opens `m.me`; the message is copied to paste), email (opens the mail app with subject and message), or the careers page. The alumnus then marks the job as applied, and the listing shows the channel ("Application sent via Email"). Applying again withdraws. |
| Events | Event cards with date, time, location and status. Registration dialog with the event's custom questions, and cancel registration. Registering sends a confirmation email (event details, answers, entry pass code `UDM-XXXX-NNNNN`). A full event refuses new registrations. **Add to Calendar** opens a Google Calendar event prefilled with the time (Asia/Manila), the venue and a link back to the event. `/alumni/events?event=<id>` opens a single event. In demo builds, "View email" on the registered banner opens the confirmation in the Sample Email inbox (`/alumni/inbox`). |
| Alumni search | Global "Search for an Alumni" overlay (Ctrl+K or "/"). The directory shows only alumni who opted in, and only the contact channels each made visible, with a profile card and contact sheet |

#### C. College / Department Portal
Limited to the account's own college. The API applies the scope to every query; the client never sends it.
| Feature | Description |
|---|---|
| Dashboard | KPIs, employment-status donut and employability insights for the college, filterable by program and batch range. The comparison with the whole university shows rates only, never counts. An Export report button opens Reports with the same filters. |
| Alumni Records | The college's records only, with program and batch filters, search, sorting and pagination. Read-only apart from verifying a record from the quick view. No add, edit, bulk actions, or account approval. |
| Outreach | Unresponsive and untraced alumni of the college. **Contact** opens a dialog with an editable message and the channels the alumnus gave at registration. Facebook Messenger opens `m.me/<handle>` in a new tab and copies the message to paste. Email opens the staff member's mail app with subject and body. The portal sends nothing itself. Confirming records the contact with the date and channel ("Today · Messenger"), and the mark can be removed. A warning shows if the alumnus was contacted recently. |
| Reports | The same report builder as Admin, locked to the college |

#### D. Admin Portal
| Feature | Description |
|---|---|
| Admin Dashboard | System-wide KPIs (alumni, registrations, employment, coverage), employability and graduate-outcome charts filterable by batch range, recent registrations. Export report hands the current scope to Reports. |
| Alumni Records | Table with search, filters (college, program, batch, status), sorting, server-side pagination and KPI cards by status (pending, flagged, verified, archived). Quick-view drawer with **Approve account & verify** for pending registrations. Add, edit and delete records. Bulk verify, flag and delete. Per-record actions: send email and request proof of employment (documents and due date). Both open the staff member's mail app with the composed message and the portal sign-in link, and are logged as "Email composed". Further actions: reassign program/batch with a reason, archive or restore with a reason, merge a duplicate into another record, and view the change history. CSV import (name, program, batch, employment, employer; programs are matched to the catalog) and CSV export. |
| Reports | Five report types: **UDM Alumni Survey — Form A**, **Employability by Program**, **Batch Coverage Audit**, **Employer & Industry Distribution**, and **Inclusion Profile (IP & PWD)**. Filter by college, program and batch range; choose sections (KPIs, chart, table, findings); preview; export to PDF (browser print), Excel (`.xls`) or CSV. Every export is logged on the server and shown in the report history. Figures match the dashboards for the same scope because the server computes them all from the same views. |
| Jobs Management | Post, edit, deactivate, reactivate, delete and restore job postings, with a cover photo. The job form includes "How to apply" (an email or careers-page address) and "Facebook / Messenger", both validated. Alumni submissions include them too. Approve or decline postings submitted by alumni from the review queue; approval publishes the job and notifies only the poster. |
| Events Management | Create, edit, duplicate and delete events and set their status (including Full and Past). Each event has a cover photo (shared, not copied, when duplicated), agenda and custom registration fields. Download the registration list. Publishing, changing or cancelling an event notifies registrants. Each event has a linked Dashboard announcement that can be removed or restored, plus standalone announcements. |
| Alumni Tracer | `/admin/tracer`. Manages every question on the Register form and Edit Profile in nine sections (Personal, Contact, Education, Additional Education, Account Password, Employment, Employment Details, Self-Employment, Feedback), with All / Register / Edit Profile tabs. Admins can edit the question text, placeholder and options; set Required or Shown; reorder; add questions (short text, long text, single choice, dropdown, multi-select); delete added questions; and reset one question or everything. Core fields (names, email, college, program, year, passwords) can't be hidden or made optional. The options of questions that feed the statistics, and of linked fields (college, program, year), can't be changed. Validation on both client and server, and profile completion, follow these settings. Completion counts only Required questions and is recalculated for every alumnus after an edit. |

#### E. Cross-cutting
- Role-based navigation: the sidebar is built from one definition per role.
- Responsive layout. A **mobile preview** mode (`?preview=auto|phone|desktop` or the switcher) shows the phone layout, optionally inside a 390 px device frame.
- UDM visual identity (green and gold palette, UDM and Alumni logos), matching the design file.
- **Notifications** generated by the server for the right recipients. Examples: new pending registrations (Admin sees all, a college sees its own), account approved, job submitted for review, job approved or declined, job matches by skill, event changes, proof requests, and coverage milestones. Read state is stored per user, so it follows the user across devices.
- **Email.** The password-reset and event-registration emails come from shared files in `/emails` (HTML and plain text, sender in `senders.json`). The API sends them through the Gmail API. A failed confirmation email is logged and does not undo the registration.
- **Contact hand-off.** Outreach and job applications use a shared "contact offline" dialog. It lists only the channels on file, opens them in the user's own Messenger, mail app or browser, and then records the channel used.
- **Files.** Profile photos, job and event covers are public files. Proofs of employment are private and served only through signed links. Uploads go to a mounted volume or an S3-compatible bucket.
- **Audit log** of sign-ins, failed sign-ins, sensitive reads, record changes and report exports.
- **Scheduled jobs** (daily): coverage alerts, notification retention, and expired token and session cleanup. They run through a cron call protected by a shared secret.
- Toasts (some with Undo), confirmation dialogs, the global search overlay, and a contact modal.
- Data Privacy Act-aligned consent at registration. The alumni directory is opt-in, with per-channel contact visibility.

### 5.2 Out of Scope (v1)

- Native mobile apps (iOS/Android). The web app is responsive only.
- Social networking: messaging, feeds, or groups. The alumni directory is search-only, opt-in, and limited to signed-in users.
- Online payments, donations, or fundraising.
- Alumni ID cards, certificates, or transcript and document requests.
- Employer self-service portal. Jobs are posted by Admin, or submitted by alumni and approved by Admin.
- Applicant tracking beyond saved/applied status. No interview scheduling or resume parsing.
- Automated job matching beyond basic filtering, skills and program relevance.
- Third-party single sign-on (Google, Facebook) for login.
- Bulk email or SMS campaign tooling. Outreach and custom emails go to individual alumni, sent by staff from their own Messenger or mail app.
- Multi-language support. English only.
- Live integration with the university's student information system or registrar. CSV import of a registrar list is supported.
- Advanced analytics and predictive models.

### 5.3 Remaining Work (before launch)

**Blocks launch**
- **Bring the production service up.** Redeploy Railway with the current `main`, then confirm `/api/v1/health` and the `Created admin account …` line in the deploy log. Attach a volume or S3 bucket for uploads, and add the daily cron (section 1.1).
- **Change password screen.** The API has `POST /auth/change-password`. Staff created with `app:create-user` or `app:ensure-admin` get a one-time password flagged `must_change_password`. The client has no screen for it, and neither the client nor the API enforces the flag. Until the screen exists, staff keep their printed one-time password, and nobody can follow the runbook step "remove `ADMIN_PASSWORD` after the first password change" from the UI. Add the screen and require it at sign-in when the flag is set.
- **Production test checklist.** Run `deploy-notes.md` section 2 in a real browser on the production domain. So far every flow has been tested against the live API only in jsdom. Check the new-tab and mail-app hand-offs, and check that photo and proof uploads work and survive a redeploy. Also check keyboard use in dialogs, the phone layouts, and the received reset and RSVP emails.
- **College accounts.** Create one dept account per college with `app:create-user --role=dept --college=…`.
- **Privacy sign-off** from UDM's Data Protection Officer (RA 10173) on the privacy notice, retention and breach procedure.
- **Retire the old Vercel prototype** (`udm-alumni-demo.vercel.app`). It still keeps data in each visitor's browser, so people could register there by mistake.

**Can follow soon after launch**
- **Account and settings screens.** The API already manages staff accounts (create, disable with immediate sign-out, reset password), app settings (coverage and employment targets) and the audit log. There are no client screens yet, so staff accounts are managed from a Railway shell. The runbook's "fix a locked-out admin from the Users page" needs this screen.
- **University ownership.** Move the GitHub repo to the university org, and move Railway, Neon and Google to university accounts with billing in the university's name.
- **UDM domain and Workspace email.** Set up a custom domain (e.g. `alumni.udm.edu.ph`) and update `APP_URL`. Send email as `no-reply@` through a Workspace service account with domain-wide delegation, with SPF, DKIM and DMARC.
- **Monitoring.** Uptime monitor, Railway and Neon usage alerts, a restore test, and a backup for the uploads.
- Smaller items: the job board's stat strip has three typed-in figures (partners, salary range, response rate); expected 401s from the session check are logged as errors; the Forgot Password step 3 inputs have no labels; the very large view files (`AdminPostsView`, `RecordsView`) should be split.

## 6. Roles and Permissions

| Capability | Alumni | College / Dept | Admin |
|---|:---:|:---:|:---:|
| Sign in / reset password | ✔ | ✔ | ✔ |
| Edit own profile, photo and survey answers | ✔ | — | — |
| Upload requested proof of employment | ✔ | — | — |
| Browse, save, and apply to jobs | ✔ | — | — |
| Submit a job posting for review | ✔ | — | — |
| Browse and register for events | ✔ | — | — |
| Search alumni | Opt-in directory | Own records | Verified records |
| View alumni records | — | Own college only | All |
| Verify a record | — | Own college (not pending accounts) | ✔ |
| Approve a pending registration | — | — | ✔ |
| Add, edit, delete, bulk-update, import, export records | — | — | ✔ |
| Mark alumni as contacted (outreach) | — | Own college only | — |
| View and export reports | — | College-level | System-wide |
| Manage and approve job postings | — | — | ✔ |
| Manage events, registrations, announcements | — | — | ✔ |
| Manage tracer questions (Alumni Tracer) | — | — | ✔ |
| Manage staff accounts and settings (API and command line; no screens yet) | — | — | ✔ |

College users must never have Admin permissions. These rules are enforced on the server for every list, statistic and report. The client never sends its own scope, and the route guards only shape the UI.

## 7. Key User Flows

1. **Register:** Sign In → Register as Alumni → Privacy Consent → Personal Information → Contact and Social Media → Educational Background → Account Password → "Pending approval" screen → back to Sign In. Sign-in is refused until an Admin approves the account.
2. **Approve a registration (admin):** Notification "new registration" → Alumni Records → the new pending record → quick view → **Approve account & verify** (or bulk verify, or verify in the edit form) → the alumnus is notified and can now sign in.
3. **Complete tracer:** Dashboard prompt → Profile → Edit → step through the sections (employment sections depend on the answers) → Save Changes. Completion, the alumnus' record and the statistics update.
4. **Apply to job:** Jobs → search or filter → job details → Apply → edit the prefilled message → open Messenger, email or the careers page → mark as applied → "Application sent via …" shown on the listing.
5. **Submit a job (alumni):** Jobs → Post a job → Admin review queue → Admin approves (published) or declines → the poster is notified.
6. **Generate report:** Reports → select type → filter by college, program and batch range → choose sections → preview → export (PDF, Excel, or CSV) → the export is logged and appears in the report history.
7. **Outreach (college):** Outreach → unresponsive alumni → Contact → edit the message → open Messenger or email → mark as contacted (date and channel shown; the mark can be removed).
8. **Edit the tracer (admin):** Alumni Tracer → pick a section → edit, reorder, require, hide or add questions → the Register form and Edit Profile change right away, and completion is recalculated.
9. **Reset password:** Sign In → Forgot password → enter email or Alumni ID → open the email → Reset Password link or the 6-digit code → set new password → sign in with the new password. Other sessions are signed out. A used or expired link shows the error state.
10. **Register for an event:** Events → event → Register → answer the event's questions → registered banner and confirmation email with the entry pass → Add to Calendar opens Google Calendar.
11. **Request proof (admin):** Alumni Records → record → Request proof → the mail app opens with the message, and the alumnus gets an in-app notice → the alumnus uploads the document → staff open it through a signed link.

## 8. Functional Requirements (summary)

Status: ✔ built and covered by automated tests · ◐ partly built · ○ not built.

| ID | Requirement | Status |
|---|---|:---:|
| FR-1 | Sign-in identifies the user's role and redirects to the matching dashboard. | ✔ |
| FR-2 | A user cannot reach another role's routes. Unauthorized access redirects in the UI and is rejected by the API. | ✔ |
| FR-3 | Registration cannot proceed without privacy consent and valid required fields. The server repeats every validation rule. | ✔ |
| FR-4 | Colleges and programs come from one catalog that feeds registration, profile, filters, record import and reports. | ✔ (server lookups) |
| FR-5 | The survey shows or hides sections and questions conditionally (marital status, IP/PWD, employed or unemployed, still working, self-employed). | ✔ |
| FR-6 | Profile and survey answers are pre-filled from registration and saved per alumnus. | ✔ |
| FR-7 | Admin and College record tables support search, filters, sorting and pagination. | ✔ server-side |
| FR-8 | College users only see data for their assigned college. Benchmarks against the university show rates only. | ✔ |
| FR-9 | Admin can create, edit and delete jobs and events, change their status, and approve or reject alumni job submissions. | ✔ |
| FR-10 | Reports respect the selected college, program and batch scope and can be exported to PDF, Excel or CSV. Each export is logged. | ✔ |
| FR-11 | All buttons, filters, forms, modals and navigation items are functional. | ◐ job board stat strip partly typed in |
| FR-12 | Every statistic is computed from the same data. Admin total = sum of college totals = Records count = Reports total. | ✔ |
| FR-13 | Each alumnus has one record. Duplicates can be merged, and archived or deleted records leave the counts. | ✔ |
| FR-14 | Notifications are generated for the right recipients and roles, and read state is stored per user. | ✔ |
| FR-15 | Logout, a password reset, a password change, or disabling an account revokes existing sessions immediately. | ✔ (no change-password or disable screen in the client yet) |
| FR-16 | The directory shows only alumni who opted in, and only the contact channels they made visible. | ✔ |
| FR-17 | Self-registered accounts start pending and cannot sign in until an Admin approves them. The pending message never reveals whether an email is registered. | ✔ |
| FR-18 | Admin can edit, require, hide, reorder and add tracer questions. Registration, Edit Profile, validation and progress follow the configuration; core fields stay required and shown. | ✔ |
| FR-19 | All users and devices read the same server data; a change saved by one user is what every other user sees next. | ✔ |
| FR-20 | Password reset accepts only the code or link that was sent (single use, expiring), changes the stored password, and never reveals whether an account exists. | ✔ |
| FR-21 | System emails (password reset, event registration) are sent from the shared `/emails` templates. | ✔ (sent through the Gmail API locally; to verify in production) |
| FR-24 | Staff with a one-time password must set their own password before using the portal. | ○ API endpoint only; no client screen, flag not enforced |
| FR-25 | Production refuses to start with missing or unsafe configuration and names every problem. | ✔ |
| FR-22 | Outreach and job applications offer only the contact channels on file (Messenger, email, careers page), hand off to the user's own app, and record the channel used. | ✔ |
| FR-23 | Staff can request proof of employment; the alumnus uploads it, and only authorized staff can open it through a signed link. | ✔ |

## 9. Non-Functional Requirements

- **Privacy and compliance:** Collect explicit consent before storing personal data, in line with the Philippine Data Privacy Act of 2012. Collect only the data the tracer needs. Restrict sensitive fields (IP/PWD status) to authorized roles. The Inclusion report shows aggregated counts only, and the Employer report shows no named alumni. Sensitive reads are audited.
- **Security:** Authorization and row scope are enforced on the server (`Scope::for` on every query). Passwords are hashed with argon2id (pinned in `config/hashing.php`), and older hashes are upgraded at sign-in. Sessions are opaque server sessions in `HttpOnly; Secure; SameSite=Lax` cookies. State-changing API calls must carry `X-Requested-With`. Reset tokens are single-use and expire. Sign-in has rate limiting and a lockout, and responses carry security headers. Uploads are checked for size and type. Secrets live only in host variables, and logs must not contain passwords, tokens, reset codes or cookies.
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
- **Reliability:** Each deploy migrates, seeds lookups and makes sure the built-in admin exists before taking traffic. A failed start keeps the previous deploy running. Migrations must stay backward-compatible, and rollback means redeploying the previous build. The database has point-in-time restore (Neon).
- **Responsiveness:** Usable at mobile, tablet and desktop widths. Phone layout at 760 px and below.
- **Accessibility:** Keyboard-navigable forms, modals and clickable rows (shared `lib/a11y.js` helpers); sufficient color contrast; `jsx-a11y` lint rules; `vitest-axe` checks.
- **Performance:** Initial load under 3 seconds on a typical broadband connection. Routes are code-split (entry chunk about 296 kB, 90 kB gzip). App and database are both in Singapore.
- **Maintainability:** Modular React components. Form questions are defined once in `data/formDefs.js`; navigation in `data/navigation.js`. Statistics are raw SQL in one service (`StatsService`) over database views. Lint is clean on both sides (ESLint; Pint + Larastan level 6).
- **Testability:** Client: Vitest + Testing Library, 160 tests against a `fetch` mock. Backend: Pest, 170+ feature and unit tests against a real PostgreSQL test database, covering scope, invariants, auth (including the hash upgrade), records, stats, reports, jobs, events, outreach, notifications, the deploy commands, the SPA fallback and the production config check. A live-API pass of every role's main flows has also been run.
- **Browser support:** Current versions of Chrome, Edge, Firefox and Safari.

## 10. Design Principles

- `docs/UDM Alumni.dc.html` is the source of truth for UI and UX (it replaces the earlier mockup and ERD files). The application must not be redesigned into a generic admin template.
- Preserve the UDM green and gold palette, off-white backgrounds, typography, card styling, sidebar, status badges and progress indicators.
- Reuse existing terminology from the design file.
- Known deviations in Alumni Tracer: Employment and Employment Details stay separate sections; core fields can't be hidden or made optional; added questions count toward progress only when required; saving empty text or fewer than two options shows an inline error.

## 11. Technical Overview

| Layer | Current build |
|---|---|
| Front end | React 18 + Vite 5, React Router 6, React Context for state; `lib/api.js` calls `/api/v1` on the same origin |
| Styling | Custom CSS carried over from the design prototype |
| API | Laravel (PHP 8.4) REST API under `/api/v1`; lists return `{ data, meta }`, errors `{ error, code?, fields? }` |
| Database | PostgreSQL 16 (Neon in production: pooled URL for the app, direct URL for migrations); schema and stat views in SQL; `LookupSeeder` everywhere, `DemoSeeder` local only |
| Browser storage | Only the unsent registration draft, the privacy consent and UI preferences (e.g. mobile preview) |
| Auth | Server-side sessions (`udm_sid` cookie), argon2id password hashes, lockout, rate limits, reset tokens |
| Email | Gmail API (OAuth as `udm.alumni.mailer@gmail.com`; Workspace `no-reply@` later), templates from `/emails`. Outreach, record emails and job applications hand off to the user's own Messenger or mail app. |
| Calendar | Google Calendar "create event" link |
| Files | `FILESYSTEM_DISK`: a mounted volume or an S3-compatible bucket; private files behind signed links |
| Exports | Generated in the browser (print-to-PDF, HTML-based `.xls`, UTF-8 CSV), logged on the server |
| Scheduled jobs | Daily cron call to `POST /api/v1/internal/jobs/:name` with `X-Cron-Secret` (or `schedule:run`) |
| Tests | Vitest + Testing Library + jsdom; Pest against PostgreSQL |
| Hosting | One Docker image on Railway (Singapore, branch `main`): Laravel serves the API and the built client (`SpaController`), so there is no CORS or proxy rewrite. Start script `backend/docker/start.sh`; runbook `docs/deploy-notes.md` |

## 12. Delivery Phases

The backend phases follow `plan-backend.md`, except that phases 7–9 below differ from it. The separate staging step was dropped: production is deployed directly and verified with the checklist in `deploy-notes.md`.

| Phase | Deliverable | Status |
|---|---|---|
| Front end | Authentication, registration, Alumni / College / Admin portals, account approval, Alumni Tracer, contact hand-off, email templates (prototype on browser storage) | Done (2026-10-19) |
| 1 | Laravel scaffold, PostgreSQL schema and views, seeders | Done (2026-10-19) |
| 2 | Auth: registration, sessions, lockout, password reset, Gmail transport, staff accounts | Done (2026-10-19) |
| 3 | Records, profile, photos and storage, directory | Done (2026-10-19) |
| 4 | Survey, statistics, reports | Done (2026-10-19) |
| 5 | Jobs, events, announcements, notifications, outreach, scheduled jobs, tracer questions | Done (2026-10-19) |
| 6 | Connect the front end to the API | Done (2026-10-19); real-browser pass still to do |
| 7 | Deploy image and checks: Docker image, start script, Neon pooler fix, built-in admin, production config check, argon2id | Done (2026-10-20) |
| 8 | Production on Railway + Neon from `main`: service live, uploads, cron, change-password screen, test checklist, DPO sign-off, go-live | In progress |
| 9 | University ownership, UDM domain, Workspace email, account and settings screens | Not started |

## 13. Assumptions, Dependencies and Risks

**Assumptions**
- UDM will provide official lists of colleges, programs and graduating batches.
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
| Low alumni participation | Give alumni something in return (jobs, events); keep forms short and mobile-friendly; let Admin trim or reorder questions in Alumni Tracer; promote through colleges; outreach |
| Data privacy breach | Consent, opt-in directory, server-side role scope, account approval, audit log, private files behind signed links; DPO sign-off before launch |
| Inaccurate or duplicate records | Unique Alumni IDs; duplicate merging; admin verification and account approval; validation on client and server |
| Demo data or demo access reaching production | `DemoSeeder` refuses production; Demo Access and the Sample Email inbox show only in demo builds |
| Uploads lost on redeploy | Volume or S3 required before real use (section 5.3); checked in the post-deploy checklist |
| Single-process server under load | `php artisan serve` with 4 workers suits a light load; move to nginx + PHP-FPM if traffic grows |
| Staff keep their printed one-time passwords | Build the change-password screen and enforce `must_change_password` before launch (section 5.3) |
| Email stops without warning | Keep the OAuth consent screen *Published*; don't change the mailer account's password; test with `app:mail-test` after changes; move to a Workspace service account |
| Systems on personal accounts | Keep the repo private and limit access; transfer the repo and hosting to the university soon after launch |

## 14. Open Questions

1. How does staff verify that a registrant is actually a UDM graduate before approving the account (manual check, or matching against the registrar's list)?
2. Can one college have several staff accounts, and who requests and approves them?
3. What data-retention period applies to alumni records, and how do alumni request deletion?
4. What are the official numeric targets for survey completion and registration? (Defaults: 60% coverage, 80% employment.)
5. Does accreditation need report formats or fields beyond the current Form A, Excel and CSV exports?
6. Will employers ever post jobs directly, or will alumni submissions with admin approval remain the only path?
7. Will the registrar supply a graduate list for bulk import, and in what format?
8. Should Admin changes to tracer questions be versioned per survey cycle, so answers collected under an older question set stay interpretable?
9. What production domain will be used (e.g. `alumni.udm.edu.ph`), and who in the university owns the hosting and email accounts?
10. Should the portal ever send outreach email itself, or does contact stay with staff's own Messenger and mail app?
