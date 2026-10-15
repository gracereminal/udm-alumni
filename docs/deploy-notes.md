# Deploy notes: staging and production

A step-by-step runbook for deploying the UDM Alumni Tracer. The design and the reasons behind it are in
[plan-backend.md](plan-backend.md) ("Deployment"). This file is the order of operations.

**Decided:** API on **Render** (Web Service + Cron Jobs), Postgres 18 on **Neon**, files on **Neon Object Storage** (same Neon project), email via the
**Gmail API** (for now our own Gmail account via OAuth; later `no-reply@udmalumni.edu` via the UDM Workspace). Frontend stays on **Vercel** (`udm-alumni-demo.vercel.app`). Everything runs in
**Singapore**. Staging goes first, then production.

## Overview

```
Browser ──► Vercel (udm-alumni-demo)
              ├─ /api/*  ──rewrite──►  Render Web Service (backend/, Node 20)
              │                          ├─► Neon Postgres 18 (sslmode=require)
              │                          ├─► Neon Object Storage bucket (private; photos, proof documents)
              │                          └─► Gmail API (our Gmail via OAuth; later no-reply@udmalumni.edu)
              └─ /*      ──rewrite──►  client/dist/index.html
Render Cron Jobs ──► POST /api/v1/internal/jobs/:name  (X-Cron-Secret header)
```

The browser only ever talks to the Vercel domain, so cookies are first-party and production needs no CORS.

| Env | Frontend | API | Database | Data |
|---|---|---|---|---|
| Local | `npm run dev` (Vite proxies `/api` → `:4000`) | `npm --prefix backend run dev` | embedded Postgres (`db:local`) | lookups + demo seed |
| Staging | Vercel preview of the `staging` branch | Render service `udm-alumni-api-staging` | Neon branch `staging` | lookups + demo seed |
| Production | Vercel production (`master`) | Render service `udm-alumni-api` | Neon branch `production` | lookups + real accounts only |

Shell commands below use Git Bash syntax (`VAR=value cmd`). In PowerShell, set `$env:VAR = 'value'` first.

---

## Step 0: Prerequisites

1. **Commit the current work.** The Phase 6 frontend swap is still uncommitted. Commit it, then confirm no secrets are tracked:
   ```bash
   git status
   git ls-files | grep -i "\.env"      # must print only backend/.env.example
   ```
   The root `.env.local` holds a Vercel OIDC token. Never commit or share it.
2. **Check that everything is green locally:**
   ```bash
   npm --prefix backend test && npm --prefix backend run lint
   npm --prefix client test  && npm --prefix client run lint
   npm run build
   ```
3. **Push to GitHub.** Create a **private** repo (owned by the university's GitHub org, not a personal account), then:
   ```bash
   git remote add origin git@github.com:<org>/udm-alumni.git
   git push -u origin master
   git branch staging && git push -u origin staging
   ```
4. **Accounts** (owned by the university, with billing in its name): GitHub, Vercel, Render and Neon. You also
   need a **Google Workspace admin** for the `udmalumni.edu` domain.
5. **Generate secrets** (one per environment, never reused between staging and prod):
   ```bash
   openssl rand -hex 32     # CRON_SECRET (the API requires 24+ characters in production)
   ```

## Step 1: Database (Neon)

1. Create a Neon project `udm-alumni` with region **AWS Asia Pacific (Singapore)** and **Postgres 18**.
   Local dev and the tests still use embedded Postgres 16, so staging is where the migrations are proven on 18.
2. Rename the default branch to `production`. Create a second branch `staging` from it, with **no expiration date**
   (the console may set one by default; clear it with `neon branches set-expiration staging` if so).
3. For **each** branch, copy two connection strings from *Connection details*:
   - **Pooled** (host contains `-pooler`): used by the running API as `DATABASE_URL`.
   - **Direct** (no `-pooler`): used for migrations as `DATABASE_URL_DIRECT`.

   Both must end with `?sslmode=require`. The API refuses to start in production without it.
4. Under the project's settings, confirm the history retention / point-in-time restore window covers at least 7 days.

## Step 2: File storage (Neon Object Storage)

Production hosts have ephemeral disks, so `STORAGE_DRIVER=s3` is required. Neon Object Storage is S3-compatible and lives in
the same Neon project as the database, so it needs no extra account or card. The Free plan includes 5 GB per project. Buckets
belong to a branch, so `staging` and `production` each get their own files.

1. **Check first:** in Neon's docs or console, confirm that Object Storage is generally available (not beta-only) and that the
   project is in `aws-ap-southeast-1` (Singapore).
2. On **each** branch (`staging` and `production`), create a **private** bucket named `uploads` with `neon bucket create`
   (run `neon bucket create --help` to see how to pick the branch). Don't use `public_read`. Proof documents are served only
   through short-lived signed URLs.
3. For each branch, get its S3 credentials. Run `neon env pull` while checked out on that branch, or copy them from the console.
   The API reads Neon's names as-is: `AWS_ENDPOINT_URL_S3`, `AWS_REGION` (`ap-southeast-1`), `AWS_ACCESS_KEY_ID` and
   `AWS_SECRET_ACCESS_KEY`. (The `S3_*` equivalents also work and take precedence.) Add `S3_BUCKET=uploads` yourself.
4. ⚠️ A credential works on its own branch **and every branch created from it**. Never give staging the `production` branch's
   credential. Don't commit the `.env` / `.env.local` file that `neon env pull` writes.
5. The 5 GB free allowance is shared by all branches in the project. Paid plans bill storage per GB.

If Neon storage turns out to be unavailable, any S3-compatible bucket works with the same variables, with no code changes:
Backblaze B2 (10 GB free, no card) or Cloudflare R2 (10 GB free, needs a card on file).

## Step 3: Email (Gmail API)

`MAIL_DRIVER=console` is refused in production. Use `google`, or `smtp` as a fallback. The `google` driver signs in one of
two ways:

- **3A. Now: our own Gmail account (OAuth).** No university accounts needed. Emails come from a `@gmail.com` address.
- **3B. Later: the UDM Workspace (service account).** Emails come from `no-reply@udmalumni.edu`. Needs a Workspace admin.

The app uses 3A when `GOOGLE_OAUTH_REFRESH_TOKEN` is set, otherwise 3B. Switching later is only an env-var change.

### 3A. Our own Gmail account (OAuth)

Use a dedicated Gmail account for sending (e.g. `udm.alumni.mailer@gmail.com`), not a personal inbox: it becomes the
sender everyone sees, and anyone with the refresh token can send mail as it.

1. **Google Cloud console** (<https://console.cloud.google.com>), signed in as that Gmail account:
   1. Create a project `udm-alumni-mail`.
   2. *APIs & Services → Library* → enable the **Gmail API**.
   3. *Google Auth Platform* (formerly *OAuth consent screen*) → **Get started**: app name `UDM Alumni Tracer`, support
      email = the Gmail account, audience **External**, contact email = the same.
   4. *Data access → Add or remove scopes* → add `https://www.googleapis.com/auth/gmail.send` (only this one) → Save.
   5. *Audience* → **Publish app** (status "In production"). ⚠️ Don't leave it in "Testing": refresh tokens from a Testing app
      expire after 7 days and email silently stops. Publishing doesn't need Google's verification for our own use; the sign-in
      just shows an "unverified app" warning.
   6. *Clients → Create client* → type **Desktop app**, name `udm-alumni-backend`. Copy the **client ID** and **client secret**.
2. **Get the refresh token** (once, from `backend/`):
   ```bash
   npm run google:token -- --client-id <client id> --client-secret <client secret>
   ```
   Open the printed URL, sign in as the sending Gmail account, click *Advanced → Go to UDM Alumni Tracer (unsafe)* on the
   warning (it's our own app), and allow **Send email on your behalf**. The terminal prints the variables to set.
3. **Set the variables** in `backend/.env` for local testing (it's git-ignored), and later in Render (Step 4):
   ```
   MAIL_DRIVER=google
   MAIL_FROM="UDM Alumni <udm.alumni.mailer@gmail.com>"   # must be the account you signed in with
   GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=...                           # secret
   GOOGLE_OAUTH_REFRESH_TOKEN=1//...                        # secret
   ```
4. **Test:** `npm run mail:test -- --to <another address>`. It should arrive in the inbox. Then try *Forgot password* in the
   app locally and use the link.
5. Good to know:
   - No DNS work: Google already signs mail from `@gmail.com` with SPF/DKIM.
   - A Gmail account can send roughly **500 emails a day**. That's plenty for password resets; large outreach batches may hit it.
   - Changing the Gmail account's password, or removing the app at <https://myaccount.google.com/permissions>, revokes the
     token. Then run `npm run google:token` again and update the variable.
   - Staging and production can share this token for now, or use two sending accounts to keep them apart.

### 3B. UDM Workspace (service account), when the university is ready

1. **Workspace admin:** create the mailbox `no-reply@udmalumni.edu`. It must be a real, active user with a license (an alias
   or group can't be impersonated). Sign in to it once to accept the terms.
2. **Google Cloud console** (signed in with a university account):
   1. Create a project `udm-alumni-mail`.
   2. *APIs & Services → Library* → enable the **Gmail API**.
   3. *IAM & Admin → Service accounts* → create `udm-alumni-mailer`. It needs **no** project roles.
   4. Open it → *Keys → Add key → JSON*. Store the downloaded file somewhere safe (password manager), never in the repo.
   5. Note its **Unique ID** (a long number, also `client_id` in the JSON). That is the "client ID" for the next step.

   If the org policy `iam.disableServiceAccountKeyCreation` blocks key creation, a Google Cloud org admin must allow it for
   this project.
3. **Workspace admin → Security → Access and data control → API controls → Manage domain-wide delegation → Add new:**
   client ID = the Unique ID, scope = `https://www.googleapis.com/auth/gmail.send` (only this scope). It can take a few
   minutes, sometimes up to an hour, to apply.
4. **DNS for `udmalumni.edu`:** so the reset emails don't land in spam:
   - SPF: a TXT record `v=spf1 include:_spf.google.com ~all` (merge into the existing SPF record; there can be only one).
   - DKIM: Workspace admin → Apps → Google Workspace → Gmail → *Authenticate email* → generate the key, add the
     `google._domainkey` TXT record, then press **Start authentication**.
   - DMARC: a TXT record at `_dmarc` such as `v=DMARC1; p=none; rua=mailto:<it-contact>@udmalumni.edu` (tighten to
     `quarantine` once reports look clean).
5. **Put the key in one line** for `GOOGLE_SERVICE_ACCOUNT_JSON` (Render accepts the pasted output as is):
   ```bash
   node -e "process.stdout.write(JSON.stringify(require(process.argv[1])))" ./udm-alumni-mailer-key.json
   ```
6. **Test the credentials** before wiring them into Render. From `backend/`, with the one-line key in an environment
   variable (not a file in the repo):
   ```bash
   DATABASE_URL=postgres://unused MAIL_DRIVER=google GOOGLE_IMPERSONATE_USER=no-reply@udmalumni.edu \
   GOOGLE_SERVICE_ACCOUNT_JSON="$(node -e "process.stdout.write(JSON.stringify(require(process.argv[1])))" ~/keys/udm-alumni-mailer-key.json)" \
   npm run mail:test -- --to <your personal gmail>
   ```
   The mail must arrive in the Gmail **inbox**. Open *Show original*: SPF, DKIM and DMARC should all say `PASS`. If the send
   fails, the script prints a hint (`unauthorized_client` = delegation missing or wrong client ID/scope; `invalid_grant` =
   mailbox doesn't exist or is suspended; `403` = Gmail API not enabled). On Render the same check is
   `npm run mail:test -- --to <address>` from the service's **Shell**.
7. Staging can use the same service account, or `MAIL_DRIVER=smtp` with a Gmail app password (requires 2-Step Verification
   on the mailbox): `SMTP_URL=smtps://no-reply%40udmalumni.edu:<app-password>@smtp.gmail.com:465`. `mail:test` works for
   either driver.

## Step 4: Staging API on Render

1. Render → **New → Web Service** → connect the GitHub repo.
   | Setting | Value |
   |---|---|
   | Name | `udm-alumni-api-staging` |
   | Region | Singapore |
   | Branch | `staging` |
   | Root directory | `backend` |
   | Runtime | Node (version 20+: add env `NODE_VERSION=20`) |
   | Build command | `npm ci` |
   | Pre-deploy command | `DATABASE_URL=$DATABASE_URL_DIRECT npm run migrate -- up && npm run seed:lookups` |
   | Start command | `npm start` |
   | Health check path | `/api/v1/health` |

   The pre-deploy command runs the migrations on the **direct** URL (the pooler doesn't suit migrations) before the new
   code starts. `seed:lookups` is idempotent, so it is safe on every deploy.

2. **Environment variables** (Render → Environment). Staging uses `NODE_ENV=production`, so it runs the same strict
   startup checks as prod.

   | Variable | Staging | Production |
   |---|---|---|
   | `NODE_ENV` | `production` | `production` |
   | `NODE_VERSION` | `20` | `20` |
   | `LOG_LEVEL` | `info` | `info` |
   | `DATABASE_URL` | Neon `staging` **pooled** URL `?sslmode=require` | Neon `production` **pooled** URL `?sslmode=require` |
   | `DATABASE_URL_DIRECT` | Neon `staging` **direct** URL | Neon `production` **direct** URL |
   | `SESSION_TTL_DAYS` / `SESSION_IDLE_HOURS` | `14` / `12` | `14` / `12` |
   | `APP_URL` | `https://<staging-preview>.vercel.app` (see Step 5) | `https://udm-alumni-demo.vercel.app` |
   | `TRUST_PROXY` | `true` | `true` |
   | `MAIL_DRIVER` | `google` (or `smtp`) | `google` |
   | `MAIL_FROM` | `UDM Alumni <sending Gmail address>` (3A) or `UDM Alumni <no-reply@udmalumni.edu>` (3B) | same |
   | `GOOGLE_OAUTH_CLIENT_ID` | 3A only: OAuth Desktop client ID | same |
   | `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN` 🔒 | 3A only: from `npm run google:token` | same |
   | `GOOGLE_SERVICE_ACCOUNT_JSON` 🔒 | 3B only: whole JSON key in one line | same |
   | `GOOGLE_IMPERSONATE_USER` | 3B only: `no-reply@udmalumni.edu` | same |
   | `STORAGE_DRIVER` | `s3` | `s3` |
   | `AWS_ENDPOINT_URL_S3` / `AWS_REGION` | `staging` branch storage endpoint / `ap-southeast-1` | `production` branch storage endpoint / `ap-southeast-1` |
   | `S3_BUCKET` | `uploads` | `uploads` (each branch has its own) |
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` 🔒 | `staging` branch credential | `production` branch credential |
   | `CRON_SECRET` 🔒 | its own `openssl rand -hex 32` | its own `openssl rand -hex 32` |
   | `CORS_ORIGIN` | unset (same-origin via Vercel) | unset |
   | `ALLOW_DEMO_SEED` | **unset** on the service | **never set** |

   🔒 = secret. It lives only in Render's environment, never in git, chat or tickets. Leave `PORT` unset: Render provides it.

3. **Deploy** and watch the logs. If a variable is missing or unsafe, the API exits with a clear message listing it.
4. **Verify:**
   ```bash
   curl https://udm-alumni-api-staging.onrender.com/api/v1/health
   # {"ok":true,"db":"up","time":"..."}
   ```
5. **Seed demo data on staging (once, from your machine).** `seed:demo` deliberately refuses any URL containing `sslmode=`,
   and Neon requires TLS. For this one-off, use the staging **direct** URL with `ssl=true` in place of `sslmode=require`,
   and allow the non-local host explicitly:
   ```bash
   cd backend
   NODE_ENV=development ALLOW_DEMO_SEED=true \
   DATABASE_URL="postgres://<user>:<pass>@<staging-direct-host>/<db>?ssl=true" \
   npm run seed:demo
   ```
   ⚠️ Triple-check that the host is the **staging** branch. Never point this at production. It adds ~650 fake alumni and
   accounts with the public password `demoPass123`.

## Step 5: Wire Vercel to the API

1. **Edit the root `vercel.json`.** Add the API rewrite **before** the SPA catch-all. On the `staging` branch, point it at
   the staging API:
   ```json
   {
     "installCommand": "npm --prefix client install",
     "buildCommand": "npm run build",
     "outputDirectory": "client/dist",
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://udm-alumni-api-staging.onrender.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   On `master`, point the same rule at `https://udm-alumni-api.onrender.com/api/$1` (production). This file is the one
   line that differs between the two branches. When merging `staging` → `master`, keep master's destination.
2. **Delete `client/vercel.json`.** It is an unused duplicate, because the Vercel project root is the repo root.
3. **Connect Git.** Vercel → project `udm-alumni-demo` → Settings → Git → connect the GitHub repo. Set the
   **production branch** to `master`. Every push to `staging` now builds a preview deployment that talks to the staging API.
4. Optional: in Vercel → Domains, assign a stable alias to the `staging` branch (e.g. `udm-alumni-staging.vercel.app`) and use it
   as the staging `APP_URL` (Step 4), so reset-email links point to a fixed address.
5. Preview deployments must **never** reach the production API. Only `master` carries the prod destination.

## Step 6: Scheduled jobs (staging)

The API uses no in-process timers. Create three Render **Cron Jobs** (Render → New → Cron Job, region Singapore, same repo,
any small Node or shell runtime). Give each one its own `CRON_SECRET` env var, equal to the staging API's value:

| Job | Schedule (UTC) | Command |
|---|---|---|
| `coverage-alerts` | `0 18 * * *` (02:00 Manila) | `curl -fsS -X POST -H "X-Cron-Secret: $CRON_SECRET" https://udm-alumni-api-staging.onrender.com/api/v1/internal/jobs/coverage-alerts` |
| `notification-retention` | `10 18 * * *` | same, ending in `/notification-retention` |
| `token-cleanup` | `20 18 * * *` | same, ending in `/token-cleanup` |

Use **Trigger Run** once on each and confirm a 2xx response in the job logs.

## Step 7: Verify staging

Do all of these before touching production:

- [ ] `/api/v1/health` is OK. Render's health check is green.
- [ ] Sign in with a demo account through the **Vercel** staging URL (not the Render URL).
- [ ] In DevTools → Application → Cookies, the session cookie is `HttpOnly`, `Secure` and set on the Vercel domain.
- [ ] Manual end-to-end checks from [plan-backend.md](plan-backend.md) ("Verification"):
  - adding one alumnus in Records changes the Records counter, the admin KPI, the college dashboard and Reports by exactly 1;
  - submitting a survey changes coverage and employment by exactly that person;
  - hiding a contact updates the directory and the modal.
- [ ] Upload a profile photo and a proof document. Both land in the `staging` branch's `uploads` bucket, and the proof opens
      only through a signed URL. This also proves Render can reach Neon storage. If it can't, switch to Backblaze B2 (Step 2);
      only the `S3_*` variables change.
- [ ] **Forgot password:** the email arrives in a real Gmail inbox (not spam), and the link works exactly once.
- [ ] **Client IP:** in Neon's SQL editor, `select ip from auth_session order by created_at desc limit 5;` shows your real IP,
      not a Vercel IP. If it doesn't, rate limiting falls back to identifier/account only (see plan-backend.md).
- [ ] **Backup restore:** use Neon to restore `staging` to a point in time (or branch from a past timestamp), and confirm the data.
- [ ] Each cron job ran successfully.

## Step 8: Production

Production starts with **no people in it**. It only ever gets `migrate`, `seed:lookups` and `create-user`.

1. **Neon (DB + storage) / Google:** use the `production` branch URLs, the `production` branch's storage credential, and the
   prod Google credentials (Steps 1–3).
2. **Render Web Service** `udm-alumni-api`: same settings as Step 4, but with branch **`master`** and the **Production**
   column of the env table. Deploy, then check
   `curl https://udm-alumni-api.onrender.com/api/v1/health`.
3. **First accounts.** Open the service's **Shell** in Render (or run locally against the prod direct URL):
   ```bash
   npm run create-user -- --role admin --email <real admin email> --name "Alumni Office Admin"
   npm run create-user -- --role dept --college CCS --email <dean email> --name "<name>" --label "College Dean"
   # repeat --role dept for each college
   ```
   Each command prints a **one-time password**. Send it to that person privately. They must change it at first sign-in.
   🚫 **Never run `seed:demo` against production.**
4. **Cron Jobs:** create the three jobs from Step 6 again, pointing at `udm-alumni-api.onrender.com`, with the **prod**
   `CRON_SECRET`. Run each once by hand.
5. **Frontend:** make sure `master`'s `vercel.json` points at the prod API, then merge and push:
   ```bash
   git checkout master && git merge staging   # keep master's /api destination
   git push
   ```
   Vercel builds and promotes it to production. If Git integration isn't connected, use `npx vercel --prod --yes`.

   **Order matters:** API live and healthy → accounts created → frontend deployed.

## Step 9: Production smoke test and monitoring

- [ ] `https://udm-alumni-demo.vercel.app/api/v1/health` returns `ok: true` (through the Vercel rewrite).
- [ ] The admin can sign in and change the one-time password. The admin dashboard loads.
- [ ] The cookie is `Secure`, `HttpOnly` and first-party.
- [ ] A password-reset email reaches a real inbox.
- [ ] No "Demo" hints or demo accounts are visible in the production build.
- [ ] Set up an **uptime monitor** (e.g. UptimeRobot or Better Stack) on `/api/v1/health`, alerting the alumni office's IT contact.
- [ ] Confirm Neon backups/PITR are on for `production`.
- [ ] Scan the Render logs: no passwords, tokens, reset codes or cookies appear (pino redacts them).

## Routine releases (after go-live)

1. Work on a feature branch → merge into `staging` → Render staging + the Vercel preview deploy automatically → verify.
2. Merge `staging` → `master` (keep the prod `/api` destination) → Render prod runs the **pre-deploy migrations**, then
   starts the new code. Vercel builds the frontend.
3. **Migrations must be backward-compatible** with the version that's still running: add columns before the code uses
   them, and drop them in a later release.
4. **Rollback:** Render → Deploys → *Rollback* to the previous build, and Vercel → Deployments → *Promote* the previous
   one. A migration that has already run is never rolled back. Fix it with a new forward migration.

## Optional: custom domain (later)

If the app moves to a UDM domain (e.g. `alumni.udm.edu.ph`):

1. Vercel → project → Domains → add the domain, then create the DNS record Vercel shows (CNAME to `cname.vercel-dns.com`).
2. Update `APP_URL` on the **prod** Render service to `https://alumni.udm.edu.ph` and redeploy, so email links use the new domain.
3. Re-test sign-in (cookies are per domain, so users sign in again) and the reset-email links.

## Go-live checklist

- [ ] Private GitHub repo. `.env.local` and other secrets not committed.
- [ ] Render and Neon both in Singapore. Accounts and billing owned by the university.
- [ ] Prod env vars set. The API starts with `NODE_ENV=production`, `STORAGE_DRIVER=s3`, `MAIL_DRIVER=google`,
      `sslmode=require`, and a 24+ character `CRON_SECRET`.
- [ ] The prod DB has only `migrate` + `seed:lookups` + `create-user`. No `seed:demo`. `ALLOW_DEMO_SEED` unset.
- [ ] `vercel.json` `/api` rewrite deployed (staging → staging API, master → prod API). `client/vercel.json` removed.
- [ ] Mail: OAuth app **published** (not Testing) for 3A, or Workspace delegation granted with SPF/DKIM/DMARC passing for 3B.
      Reset email received in a Gmail inbox.
- [ ] Neon `uploads` bucket private on both branches. Proofs reachable only through signed URLs.
- [ ] Three cron jobs configured in each environment and run once by hand.
- [ ] Backup restore tested. Uptime check on `/health`.
- [ ] Staging verification (Step 7) passed.
- [ ] Sign-off from UDM's Data Protection Officer (RA 10173) on the privacy notice, retention and breach procedure.

## Frontend-only redeploy

To redeploy only the frontend from your machine (it uses the `vercel.json` of the branch you're on):

```bash
npx vercel --prod --yes
```
