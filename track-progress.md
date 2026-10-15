# track-progress.md

Primary reference for the UDM Alumni Tracer. **Read this before changing anything; update it right after each task/phase.**
Last verified: 2026-10-15 (by inspecting the code and running backend `npm test` + `lint`, client `vitest` (105 tests), `eslint` and `vite build`).

Status legend: ✅ implemented · 🟡 partial · ⬜ not started · 🧪 tested (automated) · 👁 manual-only

## Rules for working on this project
- Preserve the current design/behavior (match `docs/Alumni Tracer Mockups.dc.html`, see `resources.md`). Don't touch completed features unless a change is explicitly required.
- Don't assume a feature is missing because it isn't listed: grep the code first.
- Record new issues, fixes and decisions below as they happen.

## Snapshot
- React 18 + Vite 5 + React Router 6 SPA in `client/`. **Phase 6 frontend swap done (2026-10-15, uncommitted):** every context reads the API through `client/src/lib/api.js` (same-origin `/api/v1`, Vite proxy to `localhost:4000` in dev). Only the survey draft stays in `localStorage`; legacy prototype keys are cleared once on load.
- **Backend (Phases 1–5 of `docs/plan-backend.md`) in `backend/`** (committed `24574bd`): Express 5 + Postgres 16, 28-table schema + stat views, auth/sessions, records, survey, stats, reports, outreach, jobs, events, notifications, files, scheduled jobs. Phase 6 additions: `contact_email` migration, records form / proof-request / custom-email support, `GET /stats/benchmark`. `npm test`: 93/93 pass; `eslint`: clean. Not deployed (no hosting accounts yet).
- Git: `f153dfa` baseline, `24574bd` backend phases 1–5; Phase 6 work is in the working tree, not yet committed. No remote yet.
- The Vercel deployment is still the old frontend-only SPA (root `vercel.json` has no `/api` rewrite yet), so the new client cannot work there until the backend is hosted.
- `npm run build` ✅ passes with no size warning (entry chunk 278 kB / 85 kB gzip; route pages are separate lazy chunks). `vitest`: **105/105 pass** (10 files, incl. feature tests). `eslint`: **0 errors, 0 warnings**.

## Completed (implemented; verified by reading code/build, manual-only unless noted)
**Auth & registration** (`pages/auth`, `context/AuthContext`, `ProfileContext`)
- ✅ Sign-in against the API (session cookie), role-based landing and route guards (`routes/guards.jsx`). Demo-account buttons show only in dev or with `VITE_DEMO=true`, and only work where the backend demo seed ran (password `demoPass123`).
- ✅ Forgot password → real reset email through the API (`ForgotPassword`, `ResetFlowContext`). The demo `ResetInbox` page is deleted.
- ✅ Registration: Privacy Consent → Personal → Contact & Social → Education → Account Password → Success, with validation in `lib/validation.js`.

**Alumni** (`pages/alumni`)
- ✅ Dashboard, Profile (photo upload/remove via API, survey lives here; only the unsaved draft is kept in `localStorage`), Jobs (search/filter, details modal, save, apply, post for review), Events (register, add to calendar), all backed by the API.

**College / Department** (`pages/college`, `pages/admin/AlumniRecords`, `Reports`)
- ✅ Dashboard, Outreach, Alumni Records and Reports scoped by the API to the account's college (`USER_ACCOUNT.college_id`); the hardcoded `DEPT_COLLEGE` is gone. The dashboard compares against university rates from `GET /stats/benchmark` (rates only, no counts).

**Admin** (`pages/admin`)
- ✅ Dashboard, Alumni Records (create from full name + contact email + employment, proof requests, custom emails), Reports (5 types incl. Inclusion Profile), Jobs management (post/edit/deactivate/delete, approve alumni submissions), Events management (create/edit/duplicate/delete, status, real `EVENT_REGISTRATION` lists, announcements). All data comes from the API; hardcoded totals, seed events, `TODAY_ISO`, `RecordsContext` and `demoAccounts.js` are deleted.

**Shared**
- ✅ Topbar (search pill, notification bell from the notifications API, user chip), search overlay (directory API), contact modal, alumni card, DatePicker, Modal, Pager, toast, responsive AppShell.
- ✅ Tooling: ESLint (+jsx-a11y), Vitest + Testing Library + vitest-axe, coverage, bundle analyzer, Prettier.

## In progress
- ✅🧪 Backend API Phases 1–5 (`backend/`, see `backend/README.md`). ERD updated to 28 entities / 38 relationships.
- ✅ Phase 6 frontend swap (working tree): lint/build/tests pass, **not yet verified end-to-end in a browser against a running backend**, and not committed.
- ⬜ Vercel `/api` rewrite in root `vercel.json` and deleting the duplicate `client/vercel.json` (plan-backend Deployment section).
- ⬜ Phase 0 hosting (Render/Neon or Railway, staging DB) and Phase 7 production — need accounts owned by the university.
- ✅🧪 Client feature tests (2026-10-15): auth guards, Sign In, registration validation + flow, records filters, reports, jobs/events flows. `fetch` is mocked (`src/test/mockApi.js`); nothing runs against the real backend.

## Pending
- 🟡 Real password-reset email: API and frontend done (demo inbox removed); production sending still needs the Workspace service account + domain-wide delegation for the Gmail API driver.
- ✅ ~~Replace hardcoded `DEPT_COLLEGE`~~ (2026-10-15).
- ✅ ~~Remove hardcoded/fake stats (`FULL_TOTALS`, `CCS_TOTALS`, etc.)~~ (2026-10-15).
- ✅ ~~File upload: removing an event cover photo~~ (2026-10-15): `DELETE /events/:id/photo`; replacing or removing a cover now deletes the old file unless a duplicated event still uses it. The admin form's Duplicate keeps the cover (`coverFrom` on `POST /events`).
- ✅🧪 ~~Feature tests (auth guards, registration validation, records filters, reports, jobs/events flows)~~ (2026-10-15): see Testing & validation.
- ✅ ~~Code-splitting to bring the bundle under 500 kB~~ (2026-10-15): registration and signed-in pages are `React.lazy` in `routes/AppRoutes.jsx`, behind a `Suspense` in `layouts/AppShell.jsx`. Entry chunk 694 → 278 kB (179 → 85 kB gzip); largest lazy chunk is `AlumniRecords` at 86 kB.

## Known issues / bugs
Fixed 2026-10-14 following `docs/cleaning-code.md` (backup of the pre-fix `src/` was kept outside the project; no git, so review the diff by eye):
1. ✅ **Lint: 491 → 0 errors.** Clickable `div`s now have `role`/`tabIndex`/Enter+Space handling via `lib/a11y.js` (`onActivate`, `onBackdrop`); modal backdrops use `role="presentation"` and close only on direct clicks (dialogs no longer need a `stopPropagation` onClick); `href="#"` links became `<button className="link-btn">` (style in `prototype.css`); checkbox/radio roles got `aria-checked`; unused `React` imports, catch bindings and props removed; apostrophes escaped; CSV BOMs written as `﻿`; `AlumniProfile` hook deps fixed. ESLint config: `react/prop-types` off (plain JS, revisit if moving to TypeScript), `aria-role` ignores non-DOM components (`role` is a business prop), `no-autofocus` off only in `ForgotPasswordView` (deliberate step focus).
2. ✅ `pages/alumni/AlumniSurvey.jsx` (dead code, imported nowhere) deleted, and its ESLint ignore entry removed.
3. ⬜ `src/views/` files are still very large (e.g. `AdminPostsView` ~3480 lines, `RecordsView` ~2800); split per cleaning-code Phase 5 (largest effort).
4. ℹ️ `vitest` logs "HTMLCanvasElement.getContext not implemented" during the axe test (harmless; jsdom limitation).
5. 🟡 Demo IDs `2024-00567-AT` / `CCS-DEAN-01` don't match ERD ID formats: the client demo data is gone; check the backend demo seed.
6. 🟡 Housekeeping: generated `client/stats.html` still exists; delete it manually. `docs/track-progress.md` is a pointer to this file. The project has been a git repo since 2026-10-14.
7. ⬜ `.env.local` holds a Vercel OIDC token; move it out of the project folder and keep it out of any shared archive.
8. ✅ **Sign In never worked after the Phase 6 swap** (found by the new feature tests, fixed 2026-10-15): `pages/auth/SignIn.jsx` called the now-async `signIn()` without `await`, so it never showed an error and never navigated. It now awaits and ignores double submits while the request is pending.
9. ℹ️ Node 22+ (here Node 26) defines its own `localStorage` global, which is `undefined` without `--localstorage-file` and hides jsdom's. `src/test/setup.js` adds an in-memory Storage when that happens; Vitest prints a harmless `ExperimentalWarning` about it.

## Next steps (priority order)
1. Run backend + client together locally and click through every role (sign-in, registration, survey, records, reports, outreach, jobs, events, notifications, reset password, photo upload). Keyboard-tab through modals too (a11y fixes are still unverified visually).
2. Commit the Phase 6 work once the browser pass is clean.
3. Add the `/api` rewrite to root `vercel.json` and delete `client/vercel.json`. (~~Endpoint for removing an event cover photo~~ done 2026-10-15.)
4. Phase 0 hosting (staging DB + API) on university-owned accounts, then the Workspace service account for email.
5. ~~Add client feature tests~~ (done 2026-10-15). Still worth adding: page-level tests for the Records/Reports/Jobs/Events screens (current tests cover the hooks/contexts behind them).
6. ~~Code-split heavy routes (admin/college/reports) to cut bundle size~~ (done 2026-10-15).
7. Delete `client/stats.html`.

## Testing & validation
| Area | Result |
|---|---|
| Production build (`npm run build`) | 🧪 Passes 2026-10-15, no chunk-size warning (entry chunk 278 kB / 85 kB gzip; largest lazy chunk `AlumniRecords` 86 kB) |
| Vitest (smoke + axe + a11y helpers + feature tests) | 🧪 105/105 pass 2026-10-15 (10 files, stable over 3 runs) |
| Client feature tests | 🧪 `routes/guards.test.jsx` (role guards, pending session, consent/success gates), `pages/auth/SignIn.test.jsx`, `lib/validation.test.js`, `pages/auth/AlumniRegistration.test.jsx` (step errors, password rules, submit payload, server field errors, password never in draft), `hooks/useRecordsPage.test.jsx` (filter/sort/search/paging query params, dept program scope), `hooks/useReportsPage.test.jsx` (scope params, dept lock, sections/format, CSV export logging), `context/JobsContext.test.jsx` + `context/EventsContext.test.jsx` (save/apply, submit for review, approve/reject, RSVP/cancel, feed, cover handling, announcements). API is mocked. |
| ESLint (`npm run lint`) | 🧪 0 errors, 0 warnings (2026-10-15) |
| `npm audit` | Not run this session |
| Feature behavior of every role (flows above) | 🧪 Covered by client feature tests against a mocked API; 👁 **not yet run in a browser against the real API after the Phase 6 swap** |
| Mobile/responsive layouts | 👁 Not re-verified this session |
| Keyboard/visual behavior after a11y fixes | 👁 Not checked in a browser; codemod-based, verify by hand |
| Deployed Vercel site | Not checked this session |
| Backend `npm test` (Vitest + Supertest, embedded Postgres 16) | 🧪 93/93 pass 2026-10-15 (9 files): auth, reset, scope, invariants, notifications, outreach, jobs/events, platform, records form |
| Backend `npm run lint` | 🧪 clean (2026-10-15) |

## Decision log
- 2026-10-15: **Code-splitting** at the route level only: registration and all signed-in pages are `React.lazy` in `routes/AppRoutes.jsx` with a single `Suspense fallback={null}` in `layouts/AppShell.jsx` (no spinner, so no visual change). Sign In, Forgot Password and Privacy Consent stay in the entry chunk because they are the first screens. No manual `manualChunks` config.
- 2026-10-15: **Event cover files are shared, not copied.** Duplicating an event (the `/duplicate` endpoint or the composer's Duplicate via `coverFrom` on `POST /events`) reuses the same file; replacing or removing a cover (`DELETE /events/:id/photo`) deletes the file only when no other event still references it.
- 2026-10-15: **Sign In awaits `signIn()`** and ignores repeat submits while a request is pending, rather than disabling the button (keeps the mockup's look).
- 2026-10-15: **Demo `ResetInbox` removed for good**; password reset goes only through the API and `services/mailer.js` (Gmail API driver). No simulated inbox will be reintroduced; production just needs the Workspace service account + domain-wide delegation.
- 2026-10-15: **Hardcoded data removed instead of kept as fallback:** `RecordsContext`, `demoAccounts.js`, `DEPT_COLLEGE`, `FULL_TOTALS`/`CCS_TOTALS`, seed events and `TODAY_ISO` are deleted; the dept scope comes from `USER_ACCOUNT.college_id` on the server. Demo data now exists only in the backend demo seed.
- 2026-10-15: **Test-env `localStorage` shim** in `client/src/test/setup.js` (in-memory Storage when Node 22+'s own global hides jsdom's), instead of pinning Node or passing `--localstorage-file`.
- 2026-10-15: **Client feature tests** mock `fetch` with a small router (`src/test/mockApi.js`: `mockApi(routes)`, `session(role)`, `loadTestCatalog()`) instead of adding MSW, so no new dependency. Records/Reports/Jobs/Events are tested at the hook/context level (where the logic lives) rather than through the very large `views/` files.
- 2026-10-15: **Phase 6 frontend swap.** The client talks to the API same-origin (`/api/v1`) so the session cookie is first-party; a 401 from non-auth calls fires `udm:unauthorized` and `AuthContext` signs out locally. Demo sign-in buttons are dev/`VITE_DEMO`-only. Only the survey draft stays in `localStorage`.
- 2026-10-15: `ALUMNUS.contact_email` added (migration `1760400000200_records_extras.sql`) for records without a sign-in account (e.g. registrar imports). `USER_ACCOUNT.email` always wins when an account exists, and staff cannot change it.
- 2026-10-15: `GET /stats/benchmark` returns university-wide rates only (no counts), so a dept user learns nothing about other colleges' alumni.
- 2026-10-14: **Backend open questions — defaults chosen (all reversible):**
  - Employment groups: employed = `ever_employed = Yes` and still working there; self-employed = `job_status = Self-employed` or `org_type = Self-owned business`; further studies = unemployed reason includes "Advance or further study"; `still_working = No` counts as not employed. Part-time / Business Owner labels are dropped (the survey never asks them).
  - Employment rate = employed ÷ (traced − further studies), the "labour force" both dashboards already describe. Toggle: `APP_SETTING.employment_rate_excludes_further_studies`.
  - Months to first job: buckets stored (`time_to_job_bucket`); averages use the bucket midpoint (`months_to_first_job`, numeric(4,1) instead of TINYINT so 3.5 fits).
  - One open `SURVEY_CYCLE` at a time (partial unique index); stats use the open cycle, else the latest one.
  - Coverage target is 60% everywhere (dashboards said 65%, Reports 60%); stored in `APP_SETTING`.
  - `PROGRAM.code` is unique as `<college>-<abbr>` (e.g. `CCS-BSIT`), because BSIT, BPA and BSBA-MM repeat across colleges; the display code is `PROGRAM.abbr`. "Others" is a COLLEGE row (`OTH`) so typed programs have a declared college.
  - Events: added `reg_status = full` and `EVENT.ended_at` for the admin "Full" / "Move to past" controls.
  - A survey response becomes "submitted" (traced) once `ever_employed` is answered; later saves re-derive the typed columns.
- 2026-10-14: Local Postgres is the `embedded-postgres` npm package (no system install needed); the cluster must be UTF8 (`--encoding=UTF8`), Windows otherwise defaults to WIN1252.
- 2026-10-14: The tracker lives at the project root (`track-progress.md`); `docs/track-progress.md` points here. Status was derived from reading the code and running build/lint/tests, not from earlier documentation.
- 2026-10-14: Applied `docs/cleaning-code.md` to Known issues: a11y via shared `lib/a11y.js` helpers instead of rewriting markup (keeps visuals); `prop-types` rule disabled rather than adding PropTypes; stray `.md` and `stats.html` left for manual deletion.
- 2026-10-14: Deleted dead `AlumniSurvey.jsx` at the user's request.
- 2026-10-14: `docs/plan-backend.md` re-checked against the code and ERD (stale ERD gaps corrected, form→column map added) and extended with a Deployment section (Vercel `/api` rewrite for same-origin cookies, env vars, migrations, cron jobs, storage, backups, go-live checklist).
