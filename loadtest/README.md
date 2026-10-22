# Load test (k6)

`k6-alumni.js` simulates a peak such as a survey launch or homecoming. Most users are alumni browsing (dashboard, jobs,
events, directory). A few admin and college staff open dashboards, Records and Reports. New alumni register at a steady
30 per minute. It skips everything that sends email (event RSVP, forgot password).

**Never run it against production.** It registers new alumni on every run. Use local, or a throwaway Neon branch
(for example `loadtest`, branched from `staging`) behind a staging service with `MAIL_MAILER=log`.

## Local run (Windows)

1. Seed 3,000 alumni (this wipes the local database):

   ```bash
   cd backend
   export PATH="$HOME/.config/herd/bin/php85:$PATH"
   DEMO_ALUMNI=3000 php artisan migrate:fresh --drop-views --drop-types --seed
   ```

2. Start the API with test overrides. Run it from `public/` with `php -S`, not `php artisan serve`, because
   `artisan serve` does not pass `AUTH_RATE_LIMIT` or `MAIL_MAILER` through to the PHP process that handles requests:

   ```bash
   cd backend/public
   MAIL_MAILER=log AUTH_RATE_LIMIT=100000 php -d variables_order=EGPCS -S 127.0.0.1:4000 \
     ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php
   ```

   `AUTH_RATE_LIMIT` is raised because every virtual user signs in from the same IP (the default is 10 per minute).
   Run `php artisan cache:clear` between runs to reset the limiter.

3. Run k6 (`winget install GrafanaLabs.k6`) from the repo root:

   ```bash
   k6 run -e BASE_URL=http://127.0.0.1:4000 loadtest/k6-alumni.js                 # smoke, 30 s
   k6 run -e BASE_URL=http://127.0.0.1:4000 -e PROFILE=load loadtest/k6-alumni.js # ~100 users, 5 min
   ```

On Windows, `php -S` handles **one request at a time** (`PHP_CLI_SERVER_WORKERS` only works on Linux). Local numbers
therefore show the single-worker worst case, not production. For production-like numbers, run against the Docker image
(4 workers) on staging.

## Staging run

Point the staging service at the `loadtest` Neon branch (`DB_URL` pooled, `DB_URL_DIRECT` direct). Set
`MAIL_MAILER=log`, `AUTH_RATE_LIMIT=100000` and `ALLOW_DEMO_SEED=true`, and seed with `DEMO_ALUMNI=3000`. Run with
`-e BASE_URL=https://<staging domain>`. Afterwards, restore the variables and delete the branch.

## Thresholds

The run fails when any of these is crossed: more than 1% failed requests or checks, p95 over 1.5 s overall, alumni
pages p95 over 1 s, or sign-in p95 over 2 s.

## Results

| Date | Target | Data | Profile | Requests | Errors | Median / p95 | Notes |
|---|---|---|---|---|---|---|---|
| 2026-10-21 | Local, Windows `php -S` (1 worker), local Postgres 16 | 3,000 alumni | smoke (4 users) | 153 | 0% | 69 ms / 372 ms | All checks pass |
| 2026-10-21 | Same | 3,000 alumni | load (~100 users) | 3,712 (13/s) | 0% | 5.4 s / 9.6 s | No errors, but requests queue behind the single worker |
