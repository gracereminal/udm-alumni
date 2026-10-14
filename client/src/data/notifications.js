const I = {
  job: 'M3 7h18v13H3zM8 7V4h8v3',
  cal: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  check: 'M20 6L9 17l-5-5',
};

export const TONES = { green: ['#E6F0EB', '#0F3D2E'], gold: ['#FBF0D8', '#8A6D1F'] };

/** Notification feed per role. `to` is a screen id resolved by screenPath(role, id). */
export function notifDefs(role) {
  if (role === 'admin') {
    return [
      { id: 'a1', icon: I.user, tone: 'green', title: '14 new alumni registrations', body: 'Awaiting verification against the registrar’s graduate list.', time: '10 min ago', to: 'records' },
      { id: 'a2', icon: I.chart, tone: 'gold', title: 'Alumni survey passed 60% response rate', body: 'Class of 2024 is now at 61.8%. Report data has been refreshed.', time: '2 hours ago', to: 'reports' },
      { id: 'a3', icon: I.job, tone: 'green', title: 'Job posting submitted for review', body: 'Brightline Tech submitted “Junior Backend Developer”.', time: 'Yesterday', to: 'jobs' },
      { id: 'a4', icon: I.cal, tone: 'gold', title: 'Homecoming RSVPs reached 400', body: '412 alumni have RSVP’d to the Grand Alumni Homecoming.', time: 'Sep 26', to: 'events' },
    ];
  }
  if (role === 'dept') {
    return [
      { id: 'd1', icon: I.user, tone: 'green', title: '14 new alumni registrations', body: 'Awaiting verification against the registrar’s graduate list.', time: '10 min ago', to: 'records' },
      { id: 'd2', icon: I.chart, tone: 'gold', title: 'Alumni survey passed 60% response rate', body: 'Class of 2024 is now at 61.8%. Report data has been refreshed.', time: '2 hours ago', to: 'reports' },
      { id: 'd3', icon: I.job, tone: 'green', title: 'Batch 2024 coverage below target', body: 'Send survey reminders to alumni who haven’t responded.', time: 'Yesterday', to: 'outreach' },
    ];
  }
  return [
    { id: 'u1', icon: I.job, tone: 'green', title: 'New job match: Cloud Support Engineer', body: 'Northpoint Cloud is hiring IT graduates. Applications close Oct 10.', time: '25 min ago', to: 'jobs' },
    { id: 'u2', icon: I.cal, tone: 'gold', title: 'Alumni Job Fair is this Sunday', body: 'Oct 4, 9:00 AM at the UDM Quadrangle — 18 partner employers.', time: '3 hours ago', to: 'events' },
    { id: 'u3', icon: I.user, tone: 'green', title: 'Keep your employment details current', body: 'Update your profile so the alumni survey reflects your latest role.', time: 'Yesterday', to: 'profile' },
    { id: 'u4', icon: I.check, tone: 'gold', title: 'Alumni survey response received', body: 'Thank you — your 2026 survey has been recorded.', time: 'Sep 24', to: 'dashboard' },
  ];
}
