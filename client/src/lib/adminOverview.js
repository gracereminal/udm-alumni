// Admin Dashboard overview panels (the "Admin Dashboard Overview" screen of "UDM Alumni.dc.html"): the outcomes
// chart, recent registrations, engagement trend, active colleges and upcoming events. Every figure comes from the API
// responses the page already loads; the only computed values are chart geometry and the dashed linear-trend forecast.
import { linearFit, HORIZON, MIN_BATCHES } from './forecast';
import { evCat, evStatusKey, evTs, manilaToday } from '../data/events';
import { collegeById } from '../data/colleges';
import { qs } from './api';

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
 * @param hover   hovered point index or null
 * @param target  employment-rate target (CATALOG.targets.employment)
 * @param size    { w, h } of the chart box when the desktop layout sizes it to fit the window, else null (fixed shape)
 * @param opts    { pick: clicked point index (its Employment Analysis is open) or null, scope: short scope name }
 */
export function buildOutcomeChart(rows, tab, hover, target, size, opts = {}) {
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
  const yearAt = (i) => (i > last ? fy[i - HISTORY] : yrs[i]);

  // Drawn in CSS pixels at the box size on desktop, so text keeps its size; a short box drops the axis title and
  // tightens the margins.
  const W = size ? Math.max(320, Math.round(size.w)) : 980;
  const H = size ? Math.max(60, Math.round(size.h)) : 360;
  const compact = !!size && H < 300;
  const fs = compact ? 11.5 : size ? 12.5 : 15;
  const fsS = compact ? 11 : 13;
  const L = compact ? 54 : size ? 66 : 78; const Rm = compact ? 14 : size ? 24 : 28; const T = compact ? 10 : size ? 18 : 20; const B = compact ? 24 : size ? 52 : 70;
  const pw = W - L - Rm; const ph = H - T - B;
  const X = (i) => L + (pw * i) / (n - 1);
  const bot = T + ph;

  const EA = E.concat(FE || Array(HORIZON).fill(null));
  const RA = Rr.concat(FR || Array(HORIZON).fill(null));
  const CA = C.concat(FC);
  // Percentage axis up to 100%, starting at 40% or lower, as in the reference.
  const allv = [...EA, ...RA].filter((v) => v != null);
  const lo = allv.length ? Math.max(0, Math.min(40, Math.floor((Math.min(...allv) - 4) / 10) * 10)) : 40;
  const top = 100;
  const YA = (v) => T + ph * (1 - (v - lo) / (top - lo));
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

  // Focus: the hovered batch, else the batch whose analysis is open. The total tab's callout follows it (else the latest batch).
  const pick = opts.pick != null && opts.pick < n ? opts.pick : null;
  const hov = hover != null && hover < n;
  const idx = hov ? hover : last;
  const foc = hov ? hover : pick;
  const ti = foc == null ? last : foc;
  const isF = idx > last;
  const dot = (p, big, c) => (p ? { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: p[2] === big ? 5.5 : p[2] > last ? 3 : 3.5, f: p[2] > last ? '#fff' : c, s: p[2] > last ? c : '#fff' } : null);
  const fx = (X(last) + X(last + 1)) / 2;
  const pct = (v, d) => `${((v / d) * 100).toFixed(2)}%`;
  const anchor = pe[idx] || pr[idx] || [X(idx), YA(lo)];
  const row = by.get(yrs[Math.min(idx, last)]) || {};
  const tipPct = (v) => (v == null ? '—' : `${v.toFixed(1)}%`);
  const tf = (i) => (i >= n - 2 ? 'translate(calc(-100% + 22px),calc(-100% - 14px))' : i <= 1 ? 'translate(-22px,calc(-100% - 14px))' : 'translate(-50%,calc(-100% - 14px))');
  const dT = EA[idx] == null ? null : EA[idx] - target;
  const of = row.laborForce === row.traced ? 'traced' : 'in the labour force';

  return {
    rate, W, H, vb: `0 0 ${W} ${H}`, fs, fsS, fsT: compact ? 11.5 : size ? 12.5 : 14, showXTitle: !compact, yTx: compact ? 10 : 14,
    n, last, yearAt, EA, RA, histFrom: yrs[0], histTo: end,
    title: rate ? 'Employability Rate by Batch' : 'Total Registered Alumni',
    sub: `${rate
      ? `Batches ${yrs[0]}–${end}${FE || FR ? ` + ${fy[0]}–${fy[HORIZON - 1]} forecast*` : ''} · self-reported tracer data`
      : `Running total of graduates in the alumni directory + ${fy[0]}–${fy[HORIZON - 1]} forecast*`}${opts.scope ? ` · ${opts.scope}` : ''} · click a batch for details`,
    yTitle: rate ? 'Percentage (%)' : 'Registered alumni',
    target, targetY: YA(target).toFixed(1), targetLabelY: (YA(target) - 8).toFixed(1),
    gridA: Array.from({ length: Math.round((top - lo) / 10) + 1 }, (_, i) => lo + i * 10).map((v) => ({ y: YA(v).toFixed(1), l: `${v}%` })),
    gridB: Array.from({ length: Math.round(tt / nice) + 1 }, (_, i) => i * nice).map((v) => ({ y: YB(v).toFixed(1), l: v >= 1000 ? `${v / 1000}K` : String(v) })),
    L, T, ph, pw, bot, x2: W - Rm, fx: fx.toFixed(1), fw: (W - Rm - fx).toFixed(1), flx: (fx + (W - Rm - fx) / 2).toFixed(1), fly: T + fsS + 6,
    fyLabel: `Forecast estimates* (${fy[0]}–${fy[HORIZON - 1]})`,
    xs: yrs.concat(fy).map((y, i) => ({ x: X(i).toFixed(1), y: bot + (compact ? 16 : 22), t: i > last ? `${y}*` : String(y), w: i === foc ? 700 : 400, c: i === foc ? '#0B1220' : '#334155' })),
    lineE: line(hist(pe)), lineR: line(hist(pr)), lineC: line(cp),
    areaC: cp.length > 1 ? `${smooth(cp)} L${cp[cp.length - 1][0].toFixed(1)} ${bot} L${cp[0][0].toFixed(1)} ${bot} Z` : '',
    fcE: line(fc(pe, !!FE)), fcR: line(fc(pr, !!FR)), fcC: line(fc(pc, true)),
    dotsE: pe.map((p) => dot(p, foc == null ? -1 : foc, '#0F3D2E')).filter(Boolean),
    dotsR: pr.map((p) => dot(p, foc == null ? -1 : foc, '#E3A91B')).filter(Boolean),
    dotsC: pc.map((p) => dot(p, ti, '#0F3D2E')).filter(Boolean),
    hits: yrs.concat(fy).map((y, i) => ({ key: y, x: (X(i) - pw / (n - 1) / 2).toFixed(1), y: T, w: (pw / (n - 1)).toFixed(1), h: ph + B, i, t: `Batch ${y}${i > last ? ' (forecast)' : ''}` })),
    vx: X(foc == null ? last : foc).toFixed(1), vb2: foc != null ? bot : T,
    tipShow: rate && hov,
    tipX: pct(anchor[0], W), tipY: pct(anchor[1], H), tipTf: tf(idx),
    tipYear: isF ? `Batch ${yearAt(idx)}* · forecast estimate` : `Batch ${yrs[idx]}`,
    tipEmp: tipPct(EA[idx]), tipEmpLbl: isF ? 'expected employed' : 'employed',
    tipEmpN: isF || EA[idx] == null ? '' : ` (${N(row.employed)} of ${N(row.laborForce)} ${of})`,
    tipResp: tipPct(RA[idx]), tipRespLbl: isF ? 'expected response' : 'responded',
    tipRespN: isF || RA[idx] == null ? '' : ` (${N(row.traced)} of ${N(row.total)} graduates)`,
    tipTgt: dT == null ? '' : `${dT >= 0 ? '▲' : '▼'} ${Math.abs(dT).toFixed(1)} pts ${dT >= 0 ? 'above' : 'below'} ${target}% target`,
    tipTgtC: dT != null && dT >= 0 ? '#0F6B4F' : '#8A6D1F',
    tipHint: (hov ? idx : ti) === pick ? 'Click to close analysis' : 'Click for employment analysis',
    tipTot: N(CA[ti]), tipTotLbl: ti > last ? `Projected registered alumni · Batch ${yearAt(ti)}*` : `Registered alumni through Batch ${yearAt(ti)}`,
    tipCX: pc[ti] ? pct(pc[ti][0], W) : '0%', tipCY: pc[ti] ? pct(pc[ti][1], H) : '0%', tipCTf: tf(ti),
  };
}

const P = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
/** The four first-job groups (survey buckets of the GET /stats `timeToJob` counts). */
const FIRST_JOB = [['Under 1 month', ['lt_1m'], '#0F3D2E'], ['1–6 months', ['m1_6'], '#2F6B50'], ['7–11 months', ['m7_11'], '#6FA088'], ['1 year or more', ['y1_2', 'y2_3', 'y3_4', 'gt_4y'], '#B7CBBF']];
const ANALYSIS_TABS = [['ov', 'Overview'], ['fj', 'First Job'], ['col', 'By College'], ['pr', 'By Program']];

/** API paths behind the By College / By Program tabs of a historical batch's Employment Analysis. */
export function analysisRequests(sc, year) {
  return {
    cols: `/stats/by-program${qs({ status: sc.status, batches: [year], group: 'college' })}`,
    progs: `/stats/by-program${qs({ college_id: sc.college, status: sc.status, batches: [year], group: 'program' })}`,
  };
}

/**
 * Employment Analysis under the outcomes chart for the clicked batch: overview, first job, by college and by program
 * (historical batches), or the projected rates (forecast batches).
 * @param c      buildOutcomeChart() result
 * @param rows   GET /stats/by-batch `data`
 * @param pick   clicked point index
 * @param tab    'ov' | 'fj' | 'col' | 'pr'
 * @param units  { cols, progs } responses of analysisRequests() (null while loading)
 * @param ctx    { target, scope (scope name), college, course (selected ids or 'all') }
 */
export function buildBatchAnalysis(c, rows, pick, tab, units, ctx) {
  if (pick == null || pick >= c.n) return { open: false };
  const { target } = ctx;
  const y = c.yearAt(pick);
  const F = pick > c.last;
  const emp = c.EA[pick];
  const d = emp == null ? null : emp - target;
  const base = {
    open: true, target, fc: F, batch: `Batch ${y}${F ? '*' : ''}`, kind: F ? 'Forecast estimate' : 'Historical · survey data',
    kindBg: F ? '#F1F4F2' : '#E8F1EC', kindC: F ? '#475569' : '#0F3D2E',
    vsT: d == null ? '' : `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts ${d >= 0 ? 'above' : 'below'} the ${target}% target`, vsTC: d != null && d >= 0 ? '#0F6B4F' : '#8A6D1F',
    tab, tabs: ANALYSIS_TABS.map(([k, l]) => ({ k, l, on: tab === k })),
  };
  if (F) {
    return {
      ...base, scope: ctx.scope, fcEmp: P(emp), fcResp: P(c.RA[pick]),
      fcNote: `Forecast estimate from the linear trend of batches ${c.histFrom}–${c.histTo} in this scope. This batch has no tracer responses yet, so status, first-job, college and program breakdowns are not available.`,
    };
  }
  const s = (rows || []).find((r) => Number(r.key) === y) || {};
  const t = s.traced || 0;
  const e = s.employed || 0;
  const share = (v, of) => (of ? P((v / of) * 100) : '—');
  const w = (v, of) => (of ? `${((v / of) * 100).toFixed(2)}%` : '0%');
  const seg = (l, v, of, col) => ({ l, n: N(v), p: share(v, of), w: w(v, of), c: col, tip: `${l}: ${N(v)} (${share(v, of)})` });
  const tj = s.timeToJob || {};
  const fj = FIRST_JOB.map(([l, ks, col]) => [l, ks.reduce((a, k) => a + (tj[k] || 0), 0), col]);
  const fjN = fj.reduce((a, g) => a + g[1], 0);
  const unitRow = (r, cur) => {
    const ab = r.employmentRate >= target;
    return {
      key: String(r.key), full: r.full, code: r.label, v: P(r.employmentRate), w: `${Math.min(100, r.employmentRate).toFixed(1)}%`,
      c: ab ? '#0F6B4F' : '#C99A12', tag: ab ? 'Above target' : 'Below target', tc: ab ? '#0F6B4F' : '#8A6D1F',
      n: `${N(r.traced)} traced`, bg: cur ? '#F1F6F3' : 'transparent', fw: cur ? 700 : 600,
    };
  };
  const rated = (res) => ((res && res.data) || []).filter((r) => r.traced > 0 && r.employmentRate != null).sort((a, b) => b.employmentRate - a.employmentRate);
  const cols = rated(units && units.cols).map((r) => unitRow(r, ctx.college !== 'all' && Number(r.key) === Number(ctx.college)));
  const progs = rated(units && units.progs).map((r) => unitRow(r, ctx.course !== 'all' && Number(r.key) === Number(ctx.course)));
  const hi = progs[0];
  const lo = progs[progs.length - 1];
  const col = ctx.college !== 'all' ? collegeById(ctx.college) : null;
  return {
    ...base,
    scope: `${ctx.scope} · ${N(t)} of ${N(s.total)} graduates responded`,
    rate: P(s.employmentRate), resp: P(s.coverage), respSub: `${N(t)} of ${N(s.total)} graduates`, rel: P(s.alignedRate), traced: N(t), employed: N(e),
    status: [
      seg('Employed (wage or salary)', s.wageEmployed || 0, t, '#0F3D2E'), seg('Self-employed', s.selfEmployed || 0, t, '#E3A91B'),
      seg('Unemployed', Math.max(0, t - e), t, '#C3CDC8'),
    ],
    deg: [seg('Related to degree', s.aligned || 0, e, '#0F6B4F'), seg('Not related to degree', Math.max(0, e - (s.aligned || 0)), e, '#D5DED9')],
    fj: fj.map(([l, v, cl]) => ({ l, n: N(v), p: share(v, fjN), w: w(v, fjN), c: cl })),
    fj6: share(fj[0][1] + fj[1][1], fjN), fjAvg: s.monthsAvg == null ? '—' : Number(s.monthsAvg).toFixed(1), fjN: N(fjN),
    unitsLoading: !units,
    cols, colAbove: `${cols.filter((r) => r.tag === 'Above target').length} of ${cols.length} colleges`,
    colNote: col ? 'your selected college is highlighted' : `Batch ${y}, all programs`,
    progs, prHi: hi ? `${hi.code} ${hi.v}` : '—', prLo: lo ? `${lo.code} ${lo.v}` : '—',
    prNote: `${col ? `${col.code} · ` : 'All '}${progs.length} programs with traced graduates in Batch ${y} · sorted by employment rate`,
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
