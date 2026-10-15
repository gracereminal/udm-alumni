import { COLLEGES } from './colleges';
// Event helpers: formatting, the composer form model and validation. Events, counts and status come from /events.

/** Today in Manila as YYYY-MM-DD (the server re-checks dates against its own clock). */
export const manilaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

export const EVENT_KIND_STYLE = { EVENT: ['#0F3D2E', '#E6F0EB'], CAREER: ['#8A6D1F', '#FBF0D8'], COMMUNITY: ['#1E4E79', '#E6EEF6'] };

export const NOTICE_KINDS = { Notice: ['#475569', '#EEF2F6'], Reminder: ['#8A4B08', '#FDEFD9'], Update: ['#1E4E79', '#E6EEF6'] };

export const EVENT_HOSTS = [
  'UDM Alumni Relations Office', 'Office of the President', 'Office of Student Affairs', 'Career Development Office',
  ...Object.keys(COLLEGES).filter((k) => k !== 'Others'),
];

export const evCat = (e) => (e.kind === 'CAREER' ? 'Career' : e.kind === 'COMMUNITY' ? 'Community' : 'Events');
export const evTs = (e) => { const t = Date.parse(e.iso || e.date); return Number.isNaN(t) ? 8.64e15 : t; };

export const EV_STATUS_META = {
  open: { label: 'Registration Open', fg: '#0B5D3F', bg: '#E3F3EA', dot: '#0F8A5F' },
  full: { label: 'Full', fg: '#8A4B08', bg: '#FDEFD9', dot: '#D97706' },
  closed: { label: 'Registration Closed', fg: '#475569', bg: '#EEF2F6', dot: '#94A3B8' },
  cancelled: { label: 'Cancelled', fg: '#9F1239', bg: '#FCE9EE', dot: '#E11D48' },
  past: { label: 'Past Event', fg: '#64748B', bg: '#F1F5F9', dot: '#CBD5E1' },
};

/** Active registrations, the viewer's own included (counted by the server from EVENT_REGISTRATION). */
export const evCount = (e) => e.regCount || 0;
/** open | full | closed | cancelled | past, as computed by v_event_stats. */
export const evStatusKey = (e) => e.statusKey || 'open';
export const photoCss = (e) => (e && e.photo ? `url("${e.photo}") center/cover no-repeat` : 'repeating-linear-gradient(135deg,#E9E5DB 0 10px,#F1EEE7 10px 20px)');

export const evPad = (n) => String(n).padStart(2, '0');
export const EV_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const EV_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function evFmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${EV_MONTHS[m - 1]} ${d}, ${y}`;
}
export function evFmtTime(d) {
  const f = (t) => { if (!t) return ''; let [h, mi] = t.split(':').map(Number); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(mi).padStart(2, '0')} ${ap}`; };
  return [f(d.timeStart), f(d.timeEnd)].filter(Boolean).join(' – ');
}

/** Event -> composer form model */
export function evToForm(e) {
  let iso = String(e.iso || '').slice(0, 10);
  if (!iso) { const ts = Date.parse(e.date); if (!Number.isNaN(ts)) { const x = new Date(ts); iso = `${x.getFullYear()}-${evPad(x.getMonth() + 1)}-${evPad(x.getDate())}`; } }
  const tm = [];
  String(e.time || '').replace(/(\d{1,2}):(\d{2})\s*([AP])\.?M/gi, (_, h, mi, ap) => { tm.push(`${evPad((+h % 12) + (ap.toUpperCase() === 'P' ? 12 : 0))}:${mi}`); return _; });
  return { id: e.id, title: e.title || '', dateISO: iso, timeStart: e.timeStart || tm[0] || '', timeEnd: e.timeEnd || tm[1] || '', venue: e.venue || '', organizer: e.organizer || EVENT_HOSTS[0], body: (e.body || []).join('\n\n'), status: e.statusKey || 'open' };
}
export function evValidate(f, checkPast) {
  const r = {};
  if (!String(f.title || '').trim()) r.title = 'Enter an event title.';
  if (!f.dateISO) r.date = 'Select a date.';
  else if (checkPast && f.dateISO < manilaToday()) r.date = 'Choose a date that hasn’t passed.';
  if (!f.timeStart) r.time = 'Enter a start time.';
  else if (f.timeEnd && f.timeEnd <= f.timeStart) r.time = 'End time must be after the start time.';
  if (!String(f.venue || '').trim()) r.venue = 'Enter a venue.';
  if (!String(f.body || '').trim()) r.body = 'Add a description.';
  return r;
}
export function evFromForm(f) {
  const iso = f.dateISO;
  const p = iso.split('-').map(Number);
  const time = evFmtTime(f);
  const venue = f.venue.trim();
  const body = String(f.body).trim();
  return {
    iso, month: EV_MONTHS_SHORT[p[1] - 1], day: evPad(p[2]), title: f.title.trim(), date: evFmtDate(iso), time, venue,
    organizer: f.organizer || EVENT_HOSTS[0], meta: [time.split(' – ')[0], venue.split(',')[0]].filter(Boolean).join(' · '),
    teaser: body.slice(0, 150), body: body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
  };
}
