# UDM Alumni Tracer

Alumni tracer for Universidad de Manila: alumni register and answer the tracer survey, colleges follow up with their graduates, and the Alumni Office gets reports (including CHED Form A).

- **Frontend:** React 18 + React Router 6 + Vite 5 in `client/`, deployed to Vercel.
- **Backend:** a Laravel (PHP 8.4) REST API on PostgreSQL 16 in `backend/`, served under `/api/v1`. **Being rebuilt.** The spec is [docs/plan-backend.md](docs/plan-backend.md), and progress is tracked in [track-progress.md](track-progress.md).

> Right now the client is a frontend-only prototype: its data lives in `localStorage` (synced across tabs), and `backend/` is empty. Emails (password reset, event registration) are not sent; they open in a **Sample Email** inbox inside the app instead. Phase 6 of the plan brings back `client/src/lib/api.js` and the Vite `/api` proxy from commit `915ca4e` and reconnects the client to the API.

## Requirements

| Part | Needs |
|---|---|
| Client | Node.js 18+ (22 LTS recommended) |
| Backend | PHP 8.4 with `pdo_pgsql`, `mbstring`, `fileinfo`, `openssl`, `sodium`, `zip`, `curl`; Composer 2; PostgreSQL 16 (local install or a Neon dev branch). On Windows, [Laravel Herd](https://herd.laravel.com/windows) installs PHP and Composer together. |

## Running locally

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

To start over with fresh demo data, clear the site's `localStorage` (keys start with `udm.`).

**Backend** (once `backend/` exists; from `backend/`):

```bash
composer install
cp .env.example .env               # then set DB_URL, MAIL_MAILER=log, …
php artisan key:generate
php artisan migrate
php artisan db:seed --class=LookupSeeder
php artisan db:seed --class=DemoSeeder      # local/staging only
php artisan serve --port=4000               # the Vite /api proxy (back in phase 6) points here
php artisan test                            # Pest
composer lint                               # Pint + Larastan
```

The first staff accounts are created with `php artisan app:create-user --role=admin --email=…` (it prints a one-time password).

## Demo accounts (password `demoPass123`)

The demo buttons on Sign In show only in dev or with `VITE_DEMO=true`. In the prototype the accounts are built into the client. Once the API is back, the accounts exist only where `DemoSeeder` ran (local and staging, never production).

| Role | Email | Lands on |
|---|---|---|
| Alumni | `maria.delacruz@udmalumni.edu` (or Alumni ID `24-05-567`) | `/alumni/dashboard` |
| Alumni, pending approval | `paolo.mendoza@gmail.com` (can sign in after an admin approves it) | `/alumni/dashboard` |
| College / Department | `ccs.dean@udmalumni.edu` (College of Computing Studies) | `/college/dashboard` |
| Admin | `admin@udmalumni.edu` | `/admin/dashboard` |

New alumni register through **Register as Alumni**: Privacy Consent → Personal → Contact & Social → Education → Account Password → Success. The account stays pending until an admin verifies the record.

## Project layout

```text
client/            React + Vite frontend (own package.json)
backend/           Laravel REST API (empty until plan phase 1; see docs/plan-backend.md)
emails/            email templates (.html + .txt) and senders.json, shared by the Sample Email inbox and the future mailer
docs/              backend plan, deploy runbook, PRD, design reference (UDM Alumni.dc.html)
track-progress.md  current status, known issues and decision log; read it before changing anything
vercel.json        Vercel build config + rewrites (/api → API host, everything else → SPA)
```

### Client (`client/src`)

```text
components/   NavSidebar, Topbar (search pill, notification bell, user chip), FormField, DatePicker, Modal, Pager, alumni/
context/      Auth, Profile (registration + survey), Records, Jobs, Events, Search, Toast providers
data/         form / survey definitions, per-role navigation, demo data (prototype only)
hooks/        page controllers (records, reports), chart tooltip, confirm/toast helpers
layouts/      AppShell (responsive hooks), PortalPage
lib/          analytics, dashboard view-models, validation, storage, contact links, question store, email templates, profile progress
pages/        auth/ (incl. SampleInbox) · alumni/ · college/ · admin/ (incl. AlumniTracer)
routes/       AppRoutes + role guards (a role can only open its own area)
views/        presentational screens converted 1:1 from the prototype markup
styles/       prototype.css (responsive rules) + global.css
```

### Backend (`backend/`, planned)

```text
app/Http/Controllers/Api/V1/   one controller per API area
app/Http/Requests/             Form Request validation (mirrors client/src/lib/validation.js)
app/Http/Resources/            JSON response shapes
app/Services/                  Alumni, Survey, Stats (raw SQL), Reports, Sessions, Notifications, Storage, Audit
database/migrations, sql/      schema, enums and stat views
database/seeders/              LookupSeeder (every env), DemoSeeder (local/staging)
routes/api.php                 /api/v1 routes
tests/                         Pest feature and unit tests
```

## Roles

- **Alumni:** Dashboard, Profile (with the tracer survey), Jobs (search/filter, details, save, apply by Messenger, email or careers page, post for review), Events (register, add to calendar).
- **College / Department:** Dashboard, Alumni Records and Reports for its own college only, Outreach (contact by Messenger or email).
- **Admin:** Dashboard, Alumni Records (incl. approving pending registrations), Reports (5 types incl. CHED Form A), Alumni Tracer (edit registration and survey questions), Jobs management (post / edit / deactivate / delete, approve alumni submissions), Events management (create / edit / duplicate / delete, status, registrations, announcements).

## Deployment

The frontend is on Vercel (project `udm-alumni-demo`). The root `vercel.json` builds `client/`, serves `client/dist` and rewrites all routes to `index.html`. Once the API is hosted, it also rewrites `/api/*` to the Laravel host, so the browser sees one origin and the session cookie stays first-party.

```bash
npx vercel --prod --yes   # frontend-only redeploy
```

Full steps (API host, database, storage, Gmail, staging → production) are in [docs/deploy-notes.md](docs/deploy-notes.md). `client/vercel.json` is an unused duplicate of the root file; deploy-notes Step 3 deletes it.

The Git remote is `origin` → `github.com/gracereminal/udm-alumni` (a personal account); it moves to the university's GitHub org before staging.

`.env.local` (created by the Vercel CLI) holds a local OIDC token and is git-ignored. Don't commit it, and never commit `backend/.env`.
