# Code Cleaning Plan: udm-alumni

## Goals
Shrink the oversized files, remove dead code and duplication, harden error handling, and add the tooling (lint, format, tests, git) the project lacks. Do not change behavior.

## Ground rules
- `git init` and make a baseline commit first, so every step can be reverted.
- One phase per commit. Run `npm run build` and click through all three roles (alumni, dept, admin) after each phase.
- Run Prettier last (Phase 7) so its large diff does not hide real changes.

## Phase 0: Safety and setup (do first)
- [ ] Move `.env.local` out of the folder. It holds a `VERCEL_OIDC_TOKEN`. Never zip or share the folder with it inside.
- [ ] Run `git init`, check that `.gitignore` covers `node_modules`, `dist`, `.vercel` and `.env*`, then commit a baseline.
- [ ] Delete the leftover `client/node_modules/.vite/deps_temp_*` folder.

## Phase 1: Remove dead files
- [x] Delete `client/src/pages/alumni/AlumniSurvey.jsx` (18 KB, imported nowhere; `/alumni/survey` already redirects to the profile). Done 2026-10-14.
- [ ] Delete `client/src/assets/images/*` (unused; code uses `public/`).
- [ ] Delete the stray root `.md` (it duplicates `docs/deploy-notes.md`).
- [ ] Keep one copy of `Alumni Tracer Mockups.dc.html`. The root and `docs/` copies differ, so confirm which is current, keep that one in `docs/`, and delete the other.
- [ ] Decide whether to keep `resources.md` and `docs/prompt.md`. They look like AI-prompt leftovers.
- [ ] Remove `client/dist/` from the source tree. It is a build artifact and gets regenerated.

## Phase 2: Quick performance win
- [ ] Compress `alumni-logo.png` from 5.5 MB to under 100 KB (resize to the largest displayed size, or convert to WebP/SVG) in `client/public`.

## Phase 3: Remove duplication
- [ ] Add a `<Logo>` component to replace the repeated `<img src="/alumni-logo.png">` in about 9 files (NavSidebar, EventsView, PrivacyConsentView, RegisterView, RegSuccessView, ReportsView, SignInView, and others).
- [ ] Add `lib/storage.js` (or a `useLocalStorage` hook) with safe `load(key, fallback)` and `save(key, value)`. Replace the copy-pasted try/JSON.parse/localStorage code in EventsContext, JobsContext, RecordsContext, NotificationBell, AuthContext and ProfileContext.
- [ ] Merge `client/src/data/colleges.js` and `client/src/lib/colleges.js` into one source of truth. Resolve the overlapping program names (for example the two "Public Administration" spellings that both map to BPA).
- [ ] Move repeated hex colors to CSS variables in `styles/global.css`.

## Phase 4: Error handling
- [ ] Wrap the `JSON.parse` calls in AuthContext (lines 9-10) and ProfileContext (lines 8-9) in a try/catch, using the new storage helper, so corrupted storage cannot crash startup.
- [ ] Replace the empty `catch` blocks on storage writes with a Toast message (quota errors are currently silent).
- [ ] Add a top-level React error boundary in `App.jsx`.

## Phase 5: Break up the giant files (largest effort)
Do one file per commit, in this order. For each: extract subcomponents into a folder next to the view, move inline `style={{}}` into CSS classes or CSS modules, and keep props unchanged.
1. `views/AdminPostsView.jsx` (3,483 lines, about 355 inline styles)
2. `views/RecordsView.jsx` (2,804 lines) and `hooks/useRecordsPage.js` (split by concern: filters, selection, modals)
3. `views/AdminDashboardView.jsx` and `views/CollegeDashboardView.jsx` (about 1,100 lines each)
4. `views/EventsView.jsx`, `ReportsView.jsx`, `JobsView.jsx`, `AlumniDashboardView.jsx`
5. `context/SearchContext.jsx` (16 KB; separate indexing from state)

Check the import map first. `AdminPostsView` seems to serve the admin Jobs and Events pages, so rename it to match.

## Phase 6: Naming and structure
- [ ] Settle the `pages/` vs `views/` convention and document it in the README. Pages are thin controllers and views are presentational.
- [ ] Align naming: `College*` against the role id `dept`, and `AlumniRecords` living under `admin/`.
- [ ] Move the JSX in `lib/fields.jsx` into `components/`, and separate seed data from form definitions in `data/`.
- [~] Remove `import React from 'react'` where the automatic JSX runtime makes it unnecessary (about 61 files). Keep it only where `React.` is used. Partly done 2026-10-14: every import ESLint flagged as unused is gone; the remaining ones (mostly `views/*`, `main.jsx`) still use `React.`.

## Phase 7: Tooling
- [x] Add ESLint (`eslint-plugin-react`, `react-hooks`, `jsx-a11y`) so the existing `eslint-disable` comments mean something, then fix what it reports. `npm run lint` reports 0 errors as of 2026-10-14 (prop-types rule off; see `track-progress.md`).
- [~] Add `format` and `lint` scripts to `client/package.json`, add `.editorconfig`, and add `engines` (Node 18+) plus `.nvmrc`. `lint` and `test` scripts exist; `format`, `.editorconfig`, `engines` and `.nvmrc` are still missing.
- [ ] Run Prettier over everything as a single, isolated commit.
- [~] Add Vitest with tests for the pure logic in `lib/` (`analytics`, `adminDash`, `collegeDash`, `validation`, `colleges`) and a `test` script. Vitest and the `test` script are set up, with a smoke test and `lib/a11y.test.js`; the `lib/` logic tests listed here are still to write.

## Phase 8: Docs and security hygiene
- [ ] Update the README with the lint, format, test and structure conventions.
- [ ] Keep the hardcoded demo password (`demoPass123` in `data/demoAccounts.js`, auto-filled in `SignIn.jsx`) behind a clear "demo only" flag, and list "replace fake auth" as a blocker before production.

## Verification (after each phase)
- `npm run build` passes and `npm run dev` starts without console errors.
- Manually test sign-in and the main pages for each role: alumni, dept (college) and admin.
- After Phase 7, `npm run lint` and `npm test` pass.
- Compare the `dist/` bundle size before and after Phases 2 and 5.

## Suggested order and effort
| Phase | Effort | Risk |
|---|---|---|
| 0-2 | Under 1 hour | Low |
| 3-4 | Half a day | Low-medium |
| 5 | Several days | Medium (largest) |
| 6-8 | 1-2 days | Low |

## Status (2026-10-14)
Legend: [x] done, [~] partly done, [ ] not started. Also done outside the phases above: keyboard-accessibility and lint fixes via `lib/a11y.js` (see `track-progress.md`, Known issues 1). Not started: Phases 0 (except nothing moved yet), 2, 3, 4, 5, 6 (except the React import item), 8.
