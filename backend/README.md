# UDM Alumni Tracer API

Node 20+ · Express 5 · PostgreSQL 16 (`pg`, SQL kept visible) · `node-pg-migrate` · `zod` · `pino`.
Design and rules: [`docs/plan-backend.md`](../docs/plan-backend.md). Schema: `migrations/` (28 tables + stat views).

## Local development

```bash
cd backend
npm install
cp .env.example .env
npm run db:local        # Postgres 16 on :5433 (embedded binaries, data in .pgdata) — keep it running
npm run migrate -- up   # schema + views
npm run seed:lookups    # colleges, programs, skills, settings, first survey cycle (all environments)
npm run seed:demo       # demo / staging only: ~650 alumni, jobs, events + the 3 demo accounts (password demoPass123)
npm run dev             # http://localhost:4000/api/v1/health
```

The Vite dev server proxies `/api` to `:4000`, so the app runs on one origin locally just like production.
`npm run seed:demo -- --reset` wipes all non-lookup data and reseeds. With `MAIL_DRIVER=console`, reset and outreach
emails (links and codes) are printed to the API console.

Demo accounts: `maria.delacruz@udmalumni.edu` (or Alumni ID `AM-2024-00567` / `2024-00567-UDM`),
`ccs.dean@udmalumni.edu`, `admin@udmalumni.edu`.

## Production setup

Production starts with no people in it. Run only:

```bash
npm run migrate -- up    # schema + views
npm run seed:lookups     # colleges, programs, skills, settings, first survey cycle
npm run create-user -- --role admin --email <real admin email> --name "Alumni Office Admin"
npm run create-user -- --role dept --college CCS --email <dean email> --name "<name>" --label "College Dean"
```

Alumni then register themselves (public registration can only create `alumni` accounts); staff accounts are
created by an admin. **Never run `seed:demo` against production**: it adds ~650 fake alumni and accounts with the
public password `demoPass123`, and `--reset` truncates `user_account`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `npm start` | API with / without file watching |
| `npm run migrate -- up` | apply migrations (production: the host's pre-deploy command) |
| `npm run seed:lookups` | idempotent lookups |
| `npm run seed:demo` | **local/staging only.** Refuses with `NODE_ENV=production`, a `sslmode=` database URL, or any non-local host unless `ALLOW_DEMO_SEED=true` |
| `npm run create-user -- --role admin --email … --name "…"` | staff account with a one-time password (`--role dept --college CCS` for a college account) |
| `npm run google:token -- --client-id … --client-secret …` | one-time Gmail sign-in that prints `GOOGLE_OAUTH_REFRESH_TOKEN` (personal Gmail sender) |
| `npm run mail:test -- --to <email>` | send one test email through `MAIL_DRIVER` (checks Gmail API / SMTP credentials) |
| `npm test` | Vitest + Supertest on a throwaway seeded database (embedded Postgres, or `TEST_DATABASE_ADMIN_URL`) |
| `npm run lint` | ESLint |

## Layout

```
src/app.js, server.js       express app (helmet, json, cookies, CSRF header, routes, error handler) / listener
src/config/                 env parsing with zod; refuses unsafe production settings
src/db/                     pg pool + tx() helper
src/middleware/             auth (sessions), scope (scopeFor), validate, rate limits, errors
src/routes/                 one file per API area (+ health, files, internal jobs)
src/services/               stats, reports, alumni, survey, notifications, mailer, storage, sessions, audit, settings
src/jobs/                   coverage-alerts, notification-retention, token-cleanup
src/lib/                    vocab (form labels <-> enums), validation (server copy of the client rules), survey defs
migrations/                 schema + views (.sql)
seed/                       lookups.js (all envs), demo.js (demo/staging only), catalog.js
scripts/                    create-user.js, local-db.js, mail-test.js, google-oauth-token.js
tests/                      auth, reset, scope, invariants, notifications, outreach, jobs/events, platform
```

## Scheduled jobs

The host's cron calls `POST /api/v1/internal/jobs/<name>` with header `X-Cron-Secret: $CRON_SECRET`, daily:
`coverage-alerts`, `notification-retention`, `token-cleanup`.
