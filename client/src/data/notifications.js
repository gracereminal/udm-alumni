// Notification icons and tones by NOTIFICATION.type. The notifications themselves come from the API.
const I = {
  job: 'M3 7h18v13H3zM8 7V4h8v3',
  cal: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  check: 'M20 6L9 17l-5-5',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
};

export const TONES = { green: ['#E6F0EB', '#0F3D2E'], gold: ['#FBF0D8', '#8A6D1F'] };

const BY_TYPE = {
  registration: [I.user, 'green'], account_approved: [I.check, 'green'], record_status: [I.check, 'gold'], survey: [I.check, 'gold'], milestone: [I.chart, 'gold'], coverage_alert: [I.chart, 'gold'],
  job_submitted: [I.job, 'green'], job_decision: [I.job, 'green'], job_match: [I.job, 'green'], event: [I.cal, 'gold'], rsvp: [I.cal, 'gold'], outreach: [I.mail, 'green'],
};
export const notifLook = (type) => { const [icon, tone] = BY_TYPE[type] || [I.doc, 'green']; return { icon, tone }; };

/** "10 min ago", "2 hours ago", "Yesterday", "Sep 26" — rendered from created_at. */
export function timeAgo(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  if (h < 48) return 'Yesterday';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
}
