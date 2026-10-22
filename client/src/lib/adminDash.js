// Admin dashboard view-model: shapes API statistics (GET /stats/*) into the props AdminDashboardView renders.
// No numbers are computed here beyond formatting and chart geometry — every count comes from the server.
import { CATALOG, collegeById, programById } from '../data/colleges';
import { employmentLabel } from '../data/records';
import { qs } from './api';

export const STATUS_FILTER_LABELS = { all: 'All statuses', verified: 'Verified only', flagged: 'Flagged' };
const ST = {
  verified: ['Verified', '#0F6B4F', '#E1F3EA', 'Details', '#64748B'],
  flagged: ['Flagged', '#B3213C', '#FDE7EC', 'Review', '#0F6B4F'],
  archived: ['Archived', '#5A6572', '#EDEFF2', 'Details', '#64748B'],
};
const dotOf = (code) => (code === 'employed' ? '#12A36F' : code === 'self_employed' ? '#F0C428' : code === 'further_studies' ? '#4FA383' : code === 'not_employed' ? '#E5484D' : '#A7B0BC');
const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const P1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const pct = (n, d) => (d ? (n / d) * 100 : 0);
const thisYear = () => new Date().getFullYear();
/** Graduating batches the filters offer, newest first (registration accepts 1999 to the current year). */
export const ADMIN_YEARS = (() => { const AY = []; for (let y = thisYear(); y >= 1999; y--) AY.push(y); return AY; })();

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
  const years = AY.filter((y) => y >= lo && y <= hi).reverse();
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
  summary: emptyMetrics(), now: emptyMetrics(), prev: emptyMetrics(), unitsNow: { data: [] }, unitsPrev: { data: [] }, byBatch: { data: [] },
  inclusion: { traced: 0, ip: 0, pwd: 0, indigenousGroups: [], pwdTypes: [] }, recent: { data: [], meta: { total: 0 } },
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
    unitsNow: `/stats/by-program${qs({ ...base, group: sc.group, batches: sc.level === 'batch' ? batchRows : sc.now })}`,
    unitsPrev: `/stats/by-program${qs({ ...base, group: sc.group, batches: sc.level === 'batch' ? batchRows.map((y) => y - 1) : sc.prev })}`,
    byBatch: `/stats/by-batch${qs(base)}`,
    inclusion: `/stats/inclusion${qs({ ...base, ...range })}`,
    recent: `/alumni${qs({ ...base, ...range, status: sc.status, sort: 'created_at', dir: 'desc', per_page: 5 })}`,
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
    delta: d == null ? 'new' : `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`, arrow: d == null ? '' : d >= 0 ? '↑' : '↓',
    deltaColor: d == null || d >= 0 ? '#0F6B4F' : d < -1 ? '#B3213C' : '#8A6D1F', deltaBg: d == null || d >= 0 ? '#E1F3EA' : d < -1 ? '#FDE7EC' : '#FBF0D8',
    ...tipH(full, `${v.toFixed(1)}% employed${d == null ? '' : ` · ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts vs the previous batches`}`),
  }));

  const recent = data.recent.data || [];
  const registrations = recent.map((r) => {
    const s = ST[r.status] || ST.verified;
    return {
      name: r.name, program: r.program, full: r.course ? `${r.course} · ${r.college}` : '', batch: String(r.batch), employment: employmentLabel(r.employmentStatus), dot: dotOf(r.employmentStatus),
      date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: s[0], statusColor: s[1], statusBg: s[2], action: s[3], actionColor: s[4], id: r.id,
    };
  });

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
      adminShowFrom: registrations.length ? 1 : 0, adminShowTo: registrations.length,
      ...dash.vals,
      programRatesTitle: sc.level === 'college' ? 'Employability by college' : sc.level === 'course' ? 'Employability by course' : 'Employability by batch',
      programRatesSub: sc.level === 'batch' ? `${prog.abbr} · employment rate of traced graduates in the labour force, per batch` : `Employment rate, ${sc.now.length === 1 ? `batch ${sc.now[0]}` : `batches ${sc.now[0]}–${sc.now[sc.now.length - 1]}`}${col ? ` · ${col.name}` : ''}`,
      programRates, registrations, registrationsEmpty: !registrations.length,
      adminTotalEntries: N(data.recent.meta ? data.recent.meta.total : 0),
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
    if (falling && falling.d < -0.5) ins.push([`${falling.program} employability fell ${Math.abs(falling.d).toFixed(1)} pts`, `— now ${falling.v.toFixed(1)}% against the previous batches.`, 'r']);
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

  // Median of the time-to-job buckets.
  const midOrder = [['lt_1m', 0.5], ['m1_6', 3.5], ['m7_11', 9], ['y1_2', 18], ['y2_3', 30], ['y3_4', 42], ['gt_4y', 54]];
  let cum = 0;
  const half = ttjN / 2;
  const med = ttjN ? (midOrder.find(([k]) => { cum += t[k] || 0; return cum >= half; }) || [null, null])[1] : null;

  return {
    slices,
    admK: {
      emp: S.employmentRate, employed: S.employed, lf: S.laborForce, empD: delta(Sn.employmentRate, Sp.employmentRate),
      traced, total: S.total, covP: S.coverage || 0, goal, goalP: goal ? Math.min(100, pct(traced, goal)) : 0,
      comp: S.completion, completed: S.completed, compD: null,
      fg: S.firstGen, fgP: S.firstGenRate, al: S.alignedRate, alN: S.aligned, alD: delta(Sn.alignedRate, Sp.alignedRate),
      fs: S.furtherStudies, fsP: pct(S.furtherStudies, traced), sk: S.notEmployed, skP: pct(S.notEmployed, traced),
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
      donutTotal: N(traced), activeLabor: `${P1(traced ? 100 - pct(S.notEmployed, traced) : 0)}%`, medianMonths: med == null ? '—' : P1(med),
      timeToJob: groups.map(([lb, , color, text], i) => ({ label: lb, pct: `${tt[i]}%`, grow: tt[i] || 0, color, text, ...tipH(lb, `${tt[i]}% of employed graduates`) })),
      insights: ins.slice(0, 3).map(([lead, text, k]) => ({ lead, text, color: tone[k][0], leadColor: tone[k][1], bg: tone[k][2], border: tone[k][3] })),
      adminAwaiting: sc.status === 'verified' ? 'Showing verified submissions only' : `${N(S.flagged)} flagged for follow-up`,
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

/** KPI cards (hero + side + mini stats) for the admin dashboard. */
export function buildKpis(d, hoverId, setHover, goRecords) {
  const hv = hoverId;
  const sg = (n) => (n == null ? '' : `${n >= 0 ? '↑ ' : '↓ '}${Math.abs(n).toFixed(1)}`);
  const sgn = (n) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`;
  const wire = (id, o, noArrow) => ({
    ...o, onEnter: () => setHover(id), onLeave: () => setHover((h) => (h === id ? null : h)),
    arrowOp: hv === id && !noArrow ? 1 : 0, arrowX: hv === id ? 'translateX(0)' : 'translateX(-4px)',
  });
  return {
    kpiHero: wire('emp', { label: 'Employability rate', value: P1(d.emp), unit: '%', subLead: N(d.employed), sub: `employed of ${N(d.lf)} in the labour force`, pct: `${Math.round(d.emp || 0)}%`, context: d.empD == null ? 'Latest survey cycle' : `${sg(d.empD)} pts vs the previous batches` }),
    kpiSide: [
      wire('traced', { label: 'Graduates traced', value: N(d.traced), unit: `/ ${N(d.total)} total`, subLead: `${P1(d.covP)}%`, sub: 'of alumni records reached this cycle', hasBar: true, isDelta: false, pct: `${P1(d.goalP)}%`, context: `Goal: ${N(d.goal)}` }),
      wire('survey', { label: 'Survey completion', value: P1(d.comp), unit: '%', subLead: N(d.completed), sub: 'fully completed survey forms', hasBar: false, isDelta: d.compD != null, context: d.compD == null ? 'Average answered share of submitted surveys' : `${sg(d.compD)} pts` }),
      wire('firstgen', { label: 'First-generation graduates', caption: 'Are you the first in your family to graduate college?', value: N(d.fg), unit: 'respondents', subLead: `${P1(d.fgP)}%`, sub: 'answered “Yes”', hasBar: false, isDelta: false }),
    ],
    miniStats: [
      wire('m1', { label: 'Degree-aligned jobs', value: `${P1(d.al)}%`, sub: `${N(d.alN)} working in their field`, icon: 'M4 8h16v11H4z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M9 13.5l2 2 4-4', iconBg: '#E7F6EE', iconColor: '#0E7A5A', pill: d.alD == null ? 'Course-related jobs' : `${sgn(d.alD)}% field alignment`, pillBg: '#E1F3EA', pillColor: '#0F6B4F', isPill: true, isLink: false, cardBg: '#fff', cardBorder: '#E7E9ED' }),
      wire('m2', { label: 'Pursuing further studies', value: N(d.fs), sub: `${P1(d.fsP)}% of respondents`, icon: 'M2 9l10-5 10 5-10 5-10-5z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5', iconBg: '#E8EEF5', iconColor: '#3E5C7A', pill: 'Graduate & Professional', pillBg: '#EEF2F7', pillColor: '#334E68', isPill: true, isLink: false, cardBg: '#fff', cardBorder: '#E7E9ED' }),
      wire('m3', { label: 'Still seeking work', value: N(d.sk), sub: `${P1(d.skP)}% of survey responses`, icon: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5L20 20', iconBg: '#FBEBC4', iconColor: '#9A6400', pill: 'View records →', isPill: false, isLink: true, cardBg: '#FFFAEE', cardBorder: '#F0D9A0', onClick: goRecords }, true),
    ],
  };
}
