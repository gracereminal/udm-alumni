# ISO/IEC 25010 Quality Prompt — UDM Alumni Tracer (React + Laravel)

You are working on **"UDM Alumni"** (Universidad de Manila), a full-stack alumni tracer:

- **Client** (`client/`): React 18 + Vite 5 + React Router 6 SPA. Talks to the API only through
  `src/lib/api.js` (same-origin `/api/v1`, session cookie, `X-Requested-With`, `list()` / `page()` for
  `{ data, meta }` lists). State lives in contexts (`AuthContext`, `ProfileContext`, `JobsContext`,
  `EventsContext`, `SearchContext`, `ToastContext`, `ResetFlowContext`).
- **Backend** (`backend/`): Laravel (PHP 8.4) REST API on PostgreSQL 16, under `/api/v1`, with services in
  `app/Services`, role middleware (`role:alumni|dept|admin`), `SecurityHeaders`, `RequestId`, `RequireXhr`.
- **Deploy**: one Docker image (root `Dockerfile`) serves the API and the built client from the same origin
  (`SpaController`), deployed on Railway + Neon at https://udm-alumni-production.up.railway.app (branch
  `main`). Runbook: `docs/deploy-notes.md`.

Roles: **Alumni**, **College / Department** (`dept`, scoped to its own college), **Admin**.
Screens: Sign In, Forgot Password (+ Sample Email inbox), Data Privacy Consent, Register as Alumni
(Personal → Contact & Social → Education → Account Password), Registration Successful (pending approval),
Alumni Dashboard / Profile / Edit Profile / Jobs / Events, College Dashboard (with Outreach), Admin Dashboard,
Alumni Records, Reports, Jobs management, Events management, Alumni Tracer (question manager).

**Goal:** evaluate and improve the system against six quality characteristics — **Functionality,
Reliability, Efficiency, Usability, Security, and Portability** — mapped to ISO/IEC 25010 as Functional
suitability, Reliability, Performance efficiency, Interaction capability (usability), Security, and
Flexibility (named Portability before the 2023 edition). Keep the current visual design (`docs/UDM Alumni.dc.html`)
and behaviour unless a change is needed to fix a quality issue.

## Before changing anything

1. Read `track-progress.md` first (status, known issues, decisions), then `docs/plan-backend.md`,
   `client/package.json`, `client/vite.config.js`, `client/src/routes/` and `backend/routes/api.php`.
2. Don't assume a feature is missing because it isn't listed here: grep the code first.
3. Give a short summary and plan, and wait for approval before large changes (new libraries, folder
   restructuring, state-management swaps, schema changes).
4. Update `track-progress.md` after each fix.

## Tooling already in place (use it to measure, don't assume)

| Area | Client (`client/`) | Backend (`backend/`) |
|---|---|---|
| Lint / static analysis | `npm run lint` (ESLint 9 + react, react-hooks, jsx-a11y) | `composer lint` (Pint + Larastan level 6) |
| Tests | `npm test` (Vitest + Testing Library, fetch mock in `src/test/mockApi.js`) | `composer test` (Pest, against `udm_alumni_test`) |
| Coverage | `npm run test:coverage` (v8) | Pest `--coverage` if Xdebug/PCOV is available |
| Accessibility | `vitest-axe` (`src/test/setup.test.jsx`) | — |
| Bundle | `npm run build:analyze` (rollup-plugin-visualizer → `stats.html`) | — |
| Dependencies | `npm run audit` | `composer audit` |

Last recorded baseline (2026-10-20): Vitest 193/193 (23 files, incl. the page-level tests), ESLint clean,
entry chunk 297 kB (90 kB gzip); `composer test` 203/203 (1306 assertions), `composer lint` clean (Pint +
Larastan 0 errors); `npm audit` and `composer audit` not run yet. Re-run everything and report the current numbers.

## Evaluate and fix each characteristic

For each item: confirm what is already implemented (cite the file), then fix what is missing.

### 1. Functionality (Functional suitability)

**Already implemented — verify end to end, per role:**
- Sign-in by email or Alumni ID, role-based landing, route guards (`routes/guards.jsx`).
- Registration with recorded privacy consent (`privacy_consent_at`), validation in `lib/validation.js`
  mirrored by `backend/app/Support/RegistrationRules.php`; new accounts start **pending** until an Admin
  verifies the record in Alumni Records.
- Forgot password with a server-checked 6-digit code; no account enumeration.
- Tracer survey inside Edit Profile (`/alumni/profile/edit`), driven by the Alumni Tracer question config
  (`/tracer/questions`, `lib/questionStore.js`, `data/formDefs.js`).
- Jobs (board, save, apply via Messenger / email / careers page with `applied_via`, alumni submissions →
  admin approval queue), Events (RSVP with entry-pass email, add to calendar, capacity), announcements,
  notifications, College Outreach (`/outreach`, offline-contact dialog).
- Alumni Records (create, verify/approve, bulk, merge, proof requests, CSV), Reports (5 types incl.
  Inclusion Profile; PDF print, Excel, CSV; exports logged via `POST /reports/exports`), College data
  scoped to the account's college by the API.
- Dashboard numbers come from `/stats/*` views and must equal Records and Reports counts
  (`backend/tests/Feature/StatsTest.php`, `InvariantTest.php`).
- Page-level client tests render the full app at the route (`src/test/renderApp.jsx`) for Alumni Records,
  Reports, Admin/Alumni Jobs and Admin/Alumni Events (`pages/**/*.test.jsx`).

**Open issues to fix:**
- Job board stat strip is typed in (`pages/alumni/AlumniJobs.jsx` `jobStats`: "42 Partners",
  "₱45k – ₱85k Avg", "94% Response Rate"). Compute from `/jobs` or remove (no typed-in stats).
- Alumni cannot request deletion of their account/data: `/me` has view, edit, photo and proofs only.
  Add a deletion/deactivation request flow (see Security, RA 10173).

### 2. Reliability

**Already implemented — verify:**
- `lib/api.js` maps network failure to "Can't reach the server…", 5xx to a generic message, keeps field
  errors (`ApiError.fields`), and fires `udm:unauthorized` on a 401 so `AuthContext` signs out cleanly.
- `AuthContext` ignores a stale `/auth/session` answer older than the last sign-in/out.
- Registration draft (`udm.registration.draft.v1`) and Edit Profile draft survive a refresh;
  `beforeunload` guards unsaved Edit Profile / admin Events forms.
- Backend: one JSON error shape (`ApiException`), request ids (`RequestId`), audited writes inside the same
  transaction (`AuditService`), `/api/v1/health` for the host healthcheck, start script that fails the deploy
  on any migration/seed error, Neon pooler fix (emulated prepares, direct URL for migrations).

**Open issues to fix:**
- No React error boundary: a render error blanks the app. Add one around the routes (inside `App.jsx`'s
  `Suspense`) with a friendly fallback and a reload button; also handle a failed lazy chunk load.
- `Suspense fallback={null}` shows nothing while a page chunk loads; show a lightweight loader.
- No request timeout in `api()`: add an `AbortController` timeout and a clear "took too long" message;
  consider an offline banner (`navigator.onLine` + `online`/`offline` events).
- Confirm every data-driven screen has loading, empty and error states, and that a failed save never
  clears form input.
- API logs every signed-out `GET /auth/session` 401 as `local.ERROR`; log expected 4xx `ApiException`s at
  info/debug so real errors stand out.
- Uploads are lost on each deploy until a Railway volume or S3 disk (`FILESYSTEM_DISK=s3`) is configured.
- Scheduled jobs (coverage alerts, notification retention, token cleanup) need the daily cron to
  `POST /api/v1/internal/jobs/*` with `X-Cron-Secret`.

### 3. Efficiency (Performance efficiency)

**Already implemented — verify:**
- Registration and signed-in pages are `React.lazy` in `routes/AppRoutes.jsx`; entry chunk 296 kB
  (largest lazy chunk `AlumniRecords` ~88 kB), no >500 kB warning.
- Lists are paginated server-side (`{ data, meta }`, `per_page` ≤ 100) and paged in the UI (`Pager`).
- Stats come from database views rather than client-side counting.

**Check and improve:**
- `lib/api.js` `list()` reads *every* page of an endpoint; find callers that load whole tables
  (Records, directory, jobs) and switch them to `page()` with server-side filters where possible.
- `index.html` loads four Google Font families (Inter, Plus Jakarta Sans, Playfair Display,
  JetBrains Mono) with many weights; trim to the weights actually used.
- Optimize `public/udm-logo.jpg` / `alumni-logo.png` and uploaded photos (size limits already: 2 MB, JPG/PNG/WebP).
- Check the backend for N+1 queries and missing indexes on filter columns (college, batch, status).
- Avoid unnecessary re-renders in the large views (`views/AdminPostsView.jsx`, `views/RecordsView.jsx`);
  memoize only where profiling shows it helps.
- Target Lighthouse performance ≥ 90 on the production build; report API p95 response time for
  dashboard, Records and Reports.

### 4. Usability (Interaction capability)

**Already implemented — verify in a real browser:**
- ESLint jsx-a11y clean; clickable non-button elements use `lib/a11y.js` (`onActivate`, `onBackdrop`)
  with `role` / `tabIndex` / Enter + Space; modals use `role="presentation"` backdrops and
  `hooks/useDialogDismiss.js` for Escape and focus.
- Shared `FormField`, `DatePicker`, `Modal`, `Pager`, `Icon`, toasts, confirm toasts (`useConfirmToast`).
- Responsive `AppShell` (phone layout ≤ 760 px, `useNarrow`, `?preview=` switcher).

**Open issues to fix:**
- Forgot Password step 3: the two password inputs have no label or placeholder
  (`views/ForgotPasswordView.jsx`). Give them visible labels.
- Meet WCAG 2.2 AA: prefer real `<button>` / `<a>` over role-patched `div`s where it doesn't change the
  design; text contrast ≥ 4.5:1 (check slate grays like `#94A3B8` on white); min 12 px text, 16 px
  inputs on mobile, 44×44 px touch targets; visible focus styles; move focus to the page heading on route
  change.
- Keyboard-tab through every modal and form, and check phone layouts at 360 px — none of this has been
  checked in a real browser since the a11y codemod and phase 6.
- Consistent, inline, field-level error messages from both client validation and API `fields`.
- Confirmation dialogs for every destructive action (delete job/event, reject/merge record, remove photo).
- Run a short task-based test (e.g., register, update survey, post a job, export a report) with a few
  alumni and staff, and record completion and errors.

### 5. Security

**Already implemented — verify:**
- Server-side role checks on every route (`RequireRole`), college scoping (`Support/Scope.php`), client
  guards only for UX.
- Session cookie auth (`http_only` true, `same_site` lax; set `SESSION_SECURE_COOKIE=true` in production),
  `RequireXhr` on state-changing calls, no tokens in `localStorage`.
- Passwords hashed with argon2id, old hashes upgraded at sign-in; account lockout
  (`auth.lockout.threshold` / `minutes`), `throttle:auth` and `throttle:outreach` rate limits, generic
  sign-in errors, no account enumeration on reset, `must_change_password` for staff-issued passwords,
  immediate sign-out when an account is disabled.
- `SecurityHeaders`: CSP (strict `default-src 'none'` for the API, a tight SPA policy), `nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, CORP, HSTS in production, 1 MB JSON body limit.
- Private proof files behind signed URLs (`files.private`, `signed:relative`); directory masked by
  `v_directory` and the alumnus' privacy settings; audit log of changes, failed sign-ins and sensitive
  reads (no passwords, tokens, codes or full emails in diffs); production config check
  (`ProductionConfigTest`); `backend/account.md` git- and docker-ignored.

**Open issues to fix:**
- `pages/auth/SampleInbox.jsx` renders email HTML with `dangerouslySetInnerHTML`. Confirm every
  interpolated value is escaped in the templates (`/emails`, `lib/emailTemplates.js`), or sanitize, and
  keep the Sample Inbox out of production builds unless intended.
- Demo-account buttons only in dev or with `VITE_DEMO=true`; make sure `ALLOW_DEMO_SEED` is off in production.
- `.env.local` in the project root holds a Vercel OIDC token: move it out of the project folder.
- No secrets in the client (only public `VITE_` variables); no personal data logged to the console in production.
- Run `npm audit` and `composer audit`; fix high and critical findings.
- **Data Privacy Act (RA 10173):** consent is recorded and declining is handled respectfully; add the
  alumni data-deletion request (see Functionality), a data-retention rule, and document who can see what.
- Move the repo and hosting accounts to university ownership before production.

### 6. Portability (Flexibility)

**Already implemented — verify:**
- Single Docker image (Node 22 client build → Composer `--no-dev` → `php:8.4-cli-bookworm`), listens on
  `$PORT`; any host that runs containers can serve it. Split Vercel + API host setup documented as the alternative.
- Configuration from environment variables: `VITE_API_URL`, `VITE_API_PROXY`, `VITE_DEMO`, `APP_URL`,
  `DB_URL` / `DB_URL_DIRECT`, `MAIL_MAILER` + `GOOGLE_OAUTH_*`, `FILESYSTEM_DISK`, `CRON_SECRET`,
  `ADMIN_EMAIL` / `ADMIN_PASSWORD`, `SESSION_*`.
- Storage abstracted by Laravel disks (local or S3); mail by a transport (`GmailTransport` or log).
- Built-in admin on start (`app:ensure-admin`), staff via `app:create-user`; migrations + `LookupSeeder`
  run automatically on start.
- Same-origin API by default, so no CORS setup is needed on a single host.

**Check and improve:**
- Works on current Chrome, Edge, Firefox and Safari, desktop and mobile (Android / iOS), from 360 px to wide desktop.
- Reports export in standard formats (CSV, Excel, PDF) that open in common office software.
- Document every environment variable with an example in `.env.example` (client and backend) and the README.
- Delete the duplicate `client/vercel.json` and the generated `client/stats.html`; add the `/api`
  rewrite to root `vercel.json` only if the split setup is used.
- Colors, spacing and typography defined in one place (`styles/global.css` tokens) rather than repeated
  inline styles; split the very large views (`AdminPostsView` ~3480 lines, `RecordsView` ~2800) so the
  code is easier to adapt.
- Confirm the system installs from a clean checkout with only the README steps (dev: Herd PHP + Postgres
  16 + `npm run dev`; prod: the Docker image).

## Deliverables

- A summary table: characteristic, status (Pass / Needs work / Fail), evidence (file or test), main issue.
- Code changes in small, reviewable commits grouped by characteristic.
- A change log listing each fix with the files it touched, and `track-progress.md` updated.
- Before/after numbers: Vitest and Pest pass counts and coverage, ESLint / Larastan errors, axe
  violations, bundle size, Lighthouse scores, API p95 times, `npm audit` / `composer audit` results.
- A list of what still needs a real-browser or on-host check (staging on Railway, emails, uploads, cron).
- An evaluation instrument for respondents (alumni, college staff, admin, IT experts): a 5-point Likert
  questionnaire with 3–5 statements per characteristic (Functionality, Reliability, Efficiency,
  Usability, Security, Portability), written in plain language about what users can observe.
