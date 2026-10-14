# ISO/IEC 25010 Quality Prompt — UDM Alumni Tracer (React + Vite)

You are working in the React + Vite client for **"UDM Alumni"** (Universidad de Manila).
It has three roles (Alumni, College, Admin) and these screens: Sign In, Forgot Password,
Register as Alumni (multi-step), Data Privacy Notice, Privacy Consent Declined, Registration
Successful, Survey Submitted, Alumni Dashboard, Edit Profile, Job Board, Events, College
Dashboard, Admin Dashboard, Manage Records, and Reports.

**Goal:** bring the client up to ISO/IEC 25010:2023 product quality. Keep the current visual
design and branding unless a change is needed to fix a quality issue.

## Before changing anything

1. Read `package.json`, `vite.config`, the `src/` folder structure, the router setup, and how
   state, API calls, and auth are handled.
2. Give me a short summary of the architecture and a plan, then wait for my approval
   before making large changes (new libraries, folder restructuring, state management swaps).

## Set up tooling so quality can be measured, not assumed

- ESLint with `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-jsx-a11y`
- Vitest + React Testing Library for unit and component tests
- `@axe-core/react` or `vitest-axe` for accessibility checks
- `rollup-plugin-visualizer` to inspect bundle size
- `npm audit` for dependency vulnerabilities

Add npm scripts for `lint`, `test`, `test:coverage`, and `build:analyze`.

## Check and fix each ISO 25010 characteristic

### 1. Functional suitability
- Registration, tracer survey, job posting, events, record verification, and reports work end to end for the correct role.
- Validate all forms (email, student number, graduation year, required fields) with a consistent approach (e.g., react-hook-form + zod) and clear inline error messages.

### 2. Performance efficiency
- Lazy-load routes with `React.lazy` and `Suspense`, especially admin and reports pages.
- Remove unused dependencies and duplicate font loads; optimize images.
- Paginate or virtualize long lists (Manage Records, Job Board).
- Avoid unnecessary re-renders (stable keys, memoization only where it measurably helps).
- Target a Lighthouse performance score of 90+ on the production build.

### 3. Compatibility
- Works on current Chrome, Edge, Firefox, and Safari, desktop and mobile.
- API calls go through one client module with consistent request/response handling.
- Report exports use standard formats (CSV, PDF).

### 4. Interaction capability (usability and accessibility)
- Meet WCAG 2.2 AA. Every clickable element is a real `<button>` or `<a>`, never a `<div>` with `onClick`.
- Every input has a connected `<label>` or `aria-label`; placeholders are not labels.
- Text contrast at least 4.5:1 (check slate grays like `#94A3B8`, which fail on white).
- Minimum 12px text, 16px inputs on mobile, 44×44px touch targets.
- Visible focus styles everywhere; manage focus on route changes and modals.
- Loading, empty, and error states on every data-driven screen.

### 5. Reliability
- Add an error boundary around routes with a friendly fallback.
- Handle API failures, timeouts, and offline states without losing form input.
- Multi-step registration keeps progress if the user goes back or refreshes.

### 6. Security
- Protected routes by role; alumni cannot reach college or admin routes.
- Store tokens safely (prefer httpOnly cookies set by the backend over localStorage).
- No secrets in the client; only `VITE_` variables meant to be public.
- No `dangerouslySetInnerHTML` with user content; sanitize if unavoidable.
- Fix high and critical `npm audit` findings.
- List what the backend must enforce, since client checks alone are not security.

### 7. Maintainability
- Consistent folder structure (e.g., `features/`, `components/`, `hooks/`, `services/`).
- Replace repeated inline styles with shared components, CSS modules, or design tokens.
- Extract repeated logic into custom hooks.
- Zero ESLint errors. At least 70% test coverage on forms, auth, and role routing.
- Brief README covering setup, scripts, environment variables, and folder layout.

### 8. Flexibility
- Responsive from 360px to wide desktop.
- API base URL and other settings come from environment variables.
- Colors, spacing, and typography defined in one place.

### 9. Safety and privacy
- Comply with the Philippine Data Privacy Act (RA 10173): explicit, recorded consent; respectful handling when consent is declined; alumni can view, edit, and request deletion of their data.
- Confirmation dialogs for destructive actions (delete, reject record).
- Do not log personal data to the console in production.

## Deliverables

- A summary table: characteristic, status (Pass / Needs work / Fail), main issue.
- Code changes in small, reviewable commits grouped by characteristic.
- A change log listing each fix with the files it touched.
- Before/after numbers: Lighthouse scores, bundle size, ESLint errors, test coverage, axe violations, `npm audit` results.
- A list of backend requirements needed to fully meet security, reliability, and privacy.