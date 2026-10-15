# Product Requirements Document — UDM Alumni Tracer

| | |
|---|---|
| **Product** | UDM Alumni Tracer (Alumni Portal) |
| **Owner** | UDM Alumni Relations Office |
| **Status** | Draft v1.1. Front end and backend API are built and tested locally. Not yet hosted. |
| **Last updated** | 2026-10-15 |

---

## 1. Overview

UDM Alumni Tracer is a web portal for Universidad de Manila (UDM). It registers graduates and collects tracer-survey data on their employment and career outcomes. It gives colleges and the university administration the information they need to measure graduate employability, reach out to alumni, and report to stakeholders.

The portal serves three roles from one application: **Alumni**, **College / Department**, and **Admin**. Each role gets its own dashboard, navigation, and permissions. The React front end talks to an Express + PostgreSQL API, and every number on every screen comes from the database.

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
| Capture tracer data | % of registered alumni who complete the tracer survey (coverage target: 60%, stored as a setting) |
| Measure employability | Employment rate per program and college (target: 80%) |
| Keep records current | % of profiles updated within the last 12 months; average profile completion |
| Give alumni value in return | Job applications submitted; event registrations; returning-user rate |
| Support college decision-making | Reports generated per term; colleges actively using their dashboard |
| Reduce manual reporting effort | Time to produce an employability report (from days to minutes) |

## 4. Target Users and Personas

### 4.1 Alumni
UDM graduates (from 1999 onward) across all colleges and graduate programs.
**Needs:** register once, keep a profile, complete the tracer survey, find jobs, and hear about events.
**Pain points:** long forms, unclear data-privacy handling, no clear benefit to participating.

### 4.2 College / Department (e.g. College Dean)
Deans and department heads. Each sees **only their own college**. The college is set on the account by the server, not chosen in the UI.
**Needs:** know how their graduates are doing, find which programs lead to related jobs, and contact alumni for outreach.
**Pain points:** no program-level employment data; cannot reach their own graduates.

### 4.3 Admin (Alumni Relations Office / system administrator)
University-wide staff.
**Needs:** manage all alumni records, produce university-wide reports, and run job postings and events.
**Pain points:** manual consolidation of data; no single source of truth.

## 5. Scope

### 5.1 In Scope (v1)

#### A. Authentication and Registration
- **Sign In** with email or Alumni ID and password. Show/hide password, and a redirect to the dashboard for the user's role. Sessions are server-side and held in an httpOnly cookie.
- **Demo-account buttons** appear only in development or when `VITE_DEMO=true`. They work only where the backend demo seed has been run.
- **Forgot / reset password.** The user requests a reset and receives a real email with a single-use, expiring link and a 6-digit code. They verify, then set a new password. Expired or used links show an error state. The demo "Sample Email Inbox" has been removed.
- **Alumni self-registration**, a multi-step flow with a progress indicator. Each step is validated in the browser and again on the server:
  1. Data Privacy Consent (required checkbox)
  2. Personal Information: name, birth date, present and permanent addresses, gender, civil status, IP/PWD declarations
  3. Contact and Social Media: mobile, email, Facebook, X/Twitter, Instagram, LinkedIn
  4. Educational Background: college/department, program (or "other"), year graduated
  5. Account Password: 8+ characters, with a number and an uppercase letter
  6. Registration Successful. The user is signed in, and admins and the user's college are notified.
- **Protected routes.** No role can open another role's pages, and the API rejects any request outside the user's role and scope.
- **Change password** for a signed-in user.
- **Login protection:** rate limiting on auth endpoints, account lockout after repeated failures, and a generic "invalid credentials" message.

#### B. Alumni Portal
| Feature | Description |
|---|---|
| Dashboard | Profile completion, job matches, events attended, survey status, recent activity, calls to action |
| Profile | View and edit personal, contact, educational, and employment information. Upload and remove a profile photo. Shows a completion indicator and validates input. Also manages social links, credentials (honors, exams), skills (with up to 3 top skills), employment history with proof documents, and privacy settings (directory opt-in, show email, show mobile). |
| Alumni Tracer Survey | Lives inside Profile (`/alumni/survey` redirects there). Step-by-step and progress-tracked, with answers pre-filled from registration. Answers can be edited before submission, and the unsaved draft is kept in the browser. Sections: Personal, Contact and Social Media, Educational Background, Employment Information, Employment Details, Self-Employment (conditional), and Alumni Feedback. |
| Jobs | Listings with search and filters, a job details view, save and apply actions, and application status. Alumni can **submit a job posting for admin review**. |
| Events | Event cards showing date, time, location, and status. Alumni can register (with custom registration questions), cancel a registration, and add an event to their calendar. Announcements are also shown here. |
| Alumni directory search | A global search over alumni who opted in to the directory. It shows only the contact channels each alumnus made visible. |

#### C. College / Department Portal
Scoped on the server to the account's own college.
| Feature | Description |
|---|---|
| Dashboard | Alumni statistics and employability insights for the college, compared with university-wide **rates** (no other college's counts) |
| Alumni Records | Records for the college only, with program and batch filters, search, sorting, and pagination. The record tools are the same as Admin's, limited to the college. |
| Outreach | Lists unresponsive and untraced alumni of the college. Staff can contact them individually and record each attempt's outcome (sent, reached, no response, bounced). |
| Reports | College-level reports, locked to the college, with PDF, Excel, or CSV export |

#### D. Admin Portal
| Feature | Description |
|---|---|
| Admin Dashboard | System-wide KPIs (alumni, registrations, employment, coverage), charts, recent registrations and activity, global search |
| Alumni Records | Table with search, filters (college, program, batch, status), sorting, and pagination. Admins can view and edit record details and create records (full name, contact email, employment). They can verify, flag, or archive records, singly or in bulk, merge duplicates, and map a typed program to an official one. They can also import rows in bulk, request proof of employment, and send custom emails. |
| Reports | Five report types: **Form A** (UDM Alumni Survey), **Employability by Program**, **Batch Coverage Audit**, **Employer & Industry Distribution**, and **Inclusion Profile (IP & PWD)**. Filter by college and program, choose sections, preview, and export to PDF, Excel, or CSV. Every export is logged in a report history. |
| Jobs Management | Create, edit, deactivate, reactivate, delete, and restore job postings, with a cover photo. Admins **approve or reject** postings submitted by alumni from a review queue. |
| Events Management | Create, edit, duplicate, cancel, and delete events, and set their status (open, full, past). Each event has a cover photo, agenda, and custom registration fields. Admins can view the real registration list and manage announcements. |
| Platform (API) | User accounts (`/users`) for provisioning college and admin accounts, app settings (targets, employment-rate rule), and the audit log. There is no admin screen for these yet; see 5.3. |

#### E. Cross-cutting
- Role-based navigation (the sidebar changes with the signed-in role).
- Responsive design for desktop, tablet, and mobile.
- UDM visual identity (green and gold palette, UDM logo), matching the approved mockup.
- **Notifications** are created on the server by the action that triggers them, and each role's bell reflects what the other roles did. Examples: a new registration notifies admin and that college; a job approval notifies the poster; an event change notifies alumni; a coverage drop notifies the college. Read state follows the user across devices.
- Toasts, confirmation dialogs, a global search overlay, and a contact modal.
- Data Privacy Act-aligned consent at registration. Directory listing and contact visibility are opt-in.
- **Audit log** of failed logins, sensitive reads, record changes, and report exports.
- **Scheduled jobs**, triggered by the host's cron: coverage alerts, notification retention (read notifications are deleted after 90 days), and expired token cleanup.

### 5.2 Out of Scope (v1)

- Native mobile apps (iOS/Android). The web app is responsive only.
- Social networking: messaging, feeds, or groups. The alumni directory is search-only, opt-in, and limited to signed-in users.
- Online payments, donations, or fundraising.
- Alumni ID cards, certificates, or transcript and document requests.
- Employer self-service portal. Jobs are posted by Admin, or submitted by alumni and approved by Admin.
- Applicant tracking beyond saved/applied status. No interview scheduling or resume parsing.
- Automated job matching beyond basic filtering and program/skill relevance.
- Third-party single sign-on (Google, Facebook) for login.
- Bulk email or SMS campaign tooling. Outreach and custom emails go to individual alumni.
- Multi-language support. English only.
- Live integration with the university's student information system or registrar. Bulk import of a registrar list is supported.
- Advanced analytics and predictive models.

### 5.3 Remaining Work (before launch)

- **Browser end-to-end pass** of every role against the running API (the front end is tested against a mocked API only).
- **Hosting:** staging and production database, API, and object storage on university-owned accounts. Add the `/api` rewrite to the root `vercel.json` so the browser sees one origin.
- **Production email:** a Google Workspace service account with domain-wide delegation for the Gmail API mail driver (the code is done).
- **Admin Users screen** over the existing `/users` API for creating and disabling college and admin accounts (optional for v1; the `create-user` script covers it meanwhile).
- Split the very large view files (`AdminPostsView`, `RecordsView`) for maintainability.

## 6. Roles and Permissions

| Capability | Alumni | College / Dept | Admin |
|---|:---:|:---:|:---:|
| Sign in / reset / change password | ✔ | ✔ | ✔ |
| Edit own profile, photo, privacy settings | ✔ | — | — |
| Complete tracer survey | ✔ | — | — |
| Browse, save, and apply to jobs | ✔ | — | — |
| Submit a job posting for review | ✔ | — | — |
| Browse and register for events | ✔ | — | — |
| Search the opt-in alumni directory | ✔ | ✔ | ✔ |
| View alumni records | — | Own college only | All |
| Create, edit, verify, merge, import records | — | Own college only | All |
| Contact alumni (outreach) | — | Own college only | ✔ |
| View and export reports | — | College-level | System-wide |
| Manage and approve job postings | — | — | ✔ |
| Manage events, registrations, announcements | — | — | ✔ |
| Manage users, settings; read audit log (API) | — | — | ✔ |

College users must never have Admin permissions. Scope is enforced on the server for every list, statistic, and report. The client never sends a scope.

## 7. Key User Flows

1. **Register:** Sign In → Register as Alumni → Privacy Consent → Personal Information → Contact and Social Media → Educational Background → Account Password → Success → Alumni Dashboard.
2. **Complete tracer:** Dashboard prompt → Profile survey → step through sections (employment branches depend on answers) → review and edit → submit → submitted state. Coverage and employment statistics update for that person.
3. **Apply to job:** Jobs → search or filter → job details → Apply → status shown on the listing.
4. **Submit a job (alumni):** Jobs → Post a job → pending review → Admin approves or rejects → the poster is notified.
5. **Generate report:** Reports → select type → filter by college and program → choose sections → preview → export (PDF, Excel, or CSV) → the export appears in the report history.
6. **Outreach (college):** Outreach → unresponsive alumni → contact → record the outcome.
7. **Reset password:** Sign In → Forgot password → email with link and code → verify → set new password. Expired or used links show an error state, and all existing sessions are revoked.

## 8. Functional Requirements (summary)

| ID | Requirement |
|---|---|
| FR-1 | Sign-in identifies the user's role and redirects to the matching dashboard. |
| FR-2 | A user cannot reach another role's routes. Unauthorized access redirects in the UI and is rejected by the API. |
| FR-3 | Registration cannot proceed without privacy consent and valid required fields. The server repeats every validation rule. |
| FR-4 | Colleges and programs are database lookup tables. They are the single source of truth for registration, profile, filters, and reports. |
| FR-5 | The survey shows or hides sections and questions conditionally (e.g. marital status, employed or unemployed, self-employed). |
| FR-6 | Profile and survey data are stored in the database and pre-filled from registration. Only the unsaved survey draft is kept in the browser. |
| FR-7 | Admin and College record tables support search, filters, sorting, and pagination on the server. |
| FR-8 | College users only see data for their assigned college. Benchmarks against the university show rates only. |
| FR-9 | Admin can create, edit, and delete jobs and events, change their status, and approve or reject alumni job submissions. |
| FR-10 | Reports respect the selected college and program scope and can be exported to PDF, Excel, or CSV. Each export is logged. |
| FR-11 | All buttons, filters, forms, modals, and navigation items are functional. |
| FR-12 | Every statistic is computed by the server from the same database views. The UI never counts or holds hardcoded totals. Admin total = sum of college totals = Records count = Reports total. |
| FR-13 | Each alumnus has one record. Duplicates are merged, and merged or archived records are excluded from all counts. |
| FR-14 | Notifications are generated on the server for the right recipients and roles, and read state is stored per user. |
| FR-15 | Logout, a password reset, or disabling an account revokes existing sessions immediately. |
| FR-16 | The directory shows only alumni who opted in, and only the contact channels they made visible. |

## 9. Non-Functional Requirements

- **Privacy and compliance:** Collect explicit consent before storing personal data, in line with the Philippine Data Privacy Act of 2012. Collect only the data the tracer needs. Restrict sensitive fields (IP/PWD status) to authorized roles. The Inclusion report shows aggregated counts only, and the Employer report shows no named alumni.
- **Security:** Server-side authorization and row scope. Passwords hashed with argon2id. Opaque server-side sessions in `HttpOnly; Secure; SameSite=Lax` cookies. A custom header is required on state-changing requests. Reset tokens are single-use and expire. Rate limiting and account lockout protect the login. Security headers come from `helmet`. Uploads are checked for size and file type, and private files are served through signed URLs.
- **Responsiveness:** Usable at mobile, tablet, and desktop widths.
- **Accessibility:** Keyboard-navigable forms and modals; sufficient color contrast; jsx-a11y lint rules and axe checks in tests.
- **Performance:** Initial load under 3 seconds on a typical broadband connection. Routes are code-split (entry chunk about 85 kB gzip). Tables paginate on the server.
- **Maintainability:** Modular React components (Sidebar, Topbar, Cards, Tables, Forms, Modals, Badges, Charts). Lint is clean on client and backend.
- **Testability:** Backend tests run against an embedded Postgres (93 tests), and client tests run against a mocked API (105 tests).
- **Browser support:** Current versions of Chrome, Edge, Firefox, and Safari.

## 10. Design Principles

- The approved `Alumni Tracer Mockups.dc.html` is the source of truth for UI and UX. The application must not be redesigned into a generic admin template.
- Preserve the UDM green and gold palette, off-white backgrounds, typography, card styling, sidebar, status badges, and progress indicators.
- Reuse existing terminology from the mockup.

## 11. Technical Overview

| Layer | Choice |
|---|---|
| Front end | React 18 + Vite 5, React Router 6, React Context for state; calls the API through `client/src/lib/api.js` (same-origin `/api/v1`) |
| Styling | Custom CSS carried over from the prototype |
| API | Node.js 20+ and Express 5 (REST + JSON), `zod` validation, `pino` logging |
| Database | PostgreSQL 16 with `node-pg-migrate` migrations; 28-table schema based on `UDM Alumni ERD.dc.html`, plus statistics views |
| Auth | Self-hosted in the API: argon2id hashes, server-side sessions, password reset tokens and codes |
| Email | Gmail API through a Google Workspace service account (SMTP fallback; console driver in development) |
| File storage | Local disk in development; S3-compatible bucket (Neon Object Storage) in production |
| Scheduled jobs | Host cron calling `POST /api/v1/internal/jobs/:name`, protected by a secret |
| Tests | Vitest + Supertest (backend), Vitest + Testing Library + vitest-axe (client) |
| Hosting | Front end on Vercel. API and database on a separate host (to be decided), reached through a Vercel `/api` rewrite so cookies stay first-party |

## 12. Delivery Phases

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Front end: authentication, registration, password reset UI | Done |
| 2 | Front end: Alumni portal (Dashboard, Profile + Survey, Jobs, Events) | Done |
| 3 | Front end: College and Admin portals (dashboards, records, outreach, reports, jobs and events management) | Done |
| 4 | Backend: schema, auth and sessions, records, survey, statistics, reports, outreach, jobs, events, notifications, files, audit log, scheduled jobs | Done and tested (local) |
| 5 | Front end connected to the API; hardcoded data and demo inbox removed | Done in code; browser end-to-end check pending |
| 6 | Hosting (staging, then production), production email, go-live | Not started; needs university-owned accounts |

## 13. Assumptions, Dependencies and Risks

**Assumptions**
- UDM will provide official lists of colleges, programs, and graduating batches.
- Alumni have an email address and a mobile number.
- One survey cycle is open at a time.
- Employment rate = employed ÷ (traced − further studies). This can be changed in settings.

**Dependencies**
- A Google Workspace mailbox (`no-reply@…`) and a service account with domain-wide delegation for reset and outreach email.
- University-owned hosting accounts for the API, database, and object storage.
- A decision on the production domain, since email links depend on it.

**Risks**
| Risk | Mitigation |
|---|---|
| Low alumni participation | Give alumni something in return (jobs, events); keep forms short and mobile-friendly; promote through colleges; coverage alerts and outreach |
| Data privacy breach | Consent, opt-in directory, server-side role and row scope, audit logging, session revocation |
| Inaccurate or duplicate records | Unique Alumni IDs; merge tool; admin verification; validation on client and server |
| Demo data reaching production | The demo seed refuses non-local databases unless explicitly allowed; demo buttons are hidden in production builds |
| Front end not yet verified against the live API | Full browser pass of every role before commit and deploy |

## 14. Open Questions

1. Who verifies that a registrant is actually a UDM graduate (manual approval, or matching against the registrar's list)? New registrations start as **pending** until staff verify them.
2. Can one college have several staff accounts? (The data model allows it; who requests and approves them?)
3. What data-retention period applies to alumni records, and how do alumni request deletion?
4. What are the official numeric targets for survey completion and registration? (Defaults: 60% coverage, 80% employment.)
5. Does accreditation need report formats or fields beyond the current Form A, Excel, and CSV exports?
6. Will employers ever post jobs directly, or will alumni submissions with admin approval remain the only path?
7. Will the registrar supply a graduate list for bulk import, and in what format?
8. Which host (e.g. Render + Neon, or Railway) and which production domain will be used?
