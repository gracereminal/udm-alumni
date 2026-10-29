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
  inclusion: { traced: 0, ip: 0, pwd: 0, indigenousGroups: [], pwdTypes: [] },
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
    // Same scope as the summary, split by college / program / batch: the breakdown in the stat detail dialog.
    units: `/stats/by-program${qs({ ...base, ...range, group: sc.group })}`,
    unitsNow: `/stats/by-program${qs({ ...base, group: sc.group, batches: sc.level === 'batch' ? batchRows : sc.now })}`,
    unitsPrev: `/stats/by-program${qs({ ...base, group: sc.group, batches: sc.level === 'batch' ? batchRows.map((y) => y - 1) : sc.prev })}`,
    byBatch: `/stats/by-batch${qs(base)}`,
    inclusion: `/stats/inclusion${qs({ ...base, ...range })}`,
  };
}

/**
 * @param sel   { college, course, from, to, status } (raw select values: ids or 'all'; from / to are batch years)
 * @param data  responses keyed like adminRequests()
 * @param tipH  (title, value) => { onTipMove, onTipLeave }
 */
export function buildAdminDash(sel, data, tipH) {
  const sc = adminScope(sel);
  const target = CATALOG.targets;
  const S = data.summary;
  const col = sc.college !== 'all' ? collegeById(sc.college) : null;
  const prog = sc.course !== 'all' ? programById(sc.course) : null;
  const label = prog ? prog.name : col ? col.name : 'all colleges';

  // Employability per unit, with the change against the previous batch window.
  const prevBy = new Map((data.unitsPrev.data || []).map((r) => [String(r.key), r]));
  const rows = (data.unitsNow.data || []).filter((r) => r.traced > 0).map((r) => {
    const p = prevBy.get(String(r.key - (sc.level === 'batch' ? 1 : 0))) || prevBy.get(String(r.key));
    const v = r.employmentRate ?? 0;
    const d = p && p.employmentRate != null ? v - p.employmentRate : null;
    return { program: r.label, full: sc.level === 'batch' ? `${prog ? prog.abbr : ''} · Batch ${r.key}` : r.full, v, d, m: r.monthsAvg, traced: r.traced, employed: r.employed };
  }).sort((a, b) => (sc.level === 'batch' ? 0 : b.v - a.v));
  const programRates = rows.map(({ program, full, v, d }) => ({
    program, full, pct: `${v.toFixed(1)}%`,
    delta: d == null ? 'new' : `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}%`, arrow: d == null ? '' : d >= 0 ? '↑' : '↓',
    deltaColor: d == null || d >= 0 ? '#0F6B4F' : d < -1 ? '#B3213C' : '#8A6D1F', deltaBg: d == null || d >= 0 ? '#E1F3EA' : d < -1 ? '#FDE7EC' : '#FBF0D8',
    ...tipH(full, `${v.toFixed(1)}% employed${d == null ? '' : ` · ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}% from last year`}`),
  }));

  const dash = admDash(sc, S, data, rows, tipH, target);
  const colleges = CATALOG.colleges.filter((c) => c.programs.length || c.code === 'OTH');
  const courses = col ? col.programs : [];
  return {
    scope: sc,
    slices: dash.slices,
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
      programRatesSub: sc.level === 'batch' ? `${prog.abbr} · employment rate of traced graduates in the labour force, per batch` : `Employment rate, ${sc.now.length === 1 ? `batch ${sc.now[0]}` : `batches ${sc.now[0]}–${sc.now[sc.now.length - 1]}`}${col ? ` · ${col.name}` : ''}`,
      programRates,
      breakdownTitle: sc.level === 'college' ? 'By college' : sc.level === 'course' ? 'By program' : 'By batch',
    },
  };
}

function admDash(sc, S, data, rows, tipH, target) {
  const Sn = data.now;
  const Sp = data.prev;
  const delta = (a, b) => (a == null || b == null ? null : a - b);
  // Coverage by batch: all years / one batch show six batches ending at the latest (or around the selected) batch;
  // a range shows its own batches, up to the latest twelve.
  const one = typeof sc.batch === 'number';
  const end = sc.batch === 'all' ? thisYear() : Math.min(thisYear(), sc.hi + 2);
  const barYears = sc.batch === 'all' || one ? [0, 1, 2, 3, 4, 5].map((i) => end - 5 + i) : sc.years.slice(-12);
  const byBatch = new Map(((data.byBatch && data.byBatch.data) || []).map((r) => [r.key, r]));
  const bars = barYears.map((y) => { const r = byBatch.get(y); return { y, v: r && r.total ? Math.round(r.coverage) : 0, total: r ? r.total : 0, traced: r ? r.traced : 0 }; });
  const goal = Math.ceil((S.total * target.coverage) / 100);

  const mix = [
    ['Employed', S.wageEmployed, '#0F3D2E'],
    ['Self-employed / Entrepreneurship', S.selfEmployed, '#F0C428'],
    ['Further studies / Academics', S.furtherStudies, '#2F7FC1'],
    ['Not yet employed (Seeking opportunities)', S.notEmployed, '#D9620B'],
  ];
  const traced = S.traced || 0;
  const r1 = (x) => +x.toFixed(1);
  let acc = 0;
  const stops = [];
  const slices = [];
  mix.forEach(([lbl, n, color], i) => {
    const v = pct(n, traced);
    const a = r1(acc); const b = i === mix.length - 1 ? 100 : r1(acc + v); acc += v;
    stops.push(`${color} ${a}% ${r1(Math.max(a, b - 0.5))}%`, `#fff ${r1(Math.max(a, b - 0.5))}% ${b}%`);
    slices.push({ end: b, title: lbl.replace(/ \(.*\)$/, ''), value: `${N(n)} graduates · ${P1(v)}%` });
  });
  const statusDonut = traced ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#E7E9ED 0% 100%)';

  // Months to first job: survey buckets (no invented averages beyond the bucket midpoints).
  const t = S.timeToJob || {};
  const groups = [
    ['Under 1 month', t.lt_1m || 0, '#CFE8DA', '#0B3A2B'], ['1 – 6 months', t.m1_6 || 0, '#7CC4A0', '#0B3A2B'],
    ['7 – 11 months', t.m7_11 || 0, '#1F7A57', '#fff'], ['1 year or more', (t.y1_2 || 0) + (t.y2_3 || 0) + (t.y3_4 || 0) + (t.gt_4y || 0), '#0B3A2B', '#fff'],
  ];
  const ttjN = groups.reduce((a, g) => a + g[1], 0);
  const tt = groups.map((g) => Math.round(pct(g[1], ttjN)));
  if (ttjN) tt[tt.length - 1] = 100 - tt.slice(0, -1).reduce((a, b) => a + b, 0);

  const tone = { r: ['#E5484D', '#C2344F', '#FDF2F4', '#F8DFE4'], y: ['#F0C428', '#8A6D1F', '#FDF9EE', '#F5E9CE'], g: ['#12A36F', '#0F6B4F', '#F0FAF4', '#D8EFE1'] };
  const ins = [];
  if (rows.length) {
    const falling = rows.filter((r) => r.d != null).sort((a, b) => a.d - b.d)[0];
    const low = rows.reduce((a, b) => (b.v < a.v ? b : a));
    if (falling && falling.d < -0.5) ins.push([`${falling.program} employability fell ${Math.abs(falling.d).toFixed(1)}% from last year`, `— now ${falling.v.toFixed(1)}%.`, 'r']);
    else ins.push([`${low.program} trails at ${low.v.toFixed(1)}% employability`, `— the lowest in this view (target ${target.employment}%).`, low.v < target.employment ? 'r' : 'y']);
  }
  const counted = bars.filter((b) => b.total > 0);
  if (counted.length) {
    const weak = counted.reduce((a, b) => (b.v < a.v ? b : a));
    ins.push([`Batch ${weak.y} coverage is the weakest at ${weak.v}%.`, `${N(weak.total - weak.traced)} records still have no survey response (target ${target.coverage}%).`, weak.v < target.coverage ? 'y' : 'g']);
  }
  const fast = rows.filter((r) => r.m != null).sort((a, b) => a.m - b.m)[0];
  if (fast) ins.push([`${fast.program} graduates`, `reach first employment in about ${fast.m.toFixed(1)} months (bucket midpoints).`, 'g']);
  if (!ins.length) ins.push(['No survey responses in this view yet.', 'Insights appear once alumni in this scope answer the survey.', 'y']);

  return {
    slices,
    admK: {
      emp: S.employmentRate, employed: S.employed, lf: S.laborForce, empD: delta(Sn.employmentRate, Sp.employmentRate),
      traced, total: S.total, covP: S.coverage || 0, goal, goalP: goal ? Math.min(100, pct(traced, goal)) : 0,
      comp: S.completion, completed: S.completed, compD: null,
      fg: S.firstGen, fgP: S.firstGenRate, al: S.alignedRate, alN: S.aligned, alD: delta(Sn.alignedRate, Sp.alignedRate),
      fs: S.furtherStudies, fsP: pct(S.furtherStudies, traced), sk: S.notEmployed, skP: pct(S.notEmployed, traced),
      verified: S.verified, flagged: S.flagged,
    },
    vals: {
      batchSub: `${N(S.traced)} of ${N(S.total)} alumni records reached`,
      batchBars: bars.map(({ y, v }) => {
        const muted = one && y !== sc.batch;
        const ok = v >= target.coverage;
        return {
          label: String(y), pct: `${v}%`, pctColor: muted ? '#94A3B8' : ok ? '#0B1220' : '#8A6D1F', color: muted ? '#D5DED9' : ok ? '#0F3D2E' : '#E0A915',
          ...tipH(`Batch ${y}`, `${v}% traced · ${ok ? 'meets' : 'below'} ${target.coverage}% target`),
        };
      }),
      statusMix: mix.map(([lbl, n, color], i) => ({ label: lbl, count: `${N(n)} graduates`, pct: `${P1(pct(n, traced))}%`, pctColor: i === 3 ? '#B4500A' : '#0B1220', color })),
      statusDonut,
      donutTotal: N(traced), activeLabor: `${P1(traced ? 100 - pct(S.notEmployed, traced) : 0)}%`, avgMonths: S.monthsAvg == null ? '—' : P1(S.monthsAvg),
      timeToJob: groups.map(([lb, , color, text], i) => ({ label: lb, pct: `${tt[i]}%`, grow: tt[i] || 0, color, text, ...tipH(lb, `${tt[i]}% of employed graduates`) })),
      insights: ins.slice(0, 3).map(([lead, text, k]) => ({ lead, text, color: tone[k][0], leadColor: tone[k][1], bg: tone[k][2], border: tone[k][3] })),
      ...inclusionProfile(data.inclusion),
    },
  };
}

/** Inclusion profile (IP & PWD self-declared on registration) — aggregated counts for the traced respondents. */
const PWD_LABEL = { visual: 'Visual', hearing: 'Hearing', speech_language: 'Speech and Language', physical: 'Physical / Orthopedic', intellectual: 'Intellectual', learning: 'Learning', psychosocial: 'Psychosocial', mental: 'Mental', chronic_illness: 'Chronic Illness', others: 'Others' };
function inclusionProfile(inc) {
  const t = inc ? inc.traced : 0;
  const P2 = (n) => `${t ? ((n / t) * 100).toFixed(1) : '0.0'}%`;
  const mk = (title, yes, color, rowsTitle, list, labelOf) => {
    const top = list.slice(0, 5);
    const m = Math.max(1, ...top.map((x) => x.n));
    return {
      title, yes: N(yes), yesPct: P2(yes), no: N(t - yes), noPct: P2(t - yes), color, rowsTitle,
      rows: top.length ? top.map((x) => ({ label: labelOf(x.key), n: N(x.n), w: `${Math.round((x.n / m) * 100)}%`, color })) : [{ label: 'None recorded', n: '0', w: '0%', color }],
    };
  };
  return {
    inclSub: `Self-declared on registration · ${N(t)} respondents`,
    inclGroups: inc ? [
      mk('Indigenous Peoples (IP)', inc.ip, '#0F6B4F', 'By Indigenous group', inc.indigenousGroups || [], (k) => k),
      mk('Persons with Disability (PWD)', inc.pwd, '#2F7FC1', 'By type of disability', inc.pwdTypes || [], (k) => PWD_LABEL[k] || k),
    ] : [],
  };
}

const R = (label, value) => ({ label, value });

/**
 * One metric across the GET /stats/by-program rows of the dashboard scope, highest first: the bars, highest /
 * lowest chips and spread (rates) or top share (counts) in the stat detail dialog. Null when no row has the metric.
 */
export function breakdown(units, metric, title, isPct) {
  const rows = (units || [])
    .filter((u) => u.total > 0 && u[metric] != null)
    .map((u) => ({ code: String(u.label ?? u.key), full: u.full || String(u.label ?? u.key), raw: Number(u[metric]) }))
    .sort((a, b) => b.raw - a.raw);
  if (!rows.length) return null;
  const fmt = (x) => (isPct ? `${x.toFixed(1)}%` : N(x));
  const mx = Math.max(...rows.map((r) => r.raw)) || 1;
  const tot = rows.reduce((a, r) => a + r.raw, 0);
  const hi = rows[0];
  const lo = rows[rows.length - 1];
  const last = rows.length - 1;
  return {
    barTitle: title,
    chips: [
      { k: 'Highest', v: hi.code, s: fmt(hi.raw), c: '#0F3D2E' },
      { k: 'Lowest', v: lo.code, s: fmt(lo.raw), c: '#8A6D1F' },
      isPct ? { k: 'Spread', v: (hi.raw - lo.raw).toFixed(1), s: 'pts high–low', c: '#475569' } : { k: 'Top share', v: `${tot ? Math.round((hi.raw / tot) * 100) : 0}%`, s: 'of total', c: '#475569' },
    ],
    bars: rows.map((r, i) => ({ code: r.code, full: r.full, val: fmt(r.raw), w: `${(isPct ? r.raw : (r.raw / mx) * 100).toFixed(1)}%`, color: i === 0 ? '#0F3D2E' : i === last ? '#E0A915' : '#4FA383' })),
  };
}

/**
 * The seven KPI cards, plus click handlers on every chart that open the stat detail dialog.
 * @param d      admK from buildAdminDash
 * @param vals   buildAdminDash(...).vals
 * @param units  rows of GET /stats/by-program for the dashboard scope
 * @param h      { hoverId, setHover, openDetail(det), openPopulation, openForecast, goRecords }
 */
export function buildKpiCards(d, vals, units, h) {
  const sg = (n) => `${n >= 0 ? '↑ ' : '↓ '}${Math.abs(n).toFixed(1)}`;
  const sgn = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`;
  const bd = (metric, isPct) => breakdown(units, metric, vals.breakdownTitle, isPct);
  const open = (det) => () => h.openDetail(det);
  const empCtx = d.empD == null ? 'Latest survey cycle' : `${sg(d.empD)}% from last year`;
  const compCtx = d.compD == null ? 'Average answered share of submitted surveys' : `${sg(d.compD)}% from last year`;
  const alCtx = d.alD == null ? 'Course-related jobs' : `${sgn(d.alD)}% from last year`;
  const card = (id, ico, label, value, sub, subColor, onClick) => ({
    id, ico, label, value, sub, subColor, onClick,
    onEnter: () => h.setHover(id), onLeave: () => h.setHover((x) => (x === id ? null : x)),
    arrowOp: h.hoverId === id ? 1 : 0, arrowX: h.hoverId === id ? 'translateX(0)' : 'translateX(-4px)',
    acc: '#0F3D2E', chip: '#EEF6F2', bg: '#fff', border: '#E7E9ED',
  });
  const sub = vals.admScopeLabel;
  const kpiCards = [
    card('total', '☰', 'Total alumni', N(d.total), `${N(d.traced)} traced · ${N(d.verified)} verified`, '#475569', h.openPopulation),
    card('emp', '↗', 'Employability rate', `${P1(d.emp)}%`, empCtx, '#0F6B4F', h.openForecast),
    card('traced', '⌖', 'Graduates traced', N(d.traced), `${P1(d.covP)}% of records · Goal: ${N(d.goal)}`, '#475569', open({
      title: 'Graduates traced', sub, big: `${N(d.traced)} / ${N(d.total)}`,
      rows: [R('Traced alumni', N(d.traced)), R('Total records', N(d.total)), R('Coverage', `${P1(d.covP)}%`), R('Collection goal', N(d.goal))],
      x: { ring: d.covP, ringLabel: 'coverage', ...bd('traced', false) },
    })),
    card('survey', '✓', 'Survey completion', `${P1(d.comp)}%`, compCtx, '#0F6B4F', open({
      title: 'Survey completion', sub, big: `${P1(d.comp)}%`,
      rows: [R('Completed forms', N(d.completed)), R('Average answered share', `${P1(d.comp)}%`)],
      x: { ring: d.comp, ringLabel: 'complete', ...bd('completion', true) },
    })),
    card('aligned', '◆', 'Degree-aligned jobs', `${P1(d.al)}%`, alCtx, '#0F6B4F', open({
      title: 'Degree-aligned jobs', sub, big: `${P1(d.al)}%`,
      rows: [R('Working in their field', N(d.alN)), R('Change', alCtx)],
      x: { ring: d.al, ringLabel: 'aligned', ...bd('alignedRate', true) },
    })),
    card('fs', '✦', 'Further studies', N(d.fs), `${P1(d.fsP)}% of respondents`, '#475569', open({
      title: 'Pursuing further studies', sub: 'Graduate & professional studies', big: N(d.fs),
      rows: [R('Graduates enrolled', N(d.fs)), R('Share of respondents', `${P1(d.fsP)}%`)],
      x: { ring: d.fsP, ringLabel: 'of respondents', ...bd('furtherStudies', false) },
    })),
    { ...card('seeking', '⚑', 'Still seeking work', N(d.sk), 'View records →', '#7A4E00', h.goRecords), acc: '#7A4E00', chip: '#FBEFD0', bg: '#FFFAEE', border: '#F0D9A0' },
  ];

  const bRows = vals.batchBars.map((b) => R(`Batch ${b.label}`, `${b.pct} traced`));
  const sRows = vals.statusMix.map((s) => R(s.label, `${s.count} · ${s.pct}`));
  const pRows = vals.programRates.map((p) => R(p.full, `${p.pct} (${p.arrow} ${p.delta})`));
  const tRows = vals.timeToJob.map((t) => R(t.label, `${t.pct} of employed`));
  return {
    kpiCards,
    batchBars: vals.batchBars.map((b) => ({ ...b, onClick: open({ title: `Graduates traced · Batch ${b.label}`, sub: vals.batchSub, big: b.pct, rows: bRows, hl: `Batch ${b.label}` }) })),
    statusMix: vals.statusMix.map((s) => ({ ...s, onClick: open({ title: s.label, sub: 'Employment status mix', big: s.pct, rows: sRows, hl: s.label }) })),
    statusOpen: open({ title: 'Employment status mix', sub: `${vals.donutTotal} respondents · active labor force`, big: vals.activeLabor, rows: sRows }),
    programRates: vals.programRates.map((p) => ({ ...p, onClick: open({ title: p.full, sub: 'Employed graduates in the labour force', big: p.pct, rows: pRows, hl: p.full }) })),
    timeToJob: vals.timeToJob.map((t) => ({ ...t, onClick: open({ title: 'Months before first job', sub: `Average ${vals.avgMonths} months`, big: t.pct, rows: tRows, hl: t.label }) })),
    insTop: vals.insights[0] || { lead: '', text: '' },
    insCount: `${vals.insights.length} signal${vals.insights.length === 1 ? '' : 's'}`,
    insOpen: open({ title: 'Signals worth acting on', sub: 'Recommended follow-ups', big: String(vals.insights.length), rows: vals.insights.map((i) => R(i.lead, i.text)) }),
    inclGroups: vals.inclGroups.map((g) => ({ ...g, onClick: open({ title: g.title, sub: vals.inclSub, big: g.yesPct, rows: g.rows.map((r) => R(r.label, r.n)) }) })),
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

/** Requests behind the Alumni population dialog: totals by college and program, and per program for each charted batch. */
export function populationRequests(sc, years) {
  const base = { college_id: sc.college, program_id: sc.course, status: sc.status };
  const range = sc.batch === 'all' ? {} : { batch_from: sc.lo, batch_to: sc.hi };
  const r = {
    cols: `/stats/by-program${qs({ ...base, ...range, group: 'college' })}`,
    progs: `/stats/by-program${qs({ ...base, ...range, group: 'program' })}`,
  };
  years.forEach((y) => { r[`y${y}`] = `/stats/by-program${qs({ ...base, batches: [y], group: 'program' })}`; });
  return r;
}

/**
 * Alumni population dialog: records by batch, college and program, and a batch × program heatmap of the ten
 * largest programs (cells under 55% of the average are marked thin).
 * @param res  responses keyed like populationRequests(); null while loading
 */
export function buildPopulation(d, byBatch, years, res) {
  const grand = d.total || 0;
  const share = (n) => `${grand ? ((n / grand) * 100).toFixed(1) : '0.0'}%`;
  const bars = (items, color) => {
    const mx = Math.max(1, ...items.map((x) => x[1]));
    return items.map(([label, n, full]) => ({ label, full: full || label, n: N(n), pct: share(n), w: `${((n / mx) * 100).toFixed(1)}%`, color }));
  };
  const totals = new Map((byBatch || []).map((r) => [r.key, r.total]));
  const base = { popTotal: N(grand), popTraced: N(d.traced), popVer: N(d.verified), popYears: years.map(String), popBatch: bars(years.map((y) => [String(y), totals.get(y) || 0]), '#0F3D2E') };
  if (!res) return { ...base, popLoading: true, popCol: [], popProg: [], popHeat: [], popThin: '', popMean: '0' };

  const rowsOf = (k) => ((res[k] && res[k].data) || []).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const progs = rowsOf('progs');
  const top = progs.slice(0, 10).map((p) => ({
    p, cells: years.map((y) => { const row = ((res[`y${y}`] && res[`y${y}`].data) || []).find((r) => String(r.key) === String(p.key)); return row ? row.total : 0; }),
  }));
  const flat = top.flatMap((t) => t.cells);
  const mean = flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : 0;
  const mx = Math.max(1, ...flat);
  const mix = (t) => { const a = [230, 240, 235]; const b = [15, 61, 46]; return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(',')})`; };
  let thin = 0;
  const popHeat = top.map(({ p, cells }) => ({
    label: p.label, full: p.full || p.label, total: N(cells.reduce((a, b) => a + b, 0)),
    cells: cells.map((n) => {
      const isThin = n < mean * 0.55;
      if (isThin) thin += 1;
      const t = Math.min(1, n / (mx * 0.9));
      return { n: N(n), bg: isThin ? '#FBF0D8' : mix(0.12 + t * 0.88), color: isThin ? '#8A6D1F' : t > 0.45 ? '#fff' : '#0B1220', ring: isThin ? '1px solid #E3C97E' : '1px solid transparent' };
    }),
  }));
  return {
    ...base, popLoading: false,
    popCol: bars(rowsOf('cols').map((r) => [r.full || r.label, r.total]), '#0F6B4F'),
    popProg: bars(progs.slice(0, 8).map((r) => [r.label, r.total, r.full]), '#4FA383'),
    popHeat, popThin: `${thin} thin cohort${thin === 1 ? '' : 's'}`, popMean: N(mean),
  };
}
