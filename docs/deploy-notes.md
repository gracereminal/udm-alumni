# Deploy notes: production

The production runbook for the UDM Alumni Tracer: how it is deployed, what to test after a deploy, and how to run it day
to day. The design and the reasons behind it are in [plan-backend.md](plan-backend.md) ("Deployment").

**Production setup:** one Docker image (root `Dockerfile`) on **Railway**, with **Neon** PostgreSQL, both in **Singapore**.
Laravel (PHP 8.4) serves the API under `/api/v1` and the built React client from the same origin (`SpaController` returns
`index.html` for every client route), so there is no Vercel rewrite and no CORS. Email goes through the **Gmail API** as
`udm.alumni.mailer@gmail.com` (OAuth). The production branch is `main`.

Replace `<prod domain>` below with the Railway domain of the production service (it is also `APP_URL`).

## Overview

```
Browser ──► Railway service (<prod domain>, branch main, Singapore)
              ├─ /api/v1/*  ──►  Laravel API (php artisan serve, 4 workers)
              │                    ├─► Neon PostgreSQL (pooled URL at runtime, direct URL for migrations)
              │                    ├─► uploads: Railway volume at /app/storage/app, or an S3 bucket
              │                    └─► Gmail API (udm.alumni.mailer@gmail.com), templates from /emails
              └─ /*         ──►  built client (public/ assets, SpaController → index.html)
Cron (daily) ──► POST /api/v1/internal/jobs/:name   (X-Cron-Secret header)
```

**What every container start does** (`backend/docker/start.sh`):

```bash
php artisan config:cache
php artisan migrate --force --database=pgsql_direct
php artisan db:seed --class=LookupSeeder --force
php artisan app:ensure-admin
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}" --no-reload
```

If any step fails (missing variable, failed migration, missing `ADMIN_PASSWORD` while the admin doesn't exist yet), the
container exits and Railway keeps the previous deploy running. The image itself sets `APP_ENV=production`,
`APP_DEBUG=false`, `LOG_CHANNEL=stderr`, `SESSION_SECURE_COOKIE=true`, `SPA_INDEX_PATH`, `EMAIL_TEMPLATES_PATH`,
`PHP_CLI_SERVER_WORKERS=4` and `PORT=8080`.

---

## 1. Production configuration

### 1.1 Railway service

- *Settings → Region*: Southeast Asia (Singapore), next to the database.
- *Settings → Source*: deploy branch `main`.
- *Settings → Networking*: the generated domain (`<prod domain>`), later a custom domain (section 6).
- *Settings → Healthcheck path*: `/api/v1/health`.

### 1.2 Variables

```
APP_KEY=base64:...                  # php artisan key:generate --show; never shared with any other environment
APP_URL=https://<prod domain>       # no trailing slash; used in email links and the email logo
DB_CONNECTION=pgsql
DB_URL=postgresql://...-pooler...?sslmode=require   # pooled, used by the app
DB_URL_DIRECT=postgresql://...?sslmode=require      # direct, used by migrations
MAIL_MAILER=gmail
MAIL_FROM_ADDRESS=udm.alumni.mailer@gmail.com
MAIL_FROM_NAME="UDM Alumni"
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
CRON_SECRET=...                     # openssl rand -hex 32 (24+ characters required)
ADMIN_PASSWORD=...                  # only until the built-in admin has signed in (section 3)
# Uploads on S3 instead of a volume (section 1.4):
FILESYSTEM_DISK=s3
AWS_ENDPOINT=... / AWS_DEFAULT_REGION=... / AWS_BUCKET=... / AWS_ACCESS_KEY_ID=... / AWS_SECRET_ACCESS_KEY=...
AWS_USE_PATH_STYLE_ENDPOINT=true    # most non-AWS S3 providers
```

Do **not** set `APP_ENV` (the image defaults to `production`), `APP_DEBUG`, `ALLOW_DEMO_SEED` or `ADMIN_EMAIL` (it defaults
to `admin@udmalumni.edu`). With `APP_ENV=production`, `AppServiceProvider` refuses to start without `APP_KEY`, an
`https://` non-localhost `APP_URL`, `DB_URL`, a separate non-pooler `DB_URL_DIRECT`, a real mailer with its Google
credentials (refresh token plus client ID and secret), the `AWS_*` bucket settings when `FILESYSTEM_DISK=s3`, and a 24+
character `CRON_SECRET`. It also refuses `APP_DEBUG=true`, `MAIL_MAILER=log`, and any `HASH_DRIVER` other than
`argon2id` (the default in `config/hashing.php`; older bcrypt hashes are upgraded at sign-in). The deploy log names every problem
at once. It can't see whether a volume is mounted, so check uploads after a redeploy (section 2.6).

### 1.3 Production database (Neon)

**Setup (once):**

1. Neon → *New project*: region **AWS Asia Pacific (Singapore)**, PostgreSQL **16**. Production gets its own project, never
   shared with development or a test database (those use their own project or a Neon branch).
2. Keep the default branch (`main`) as the production branch, and mark it **protected** (*Branches → ⋯ → Set as
   protected*) so it can't be deleted or reset by mistake.
3. Create one role and one database for the app, e.g. role `udm_app` and database `udm_alumni`, owned by `udm_app`.
   Don't use the default `neondb_owner` / `neondb` for the app.
4. *Connect* → copy two connection strings for that role and database:
   - **Pooled** (toggle *Connection pooling* on, host contains `-pooler`) → `DB_URL`.
   - **Direct** (pooling off, same host without `-pooler`) → `DB_URL_DIRECT`.

   Both end in `?sslmode=require`. Paste them on Railway only. They contain the password, so they never go in the repo,
   a chat or a screenshot.
5. Compute: set the minimum size to at least 0.25 CU. *Scale to zero* can stay on (the first request after an idle
   period waits ~1 s while the compute wakes), or turn it off on a paid plan for steady response times.
6. Deploy (section 4). The first container start creates the schema, the lookups and the built-in admin. Nothing else is
   loaded by hand: no SQL dump, no `DemoSeeder`.

**What the deploy puts in the database** (every start, all idempotent):

| Step | What it does |
|---|---|
| `migrate --database=pgsql_direct` | Runs `database/sql/001_schema.sql` (29 tables, the enums, `set_updated_at()`, `app_today()`) and `002_views.sql` (the `v_*` dashboard and report views). Already-run migrations are skipped. No extensions are needed. |
| `db:seed --class=LookupSeeder` | Upserts the colleges, programs, skills, `app_setting` defaults and the first survey cycle from `database/seeders/data/catalog.php`. Never overwrites a setting an admin changed. |
| `app:ensure-admin` | Creates `admin@udmalumni.edu` from `ADMIN_PASSWORD` if it is missing (section 3). |

**Connections and why there are two:**

- `DB_URL` (pooled) is used by the app for every request. The `pgsql` connection sets `PDO::ATTR_EMULATE_PREPARES`,
  because Neon's PgBouncer pooler breaks PDO's server-side prepared statements. If the log shows `SQLSTATE[25P02]`
  ("current transaction is aborted"), check that this option is still set in `config/database.php`.
- `DB_URL_DIRECT` (direct) is used only by `migrate --database=pgsql_direct`, because the pooler breaks some DDL. The
  production config check refuses to start if it is missing, equal to `DB_URL`, or a `-pooler` host.
- The database stores timestamps in UTC (`timezone => UTC`). "Today" for due dates and event status is Manila time through
  `app_today()`, so there's no timezone to set on Neon.

**Checking it** (Neon *SQL Editor* on the production branch, read-only queries only):

```sql
SHOW server_encoding;                                    -- UTF8
SELECT migration FROM migrations ORDER BY id;            -- both 2026_10_19_* migrations
SELECT count(*) FROM college;                            -- 11, the colleges in catalog.php
SELECT email, account_status, must_change_password FROM user_account WHERE role = 'admin';
```

Don't edit production data in the SQL Editor. Changes go through the app (so the audit log records them) or through a
forward migration (section 4).

**Backups and restore:**

- Neon keeps a **restore window** (point-in-time history) set under *Settings → Storage*. The free plan keeps only a short
  window, so set it to at least 7 days on a paid plan.
- **Before a risky migration or a bulk import**, create a branch of `main` (*Branches → New branch*, e.g.
  `pre-2026-11-import`). It is an instant snapshot. Delete it once the release is checked.
- **To restore:** first restore into a *new branch* from a point in time and check the data there. Then either restore
  `main` to that point (*Branches → main → Restore*, which keeps a backup branch of the current state) or copy the needed
  rows across. Restoring `main` rolls back everything after that time, including new registrations, so confirm with the
  alumni office first.
- A Neon restore covers the database only. Uploaded files live on the volume or bucket (section 1.4) and need their own
  backup.

**Access:** only the people who deploy have access to the Neon project. Use the role password only in Railway; reset it
(*Roles → Reset password*, then update both URLs on Railway and redeploy) if it ever leaks or someone leaves the team.

### 1.4 Uploads

The container's disk is wiped on every deploy, so photos, job logos, event covers and proof documents need one of:

- a Railway **volume** mounted at `/app/storage/app`, or
- an S3-compatible bucket (the `FILESYSTEM_DISK=s3` and `AWS_*` variables), **private**, with an access key limited to
  that bucket. Proofs are only served through short-lived signed URLs.

### 1.5 Email (Gmail API, OAuth)

The OAuth client lives in the Google Cloud project `udm-alumni-mail` under `udm.alumni.mailer@gmail.com`. Two emails are
sent, synchronously inside the request: `password-reset` and `event-registration` (templates in `/emails`, senders in
`emails/senders.json`).

- The consent screen must stay **Published** ("In production"). A "Testing" app's refresh tokens expire after 7 days and
  email silently stops.
- Changing the account's password, or removing the app at <https://myaccount.google.com/permissions>, revokes the token.
  To get a new one, run `php artisan app:google-oauth-token --client-id=... --client-secret=...` locally (from `backend/`),
  sign in as `udm.alumni.mailer@gmail.com`, and put the new `GOOGLE_OAUTH_REFRESH_TOKEN` on Railway.
- A Gmail account sends roughly **500 emails a day**. Enough for resets and RSVPs.
- Mail arrives from `udm.alumni.mailer@gmail.com` unless `no-reply@` / `events@udmalumni.edu` are added to that account as
  verified *Send mail as* aliases. The move to the UDM Workspace is in section 7.

### 1.6 Scheduled jobs

A Railway **cron** service (or an external HTTP cron) calls these once a day:

| Job | Suggested time (Asia/Manila) |
|---|---|
| `coverage-alerts` | 08:00 |
| `notification-retention` | 02:00 |
| `token-cleanup` | 02:30 |

```bash
curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://<prod domain>/api/v1/internal/jobs/token-cleanup
```

Use the HTTP cron only. Don't also run `php artisan schedule:run`, or the jobs run twice.

---

## 2. Production test checklist

Run this after the first deploy and after any release that touches the area. Use a real browser on the production domain,
with real accounts (production has no demo data, so create test alumni through the normal registration and archive
them afterwards).

### 2.1 Platform

- [ ] `https://<prod domain>/api/v1/health` returns OK, and the Railway healthcheck is green.
- [ ] The deploy log shows the migrations, `Created admin account …` (first deploy) or `Admin account … exists`, then the
      server starting. No errors.
- [ ] Reloading a deep link (e.g. `/admin/records`, `/alumni/jobs`, `/college/outreach`) loads the app, not a 404.
- [ ] An unknown API path (`/api/v1/nope`) returns a JSON error, not the client page. No stack trace in any error response
      (`APP_DEBUG=false`).
- [ ] No Demo Access panel on the sign-in page and no Sample Email inbox links (the image is built without `VITE_DEMO`).
- [ ] DevTools → Application → Cookies: the session cookie is `HttpOnly`, `Secure`, and on the production domain.
- [ ] Response time feels normal from a Philippine connection (the service and database are both in Singapore).

### 2.2 Database

- [ ] `DB_URL` host contains `-pooler`, `DB_URL_DIRECT` doesn't, and both point at the production project and role (not a
      dev branch).
- [ ] The section 1.3 check queries return UTF8, both migrations, the 11 colleges and the built-in admin.
- [ ] Registration's college and program lists show the full catalog (proves `LookupSeeder` ran).
- [ ] Redeploy once: the log shows `Nothing to migrate` and the lookups re-seed without errors.
- [ ] Data saved before that redeploy (a test registration, a changed setting) is still there after it.
- [ ] The restore window is set and a restore into a test branch was tried once (section 5).

### 2.3 Accounts and sign-in

- [ ] The built-in admin (`admin@udmalumni.edu`) signs in with `ADMIN_PASSWORD`, is forced to change the password, and
      the admin dashboard loads.
- [ ] Wrong password: generic error. Repeated failures are rate-limited (`throttle:auth`).
- [ ] Sign out, then the back button doesn't show protected pages.
- [ ] Staff accounts made with `app:create-user` sign in with their one-time password and must change it.
- [ ] A college (dept) account only sees its own college's alumni, stats and reports.
- [ ] An alumni account can't open admin or college routes (redirected, and the API answers 403).

### 2.4 Registration and approval

- [ ] Register a new alumnus. Sign-in is refused as **pending** (the message shows only after the correct password).
- [ ] The admin and that college's dean get a notification.
- [ ] The admin approves it in Alumni Records ("Approve account & verify"). The alumnus is notified and can sign in.
- [ ] Alumni Tracer settings: making an optional question required (or hiding one) changes registration and Edit Profile.
      Put it back afterwards.

### 2.5 Email

- [ ] **Forgot password** by email and by Alumni ID: the email reaches a real Gmail inbox (not spam), looks like the
      template, and its link opens the reset page on `<prod domain>` (proves `APP_URL`).
- [ ] The reset link works exactly once. The 6-digit code locks after 5 wrong tries. An unknown identifier gets the same
      "done" screen.
- [ ] **Event registration** (RSVP): the confirmation arrives with the entry pass, "View event in portal" opens the
      event, and Add to Calendar opens Google Calendar.
- [ ] The sender name is right ("UDM Alumni" / "UDM Alumni Events") and the logo image loads.

### 2.6 Alumni features

- [ ] Edit Profile: profile fields, survey answers and the photo save, and survive a reload.
- [ ] Upload a proof document. It opens only through its signed link (the link stops working after it expires).
- [ ] **Redeploy once, then check the photo and proof still load** (proves the volume or bucket is set up).
- [ ] Directory: hiding a contact field hides it in the directory and the profile modal.
- [ ] Jobs: post a job (pending), the admin approves it and the poster is notified. Save a job. Apply by Messenger, email
      or careers page and the job shows "Application sent via …".
- [ ] Events: register, cancel, register again. Announcements show.
- [ ] Notifications: mark one read, mark all read.

### 2.7 Admin and college features

- [ ] Alumni Records: add, edit, flag / archive (note required), bulk status, import, merge, request proof (opens the mail
      app, records the request).
- [ ] Adding one alumnus changes the Records counter, the admin KPI, the college dashboard and Reports by exactly 1.
      Submitting a survey changes coverage and employment by exactly that person.
- [ ] Dashboards and Reports: batch range filters work. Report export downloads.
- [ ] Outreach (college account): contact by Messenger and by email. The mail / Messenger app opens, the row shows
      "Today · Messenger", nothing is sent by the system, and "Remove contacted mark" works.
- [ ] Events (admin): create, edit, upload a cover, duplicate, cancel, view registrations.
- [ ] Users and Settings (admin): create a user, change a role. The audit log records these.

### 2.8 Scheduled jobs and logs

- [ ] Run each job once by hand with `curl` (section 1.6). Each returns OK and writes a log line.
- [ ] The next day, the cron runs show in the log at the expected times.
- [ ] Scan the Railway logs: no passwords, tokens, reset codes, cookies or full email bodies.

---

## 3. Accounts

Production gets people only through registration and `app:create-user`. 🚫 **Never run `DemoSeeder` against
production** (it refuses `APP_ENV=production` anyway, so don't set `ALLOW_DEMO_SEED`).

1. **Built-in admin:** created on start by `app:ensure-admin` from `ADMIN_PASSWORD` (8+ characters, 1 number, 1 uppercase)
   when `admin@udmalumni.edu` is missing. An existing account is never changed. After the first sign-in and password
   change, **remove `ADMIN_PASSWORD`** from Railway.
2. **Other staff accounts:** open a shell on the service (`railway ssh`, or *service → ⋯ → SSH*) and run:
   ```bash
   php artisan app:create-user --role=admin --email="<real admin email>" --name="Alumni Office Admin"
   php artisan app:create-user --role=dept --college=CCS --email="<dean email>" --name="<name>" --label="College Dean"
   # repeat --role=dept for each college
   ```
   Each command prints a **one-time password**. Send it privately. It must be changed at first sign-in.
3. **Locked-out admin:** create a new admin with `app:create-user`, then fix the old account from the Users page.

## 4. Releases and rollback

1. Run the checks locally before merging to `main`:
   ```bash
   (cd backend && php artisan test && composer lint)
   npm --prefix client test && npm --prefix client run lint
   npm run build
   ```
2. Push / merge to `main`. Railway rebuilds the image and the new container migrates on start. Traffic switches only
   once the healthcheck passes.
3. Run the parts of the checklist (section 2) that the release touches, plus 2.1 and 2.2.
4. **Migrations must be backward-compatible** with the code that's still running: add columns before the code uses them,
   drop them in a later release.
5. **Rollback:** Railway → *Deployments* → *Redeploy* the previous build. A migration that already ran is never rolled
   back (`migrate:rollback` isn't used in production). Fix it with a new forward migration.
6. Before a risky migration, take a Neon branch (snapshot) of the production database so it can be restored (section 1.3).
   Test the migration on a second branch of production first: point a local `DB_URL` / `DB_URL_DIRECT` at that branch,
   run `php artisan migrate --database=pgsql_direct`, then delete the branch.

## 5. Monitoring and backups

- [ ] **Uptime monitor** (e.g. UptimeRobot or Better Stack) on `https://<prod domain>/api/v1/health`, alerting the alumni
      office's IT contact.
- [ ] Railway usage / billing alerts set.
- [ ] **Restore test:** restore a point in time into a separate Neon branch once (section 1.3), and check that the data
      is there. Repeat after big changes.
- [ ] Neon usage alerts set (storage and compute hours), so the database doesn't hit a plan limit and get suspended.
- [ ] If uploads use a Railway volume, plan its backup (volumes are not backed up by the database restore).
- [ ] Check the Gmail account now and then for bounces and "unusual activity" warnings.

## 6. Custom domain (later)

If the app moves to a UDM domain (e.g. `alumni.udm.edu.ph`):

1. Railway → service → *Settings → Networking → Custom domain*, then create the DNS record Railway shows (CNAME).
2. Set `APP_URL=https://alumni.udm.edu.ph` and redeploy, so email links and the logo use the new domain.
3. Add the domain to the Google OAuth consent screen's app domains.
4. Re-test sign-in (cookies are per domain, so everyone signs in again) and the reset / RSVP email links.

## 7. Open items

- [ ] **Ownership:** the GitHub repo is on a personal account (`gracereminal/udm-alumni`) and Railway / Neon / Google are
      on personal accounts. Move them to the university (GitHub → Settings → *Transfer ownership* into the org; Railway and
      Neon project transfer to a university team; billing in the university's name). Keep the repo **private**.
- [ ] **Secrets:** no `.env` file is tracked (`git ls-files | grep -i "\.env"` prints only `backend/.env.example`). Move the
      root `.env.local` (Vercel OIDC token) out of the project folder.
- [ ] **Old Vercel site:** `udm-alumni-demo.vercel.app` is still the frontend-only prototype that keeps data in each
      visitor's `localStorage`. Take it down or redirect it to `<prod domain>` so nobody registers there by mistake. The
      root `vercel.json` and `client/vercel.json` are only for that site.
- [ ] **Email from the UDM Workspace:** send as `no-reply@udmalumni.edu` with a service account and domain-wide delegation
      (`gmail.send` scope only), plus SPF, DKIM and DMARC on `udmalumni.edu`. Then set `GOOGLE_SERVICE_ACCOUNT_JSON` and
      `GOOGLE_IMPERSONATE_USER` and remove `GOOGLE_OAUTH_REFRESH_TOKEN` (the app uses OAuth whenever that is set). Test
      with `php artisan app:mail-test <address>`: SPF, DKIM and DMARC must show `PASS` in *Show original*.
- [ ] **Scaling:** `php artisan serve` with 4 workers is fine for a light load. Move to nginx + PHP-FPM if traffic grows.
- [ ] **Privacy sign-off** from UDM's Data Protection Officer (RA 10173) on the privacy notice, retention and breach
      procedure.
