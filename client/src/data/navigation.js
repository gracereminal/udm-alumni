// Role-based navigation. The sidebar and the in-app links are built from this single source.
const ICONS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 14h7v7H3z',
  people: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 4.2a3.5 3.5 0 0 1 0 6.6M21 20v-1.5a4 4 0 0 0-3-3.8',
  briefcase: 'M3 8.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5zM8.5 8.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v3M3 13h18',
  records: 'M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8.5 13h7M8.5 17h5',
  chart: 'M4 4v16h16M8 20v-6M12.5 20V9M17 20v-8',
  form: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9.5 8h5M9.5 12h5M9.5 16h3',
  user: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20.5v-1a4.5 4.5 0 0 1 4.5-4.5h5a4.5 4.5 0 0 1 4.5 4.5v1',
  calendar: 'M4.5 6h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM8 3.5V6M16 3.5V6M3.5 10.5h17',
  outreach: 'M4 5h16v11H8l-4 4zM8 9.5h8M8 12.5h5',
};

export const NAV = {
  alumni: [
    { id: 'dashboard', label: 'Dashboard', to: '/alumni/dashboard', icon: ICONS.dashboard },
    { id: 'profile', label: 'Profile', to: '/alumni/profile', icon: ICONS.user },
    { id: 'jobs', label: 'Jobs', to: '/alumni/jobs', icon: ICONS.briefcase },
    { id: 'events', label: 'Events', to: '/alumni/events', icon: ICONS.calendar },
  ],
  dept: [
    { id: 'dashboard', label: 'Dashboard', to: '/college/dashboard', icon: ICONS.dashboard },
    { id: 'records', label: 'Alumni Records', to: '/college/records', icon: ICONS.records },
    { id: 'outreach', label: 'Outreach', to: '/college/outreach', icon: ICONS.outreach },
    { id: 'reports', label: 'Reports', to: '/college/reports', icon: ICONS.chart },
  ],
  admin: [
    { id: 'dashboard', label: 'Admin Dashboard', to: '/admin/dashboard', icon: ICONS.dashboard },
    { id: 'records', label: 'Alumni Records', to: '/admin/records', icon: ICONS.records },
    { id: 'reports', label: 'Reports', to: '/admin/reports', icon: ICONS.chart },
    { id: 'jobs', label: 'Jobs', to: '/admin/jobs', icon: ICONS.briefcase },
    { id: 'events', label: 'Events', to: '/admin/events', icon: ICONS.calendar },
  ],
};

/** Landing page per role after sign-in. */
export const ROLE_HOME = { alumni: '/alumni/dashboard', dept: '/college/dashboard', admin: '/admin/dashboard' };

export const ROLE_LABEL = { alumni: 'Alumni', dept: 'College Dean', admin: 'Administrator' };
export const ROLE_BASE = { alumni: '/alumni', dept: '/college', admin: '/admin' };

/** Path for a named screen of a role, e.g. screenPath('admin', 'records') -> /admin/records */
export function screenPath(role, id) {
  const item = (NAV[role] || []).find((n) => n.id === id);
  return item ? item.to : `${ROLE_BASE[role] || ''}/dashboard`;
}
