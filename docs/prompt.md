Use the provided **`Alumni Tracer Mockups.dc.html`** as the primary design and functional reference.

Convert the entire `.dc.html` prototype into a **fully functional React + Vite application**.

### IMPORTANT

* Use the `.dc.html` as the **source of truth for the UI/UX, layout, colors, typography, spacing, components, navigation, and overall visual design**.
* Recreate the design **as closely as possible**. Do not redesign it into a different style.
* Do not simplify or remove important screens/features from the mockup.
* Make the application responsive for desktop, tablet, and mobile.
* Replace the `.dc.html` prototype interactions with real React components, state, routing, forms, and interactions.
* Organize the project cleanly and use reusable React components.
* Use **React + Vite**.
* Keep the existing visual identity of the mockup, including the UDM green/gold color palette, typography, cards, sidebar navigation, buttons, forms, tables, dashboards, and responsive behavior.
* Use the existing `udm-logo.jpg` and other provided assets where applicable.

## APPLICATION ROLES

There are **3 role-based user types**:

1. **Alumni**
2. **College / Department**
3. **Admin**

Each role must have its own appropriate dashboard, navigation, permissions, and features.

---

# PHASE 1 — AUTHENTICATION

Build this phase first before moving to the role-specific dashboards.

### 1. Sign In

Recreate the Sign In screen from the `.dc.html` as closely as possible.

Include:

* UDM Alumni branding
* UDM logo
* Welcome Back, Alumni section
* Alumni/network description
* Demo account selector
* Email or Alumni ID
* Password
* Show/Hide password
* Forgot password
* Sign In button
* Register as Alumni
* Privacy / Terms / Contact
* Responsive layout

The login must determine the user's role and redirect to the correct dashboard.

Example:

```text
Alumni Account
→ Alumni Dashboard

College / Department Account
→ College Dashboard

Admin Account
→ Admin Dashboard
```

### 2. Alumni Registration

Recreate the complete registration flow from the mockup.

Flow:

```text
Sign In
   ↓
Register as Alumni
   ↓
Data Privacy Consent
   ↓
Personal Information
   ↓
Educational Background
   ↓
Registration Successful
   ↓
Alumni Dashboard / Profile
```

Keep the existing multi-step registration design, progress indicator, validation, consent checkbox, navigation buttons, and success screen.

### 3. Authentication Structure

Create a proper React authentication structure.

Suggested:

```text
src/
├── components/
├── pages/
│   ├── auth/
│   │   ├── SignIn.jsx
│   │   ├── PrivacyConsent.jsx
│   │   ├── AlumniRegistration.jsx
│   │   └── RegistrationSuccess.jsx
│   ├── alumni/
│   ├── college/
│   └── admin/
├── layouts/
├── routes/
├── data/
├── hooks/
├── styles/
└── App.jsx
```

Use protected routes so users cannot access another role's dashboard directly.

---

# PHASE 2 — ALUMNI SIDE

After Phase 1 is working, implement the **Alumni portal**.

Use the existing `.dc.html` screens as the visual reference.

The Alumni side should include:

### Alumni Dashboard

* Sidebar navigation
* User profile/avatar
* Profile completion
* Connections
* Job matches
* Events attended
* Survey/profile status
* Dashboard cards
* Recent activity
* Calls to action

### Alumni Profile

Implement the profile/edit profile functionality shown in the mockup.

Include:

* Personal information
* Educational background
* Employment/career information
* Profile completion
* Edit/save functionality
* Profile avatar
* Appropriate form validation

### Alumni Survey

Implement the alumni tracer survey shown in the mockup.

The survey should:

* Use the existing sections/questions from the `.dc.html`
* Have step-by-step navigation
* Show progress
* Save answers in React state
* Allow editing before submission
* Display a submitted/success state
* Preserve previously entered registration information where applicable

### Jobs

Implement the Alumni Jobs page.

Include:

* Job listings
* Search/filter
* Job details
* Apply action
* Application status
* Appropriate cards/layout based on the mockup

### Events

Implement the Alumni Events page.

Include:

* Event cards
* Event details
* Date/time/location
* Registration/action buttons
* Event status

Do not invent a completely different design. Follow the `.dc.html`.

---

# PHASE 3 — ADMIN SIDE

After the Alumni side is functional, implement the **Admin portal**.

The Admin interface should follow the existing Admin Dashboard design in the `.dc.html`.

### Admin Dashboard

Include:

* Admin sidebar
* Admin topbar
* Search
* Dashboard statistics/KPIs
* Alumni statistics
* Registration statistics
* Employment statistics
* Survey/tracer statistics
* Recent activity
* Charts/visualizations where shown in the mockup

### Alumni Records

Implement:

* Alumni records table
* Search
* Filters
* College filter
* Course/program filter
* Batch/year filter
* Status filter
* View alumni details
* Record management

### Reports

Implement the Reports section from the mockup.

Include the existing report types and filtering/scope structure.

Allow administrators to:

* Select report type
* Filter by college
* Filter by course/program
* Filter by batch
* Generate/view report
* Display report statistics

### Jobs Management

Admin should be able to:

* View job postings
* Create job posting
* Edit job posting
* Delete/deactivate job posting
* Manage job status

### Events Management

Admin should be able to:

* Create events
* Edit events
* Delete events
* Manage event status
* View registrations

---

# COLLEGE / DEPARTMENT SIDE

The system also has a **College / Department role**.

Implement the College Dashboard using the existing `.dc.html` design and functionality.

College users should only see information relevant to their college/department.

Include:

* College dashboard
* Alumni statistics
* Employment/employability insights
* Alumni outreach
* Alumni records relevant to their college
* Course/program filtering
* Batch filtering
* Relevant reports/insights

College users must NOT have the same permissions as Admin.

---

# ROLE PERMISSIONS

Implement clear role-based access:

```text
ALUMNI
├── Dashboard
├── Profile
├── Alumni Survey
├── Jobs
└── Events

COLLEGE / DEPARTMENT
├── Dashboard
├── Alumni Records
├── Alumni Insights
├── Outreach
└── College Reports

ADMIN
├── Dashboard
├── Alumni Records
├── Reports
├── Jobs Management
├── Events Management
└── System-wide management
```

The navigation should dynamically change depending on the logged-in role.

---

# DESIGN REQUIREMENTS

The most important requirement is:

**MAKE THE REACT APPLICATION LOOK AS CLOSE AS POSSIBLE TO THE PROVIDED `.dc.html`.**

Preserve:

* UDM green/dark green palette
* Gold accents
* Off-white backgrounds
* Typography
* Card styling
* Border radius
* Shadows
* Sidebar
* Top navigation
* Dashboard layouts
* Tables
* Form layouts
* Buttons
* Status badges
* Progress indicators
* Responsive behavior
* Spacing and proportions
* Desktop/mobile layouts

Do NOT replace the design with a generic Bootstrap/Admin dashboard template.

Do NOT create a completely new UI.

---

# IMPLEMENTATION RULES

1. Start with **Phase 1 only**.
2. Make sure Phase 1 works before proceeding to Phase 2.
3. Then implement Phase 2.
4. Then implement Phase 3 and the College role.
5. Reuse components instead of duplicating UI.
6. Use React Router for navigation.
7. Use reusable components for:

   * Sidebar
   * Topbar
   * Cards
   * Tables
   * Forms
   * Buttons
   * Modals
   * Status badges
   * Charts
8. Keep the code modular and maintainable.
9. Do not put the entire application into one huge component.
10. Preserve the content and terminology already present in the `.dc.html`.
11. If functionality in the `.dc.html` is represented only as prototype/mock data, reproduce the behavior with local React state first rather than inventing unrelated functionality.
12. Make sure all buttons, navigation items, forms, filters, modals, and interactions actually work.

## Final goal

Turn the provided **UDM Alumni Tracer `.dc.html` prototype into a production-style React + Vite application**, while maintaining the original design as closely as possible.

Build it in this order:

```text
PHASE 1
Authentication
├── Sign In
├── Privacy Consent
├── Alumni Registration
└── Registration Success

        ↓

PHASE 2
Alumni Portal
├── Dashboard
├── Profile
├── Alumni Survey
├── Jobs
└── Events

        ↓

PHASE 3
College + Admin
├── College Dashboard
├── Alumni Insights
├── Outreach
├── Admin Dashboard
├── Alumni Records
├── Reports
├── Jobs Management
└── Events Management
```

**Do not move to the next phase until the current phase is implemented and visually matched to the `.dc.html`.**
