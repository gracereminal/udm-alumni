import { COLLEGES } from './colleges';
// Events seed data, notices and helpers (status logic, announcement feed items).
export const TODAY_ISO = '2026-10-02';

export const EVENT_DEFS = [
  {
    id: 'homecoming', month: 'Oct', day: '12', kind: 'EVENT', kindColor: '#0F3D2E', kindBg: '#E6F0EB',
    title: 'UDM Grand Alumni Homecoming 2026', meta: '4:00 PM · UDM Gymnasium',
    teaser: 'All batches invited. Registration desks open at 3:00 PM; bring your alumni ID or registration number.',
    date: 'Monday, October 12, 2026', time: '4:00 PM – 10:00 PM',
    venue: 'UDM Gymnasium, Mehan Gardens, Manila', organizer: 'UDM Alumni Relations Office',
    fee: 'Free for alumni · ₱350 per guest', attendees: '412 alumni registered', status: 'REGISTRATION OPEN',
    iso: '2026-10-12', statusKey: 'open', regCount: 412,
    highlights: ['Recognition of golden (Batch 1976) and silver (Batch 2001) jubilarians', 'Outstanding Alumni Awards', 'Variety show by the UDM alumni chorale', 'Batch tables of ten — reserve by October 5'],
    regFields: [
      { key: 'guests', label: 'Guests you’re bringing', hint: '₱350 per guest, payable at the registration desk', options: ['None', '1', '2', '3'] },
      { key: 'seat', label: 'Seating preference', options: ['With my batch', 'Open seating'] },
    ],
    photoLabel: 'cover photo — homecoming, 1600×900',
    body: [
      'The biggest gathering of Merlions returns to the gymnasium for an evening of batch reunions, a variety show by the alumni chorale, and the awarding of this year’s Outstanding Alumni.',
      'Golden jubilarians (Batch 1976) and silver jubilarians (Batch 2001) will be recognized on stage. Batch coordinators may reserve tables of ten at the Alumni Affairs office until October 5.',
    ],
    agenda: [
      { time: '3:00 PM', label: 'Registration and batch check-in' },
      { time: '4:00 PM', label: 'Holy Mass at the university chapel' },
      { time: '5:30 PM', label: 'Opening program and jubilarian recognition' },
      { time: '7:00 PM', label: 'Dinner, variety show and batch presentations' },
      { time: '9:00 PM', label: 'Raffle draw and socials' },
    ],
  },
  {
    id: 'jobfair', month: 'Oct', day: '04', kind: 'CAREER', kindColor: '#8A6D1F', kindBg: '#FBF0D8',
    title: 'Alumni Job Fair — 18 partner employers', meta: '9:00 AM · UDM Quadrangle',
    teaser: 'Fintech, BPO and engineering firms hiring fresh graduates. Slots are first-come, first-served.',
    date: 'Sunday, October 4, 2026', time: '9:00 AM – 4:00 PM',
    venue: 'UDM Quadrangle and Function Rooms 2–4', organizer: 'Career & Placement Office',
    fee: 'Free admission', attendees: '286 alumni registered', status: 'WALK-INS WELCOME',
    iso: '2026-10-04', statusKey: 'open', regCount: 286,
    highlights: ['18 partner employers across fintech, BPO and engineering', 'On-the-spot interviews and same-day job offers', 'Free resume clinic and mock interviews'],
    photoLabel: 'cover photo — job fair booths, 1600×900',
    body: [
      'Eighteen partner employers will conduct on-the-spot interviews, with same-day job offers for qualified applicants. Bring five copies of your resume and a valid ID.',
      'A resume clinic and mock-interview room run all day in Function Room 4 for alumni who graduated within the last three years.',
    ],
    agenda: [
      { time: '9:00 AM', label: 'Booths open · initial screening' },
      { time: '10:30 AM', label: 'Resume clinic (Function Room 4)' },
      { time: '1:00 PM', label: 'Employer talks: fintech and BPO tracks' },
      { time: '3:00 PM', label: 'Final interviews and job-offer releasing' },
    ],
  },
  {
    id: 'run', month: 'Nov', day: '08', kind: 'COMMUNITY', kindColor: '#1E4E79', kindBg: '#E6EEF6',
    title: 'Merlion Run 2026 — Scholarship Fun Run', meta: '5:00 AM · Rizal Park',
    teaser: 'A 3K, 5K and 10K run for the alumni scholarship fund. Race kits may be claimed until November 5.',
    date: 'Sunday, November 8, 2026', time: '5:00 AM assembly · 5:30 AM gun start',
    venue: 'Rizal Park, Ermita, Manila', organizer: 'UDM Alumni Association',
    fee: '₱500 (3K) · ₱650 (5K) · ₱800 (10K)', attendees: '134 alumni registered', status: 'SLOTS LEFT',
    iso: '2026-11-08', statusKey: 'open', regCount: 134, capacity: 600,
    highlights: ['100% of proceeds fund alumni scholarships', 'Singlet, race bib and finisher medal included', '3K, 5K and 10K categories'],
    regFields: [
      { key: 'dist', label: 'Race category', hint: 'Fee is paid when claiming your race kit', options: ['3K · ₱500', '5K · ₱650', '10K · ₱800'] },
      { key: 'size', label: 'Singlet size', options: ['XS', 'S', 'M', 'L', 'XL'] },
    ],
    photoLabel: 'cover photo — fun run, 1600×900',
    body: [
      'Proceeds go entirely to the alumni scholarship fund, which supported 60 scholars this academic year. Registration includes a singlet, race bib and finisher medal.',
      'Race kits may be claimed at the Alumni Affairs office from November 2 to 5, 9:00 AM to 5:00 PM.',
    ],
    agenda: [
      { time: '5:00 AM', label: 'Assembly and warm-up' },
      { time: '5:30 AM', label: '10K gun start' },
      { time: '5:45 AM', label: '5K and 3K gun start' },
      { time: '8:00 AM', label: 'Awarding and raffle' },
    ],
  },
  {
    id: 'mentor', month: 'Nov', day: '22', kind: 'CAREER', kindColor: '#8A6D1F', kindBg: '#FBF0D8',
    title: 'Career Mentorship Night with Batch 2010–2015', meta: '6:00 PM · AVR Building B',
    teaser: 'Twelve alumni mentors from IT, education and finance in small-group sessions with graduating students.',
    date: 'Sunday, November 22, 2026', time: '6:00 PM – 9:00 PM',
    venue: 'Audio-Visual Room, Building B', organizer: 'UDM Alumni Relations Office',
    fee: 'Free · limited to 80 participants', attendees: '80 alumni registered', status: 'SIGN-UP REQUIRED',
    iso: '2026-11-22', statusKey: 'full', regCount: 80, capacity: 80,
    highlights: ['Twelve mentors from IT, education, finance and public service', 'Three rounds of small-group sessions', 'Resume and interview review'],
    photoLabel: 'cover photo — mentorship night, 1600×900',
    body: [
      'Mentors from IT, education, finance and public service hold three rounds of small-group sessions with graduating students and recent alumni looking to shift careers.',
      'Sign-ups close November 18 or once the 80-participant cap is reached.',
    ],
    agenda: [
      { time: '6:00 PM', label: 'Registration and mentor matching' },
      { time: '6:30 PM', label: 'Round 1 — industry breakout' },
      { time: '7:30 PM', label: 'Round 2 — resume and interview review' },
      { time: '8:30 PM', label: 'Open networking' },
    ],
  },
  {
    id: 'cleanup', month: 'Sep', day: '19', kind: 'COMMUNITY', kindColor: '#1E4E79', kindBg: '#E6EEF6',
    title: 'Alumni Coastal Cleanup at Manila Bay', meta: '6:00 AM · Baywalk, Roxas Blvd.',
    teaser: 'Alumni volunteers joined the International Coastal Cleanup Day along the Manila Baywalk.',
    date: 'Saturday, September 19, 2026', time: '6:00 AM – 10:00 AM',
    venue: 'Manila Baywalk, Roxas Boulevard', organizer: 'UDM Alumni Association',
    fee: 'Free · volunteers', attendees: '96 alumni attended', status: 'PAST EVENT',
    iso: '2026-09-19', statusKey: 'past', regCount: 96,
    photoLabel: 'cover photo — coastal cleanup, 1600×900',
    body: ['Alumni volunteers and their families joined International Coastal Cleanup Day along the Manila Baywalk, in partnership with the city environment office.'],
    highlights: ['96 alumni volunteers', 'Over 400 kg of waste collected'],
    agenda: [
      { time: '6:00 AM', label: 'Assembly and safety briefing' },
      { time: '6:30 AM', label: 'Cleanup in assigned zones' },
      { time: '9:30 AM', label: 'Waste audit and group photo' },
    ],
  },
];

export const DEFAULT_NOTICES = [
  { id: 'n-survey', month: 'Sep', day: '28', kind: 'Reminder', source: 'UDM Alumni Relations Office', title: 'Alumni survey cycle now open', body: 'Employment records for AY 2025–2026 are being consolidated for CHED reporting. Update your answers before November 15.' },
  { id: 'n-fund', month: 'Sep', day: '20', kind: 'Update', source: 'University Bulletin', title: 'UDM alumni scholarship fund reaches ₱2.4M', body: 'Contributions from the 2015–2020 batches will support 60 new scholars this academic year.' },
];

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

export const evCount = (e, rsvps) => (e.regCount || 0) + (rsvps && rsvps[e.id] ? 1 : 0);
export function evStatusKey(e, rsvps) {
  if (evTs(e) < Date.parse(TODAY_ISO)) return 'past';
  const k = e.statusKey || 'open';
  return k === 'open' && e.capacity && evCount(e, rsvps) >= e.capacity ? 'full' : k;
}
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
  return { id: e.id, title: e.title || '', dateISO: iso, timeStart: tm[0] || '', timeEnd: tm[1] || '', venue: e.venue || '', organizer: e.organizer || EVENT_HOSTS[0], body: (e.body || []).join('\n\n'), status: e.statusKey || 'open' };
}
export function evValidate(f, checkPast) {
  const r = {};
  if (!String(f.title || '').trim()) r.title = 'Enter an event title.';
  if (!f.dateISO) r.date = 'Select a date.';
  else if (checkPast && f.dateISO < TODAY_ISO) r.date = 'Choose a date that hasn’t passed.';
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
