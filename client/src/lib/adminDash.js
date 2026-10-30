// Admin dashboard view-model: shapes API statistics (GET /stats/*) into the props AdminDashboardView renders.
// No numbers are computed here beyond formatting and chart geometry — every count comes from the server.
import { CATALOG, collegeById, programById } from '../data/colleges';
import { qs } from './api';

export const STATUS_FILTER_LABELS = { all: 'All statuses', verified: 'Verified only', flagged: 'Flagged' };
const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const P1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const pct = (n, d) => (d ? (n / d) * 100 : 0);
const thisYear = () => new Date().getFullYear();
/** Graduating batches the filters offer, oldest first (registration accepts 1999 to the current year). */
export const ADMIN_YEARS = (() => { const AY = []; for (let y = 1999; y <= thisYear(); y++) AY.push(y); return AY; })();

/**
 * Normalized selection + the API filter / grouping it implies. `from` / `to` are batch years in either order;
 * `batch` is 'all' when the range spans every batch, the year when it is one batch, otherwise null (use `years`).
 */
export function adminScope(sel) {
  const college = collegeById(sel.college) ? Number(sel.college) : 'all';
  const prog = programById(sel.course);
  const course = prog && (college === 'all' || Number(prog.collegeId) === college) ? Number(sel.course) : 'all';
  const AY = ADMIN_YEARS;
  const from = AY.includes(Number(sel.from)) ? Number(sel.from) : AY[0];
  const to = AY.includes(Number(sel.to)) ? Number(sel.to) : AY[AY.length - 1];
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const years = AY.filter((y) => y >= lo && y <= hi);
  const batch = years.length === AY.length ? 'all' : years.length === 1 ? years[0] : null;
  const batchLabel = batch === 'all' ? '' : years.length === 1 ? `Batch ${lo}` : `Batches ${lo}–${hi}`;
  const status = ['verified', 'flagged'].includes(sel.status) ? sel.status : 'all';
  const level = course !== 'all' ? 'batch' : college !== 'all' ? 'course' : 'college';
  // Year-on-year comparison: the selected batches against the batches a year earlier (the latest four when all).
  const now = batch === 'all' ? [0, 1, 2, 3].map((i) => thisYear() - 3 + i) : years;
  return {
    college, course, from, to, lo, hi, years, batch, batchLabel, status, level, now, prev: now.map((y) => y - 1),
    group: level === 'college' ? 'college' : level === 'course' ? 'program' : 'batch',
  };
}

/** A metric object with every count at zero (shown while the statistics load). */
export const emptyMetrics = () => ({
  total: 0, traced: 0, untraced: 0, coverage: null, completion: null, completed: 0, employed: 0, wageEmployed: 0, selfEmployed: 0, furtherStudies: 0, notEmployed: 0,
  laborForce: 0, employmentRate: null, aligned: 0, alignedRate: null, firstGen: 0, firstGenRate: null, ip: 0, pwd: 0, monthsAvg: null, timeToJob: {}, pending: 0, verified: 0, flagged: 0,
});
export const emptyAdminData = () => ({
  summary: emptyMetrics(), now: emptyMetrics(), prev: emptyMetrics(), units: { data: [] }, unitsNow: { data: [] }, unitsPrev: { data: [] }, byBatch: { data: [] },
  recent: { data: [] },
});

/** Every request the dashboard needs, as API paths. */
export function adminRequests(sc) {
  const base = { college_id: sc.college, program_id: sc.course, status: sc.status };
  const range = sc.batch === 'all' ? {} : { batch_from: sc.lo, batch_to: sc.hi };
  // Per-batch rows inside one program: the selected batches (latest twelve), or the latest six when all are selected.
  const batchRows = sc.batch === 'all' ? [0, 1, 2, 3, 4, 5].map((i) => thisYear() - 5 + i) : sc.years.slice(-12);
  return {
    summary: `/stats/summary${qs({ ...base, ...range })}`,
    now: `/stats/summary${qs({ ...base, batches: sc.now })}`,
    prev: `/stats/summary${qs({ ...base, batches: sc.prev })}`,
    // Same scope as the summary, split by college / program / batch: the rates in the Employment Overview dialog.
    units: `/stats/by-program${qs({ ...base, ...range, group: sc.group })}`,
    unitsNow: `/stats/by-program${qs({ ...base, group: sc.group, batches: sc.level === 'batch' ? batchRows : sc.now })}`,
    unitsPrev: `/stats/by-program${qs({ ...base, group: sc.group, batches: sc.level === 'batch' ? batchRows.map((y) => y - 1) : sc.prev })}`,
    byBatch: `/stats/by-batch${qs(base)}`,
    // Recent Alumni Registrations: the newest records in the college / program scope.
    recent: `/alumni${qs({ college_id: sc.college, program_id: sc.course, sort: 'created_at', dir: 'desc', per_page: 10 })}`,
  };
}

/**
 * @param sel   { college, course, from, to, status } (raw select values: ids or 'all'; from / to are batch years)
 * @param data  responses keyed like adminRequests()
 * @param tipH  (title, value) => { onTipMove, onTipLeave }
 * @param metric  Employability card tab: 'rate' (employment rate) | 'align' (course-to-job alignment)
 */
export function buildAdminDash(sel, data, tipH, metric = 'rate') {
  const sc = adminScope(sel);
  const S = data.summary;
  const col = sc.college !== 'all' ? collegeById(sc.college) : null;
  const prog = sc.course !== 'all' ? programById(sc.course) : null;
  const label = prog ? prog.name : col ? col.name : 'all colleges';

  // Employability per unit (employment rate, or course-to-job alignment), with the change against the previous batch window.
  const align = metric === 'align';
  const mk = align ? 'alignedRate' : 'employmentRate';
  const prevBy = new Map((data.unitsPrev.data || []).map((r) => [String(r.key), r]));
  const rows = (data.unitsNow.data || []).filter((r) => (align ? r.employed : r.traced) > 0).map((r) => {
    const p = prevBy.get(String(r.key - (sc.level === 'batch' ? 1 : 0))) || prevBy.get(String(r.key));
    const v = r[mk] ?? 0;
    const d = p && p[mk] != null ? v - p[mk] : null;
    return { program: r.label, full: sc.level === 'batch' ? `${prog ? prog.abbr : ''} · Batch ${r.key}` : r.full, v, d, n: align ? r.employed : r.laborForce, k: align ? r.aligned : r.employed };
  }).sort((a, b) => (sc.level === 'batch' ? 0 : b.v - a.v));
  // Trend chip as in the reference: — (nothing to compare), → 0.0%, ↑ +x% or ↓ -x%.
  const trend = (d) => {
    if (d == null) return { arrow: '', delta: '—', deltaColor: '#94A3B8', deltaBg: '#F1F4F2' };
    if (Math.abs(d) < 0.05) return { arrow: '→', delta: '0.0%', deltaColor: '#64748B', deltaBg: '#F1F4F2' };
    return d > 0 ? { arrow: '↑', delta: `+${d.toFixed(1)}%`, deltaColor: '#0F6B4F', deltaBg: '#E3F3EA' } : { arrow: '↓', delta: `${d.toFixed(1)}%`, deltaColor: '#B42318', deltaBg: '#FDF1F0' };
  };
  const programRates = rows.map(({ program, full, v, d, n, k }) => ({
    program, full, pct: `${v.toFixed(1)}%`, ...trend(d),
    ...tipH(full, `${N(k)} of ${N(n)} ${align ? 'employed in a degree-related job' : 'in the labour force employed'}${d == null ? '' : ` · ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}% from last year`}`),
  }));

  const dash = admDash(S, data, tipH);
  const colleges = CATALOG.colleges.filter((c) => c.programs.length || c.code === 'OTH');
  const courses = col ? col.programs : [];
  return {
    scope: sc,
    admK: dash.admK,
    vals: {
      admCollegeVal: String(sc.college),
      admCollegeOpts: [{ value: 'all', label: 'All colleges' }, ...colleges.map((c) => ({ value: String(c.id), label: c.name }))],
      admCourseVal: String(sc.course),
      admCourseOpts: [{ value: 'all', label: col ? `All courses (${courses.length})` : 'All courses' }, ...courses.map((p) => ({ value: String(p.id), label: p.name }))],
      admCourseDisabled: !col, admCourseOpacity: col ? 1 : 0.55,
      admScopeLabel: label + (sc.batchLabel ? ` · ${sc.batchLabel}` : '') + (sc.status !== 'all' ? ` · ${STATUS_FILTER_LABELS[sc.status].toLowerCase()}` : ''),
      admFromVal: String(sc.from), admFromOpts: ADMIN_YEARS.map((y) => ({ value: String(y), label: `From ${y}` })),
      admToVal: String(sc.to), admToOpts: ADMIN_YEARS.map((y) => ({ value: String(y), label: `To ${y}` })),
      admStatusVal: sc.status, admStatusOpts: Object.keys(STATUS_FILTER_LABELS).map((k) => ({ value: k, label: `Status: ${STATUS_FILTER_LABELS[k]}` })),
      ...dash.vals,
      programRatesTitle: sc.level === 'college' ? 'Employability by college' : sc.level === 'course' ? 'Employability by course' : 'Employability by batch',
      programRatesSub: sc.level === 'batch'
        ? `${prog.abbr} · ${align ? 'degree-related employment of employed graduates' : 'employment rate of traced graduates in the labour force'}, per batch`
        : `${align ? 'Degree-related employment' : 'Employment rate'}, ${sc.now.length === 1 ? `batch ${sc.now[0]}` : `batches ${sc.now[0]}–${sc.now[sc.now.length - 1]}`}${col ? ` · ${col.name}` : ''}`,
      programRates, programRatesAlign: align,
    },
  };
}

function admDash(S, data, tipH) {
  const Sn = data.now;
  const Sp = data.prev;
  const delta = (a, b) => (a == null || b == null ? null : a - b);
  const change = (a, b) => (b ? ((a - b) / b) * 100 : null);
  const traced = S.traced || 0;

  // Months to first job: survey buckets (no invented averages beyond the bucket midpoints).
  const t = S.timeToJob || {};
  const groups = [
    ['Under 1 month', t.lt_1m || 0, '#0F3D2E'], ['1 – 6 months', t.m1_6 || 0, '#2F6B50'],
    ['7 – 11 months', t.m7_11 || 0, '#6FA088'], ['1 year or more', (t.y1_2 || 0) + (t.y2_3 || 0) + (t.y3_4 || 0) + (t.gt_4y || 0), '#B7CBBF'],
  ];
  const ttjN = groups.reduce((a, g) => a + g[1], 0);
  const tt = groups.map((g) => Math.round(pct(g[1], ttjN)));
  if (ttjN) tt[tt.length - 1] = 100 - tt.slice(0, -1).reduce((a, b) => a + b, 0);

  return {
    admK: {
      emp: S.employmentRate, employed: S.employed, lf: S.laborForce, empD: delta(Sn.employmentRate, Sp.employmentRate),
      traced, total: S.total, covP: S.coverage || 0,
      fg: S.firstGen, fgP: S.firstGenRate, al: S.alignedRate, alN: S.aligned, alD: delta(Sn.alignedRate, Sp.alignedRate),
      verified: S.verified, flagged: S.flagged,
      // Change of the counts: the latest batches against the batches a year earlier (percent).
      totalD: change(Sn.total, Sp.total), tracedD: change(Sn.traced, Sp.traced), employedD: change(Sn.employed, Sp.employed),
    },
    vals: {
      avgMonths: S.monthsAvg == null ? '—' : P1(S.monthsAvg),
      timeToJob: groups.map(([lb, , color], i) => ({ label: lb, pct: `${tt[i]}%`, grow: tt[i] || 0, color, ...tipH(lb, `${tt[i]}% of employed graduates`) })),
      ttjHas: ttjN > 0, ttjWithin6: `${ttjN ? tt[0] + tt[1] : 0}%`,
    },
  };
}

const R = (label, value) => ({ label, value });

/** KPI card icons (24×24 stroke paths, from the reference design). */
const ICONS = {
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 4.2a3.5 3.5 0 0 1 0 6.6M21 20v-1.5a4 4 0 0 0-3-3.8',
  user: 'M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8M5 20.5v-1a4.5 4.5 0 0 1 4.5-4.5h5a4.5 4.5 0 0 1 4.5 4.5v1',
  bag: 'M3 8.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5zM8.5 8.5V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5v3M3 13h18',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z',
};

/**
 * The four KPI cards, plus click handlers on every chart that open the stat detail dialog.
 * @param d      admK from buildAdminDash
 * @param vals   buildAdminDash(...).vals
 * @param h      { openDetail(det), openTraced, openEmployment, openAlignment }
 */
export function buildKpiCards(d, vals, h) {
  const sgn = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`;
  const open = (det) => () => h.openDetail(det);
  const alCtx = d.alD == null ? 'Course-related jobs' : `${sgn(d.alD)}% from last year`;
  /* A change chip: "↑ 8.6%" (percent change of a count) or "↑ 1.2 pts" (rate), or null when there is nothing to compare. */
  const chg = (n, unit = '%') => (n == null ? null : { text: `${n >= 0 ? '↑' : '↓'} ${Math.abs(n).toFixed(1)}${unit}`, color: n >= 0 ? '#0F6B4F' : '#B3213C' });
  // As in the reference, Total Alumni is not clickable; the other three open their dialogs (title = hover hint).
  const card = (id, icon, chip, acc, label, value, delta, note, onClick, title) => ({
    id, icon, chip, acc, label, value, onClick, title,
    delta: delta ? delta.text : '', deltaColor: delta ? delta.color : '#64748B', note: delta ? 'vs last year' : note,
  });
  const kpiCards = [
    card('total', ICONS.users, '#E6F0EB', '#0F6B4F', 'Total Alumni', N(d.total), chg(d.totalD), `${N(d.verified)} verified`, null),
    card('traced', ICONS.user, '#FDF6DD', '#8A6D0B', 'Alumni Traced', N(d.traced), chg(d.tracedD), `${P1(d.covP)}% of records`, h.openTraced, 'Open survey completion by batch'),
    // The change of the employed card is in rate points.
    { ...card('emp', ICONS.bag, '#E6F0EB', '#0F6B4F', 'Alumni Employed', N(d.employed), chg(d.empD, ' pts'), '', h.openEmployment, 'Open employment overview'), note: `${P1(d.emp)}% employed` },
    card('aligned', ICONS.target, '#DDEFE7', '#0F3D2E', 'Degree-aligned Jobs', `${P1(d.al)}%`, chg(d.alD, ' pts'), alCtx, h.openAlignment, 'Open degree-to-career alignment'),
  ];

  const pRows = vals.programRates.map((p) => R(p.full, `${p.pct} (${`${p.arrow} ${p.delta}`.trim()})`));
  const tRows = vals.timeToJob.map((t) => R(t.label, `${t.pct} of employed`));
  return {
    kpiCards,
    programRates: vals.programRates.map((p) => ({ ...p, onClick: open({ title: p.full, sub: vals.programRatesAlign ? 'Employed graduates in a degree-related job' : 'Employed graduates in the labour force', big: p.pct, rows: pRows, hl: p.full }) })),
    timeToJob: vals.timeToJob.map((t) => ({ ...t, onClick: open({ title: 'Months before first job', sub: `Average ${vals.avgMonths} months`, big: t.pct, rows: tRows, hl: t.label }) })),
  };
}

/** Values for the stat detail dialog (null = closed). */
export function detailVals(det) {
  const x = det && det.x;
  const ring = x && x.ring != null && !Number.isNaN(Number(x.ring)) ? Number(x.ring) : null;
  return {
    adDetOpen: !!det,
    adDetTitle: det ? det.title : '', adDetSub: det ? det.sub : '', adDetBig: det ? det.big : '',
    adDetRows: det ? det.rows.map((r) => ({ ...r, bg: r.label === det.hl ? '#EEF6F2' : '#fff', w: r.label === det.hl ? 700 : 500 })) : [],
    adDetHasRing: ring != null,
    adDetRingBg: ring != null ? `conic-gradient(#0F3D2E ${Math.min(100, ring) * 3.6}deg,#E6EEEA 0)` : '',
    adDetRingText: ring != null ? `${ring.toFixed(1)}%` : '', adDetRingLabel: x ? x.ringLabel : '',
    adDetHasBars: !!(x && x.bars), adDetChips: (x && x.chips) || [], adDetBars: (x && x.bars) || [], adDetBarTitle: (x && x.barTitle) || '',
  };
}
