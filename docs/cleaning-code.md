# Code Cleaning Plan: udm-alumni

## Goal
Make the code easy to read for someone seeing it for the first time, without changing what it does. Every feature, route, button and stored value keeps working exactly as before. This is a refactor, not a rewrite.

The work covers four things: removing dead code and duplication, breaking up the oversized files, untangling spaghetti code, and adding the tooling (format, tests) that keeps it clean.

## Ground rules
- **No behavior changes.** The same inputs give the same screens, the same data and the same localStorage keys. If you find a bug, write it down in `track-progress.md` and fix it in its own commit. Do not slip it into a cleanup commit.
- **Keep the public shape.** Component props, context values, hook return values, exported function names and storage keys (`udm.*.v1`) stay the same unless every caller is updated in the same commit.
- **Small commits.** One phase, or one file in Phase 5, per commit. Each commit message says what moved and where.
- **Check after every commit:** `npm run build`, `npm run lint` and `npm test` pass, then click through all three roles (alumni, dept, admin). See [Verification](#verification-after-each-commit).
- **Run Prettier on its own** (Phase 7) so its large diff does not hide real changes.

## Readability rules (no spaghetti)
These rules apply to every file touched during cleanup and to all new code. Each rule ends with a quick check.

### 1. One job per file
- A view shows things. A hook holds state and handlers. A `lib/` file holds pure logic (no React, no localStorage). A context shares state across pages.
- If you need the word "and" to describe a file ("renders the table *and* builds the CSV *and* handles filters"), split it.
- *Check:* aim for under ~300 lines per component file. A longer file needs a reason.

### 2. Short functions with clear names
- One function does one thing. Its name says what it does or returns: `buildCsvRows`, `isProfileComplete`, `handleArchiveClick`. Avoid names like `doStuff`, `process`, `handle2` or `temp`.
- Components use PascalCase, hooks start with `use`, handlers start with `handle` (or `on` when passed as props), booleans start with `is`, `has` or `can`.
- *Check:* aim for under ~40 lines per function. If a block needs a comment to explain what it does, turn it into a named function.

### 3. Flat control flow
- Use early returns instead of deep nesting. Keep nesting to 3 levels or fewer.
- No nested ternaries in JSX. Move the logic into a variable or a small component above the `return`.
- Replace long `if / else if` chains on a type or status with a lookup object, such as `const STATUS_LABEL = { pending: 'Pending', approved: 'Approved' }`.

```jsx
// Before
{loading ? <Spinner /> : error ? <ErrorMsg /> : rows.length ? <Table rows={rows} /> : <Empty />}

// After
if (loading) return <Spinner />;
if (error) return <ErrorMsg />;
if (!rows.length) return <Empty />;
return <Table rows={rows} />;
```

### 4. Data flows one way
- Data goes down through props and changes go up through callbacks. A child never reaches into a parent's state or into another component's localStorage key.
- Each localStorage key is read and written by exactly one context, always through `lib/storage.js` (`readStore`, `writeStore`, `useStoreSync`). No direct `localStorage` or `JSON.parse` calls elsewhere.
- Avoid prop drilling deeper than about 3 levels. Use the existing context or pass a smaller component as children instead.
- *Check:* `grep -rn "localStorage\." client/src` should list only `lib/storage.js` and tests.

### 5. No magic values
- Move repeated strings, numbers and colors into named constants (`data/` or the top of the file) or CSS variables in `styles/global.css`.
- Role ids (`alumni`, `dept`, `admin`), statuses and storage keys are each defined once and imported everywhere else.

### 6. Styles live in CSS
- No large inline `style={{...}}` objects. Use CSS classes (or CSS modules next to the view). Keep inline styles only for values computed at runtime, such as a chart bar's width.

### 7. Effects are for syncing, not for logic
- `useEffect` is only for syncing with something outside React (storage, timers, the DOM, the API). Derived values are computed during render (with `useMemo` if they are expensive), not copied into state through an effect.
- Every effect has a correct dependency list. Do not silence `react-hooks/exhaustive-deps` without a comment that says why.

### 8. Comments explain *why*
- Code should say *what* it does through its names. Comments are for the *why*: a workaround, a business rule, a non-obvious edge case.
- Delete commented-out code and stale TODOs. Git history keeps the old version.
- Put a one-line `/** ... */` summary on every exported function in `lib/` and every custom hook.

### 9. Errors are never silent
- No empty `catch {}` blocks unless a comment explains why ignoring the error is safe. Otherwise show a Toast or return a clear fallback value.

### 10. Imports are tidy
- Order imports: React, third-party, then project files (`context`, `hooks`, `lib`, `components`), then styles. Remove unused imports (ESLint flags them).
- No circular imports between contexts.

## Phase 0: Safety and setup
- [x] Git repository with a baseline commit (`f153dfa`).
- [ ] Move `.env.local` out of the folder. It holds a `VERCEL_OIDC_TOKEN`. Never zip or share the folder with it inside.
- [ ] Confirm that `.gitignore` covers `node_modules`, `dist`, `.vercel` and `.env*`.
- [ ] Delete the leftover `client/node_modules/.vite/deps_temp_*` folder.

## Phase 1: Remove dead files
- [x] Delete `client/src/pages/alumni/AlumniSurvey.jsx` (imported nowhere; `/alumni/survey` already redirects to the profile). Done 2026-10-14.
- [ ] Delete `client/src/assets/images/*`. It is unused because the code loads images from `public/`.
- [x] Delete the stray root `.md` file. It duplicates `docs/deploy-notes.md`. Done 2026-10-19.
- [ ] Keep one copy of each mockup (`docs/*.dc.html`): confirm which is current and delete the rest.
- [ ] Decide whether to keep `docs/resources.md` and `docs/prompt.md`. They look like AI-prompt leftovers.
- [ ] Remove `client/dist/` from the source tree. It is a build artifact and gets regenerated.

## Phase 2: Quick performance win
- [ ] Compress `client/public/alumni-logo.png` from 5.5 MB to under 100 KB (resize it to the largest size it is shown at, or convert it to WebP or SVG).

## Phase 3: Remove duplication
- [ ] Add a `<Logo>` component to replace the repeated `<img src="/alumni-logo.png">` in about 10 files (NavSidebar, EventsView, PrivacyConsentView, RegisterView, RegSuccessView, ReportsView, SignInView, and others).
- [x] Shared storage helper `lib/storage.js` (`readStore`, `writeStore`, `useStoreSync`), used by AuthContext, ProfileContext, EventsContext, JobsContext, RecordsContext and NotificationBell.
- [ ] Merge `client/src/data/colleges.js` and `client/src/lib/colleges.js` into one source of truth. Resolve the overlapping program names (for example the two "Public Administration" spellings that both map to BPA).
- [ ] Move repeated hex colors to CSS variables in `styles/global.css` (rule 5).
- [ ] Look for copy-pasted handlers and table, filter or modal code across the views and pull out shared hooks or components. Do this only when 3 or more places share the same code; two similar blocks can stay as they are.

## Phase 4: Error handling
- [x] Safe `JSON.parse` on startup through `readStore`, so corrupted storage cannot crash AuthContext or ProfileContext.
- [ ] Show a Toast when `writeStore` returns `false`, so storage quota errors are not silent (rule 9).
- [ ] Add a top-level React error boundary in `App.jsx` that shows a friendly "Something went wrong" screen with a reload button.

## Phase 5: Break up the giant files (largest effort)
Do one file per commit, in this order. Apply the readability rules above to each file.

| # | File | Lines |
|---|---|---|
| 1 | `views/AdminPostsView.jsx` | 3,482 |
| 2 | `views/RecordsView.jsx` + `hooks/useRecordsPage.js` | 2,768 |
| 3 | `views/AdminDashboardView.jsx`, `views/CollegeDashboardView.jsx` | ~1,200 each |
| 4 | `views/EventsView.jsx`, `ReportsView.jsx`, `JobsView.jsx`, `AlumniDashboardView.jsx` | 800-1,100 |
| 5 | `context/SearchContext.jsx` (separate the search index from the state) | ~16 KB |

**How to split a file without breaking it:**
1. **Before:** write down what the screen does (every tab, button, modal, filter and empty state) so you can check it afterwards. Add a quick render test if there is none.
2. **Make a folder** next to the view, for example `views/records/`. Keep the original `RecordsView.jsx` as the entry file so its imports and props do not change.
3. **Move pure logic first** (filtering, sorting, formatting, CSV building) into `lib/` or a `*.utils.js` file in that folder, and add unit tests for it.
4. **Move state and handlers** into a hook (for example `useRecordsFilters`, `useRecordsSelection`, `useRecordsModals`). Split `useRecordsPage.js` by concern the same way.
5. **Move each visual block** (toolbar, table, row, each modal) into its own component that takes only the props it needs.
6. **Move inline styles** into CSS classes (rule 6).
7. **After:** the entry file reads as a short outline, about a screen long, that composes the hooks and components. Go through your list from step 1 and confirm that each item still works.

Check the import map first. `AdminPostsView` seems to serve the admin Jobs and Events pages, so rename it to match what it does (keep a re-export under the old name until every import is updated).

## Phase 6: Naming and structure
- [ ] Settle the `pages/` vs `views/` convention and document it in the README. Pages are thin controllers (routing, data from context) and views are presentational.
- [ ] Align naming: `College*` against the role id `dept`, and `AlumniRecords` living under `admin/`.
- [ ] Move the JSX in `lib/fields.jsx` into `components/` so `lib/` holds only pure logic (rule 1), and separate seed data from form definitions in `data/`.
- [~] Remove `import React from 'react'` where the automatic JSX runtime makes it unnecessary. Keep it only where `React.` is used. Partly done 2026-10-14: every import ESLint flagged as unused is gone; the remaining ones (mostly `views/*`, `main.jsx`) still use `React.`.

## Phase 7: Tooling
- [x] ESLint (`eslint-plugin-react`, `react-hooks`, `jsx-a11y`). `npm run lint` reports 0 errors as of 2026-10-14 (the prop-types rule is off; see `track-progress.md`).
- [~] Scripts and config. `lint`, `test`, `test:coverage` and `client/.prettierrc` exist. Still missing: a `format` script, `.editorconfig`, `engines` (Node 18+) and `.nvmrc`.
- [ ] Add ESLint rules that enforce the readability rules: `max-depth` (3), `no-nested-ternary`, `complexity` (warn at 10), `max-lines` (warn at 300) and `max-lines-per-function` (warn at 60). Start these as warnings, since the giant files will trip them until Phase 5 is done.
- [ ] Run Prettier over everything as a single, isolated commit.
- [~] Vitest. It is set up with tests for `a11y`, `contact`, `emailTemplates`, `questionStore`, `events` and context sync. Still to write: tests for `analytics`, `adminDash`, `collegeDash`, `validation` and `colleges`. Write these **before** Phase 5 touches the dashboards, so the tests can prove nothing changed.

## Phase 8: Docs and security hygiene
- [ ] Update the README with the lint, format, test and folder conventions, and link to the readability rules in this file.
- [ ] Keep the hardcoded demo password (`demoPass123` in `data/demoAccounts.js`, auto-filled in `SignIn.jsx`) behind a clear "demo only" flag, and list "replace fake auth" as a blocker before production.

## Verification (after each commit)
- `npm run build` passes and `npm run dev` starts without console errors or warnings.
- `npm run lint` and `npm test` pass.
- Manually test sign-in and the main pages for each role (alumni, dept and admin): create, edit, filter, export and delete wherever the page supports it.
- Existing localStorage data still loads. Test with a browser profile that already has data, not only a fresh one.
- After Phases 2 and 5, compare the `dist/` bundle size before and after.

## Review checklist (for each cleanup commit)
- [ ] Does the screen still behave exactly as before?
- [ ] Could a new teammate tell what each file and function does from its name alone?
- [ ] No function over ~40 lines, no nesting deeper than 3 levels, no nested ternaries?
- [ ] No direct `localStorage` calls, no magic values, no large inline styles?
- [ ] No commented-out code, empty `catch` blocks or unused imports?

## Suggested order and effort
| Phase | Effort | Risk |
|---|---|---|
| 0-2 | Under 1 hour | Low |
| 3-4 | Half a day | Low-medium |
| 7 (tests for `lib/`) | Half a day | Low (do before Phase 5) |
| 5 | Several days | Medium (largest) |
| 6, 7 (rest), 8 | 1-2 days | Low |

## Status (2026-10-19)
Legend: [x] done, [~] partly done, [ ] not started.
- **Done:** git baseline, dead `AlumniSurvey.jsx`, `lib/storage.js` and safe storage reads, ESLint with 0 errors, Vitest setup. Keyboard-accessibility and lint fixes were also done through `lib/a11y.js` (see `track-progress.md`, Known issues 1).
- **Partly done:** removing unneeded React imports, tooling scripts, `lib/` tests.
- **Not started:** Phase 2, Phase 5, the remaining items in Phases 0, 1, 3, 4, 6 and 8, the readability ESLint rules, and Prettier.
