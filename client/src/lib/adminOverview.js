// Admin Dashboard overview panels (the "Admin Dashboard Overview" screen of "UDM Alumni.dc.html"): the outcomes
// chart, recent registrations, engagement trend, active colleges and upcoming events. Every figure comes from the API
// responses the page already loads; the only computed values are chart geometry and the dashed linear-trend forecast.
import { linearFit, HORIZON, MIN_BATCHES } from './forecast';
import { evCat, evStatusKey, evTs, manilaToday } from '../data/events';
import { collegeById } from '../data/colleges';

const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const thisYear = () => new Date().getFullYear();
const clamp = (v) => Math.max(0, Math.min(100, v));
/** Batches drawn as history (solid) in the outcomes chart. */
const HISTORY = 5;

/** Smooth path through [x, y] points (Catmull-Rom as cubic Béziers), as in the reference chart. */
const smooth = (pts) => pts.map((p, i) => {
  if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  const a = pts[i - 2] || pts[i - 1];
  const b = pts[i - 1];
  const d = pts[i + 1] || p;
  return `C${(b[0] + (p[0] - a[0]) / 6).toFixed(1)} ${(b[1] + (p[1] - a[1]) / 6).toFixed(1)},${(p[0] - (d[0] - b[0]) / 6).toFixed(1)} ${(p[1] - (d[1] - b[1]) / 6).toFixed(1)},${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
}).join(' ');

/** Projects `HORIZON` values after the last year from a least-squares line, or null with too little history. */
function trend(years, vals, lim) {
  const pts = years.map((y, i) => [y, vals[i]]).filter(([, v]) => v != null);
  const fit = pts.length >= MIN_BATCHES ? linearFit(pts) : null;
  if (!fit) return null;
  const last = years[years.length - 1];
  return Array.from({ length: HORIZON }, (_, i) => lim(fit.at(last + i + 1)));
}

/**
 * "Employability Rate by Batch" / "Total Registered Alumni" chart.
 * @param rows    GET /stats/by-batch `data`
 * @param tab     'rate' | 'total'
 * @param hover   hovered point index (rate tab) or null
 * @param target  employment-rate target (CATALOG.targets.employment)
 * @param size    { w, h } of the chart box when the desktop layout sizes it to fit the window, else null (fixed shape)
 */
export function buildOutcomeChart(rows, tab, hover, target, size) {
  const by = new Map((rows || []).map((r) => [Number(r.key), r]));
  const withData = [...by.keys()].filter((y) => y <= thisYear() && by.get(y).total > 0).sort((a, b) => a - b);
  const end = withData.length ? withData[withData.length - 1] : thisYear();
  const yrs = Array.from({ length: HISTORY }, (_, i) => end - HISTORY + 1 + i);
  const rate = tab === 'rate';

  const E = yrs.map((y) => { const r = by.get(y); return r && r.laborForce > 0 && r.employmentRate != null ? Number(r.employmentRate) : null; });
  const Rr = yrs.map((y) => { const r = by.get(y); return r && r.total > 0 && r.coverage != null ? Number(r.coverage) : null; });
  // Running total of alumni records up to each graduation year.
  const cumTo = (y) => (rows || []).reduce((a, r) => a + (Number(r.key) <= y ? r.total || 0 : 0), 0);
  const C = yrs.map(cumTo);
  const FE = trend(yrs, E, clamp);
  const FR = trend(yrs, Rr, clamp);
  const inc = (C[HISTORY - 1] - C[HISTORY - 4]) / 3;
  const FC = Array.from({ length: HORIZON }, (_, i) => Math.round(C[HISTORY - 1] + inc * (i + 1)));
  const fy = Array.from({ length: HORIZON }, (_, i) => end + i + 1);
  const n = HISTORY + HORIZON;
  const last = HISTORY - 1;

  // Drawn in CSS pixels at the box size on desktop, so text keeps its size; a short box drops the axis title and
  // tightens the margins.
  const W = size ? Math.max(320, Math.round(size.w)) : 560;
  const H = size ? Math.max(60, Math.round(size.h)) : 400;
  const compact = !!size && H < 300;
  const fs = compact ? 11.5 : size ? 12.5 : 15;
  const fsS = compact ? 11 : 13;
  const L = compact ? 54 : size ? 66 : 78; const Rm = compact ? 14 : 24; const T = compact ? 10 : 18; const B = compact ? 24 : size ? 52 : 70;
  const pw = W - L - Rm; const ph = H - T - B;
  const X = (i) => L + (pw * i) / (n - 1);
  const bot = T + ph;

  const EA = E.concat(FE || Array(HORIZON).fill(null));
  const RA = Rr.concat(FR || Array(HORIZON).fill(null));
  const CA = C.concat(FC);
  const allv = [...EA, ...RA].filter((v) => v != null);
  const lo = Math.max(0, Math.floor((Math.min(target, ...allv) - 4) / 10) * 10);
  const top = Math.min(100, Math.ceil((Math.max(target, ...allv) + 4) / 10) * 10);
  const YA = (v) => T + ph * (1 - (v - lo) / Math.max(1, top - lo));
  const mxv = Math.max(1, ...CA);
  const nice = [10, 25, 50, 100, 250, 500, 1000, 2000, 2500, 5000, 10000, 25000].find((q) => mxv / q <= 4) || 50000;
  const tt = Math.ceil(mxv / nice) * nice;
  const YB = (v) => T + ph * (1 - v / tt);

  const pts = (arr, Y) => arr.map((v, i) => (v == null ? null : [X(i), Y(v), i]));
  const pe = pts(EA, YA); const pr = pts(RA, YA); const pc = pts(CA, YB);
  const hist = (p) => p.slice(0, HISTORY).filter(Boolean);
  // The dashed forecast starts from the last solid point.
  const fc = (p, has) => (has && p[last] ? [p[last], ...p.slice(HISTORY)].filter(Boolean) : []);
  const line = (p) => (p.length > 1 ? smooth(p) : '');
  const cp = hist(pc);

  const hov = rate && hover != null && hover < n;
  const idx = hov ? hover : last;
  const isF = idx > last;
  const dot = (p, big, c) => (p ? { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: p[2] === big ? 5.5 : p[2] > last ? 3 : 3.5, f: p[2] > last ? '#fff' : c, s: p[2] > last ? c : '#fff' } : null);
  const fx = (X(last) + X(last + 1)) / 2;
  const pct = (v, d) => `${((v / d) * 100).toFixed(2)}%`;
  const anchor = pe[idx] || pr[idx] || [X(idx), YA(lo)];
  const row = by.get(yrs[Math.min(idx, last)]) || {};
  const tipPct = (v) => (v == null ? '—' : `${isF ? v.toFixed(1) : Math.round(v)}%`);

  return {
    rate, W, H, vb: `0 0 ${W} ${H}`, fs, fsS, fsT: compact ? 11.5 : size ? 12.5 : 14, showXTitle: !compact, yTx: compact ? 10 : 14,
    title: rate ? 'Employability Rate by Batch' : 'Total Registered Alumni',
    sub: rate
      ? `Batches ${yrs[0]}–${end}${FE || FR ? ` + ${fy[0]}–${fy[HORIZON - 1]} forecast*` : ''} · employment rate of traced graduates in the labour force`
      : `Running total of graduates in the alumni directory + ${fy[0]}–${fy[HORIZON - 1]} forecast*`,
    yTitle: rate ? 'Percentage (%)' : 'Registered alumni',
    target, targetY: YA(target).toFixed(1), targetLabelY: (YA(target) - 8).toFixed(1),
    gridA: Array.from({ length: Math.round((top - lo) / 10) + 1 }, (_, i) => lo + i * 10).map((v) => ({ y: YA(v).toFixed(1), l: `${v}%` })),
    gridB: Array.from({ length: Math.round(tt / nice) + 1 }, (_, i) => i * nice).map((v) => ({ y: YB(v).toFixed(1), l: v >= 1000 ? `${v / 1000}K` : String(v) })),
    L, T, ph, pw, bot, x2: W - Rm, fx: fx.toFixed(1), fw: (W - Rm - fx).toFixed(1), flx: (fx + (W - Rm - fx) / 2).toFixed(1), fly: T + fsS + 6,
    fyLabel: `Forecast estimates* (${fy[0]}–${fy[HORIZON - 1]})`,
    xs: yrs.concat(fy).map((y, i) => ({ x: X(i).toFixed(1), y: bot + (compact ? 16 : 22), t: i > last ? `${y}*` : String(y), w: hov && i === idx ? 700 : 400, c: hov && i === idx ? '#0B1220' : '#334155' })),
    lineE: line(hist(pe)), lineR: line(hist(pr)), lineC: line(cp),
    areaC: cp.length > 1 ? `${smooth(cp)} L${cp[cp.length - 1][0].toFixed(1)} ${bot} L${cp[0][0].toFixed(1)} ${bot} Z` : '',
    fcE: line(fc(pe, !!FE)), fcR: line(fc(pr, !!FR)), fcC: line(fc(pc, true)),
    dotsE: pe.map((p) => dot(p, hov ? idx : -1, '#0F3D2E')).filter(Boolean),
    dotsR: pr.map((p) => dot(p, hov ? idx : -1, '#E3A91B')).filter(Boolean),
    dotsC: pc.map((p) => dot(p, last, '#0F3D2E')).filter(Boolean),
    hits: yrs.concat(fy).map((y, i) => ({ key: y, x: (X(i) - pw / (n - 1) / 2).toFixed(1), y: T, w: (pw / (n - 1)).toFixed(1), h: ph + B, i })),
    vx: X(idx).toFixed(1), vb2: hov ? bot : T,
    tipShow: hov,
    tipX: pct(anchor[0], W), tipY: pct(anchor[1], H),
    tipTf: idx >= n - 2 ? 'translate(calc(-100% + 22px),calc(-100% - 14px))' : idx <= 1 ? 'translate(-22px,calc(-100% - 14px))' : 'translate(-50%,calc(-100% - 14px))',
    tipYear: isF ? `Batch ${fy[idx - HISTORY]}* · forecast` : `Batch ${yrs[idx]}`,
    tipEmp: tipPct(EA[idx]), tipEmpLbl: isF ? 'expected employed' : 'employed',
    tipEmpN: isF || EA[idx] == null ? '' : ` (${N(row.employed)} of ${N(row.laborForce)} in the labour force)`,
    tipResp: tipPct(RA[idx]), tipRespLbl: isF ? 'expected response' : 'responded',
    tipRespN: isF || RA[idx] == null ? '' : ` (${N(row.traced)} of ${N(row.total)} graduates)`,
    tipTot: N(C[last]), tipCX: pc[last] ? pct(pc[last][0], W) : '0%', tipCY: pc[last] ? pct(pc[last][1], H) : '0%',
  };
}

const REG_BG = ['#DDEFE7', '#FDF6DD', '#E6F0EB'];
const initials = (name) => String(name || '').split(' ').filter(Boolean).filter((w) => !/^[A-Z]\.$/.test(w)).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const dayMonthYear = (ts) => (ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' }) : '');

/** Latest alumni records (GET /alumni sorted by created_at, newest first). */
export function recentRegistrations(rows) {
  return (rows || []).slice(0, 10).map((r, i) => ({
    id: r.id, name: r.name, ini: initials(r.name), bg: REG_BG[i % REG_BG.length],
    prog: [r.course || r.program, r.batch].filter(Boolean).join(' · '), date: dayMonthYear(r.createdAt),
  }));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(v));

/** Event registrations per month for the twelve months ending this month (by event date). */
export function engagementTrend(events) {
  const [cy, cm] = manilaToday().split('-').map(Number);
  const endM = cy * 12 + (cm - 1);
  const counts = Array(12).fill(0);
  (events || []).forEach((e) => {
    const [y, m] = String(e.iso || '').split('-').map(Number);
    if (!y || !m || evStatusKey(e) === 'cancelled') return;
    const k = 11 - (endM - (y * 12 + m - 1));
    if (k >= 0 && k < 12) counts[k] += e.regCount || 0;
  });
  // Four whole-number steps up to at least the busiest month.
  const mx = Math.max(...counts);
  const step = [1, 2, 5, 10, 25, 50, 100, 200, 250, 500, 1000, 2500, 5000].find((q) => q * 4 >= mx) || Math.ceil(mx / 4);
  const tt = step * 4;
  return {
    total: counts.reduce((a, b) => a + b, 0),
    ticks: [4, 3, 2, 1, 0].map((i) => short(step * i)),
    bars: counts.map((v, i) => {
      const mi = (endM - 11 + i) % 12;
      return { key: i, m: MONTHS[mi], h: `${Math.round((v / tt) * 100)}%`, title: `${MONTHS[mi]} ${Math.floor((endM - 11 + i) / 12)}`, val: `${N(v)} event registration${v === 1 ? '' : 's'}` };
    }),
  };
}

/** The next six open events (EventsContext rows), soonest first. */
export function upcomingEvents(events) {
  const today = manilaToday();
  return (events || [])
    .filter((e) => e.iso && e.iso >= today && !['past', 'cancelled'].includes(evStatusKey(e)))
    .sort((a, b) => evTs(a) - evTs(b))
    .slice(0, 6)
    .map((e) => ({ id: e.id, d: e.day, m: String(e.month || '').toUpperCase(), title: e.title, type: e.organizer || evCat(e), where: e.venue, time: String(e.time || '').split(' – ')[0] }));
}

/** Days a college account may go without signing in and still count its college as active. */
export const ACTIVE_DAYS = 30;

/**
 * Colleges using UDM-Alumni: one row per college with a staff account (GET /users?role=dept), active when any of
 * its open accounts signed in within ACTIVE_DAYS. Active colleges first, most recent sign-in first.
 */
export function activeColleges(users, now = Date.now()) {
  const by = new Map();
  (users || []).forEach((u) => {
    if (u.collegeId == null) return;
    const c = by.get(u.collegeId) || { id: u.collegeId, name: u.college || '', accounts: 0, last: 0 };
    c.accounts += 1;
    const t = u.status === 'active' && u.lastLoginAt ? Date.parse(u.lastLoginAt) : 0;
    if (t > c.last) c.last = t;
    by.set(u.collegeId, c);
  });
  const day = 86400000;
  const rows = [...by.values()].map((c) => {
    const col = collegeById(c.id);
    const ago = c.last ? Math.floor((now - c.last) / day) : null;
    return {
      key: String(c.id), code: col ? col.code : c.name, name: col ? col.name : c.name, active: ago != null && ago <= ACTIVE_DAYS, last: c.last,
      seen: ago == null ? 'Never signed in' : ago < 1 ? 'Signed in today' : `Last sign-in ${ago} day${ago === 1 ? '' : 's'} ago`,
      accounts: `${c.accounts} account${c.accounts === 1 ? '' : 's'}`,
    };
  }).sort((a, b) => b.active - a.active || b.last - a.last || a.code.localeCompare(b.code));
  return { rows, active: rows.filter((r) => r.active).length, total: rows.length };
}
