# UDM Alumni Tracer — React + Vite

Production-style React port of the `Alumni Tracer Mockups.dc.html` prototype (same UDM green/gold design, copy and behavior).

```bash
npm run install:client   # installs client/ dependencies
npm run dev              # http://localhost:5173
npm run build            # production build -> client/dist
npm run preview          # serve the production build locally
```

Requires Node.js 18+. Stack: React 18, React Router 6, Vite 5.

## Demo accounts (password `demoPass123`)

| Role | Email | Lands on |
|---|---|---|
| Alumni | `maria.delacruz@udmalumni.edu` (or Alumni ID `2024-00567-AT`) | `/alumni/dashboard` |
| College / Department | `ccs.dean@udmalumni.edu` | `/college/dashboard` |
| Admin | `admin@udmalumni.edu` | `/admin/dashboard` |

New alumni can register via **Register as Alumni** (privacy consent → personal → contact → education → success).

## Project layout

```text
client/       React + Vite frontend (own package.json)
backend/      reserved for the future API (empty)
docs/         design prototypes (*.dc.html) and deploy notes
resources.md  redesign guidelines (match the .dc.html reference, keep features unchanged)
vercel.json   Vercel build config + SPA rewrites
```

## Client structure (client/)

```
src/
├── components/   NavSidebar, Topbar (topbar/: search pill, notification bell, user chip), FormField, DatePicker, Modal, Pager, alumni/ (job details modal, profile photo card)
├── context/      Auth, Profile (registration + survey), Records, Jobs, Events, Search, Toast providers
├── data/         seed data, per-role navigation, form / survey definitions
├── hooks/        page controllers (records, reports), chart tooltip, confirm/toast helpers
├── layouts/      AppShell (responsive hooks), PortalPage
├── lib/          analytics, dashboard view-models, validation, formatting
├── pages/        auth/ · alumni/ · college/ · admin/
├── routes/       AppRoutes + role guards (a role can only open its own area)
├── views/        presentational screens converted 1:1 from the prototype markup
└── styles/       prototype.css (responsive rules) + global.css
```

## Roles

- **Alumni** – Dashboard, Profile, Alumni Survey (review → submit), Jobs (search/filter, details, save, apply, post for review), Events (register, add to calendar).
- **College / Department** – Dashboard, Alumni Records (own college only), Outreach, Reports (own college only).
- **Admin** – Dashboard, Alumni Records, Reports, Jobs management (post / edit / deactivate / delete, approve alumni submissions), Events management (create / edit / duplicate / delete, status, registrations, announcements).

State lives in React context and is persisted to `localStorage` (no backend).

## Deployment

Deployed to Vercel as a SPA. The root `vercel.json` installs and builds the client, serves `client/dist`, and rewrites all routes to `index.html`.

```bash
npx vercel --prod --yes
```

`.env.local` (created by the Vercel CLI) holds a local OIDC token and is git-ignored — don't commit it.
