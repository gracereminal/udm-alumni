# UDM Alumni Tracer

Alumni tracer for Universidad de Manila. Alumni register and answer the tracer survey. Colleges follow up with their graduates. The Alumni Office gets reports, including CHED Form A.

- **Frontend:** React 18 + React Router 6 + Vite 5 in `client/`.
- **Backend:** a Laravel (PHP 8.4) REST API on PostgreSQL 16 in `backend/`, served under `/api/v1`. The spec is [docs/plan-backend.md](docs/plan-backend.md).
- **Deploy:** one Docker image (root `Dockerfile`). Laravel serves both the API and the built client from the same origin. It runs on Render with Neon PostgreSQL. The runbook is [docs/deploy-notes.md](docs/deploy-notes.md).

Status and the decision log are in [track-progress.md](track-progress.md). Backend phases 1–6 are done and the client runs on the API. The product scope is in [docs/product-req-document.md](docs/product-req-document.md).

> **Production runs in demo mode.** The Render deployment is a working demo of the system, not a live service for UDM alumni. It holds **dummy data only** (`backend/dummy_data.sql`: 4,000 fictional alumni from every college, 2022–2026, an admin and 10 college accounts, 2 events, 5 jobs, all on `@example.com`). No real alumni data, registrar masterlists or personal information go into it. See [Demo mode](#demo-mode-production).

## Requirements

| Part | Needs |
|---|---|
| Client | Node.js 18+ (22 LTS recommended) |
| Backend | PHP 8.4 with `pdo_pgsql`, `mbstring`, `fileinfo`, `openssl`, `sodium`, `zip`, `curl`, `intl`. You also need Composer 2 and PostgreSQL 16, either a local install or a Neon dev branch. On Windows, [Laravel Herd](https://herd.laravel.com/windows) installs PHP and Composer together. |

Machine-specific setup (Herd PATH, the portable Postgres on port 5433) is in [backend/README.md](backend/README.md).

## Running locally

Start the API first, then the client. Vite proxies `/api` to `http://localhost:4000`.

**Backend** (from `backend/`):

```bash
composer setup                     # install, create .env, APP_KEY, migrate + seed (lookups and demo data)
# then set DB_URL in .env (and MAIL_MAILER=log to write emails to storage/logs/laravel.log)
php artisan serve --port=4000      # or: composer dev
composer test                      # Pest, against the udm_alumni_test database
composer lint                      # Pint + Larastan
php artisan migrate:fresh --drop-views --drop-types --seed   # rebuild the dev database
```

**Client** (from the repo root):

```bash
npm run install:client   # installs client/ dependencies
npm run dev              # http://localhost:5173
npm run build            # production build -> client/dist
npm run preview          # serve the production build locally
npm --prefix client test # Vitest
npm --prefix client run test:coverage
npm --prefix client run lint
```

Staff accounts are created with `php artisan app:create-user --role=admin --email=…`. For a college account use `--role=dept --college=CCS`. The command prints a one-time password.

## Demo accounts (password `demoPass123`)

These accounts exist only where `DemoSeeder` ran (local). Production uses the dummy data in `backend/dummy_data.sql` instead (see [Demo mode](#demo-mode-production)). The demo buttons on Sign In appear only in dev or when the build has `VITE_DEMO=true`.

| Role | Email | Lands on |
|---|---|---|
| Alumni | `maria.delacruz@udmalumni.edu` (or Alumni ID `24-05-567`) | `/alumni/dashboard` |
| Alumni, pending approval | `paolo.mendoza@gmail.com` (can sign in after an admin approves it) | `/alumni/dashboard` |
| College / Department | `ccs.dean@udmalumni.edu` (College of Computing Studies) | `/college/dashboard` |
| Admin | `admin@udmalumni.edu` | `/admin/dashboard` |

New alumni register through **Register as Alumni**. The steps are Privacy Consent → Personal → Contact & Social → Education → Account Password → Success. The account stays pending until an admin verifies the record.

With `MAIL_MAILER=log`, password-reset codes and links are written to `backend/storage/logs/laravel.log`. In demo builds, the event-registration email also opens in the in-app **Sample Email** inbox (`/alumni/inbox`).

## Project layout

```text
client/            React + Vite frontend (own package.json)
backend/           Laravel REST API (own README); backend/docker/start.sh is the container start script
emails/            email templates (.html + .txt) and senders.json, sent by the API and previewed by the client
docs/              backend plan, deploy runbook, PRD, design reference (UDM Alumni.dc.html)
Dockerfile         single-host image: client build -> Composer vendor -> PHP 8.4 runtime
track-progress.md  current status, known issues and decision log; read it before changing anything
vercel.json        only for the old frontend-only Vercel site (see Deployment)
```

### Client (`client/src`)

```text
components/   NavSidebar, Topbar (search pill, notification bell, user chip), FormField, DatePicker, Modal, Pager, OfflineContactModal, alumni/
context/      Auth, Profile (registration + survey), Jobs, Events, Search, Toast providers, all reading the API
data/         form / survey definitions, per-role navigation, Demo Access accounts
hooks/        page controllers (records, reports), avatar picker, dialog dismiss, mobile preview, confirm/toast helpers
layouts/      AppShell (responsive hooks, phone preview), PortalPage
lib/          api.js (same-origin /api/v1, session cookie), analytics, dashboard view-models, validation, contact links, question store, email templates, profile progress
pages/        auth/ (incl. SampleInbox) · alumni/ · college/ · admin/ (incl. AlumniTracer)
routes/       AppRoutes (lazy-loaded pages) + role guards (a role can only open its own area)
views/        presentational screens converted 1:1 from the prototype markup
styles/       prototype.css (responsive rules) + global.css
```

### Backend (`backend/`)

```text
app/Http/Controllers/Api/V1/   one controller per API area
app/Services/                  Alumni, Profile, Survey, Stats (raw SQL; the only place numbers are computed), Reports, Jobs, Events, TracerQuestion, Storage, ScheduledJobs
app/Support/                   Scope (row filter for every query), survey mapping, profile progress, entry pass
app/Console/Commands/          create-user, ensure-admin, google-oauth-token, mail-test, daily jobs
database/sql/                  schema and stat views, run by the migrations
database/seeders/              LookupSeeder (every environment), DemoSeeder (local/staging only)
routes/api.php                 /api/v1 routes with their role middleware
tests/                         Pest feature and unit tests
```

Lists return `{ data, meta: { page, per_page, total } }`. Errors return `{ error, code?, fields? }`.

## Roles

- **Alumni:** Dashboard, Profile, and Edit Profile (which holds the tracer survey). Jobs: search and filter, details, save, apply by Messenger, email or careers page, and post a job for review. Events: register, entry pass email, add to calendar.
- **College / Department:** Dashboard, Alumni Records and Reports for its own college only, Outreach (contact by Messenger or email). The API sets the scope from the account.
- **Admin:** Dashboard, Alumni Records (including approving pending registrations), Reports (5 types including CHED Form A), and Alumni Tracer (edit registration and survey questions). Jobs management: post, edit, deactivate and delete, and approve alumni submissions. Events management: create, edit, duplicate and delete, set status, registrations, announcements.

## Demo mode (production)

Production is a demonstration environment. It runs the real production build and configuration, but every person, account, event and job in it is made up.

- **Data:** loaded once from `backend/dummy_data.sql` (about 3 MB, so run it with `psql "<DB_URL_DIRECT>" -v ON_ERROR_STOP=1 -f backend/dummy_data.sql`; it refuses to run if alumni already exist). It creates 4,000 alumni across all 10 colleges (CAS 520, CBA 560, CBPM 400, CCS 480, CCJ 520, COED 520, CET 480, CHS 320, CLAW 80, GS 120; batches 2022–2026), each with an alumni account, with survey answers and employment, so every dashboard and report has realistic numbers.
- **Accounts:** alumni sign in as `firstname.lastname.N@example.com`, the admin as `admin@example.com`, and each college as `<code>.dean@example.com` (e.g. `ccs.dean@example.com`). The committed file stores **no passwords**, so none of these can sign in. To give them the shared test passwords, run `backend/dummy_data_pass.sql` after it. That file holds only the password updates, stays local and is git-ignored. Never commit it.
- **What gets committed:** only `backend/dummy_data.sql` and `backend/wipe_data.sql`. `backend/dummy_data_pass.sql` never is.
- **No real data:** don't register real alumni, import real masterlists or upload real documents. The `@example.com` addresses have no inbox, so reset, invite and RSVP emails to them go nowhere. For the same reason, two-step verification (`MFA_ENABLED`, on) can't email them a code: run `backend/dummy_security_questions.sql` and use the "Security questions" tab (answers `Santos` and `Manila`).
- **Reset:** run `backend/wipe_data.sql` in the Neon SQL Editor, then load `dummy_data.sql` again. The wipe deletes every alumni record and account, the `@example.com` accounts, the dummy events and jobs, alumni job submissions and import batches. It keeps the lookups, the built-in admin, other staff and the audit log.

Going live with real alumni would need the steps in [docs/deploy-notes.md](docs/deploy-notes.md) and the Data Protection Officer's sign-off first. That is not planned for this deployment.

## Deployment

The app deploys as one Docker image on Render, with Neon PostgreSQL in Singapore. On each start, the container caches the config, then migrates using the direct database URL. It then seeds the lookups and creates the built-in admin if it is missing (`app:ensure-admin` from `ADMIN_PASSWORD`). Finally it serves on `$PORT`. If any step fails, the deploy fails and the previous one keeps running. In production, the app refuses to boot when required variables are missing or unsafe. Variables, the post-deploy checklist, accounts, rollback and monitoring are all in [docs/deploy-notes.md](docs/deploy-notes.md).

```bash
docker build -t udm-alumni .   # same image Render builds from the repo root
```

Email goes through the Gmail API as `udm.alumni.mailer@gmail.com`. To get the OAuth refresh token, run `php artisan app:google-oauth-token`. To test sending, run `php artisan app:mail-test <address>`.

The old Vercel site (`udm-alumni-demo.vercel.app`) is still the frontend-only prototype that keeps data in the browser. The root `vercel.json` and `client/vercel.json` exist only for it. It should be taken down or redirected once the Render service is live.

The Git remote is `origin` → `github.com/gracereminal/udm-alumni`, a personal account. It would move to the university's GitHub org only if the system ever goes live with real data.

Never commit `backend/.env` or `backend/account.md` (a local list of real accounts; it is git- and docker-ignored). `.env.local` at the root holds a Vercel OIDC token. It is git-ignored too, but should be moved out of the project folder.
