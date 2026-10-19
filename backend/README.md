# UDM Alumni Tracer API

Laravel REST API under `/api/v1`. The spec is [docs/plan-backend.md](../docs/plan-backend.md); deployment is in
[docs/deploy-notes.md](../docs/deploy-notes.md); progress is in [track-progress.md](../track-progress.md).

## Local setup (Windows dev machine)

PHP and Composer come from Laravel Herd. In Git Bash they are not on the PATH, so prefix commands with:

```bash
export PATH="$HOME/.config/herd/bin/php85:$PATH"
alias composer='php ~/.config/herd/bin/composer.phar'
```

PostgreSQL 16 is a portable install in `C:\Users\grace\pgsql16` (port 5433, `trust` auth on localhost, user
`postgres`). It does not start with Windows:

```bash
PG=/c/Users/grace/pgsql16/pgsql/bin
$PG/pg_ctl.exe -D /c/Users/grace/pgsql16/data -o "-p 5433" -l /c/Users/grace/pgsql16/pg.log start   # stop: ... stop
$PG/psql.exe -p 5433 -U postgres -d udm_alumni
```

Databases: `udm_alumni` (dev) and `udm_alumni_test` (tests). A Neon dev branch works too: set `DB_URL` in `.env`.

## Commands (from `backend/`)

| Command | What it does |
|---|---|
| `composer setup` | install, create `.env`, generate `APP_KEY`, migrate and seed |
| `php artisan serve --port=4000` (or `composer dev`) | serve the API at `http://localhost:4000/api/v1` |
| `php artisan migrate:fresh --drop-views --drop-types --seed` | rebuild the dev database with lookups and demo data |
| `php artisan db:seed --class=LookupSeeder` | lookups only (the only seeder production runs) |
| `composer test` | Pest suite against `udm_alumni_test` |
| `composer lint` | Pint (check only) + Larastan |
| `php artisan app:create-user --role=admin --email=…` | staff account with a one-time password (`--role=dept --college=CCS` for a college) |
| `php artisan app:coverage-alerts` / `app:notification-retention` / `app:token-cleanup` | the daily jobs (also `POST /api/v1/internal/jobs/:name` with `X-Cron-Secret`, or `php artisan schedule:run` with the schedule in `routes/console.php`) |
| `php artisan app:google-oauth-token --client-id=… --client-secret=…` | gets the Gmail API refresh token for `udm.alumni.mailer@gmail.com` (`--manual` to paste the redirect instead; see `docs/deploy-notes.md` Step 1A) |
| `php artisan app:mail-test you@example.com` | sends the password-reset template through the configured mailer |

Demo accounts (local/staging only, password `demoPass123`): `maria.delacruz@udmalumni.edu` (alumni, Alumni ID
`24-05-567`), `ccs.dean@udmalumni.edu` (college), `admin@udmalumni.edu` (admin) and `paolo.mendoza@gmail.com`
(pending self-registration).

## Layout

- `database/sql/` holds the schema (`001_schema.sql`) and stat views (`002_views.sql`), run by the two migrations.
- `database/seeders/`: `LookupSeeder` (every environment), `DemoSeeder` (refuses production and non-local hosts
  unless `ALLOW_DEMO_SEED=true`), catalog data in `data/catalog.php`.
- `routes/api.php`: every endpoint, grouped by area, with its `role:` middleware.
- `app/Http/Controllers/Api/V1/`: one controller per area (Auth, Alumni (Records), Me, Directory, Files, Stats,
  Reports, Outreach, Jobs, Events (+ announcements), Notifications, TracerQuestion, Users, Settings (+ audit),
  InternalJobs).
- `app/Services/`: the logic. `StatsService` is the only place numbers are computed; `ReportsService` builds the five
  reports from it. `AlumniService` (Records), `ProfileService` + `SurveyService` (`/me`), `JobService`, `EventService`,
  `TracerQuestionService`, `StorageService` (uploads on `FILESYSTEM_DISK`), `ScheduledJobs`.
- `app/Support/`: `Scope` (row filter for every query), survey mapping (answers → typed columns), `ProfileProgress`
  (completion, the client's rule), enum vocab, mobile normalization, contact links, entry pass, list paging.
- `bootstrap/app.php`: `api/v1` routing and the `{ error, code?, fields? }` error shape.

Lists return `{ data, meta: { page, per_page, total } }` and accept `page` and `per_page` (max 100). Uploaded files are
served by the API itself: `/api/v1/files/public/…` (photos, logos, covers) and `/api/v1/files/private/…` (proofs,
signed links only); on `FILESYSTEM_DISK=s3` private links are the bucket's own presigned URLs.
