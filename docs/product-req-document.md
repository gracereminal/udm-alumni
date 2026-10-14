# Product Requirements Document — UDM Alumni Tracer

| | |
|---|---|
| **Product** | UDM Alumni Tracer (Alumni Portal) |
| **Owner** | UDM Alumni Relations Office |
| **Status** | Draft v1.0 — front-end prototype built; backend pending |
| **Last updated** | 2026-10-14 |

---

## 1. Overview

UDM Alumni Tracer is a web portal for Universidad de Manila (UDM) that registers graduates, collects tracer-survey data on their employment and career outcomes, and gives colleges and the university administration the information they need to measure graduate employability, reach out to alumni, and report to stakeholders.

The portal serves three roles from one application: **Alumni**, **College / Department**, and **Admin**. Each role gets its own dashboard, navigation, and permissions.

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
| Capture tracer data | % of registered alumni who complete the tracer survey |
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
Deans and department heads. Each sees **only their own college**.
**Needs:** know how their graduates are doing, find which programs lead to related jobs, and contact alumni for outreach.
**Pain points:** no program-level employment data; cannot reach their own graduates.

### 4.3 Admin (Alumni Relations Office / system administrator)
University-wide staff.
**Needs:** manage all alumni records, produce university-wide reports, and run job postings and events.
**Pain points:** manual consolidation of data; no single source of truth.

## 5. Scope

### 5.1 In Scope (v1)

#### A. Authentication and Registration
- **Sign In** with email or Alumni ID and password, show/hide password, role-based redirect to the correct dashboard, and a demo-account selector for the prototype.
- **Forgot / reset password** flow (request, verification, new password, expired-link handling).
- **Alumni self-registration**, a multi-step flow with a progress indicator and validation:
  1. Data Privacy Consent (required checkbox)
  2. Personal Information (name, birth date, addresses, gender, civil status, IP/PWD declarations, contact details and social media)
  3. Educational Background (college/department, program, year graduated)
  4. Registration Successful
- **Protected routes** so that no role can open another role's pages.

#### B. Alumni Portal
| Feature | Description |
|---|---|
| Dashboard | Profile completion, connections, job matches, events attended, survey status, recent activity, calls to action |
| Profile | View and edit personal, educational, and employment information; profile photo; completion indicator; validation |
| Alumni Tracer Survey | Step-by-step, progress-tracked survey; answers pre-filled from registration; editable before submission; submitted state. Sections: Personal, Contact and Social Media, Educational Background, Employment Information, Employment Details, Self-Employment (conditional), Alumni Feedback |
| Jobs | Listings with search and filters, job details, apply action, application status |
| Events | Event cards with date, time, location, status, and registration actions |

#### C. College / Department Portal
Scoped to the user's own college.
| Feature | Description |
|---|---|
| Dashboard | Alumni statistics and employability insights for the college |
| Alumni Records | Records for the college only, with program and batch filters |
| Outreach | Contact alumni of the college |
| Reports | College-level reports and insights |

#### D. Admin Portal
| Feature | Description |
|---|---|
| Admin Dashboard | System-wide KPIs: alumni, registrations, employment, survey/tracer statistics, charts, recent activity, global search |
| Alumni Records | Table with search; filters for college, program, batch, and status; view and manage record details |
| Reports | Choose report type and filter by college, program, and batch; generate and view report statistics |
| Jobs Management | Create, edit, delete or deactivate job postings; manage status |
| Events Management | Create, edit, delete events; manage status; view registrations |

#### E. Cross-cutting
- Role-based navigation (the sidebar changes with the signed-in role).
- Responsive design for desktop, tablet, and mobile.
- UDM visual identity (green and gold palette, UDM logo), matching the approved mockup.
- Notifications, toasts, confirmation dialogs, and a global search overlay.
- Data Privacy Act-aligned consent at registration.

### 5.2 Out of Scope (v1)

- Native mobile apps (iOS/Android). The web app is responsive only.
- Social networking: messaging, feeds, groups, or a public alumni directory. "Connections" is a dashboard indicator only.
- Online payments, donations, or fundraising.
- Alumni ID cards, certificates, or transcript and document requests.
- Employer self-service portal. Job postings are created by Admin only.
- Applicant tracking beyond application status. No interview scheduling or resume parsing.
- Automated job matching beyond basic filtering and relevance indicators.
- Third-party single sign-on (Google, Facebook) for login.
- Bulk email or SMS campaign tooling. Outreach is limited to contacting alumni individually.
- Multi-language support. English only.
- Integration with the university's student information system or registrar.
- Advanced analytics and predictive models.

### 5.3 Planned Next (after prototype, not in the current build)

- **Backend and database.** The prototype runs on local React state and sample data. Server-side persistence, authentication, and authorization are the first follow-on.
- **Real password-reset email via Google** (Gmail API or Google Workspace SMTP), with a single-use, expiring token link (30 minutes) and a 6-digit code. The demo "Sample Email Inbox" will be removed at that point.
- Real file storage for profile photos and attachments.
- Export of reports to PDF/CSV.
- Audit logging for admin actions.

## 6. Roles and Permissions

| Capability | Alumni | College / Dept | Admin |
|---|:---:|:---:|:---:|
| Sign in / reset password | ✔ | ✔ | ✔ |
| Edit own profile | ✔ | — | — |
| Complete tracer survey | ✔ | — | — |
| Browse and apply to jobs | ✔ | — | — |
| Browse and register for events | ✔ | — | — |
| View alumni records | — | Own college only | All |
| Contact alumni (outreach) | — | Own college only | — |
| View reports | — | College-level | System-wide |
| Manage job postings | — | — | ✔ |
| Manage events and registrations | — | — | ✔ |

College users must never have Admin permissions.

## 7. Key User Flows

1. **Register:** Sign In → Register as Alumni → Privacy Consent → Personal Information → Educational Background → Success → Alumni Dashboard.
2. **Complete tracer:** Dashboard prompt → Survey → step through sections (employment branches depend on answers) → review and edit → submit → submitted state.
3. **Apply to job:** Jobs → search or filter → job details → Apply → status shown on the listing.
4. **Generate report (Admin):** Reports → select type → filter by college, program, and batch → generate → view statistics.
5. **Reset password:** Sign In → Forgot password → email with link/code → verify → set new password (expired links show an error state).

## 8. Functional Requirements (summary)

| ID | Requirement |
|---|---|
| FR-1 | Sign-in identifies the user's role and redirects to the matching dashboard. |
| FR-2 | A user cannot reach another role's routes. Unauthorized access redirects. |
| FR-3 | Registration cannot proceed without privacy consent and valid required fields. |
| FR-4 | The college and program lists are the single source of truth for registration, profile, filters, and reports. |
| FR-5 | The survey shows or hides sections and questions conditionally (e.g. marital status, employed or unemployed, self-employed). |
| FR-6 | Survey and profile data persist and are pre-filled from registration. |
| FR-7 | Admin and College record tables support search, filters, and pagination. |
| FR-8 | College users only see data for their assigned college. |
| FR-9 | Admin can create, edit, and delete jobs and events, and change their status. |
| FR-10 | Reports respect the selected college, program, and batch scope. |
| FR-11 | All buttons, filters, forms, modals, and navigation items are functional. |

## 9. Non-Functional Requirements

- **Privacy and compliance:** Collect explicit consent before storing personal data, in line with the Philippine Data Privacy Act of 2012. Collect only the data the tracer needs. Restrict sensitive fields (IP/PWD status) to authorized roles.
- **Security:** Server-side authorization once a backend exists; hashed passwords; expiring single-use reset tokens; no client-only trust of role.
- **Responsiveness:** Usable at mobile, tablet, and desktop widths.
- **Accessibility:** Keyboard-navigable forms and modals; sufficient color contrast.
- **Performance:** Initial load under 3 seconds on a typical broadband connection. Tables paginate.
- **Maintainability:** Modular React components, with reusable Sidebar, Topbar, Cards, Tables, Forms, Modals, Badges, and Charts.
- **Browser support:** Current versions of Chrome, Edge, Firefox, and Safari.

## 10. Design Principles

- The approved `Alumni Tracer Mockups.dc.html` is the source of truth for UI and UX. The application must not be redesigned into a generic admin template.
- Preserve the UDM green and gold palette, off-white backgrounds, typography, card styling, sidebar, status badges, and progress indicators.
- Reuse existing terminology from the mockup.

## 11. Technical Overview

| Layer | Choice |
|---|---|
| Front end | React + Vite, React Router, React Context for state |
| Styling | Custom CSS carried over from the prototype |
| Data (current) | Local sample data and in-memory state |
| Backend (planned) | To be decided; must provide authentication, role-based authorization, persistence, and email delivery |
| Hosting | Vercel |

## 12. Delivery Phases

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Authentication: Sign In, Privacy Consent, Registration, Success, password reset | Built (prototype) |
| 2 | Alumni portal: Dashboard, Profile, Survey, Jobs, Events | Built (prototype) |
| 3 | College and Admin portals: dashboards, records, outreach, reports, jobs and events management | Built (prototype) |
| 4 | Backend, database, real authentication and email, export, audit log | Not started |

## 13. Assumptions, Dependencies and Risks

**Assumptions**
- UDM will provide official lists of colleges, programs, and graduating batches.
- Alumni have an email address and a mobile number.

**Dependencies**
- A Google account or Workspace for password-reset email.
- A decision on backend stack and hosting for the database.

**Risks**
| Risk | Mitigation |
|---|---|
| Low alumni participation | Give alumni something in return (jobs, events); keep forms short and mobile-friendly; promote through colleges |
| Data privacy breach | Consent, role-scoped access, server-side authorization, audit logging |
| Inaccurate or duplicate records | Alumni ID uniqueness; admin record management; validation |
| Prototype data mistaken for production | Backend phase before launch; remove demo accounts and the sample inbox |

## 14. Open Questions

1. Who verifies that a registrant is actually a UDM graduate (manual approval, or matching against the registrar's list)?
2. How are College / Department accounts provisioned, and can one college have several users?
3. What data-retention period applies to alumni records, and how do alumni request deletion?
4. What are the official numeric targets for survey completion and registration?
5. Which report types and formats (PDF, CSV) does accreditation require?
6. Will employers ever post jobs directly?
