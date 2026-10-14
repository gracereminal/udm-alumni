# track-progress.md

Primary reference for the UDM Alumni Tracer. **Read this before changing anything; update it right after each task/phase.**
Last verified: 2026-10-14 (by inspecting the code and running `vitest`, `eslint` and `vite build`).

Status legend: ✅ implemented · 🟡 partial · ⬜ not started · 🧪 tested (automated) · 👁 manual-only

## Rules for working on this project
- Preserve the current design/behavior (match `docs/Alumni Tracer Mockups.dc.html`, see `resources.md`). Don't touch completed features unless a change is explicitly required.
- Don't assume a feature is missing because it isn't listed: grep the code first.
- Record new issues, fixes and decisions below as they happen.

## Snapshot
- Frontend-only React 18 + Vite 5 + React Router 6 SPA in `client/`. State is React context + `localStorage` (no backend; `backend/` holds only `.gitkeep`).
- Deployed to Vercel as an SPA (root `vercel.json`).
- `npm run build` ✅ passes (JS bundle 737 kB, over the 500 kB warning). `vitest`: 5/5 pass. `eslint`: **0 errors, 0 warnings** (fixed 2026-10-14, see below).

## Completed (implemented; verified by reading code/build, manual-only unless noted)
**Auth & registration** (`pages/auth`, `context/AuthContext`, `ProfileContext`)
- ✅ Sign-in with demo accounts (alumni / college / admin, password `demoPass123`), role-based landing and route guards (`routes/guards.jsx`).
- ✅ Forgot password → demo reset inbox (`ResetInbox`, `ResetFlowContext`).
- ✅ Registration: Privacy Consent → Personal → Contact & Social → Education → Account Password → Success, with validation in `lib/validation.js`.

**Alumni** (`pages/alumni`)
- ✅ Dashboard, Profile (photo card, survey lives here; draft persisted in `localStorage`), Jobs (search/filter, details modal, save, apply, post for review), Events (register, add to calendar).

**College / Department** (`pages/college`, `pages/admin/AlumniRecords`, `Reports`)
- ✅ Dashboard, Outreach, Alumni Records and Reports scoped to own college.

**Admin** (`pages/admin`)
- ✅ Dashboard, Alumni Records, Reports (5 types incl. Inclusion Profile), Jobs management (post/edit/deactivate/delete, approve alumni submissions), Events management (create/edit/duplicate/delete, status, registrations, announcements).

**Shared**
- ✅ Topbar (search pill, notification bell, user chip), search overlay, contact modal, alumni card, DatePicker, Modal, Pager, toast, responsive AppShell.
- ✅ Tooling: ESLint (+jsx-a11y), Vitest + Testing Library + vitest-axe, coverage, bundle analyzer, Prettier.

## In progress
- 🟡 Backend: only planned (`docs/plan-backend.md`, ERD in `docs/UDM Alumni ERD.dc.html`). No code written.
- 🟡 Test suite: tooling smoke test (`src/test/setup.test.jsx`) and `lib/a11y.test.js`; no feature tests.

## Pending
- ⬜ Backend API (Express + PostgreSQL + zod, JWT cookie auth, multer uploads) per `plan-backend.md`; replace `localStorage`/seed data and typed stats with SQL-derived stats.
- ⬜ Real password-reset email (Google); the demo inbox is temporary (see memory note).
- ⬜ Replace hardcoded college for the dept role (`DEPT_COLLEGE` in `lib/collegeDash.js`) with the account's college.
- ⬜ Remove hardcoded/fake stats (`FULL_TOTALS`, `CCS_TOTALS`, etc.) once backend exists.
- ⬜ Real file upload (profile photo, proof documents).
- ⬜ Feature tests (auth guards, registration validation, records filters, reports, jobs/events flows).
- ⬜ Code-splitting to bring the bundle under 500 kB.

## Known issues / bugs
Fixed 2026-10-14 following `docs/cleaning-code.md` (backup of the pre-fix `src/` was kept outside the project; no git, so review the diff by eye):
1. ✅ **Lint: 491 → 0 errors.** Clickable `div`s now have `role`/`tabIndex`/Enter+Space handling via `lib/a11y.js` (`onActivate`, `onBackdrop`); modal backdrops use `role="presentation"` and close only on direct clicks (dialogs no longer need a `stopPropagation` onClick); `href="#"` links became `<button className="link-btn">` (style in `prototype.css`); checkbox/radio roles got `aria-checked`; unused `React` imports, catch bindings and props removed; apostrophes escaped; CSV BOMs written as `\uFEFF`; `AlumniProfile` hook deps fixed. ESLint config: `react/prop-types` off (plain JS, revisit if moving to TypeScript), `aria-role` ignores non-DOM components (`role` is a business prop), `no-autofocus` off only in `ForgotPasswordView` (deliberate step focus).
2. ✅ `pages/alumni/AlumniSurvey.jsx` (dead code, imported nowhere) deleted, and its ESLint ignore entry removed.
3. ⬜ `src/views/` files are still very large (e.g. `AdminPostsView` ~3480 lines, `RecordsView` ~2800); split per cleaning-code Phase 5 (largest effort).
4. ℹ️ `vitest` logs "HTMLCanvasElement.getContext not implemented" during the axe test (harmless; jsdom limitation).
5. ⬜ Demo IDs `2024-00567-AT` / `CCS-DEAN-01` don't match ERD ID formats (fix in backend seed).
6. 🟡 Housekeeping: stray root `.md` (an `npx vercel` note) and generated `client/stats.html` still exist; delete them manually. `docs/track-progress.md` is a pointer to this file. The project is not a git repository (`git init` + baseline commit recommended before more refactors).
7. ⬜ `.env.local` holds a Vercel OIDC token; move it out of the project folder and keep it out of any shared archive.

## Next steps (priority order)
1. ~~Fix keyboard accessibility / lint errors~~ done. Manually verify in a browser (keyboard-tab through modals, tables, sign-in/forgot-password links) since changes are unverified visually.
2. Add feature tests for the critical flows (sign-in + guards, registration validation, records scoping, jobs/events actions) and run `vitest`.
3. Delete the stray root `.md` and `client/stats.html`; `git init` first.
4. Start the backend per `plan-backend.md` (schema/migrations, auth, seed from demo data), then wire the client via `VITE_API_URL`.
5. Real password-reset email once the backend exists.
6. Code-split heavy routes (admin/college/reports) to cut bundle size.
7. ~~prop-types~~ rule turned off (see Known issues 1).

## Testing & validation
| Area | Result |
|---|---|
| Production build (`npm run build`) | 🧪 Passes 2026-10-14 after fixes (chunk-size warning, 742 kB) |
| Vitest (smoke + axe + a11y helpers) | 🧪 5/5 pass |
| ESLint (`npm run lint`) | 🧪 0 errors, 0 warnings (2026-10-14) |
| `npm audit` | Not run this session |
| Feature behavior of every role (flows above) | 👁 No automated tests; not re-verified in a browser this session |
| Mobile/responsive layouts | 👁 Not re-verified this session |
| Keyboard/visual behavior after a11y fixes | 👁 Not checked in a browser; codemod-based, verify by hand |
| Deployed Vercel site | Not checked this session |

## Decision log
- 2026-10-14: The tracker lives at the project root (`track-progress.md`); `docs/track-progress.md` points here. Status was derived from reading the code and running build/lint/tests, not from earlier documentation.
- 2026-10-14: Applied `docs/cleaning-code.md` to Known issues: a11y via shared `lib/a11y.js` helpers instead of rewriting markup (keeps visuals); `prop-types` rule disabled rather than adding PropTypes; stray `.md` and `stats.html` left for manual deletion.
- 2026-10-14: Deleted dead `AlumniSurvey.jsx` at the user's request.
- 2026-10-14: `docs/plan-backend.md` re-checked against the code and ERD (stale ERD gaps corrected, form→column map added) and extended with a Deployment section (Vercel `/api` rewrite for same-origin cookies, env vars, migrations, cron jobs, storage, backups, go-live checklist).
