// Admin dashboard view-model (scope filters, KPIs, charts, insights) — ported from the prototype.
import { collegeNames, repAbbr, repSum, resolveScope, STATUS_FILTER_LABELS } from './analytics';
import { COLLEGES } from '../data/colleges';

const ST = {
  pending: ['Pending', '#8A6D1F', '#FBF0D8', 'Review', '#0F6B4F'],
  verified: ['Verified', '#0F6B4F', '#E1F3EA', 'Details', '#64748B'],
  flagged: ['Flagged', '#B3213C', '#FDE7EC', 'Review', '#0F6B4F'],
};
const dotOf = (e) => (e.startsWith('Employed') ? '#12A36F' : e.startsWith('Self') ? '#F0C428' : e.startsWith('Further') ? '#4FA383' : e.startsWith('Not') ? '#E5484D' : '#A7B0BC');
const N = (n) => Math.round(n).toLocaleString('en-US');
const P1 = (n) => n.toFixed(1);
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

const RAW_REGS = [
  { name: 'Liza Fernandez', college: 'College of Computing Studies', course: 'Bachelor of Science in Information Technology', batch: '2023', employment: 'Employed full-time', date: 'Sep 14, 2026', st: 'pending' },
  { name: 'Noel Santiago', college: 'College of Business and Public Management', course: 'Bachelor of Science in Hospitality Management', batch: '2017', employment: 'Self-employed', date: 'Sep 13, 2026', st: 'verified' },
  { name: 'Carmela Ong', college: 'College of Health Sciences', course: 'Bachelor of Science in Nursing', batch: '2020', employment: 'Employed full-time', date: 'Sep 12, 2026', st: 'verified' },
  { name: 'Rafael Tan', college: 'College of Business and Public Management', course: 'Bachelor of Science in Business Administration Major in Marketing Management', batch: '2015', employment: 'Further studies', date: 'Sep 11, 2026', st: 'pending' },
  { name: 'Bianca Cruz', college: 'College of Engineering and Technology', course: 'Bachelor of Science in Computer Science', batch: '2022', employment: 'Not yet employed', date: 'Sep 10, 2026', st: 'verified' },
  { name: 'Joshua Reyes', college: 'College of Criminal Justice', course: 'Bachelor of Science in Criminology', batch: '2021', employment: 'Employed full-time', date: 'Sep 09, 2026', st: 'pending' },
  { name: 'Patricia Lim', college: 'College of Education', course: 'Bachelor of Secondary Education Major in Mathematics', batch: '2019', employment: 'Employed full-time', date: 'Sep 08, 2026', st: 'verified' },
  { name: 'Mark Villanueva', college: 'College of Arts and Sciences', course: 'Bachelor of Science in Psychology', batch: '2024', employment: 'Employed part-time', date: 'Sep 07, 2026', st: 'pending' },
  { name: 'Andrea Gomez', college: 'College of Health Sciences', course: 'Bachelor of Science in Physical Therapy', batch: '2022', employment: 'Further studies', date: 'Sep 06, 2026', st: 'verified' },
];

export const ADMIN_YEARS = (() => { const AY = []; for (let y = 2026; y >= 2015; y--) AY.push(y); return AY; })();

/**
 * @param sel   { college, course, batch, status } (raw select values)
 * @param nr    the live registrant's record (or null) and its current status
 * @param tipH  (title, value) => { onTipMove, onTipLeave }
 */
export function buildAdminDash(sel, nr, nrSt, tipH) {
  const cols = COLLEGES;
  const names = collegeNames();
  const sc = resolveScope(sel.college, sel.course);
  const { college, course, courses } = sc;
  const label = course !== 'all' ? course : college !== 'all' ? college : 'all colleges';
  const level = course !== 'all' ? 'batch' : college !== 'all' ? 'course' : 'college';
  const AY = ADMIN_YEARS;
  const batch = AY.includes(+sel.batch) ? +sel.batch : 'all';
  const status = ['verified', 'pending', 'flagged'].includes(sel.status) ? sel.status : 'all';
  const SF = { all: [1, 0, 0], verified: [0.9845, 0.6, 1.1], pending: [0.0035, -2.4, -9.8], flagged: [0.012, -5.1, -31.5] }[status];
  const allC = names.flatMap((n) => cols[n]);
  const C = course !== 'all' ? [course] : college !== 'all' ? courses : allC;
  const NOW = batch === 'all' ? [2023, 2024, 2025, 2026] : [batch];
  const PREV = NOW.map((y) => y - 1);
  const pairs = (cs, ys) => cs.flatMap((c) => ys.map((y) => [c, y]));
  const units = level === 'college' ? names.map((n) => ({ full: n, cs: cols[n] })) : level === 'course' ? courses.map((c) => ({ full: c, cs: [c] })) : null;
  let rows;
  if (units) {
    rows = units.map((u) => { const v = repSum(pairs(u.cs, NOW)).emp + SF[1]; const d = v - SF[1] - repSum(pairs(u.cs, PREV)).emp; return { program: repAbbr(u.full), full: u.full, v, d, cs: u.cs, ys: NOW }; }).sort((a, b) => b.v - a.v);
  } else {
    rows = (batch === 'all' ? [2021, 2022, 2023, 2024, 2025, 2026] : [batch]).map((y) => { const v = repSum([[course, y]]).emp + SF[1]; const d = v - SF[1] - repSum([[course, y - 1]]).emp; return { program: `Batch ${y}`, full: `${course} · Batch ${y}`, v, d, cs: [course], ys: [y] }; });
  }
  const programRates = rows.map(({ program, full, v, d }) => ({
    program, full, pct: `${v.toFixed(1)}%`, delta: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`, arrow: d >= 0 ? '↑' : '↓',
    deltaColor: d >= 0 ? '#0F6B4F' : d < -1 ? '#B3213C' : '#8A6D1F', deltaBg: d >= 0 ? '#E1F3EA' : d < -1 ? '#FDE7EC' : '#FBF0D8',
    ...tipH(full, `${v.toFixed(1)}% employed · ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts YoY`),
  }));

  const raw = [...(nr ? [{ name: `${nr.name} · NEW`, college: nr.college, course: nr.course, batch: String(nr.batch), employment: nr.employment, date: nr.updated, st: nrSt }] : []), ...RAW_REGS];
  const inScope = (r) => (college === 'all' || r.college === college) && (course === 'all' || r.course === course) && (batch === 'all' || r.batch === String(batch));
  const regAll = raw.filter((r) => inScope(r) && (status === 'all' || r.st === status));
  const nrRow = nr ? raw[0] : null;
  const nrIn = !!(nrRow && inScope(nrRow) && (status === 'all' || nrSt === status));
  const registrations = regAll.slice(0, 5).map((r) => {
    const s = ST[r.st] || ST.pending;
    return {
      name: r.name, program: r.course ? repAbbr(r.course) : '—', full: r.course ? `${r.course} · ${r.college}` : '', batch: r.batch, employment: r.employment, dot: dotOf(r.employment), date: r.date,
      status: s[0], statusColor: s[1], statusBg: s[2], action: s[3], actionColor: s[4],
    };
  });

  const dash = admDash({ NOW, C, allC, batch, status, SF, rows, regCount: regAll.length, nr: !!nr, nrIn, nrPending: nrIn && nrSt === 'pending' }, tipH);
  return {
    scope: { college, course, batch: String(batch), status },
    slices: dash.slices,
    admK: dash.admK,
    vals: {
      admCollegeVal: college,
      admCollegeOpts: [{ value: 'all', label: 'All colleges' }, ...names.map((n) => ({ value: n, label: n }))],
      admCourseVal: course,
      admCourseOpts: [{ value: 'all', label: college === 'all' ? 'All courses' : `All courses (${courses.length})` }, ...courses.map((c) => ({ value: c, label: c }))],
      admCourseDisabled: college === 'all', admCourseOpacity: college === 'all' ? 0.55 : 1,
      admScopeLabel: label + (batch !== 'all' ? ` · Batch ${batch}` : '') + (status !== 'all' ? ` · ${STATUS_FILTER_LABELS[status].toLowerCase()}` : ''),
      admBatchVal: String(batch), admBatchOpts: [{ value: 'all', label: 'Batch: All years' }, ...AY.map((y) => ({ value: String(y), label: `Batch ${y}` }))],
      admStatusVal: status, admStatusOpts: Object.keys(STATUS_FILTER_LABELS).map((k) => ({ value: k, label: `Status: ${STATUS_FILTER_LABELS[k]}` })),
      adminShowFrom: registrations.length ? 1 : 0, adminShowTo: registrations.length,
      ...dash.vals,
      programRatesTitle: level === 'college' ? 'Employability by college' : level === 'course' ? 'Employability by course' : 'Employability by batch',
      programRatesSub: level === 'batch' ? `${repAbbr(course)} · employed within 12 months, per graduating batch` : `Employed within 12 months of graduating${college !== 'all' ? ` · ${college}` : ''}`,
      programRates, registrations, registrationsEmpty: !registrations.length,
    },
  };
}

function admDash({ NOW, C, allC, batch, status, SF, rows, regCount, nr, nrIn, nrPending }, tipH) {
  const AY = []; for (let y = 2015; y <= 2026; y++) AY.push(y);
  const Y = batch === 'all' ? AY : [batch];
  const pairs = (cs, ys) => cs.flatMap((c) => ys.map((y) => [c, y]));
  const F = repSum(pairs(allC, AY));
  const S = repSum(pairs(C, Y));
  const REF = [2023, 2024, 2025, 2026];
  const Fr = repSum(pairs(allC, REF));
  const Sr = repSum(pairs(C, NOW));
  const Frp = repSum(pairs(allC, REF.map((y) => y - 1)));
  const Srp = repSum(pairs(C, NOW.map((y) => y - 1)));
  const trend = (Sr.emp - Srp.emp) - (Fr.emp - Frp.emp);
  const trendRel = (Sr.rel - Srp.rel) - (Fr.rel - Frp.rel);
  const isDef = C.length === allC.length && batch === 'all' && status === 'all';
  const kt = S.t / F.t;
  const kg = S.g / F.g;
  const BB = { 2019: 69, 2020: 68, 2021: 68, 2022: 58, 2023: 54, 2024: 62 };
  const w0 = batch === 'all' || (batch >= 2019 && batch <= 2024) ? 2019 : batch > 2024 ? batch - 5 : batch;
  const covY = (cs, y) => repSum(pairs(cs, [y])).cov;
  const bars = [0, 1, 2, 3, 4, 5].map((i) => {
    const y = w0 + i; const fy = covY(allC, y); const base = BB[y] != null ? BB[y] : (fy * 67.7) / F.cov;
    return { y, v: Math.round(cl((base + covY(C, y) - fy) * SF[0], 0, 100)) };
  });
  const total = Math.round(5140 * kg);
  const goal = Math.round(3600 * kg);
  const selBar = batch === 'all' ? null : bars.find((b) => b.y === batch);
  const traced = selBar ? Math.round((total * selBar.v) / 100) : Math.round(3482 * kt * SF[0]);
  const dEmp = Sr.emp - Fr.emp + SF[1];
  const emp = cl(78.4 + dEmp, 5, 99);
  const lf = Math.round((3483 * traced) / 3482);
  const employed = Math.round((lf * emp) / 100);
  const tr = traced / 3482;
  const comp = cl(92.6 + (S.cov - F.cov) * 0.3 + SF[2], 5, 100);
  const completed = Math.round((3225 * tr * comp) / 92.6);
  const fgP = cl(36.7 - dEmp * 0.4, 5, 80);
  const fg = Math.round((1184 * tr * fgP) / 36.7);
  const al = cl(71.2 + (S.rel - F.rel), 5, 99);
  const alN = Math.round(1944 * (employed / 2731) * (al / 71.2));
  const BS = [62.1, 9.3, 7.1, 8.3, 13.2];
  const BC = [2162, 324, 245, 289, 462];
  const ne = cl(13.2 - dEmp * 0.6, 1, 60);
  const sh = BS.map((v, i) => (i === 4 ? ne : (v * (100 - ne)) / 86.8));
  const cnt = sh.map((v, i) => Math.round((BC[i] * tr * v) / BS[i]));
  const MIX = [['Employed full-time', '#0F3D2E'], ['Employed part-time', '#7CC4A0'], ['Self-employed / Entrepreneurship', '#F0C428'], ['Further studies / Academics', '#2F7FC1'], ['Not yet employed (Seeking opportunities)', '#D9620B']];
  const MIXT = ['Employed full-time', 'Employed part-time', 'Self-employed / Entrepreneurship', 'Further studies / Academics', 'Not yet employed'];
  const r1 = (x) => +x.toFixed(1);
  let acc = 0;
  const stops = [];
  const slices = [];
  sh.forEach((v, i) => {
    const a = r1(acc); const b = i === 4 ? 100 : r1(acc + v); acc += v;
    stops.push(`${MIX[i][1]} ${a}% ${r1(b - 0.5)}%`, `#fff ${r1(b - 0.5)}% ${b}%`);
    slices.push({ end: b, title: MIXT[i], value: `${N(cnt[i])} graduates · ${P1(v)}%` });
  });
  const dM = S.m - F.m;
  const med = cl(4.2 + dM, 1.2, 12);
  const t1 = cl(41 - dM * 6, 5, 80);
  const t4 = cl(13 + dM * 3, 2, 50);
  let t2 = 27;
  let t3 = 100 - t1 - t2 - t4;
  if (t3 < 3) { t2 -= 3 - t3; t3 = 3; }
  const tt = [t1, t2, t3, t4].map(Math.round);
  tt[2] = 100 - tt[0] - tt[1] - tt[3];
  const tone = { r: ['#E5484D', '#C2344F', '#FDF2F4', '#F8DFE4'], y: ['#F0C428', '#8A6D1F', '#FDF9EE', '#F5E9CE'], g: ['#12A36F', '#0F6B4F', '#F0FAF4', '#D8EFE1'] };
  let ins;
  if (isDef) {
    ins = [['Criminology employability fell 2.3 pts', '— 63 graduates from 2023–2024 remain unplaced in protective/security services.', 'r'],
      ['Batch 2023 coverage is the weakest at 54%.', '468 records still have no survey response before upcoming audit.', 'y'],
      ['Information Technology graduates', 'reach first employment in 3.1 months on average, beating historical records.', 'g']];
  } else {
    ins = [];
    const yl = batch === 'all' ? 'across batches' : `from Batch ${batch}`;
    if (rows.length) {
      const fall = rows.reduce((a, b) => (b.d < a.d ? b : a));
      const low = rows.reduce((a, b) => (b.v < a.v ? b : a));
      const pick = fall.d < -0.5 ? fall : low;
      const un = Math.round((lf * (100 - pick.v)) / 100 / rows.length);
      ins.push(fall.d < -0.5 ? [`${fall.program} employability fell ${Math.abs(fall.d).toFixed(1)} pts`, `— ${N(un)} graduates ${yl} remain unplaced.`, 'r']
        : [`${low.program} trails at ${low.v.toFixed(1)}% employability`, `— the lowest in this view; ${N(un)} graduates ${yl} remain unplaced.`, low.v < 70 ? 'r' : 'y']);
    }
    const tg = batch === 'all' ? bars.reduce((a, b) => (b.v < a.v ? b : a)) : bars.find((b) => b.y === batch);
    const miss = Math.round(((5140 * repSum(pairs(C, [tg.y])).g) / F.g) * (100 - tg.v) / 100);
    ins.push(batch === 'all' ? [`Batch ${tg.y} coverage is the weakest at ${tg.v}%.`, `${N(miss)} records still have no ${status === 'all' ? '' : `${status} `}survey response before upcoming audit.`, tg.v < 65 ? 'y' : 'g']
      : [`Batch ${tg.y} coverage is ${tg.v}%,`, `${tg.v < 65 ? 'below' : 'meeting'} the 65% target. ${N(miss)} records still have no ${status === 'all' ? '' : `${status} `}survey response.`, tg.v < 65 ? 'y' : 'g']);
    if (rows.length) {
      const fast = rows.map((r) => ({ r, m: repSum(pairs(r.cs, r.ys)).m - F.m + 4.2 })).reduce((a, b) => (b.m < a.m ? b : a));
      ins.push([`${fast.r.program} graduates`, `reach first employment in ${fast.m.toFixed(1)} months on average${rows.length > 1 && fast.m < med - 0.05 ? `, ahead of the ${med.toFixed(1)}-month median.` : '.'}`, 'g']);
    }
  }
  const pend = Math.round(12 * kt) + (nrPending ? 1 : 0);
  return {
    slices,
    admK: {
      emp, employed, lf, empD: 3.1 + trend, traced, total, covP: total ? (traced / total) * 100 : 0, goal, goalP: goal ? Math.min(100, (traced / goal) * 100) : 0,
      comp, completed, compD: 6.4 + trend * 0.5, fg, fgP, al, alN, alD: 4.8 + trendRel, fs: cnt[3], fsP: sh[3], sk: cnt[4], skP: sh[4],
    },
    vals: {
      batchSub: `${N(traced)} of ${N(total)} alumni records reached`,
      batchBars: bars.map(({ y, v }) => {
        const muted = batch !== 'all' && y !== batch;
        return {
          label: String(y), pct: `${v}%`, pctColor: muted ? '#94A3B8' : v >= 65 ? '#0B1220' : '#8A6D1F', color: muted ? '#D5DED9' : v >= 65 ? '#0F3D2E' : '#E0A915',
          ...tipH(`Batch ${y}`, `${v}% traced · ${v >= 65 ? 'meets' : 'below'} 65% target`),
        };
      }),
      statusMix: MIX.map((m, i) => ({ label: m[0], count: `${N(cnt[i])} graduates`, pct: `${P1(sh[i])}%`, pctColor: i === 4 ? '#B4500A' : '#0B1220', color: m[1] })),
      statusDonut: `conic-gradient(${stops.join(', ')})`,
      donutTotal: N(traced), activeLabor: `${P1(100 - ne)}%`, medianMonths: P1(med),
      timeToJob: [['Under 3 months', '#CFE8DA', '#0B3A2B'], ['3 – 6 months', '#7CC4A0', '#0B3A2B'], ['6 – 12 months', '#1F7A57', '#fff'], ['Over 12 months', '#0B3A2B', '#fff']]
        .map(([lb, color, text], i) => ({ label: lb, pct: `${tt[i]}%`, grow: tt[i], color, text, ...tipH(lb, `${tt[i]}% of employed graduates`) })),
      insights: ins.map(([lead, text, t]) => ({ lead, text, color: tone[t][0], leadColor: tone[t][1], bg: tone[t][2], border: tone[t][3] })),
      adminAwaiting: isDef ? `${12 + (nr ? 1 : 0)} awaiting administrative verification`
        : status === 'verified' ? 'Showing verified submissions only' : status === 'flagged' ? `${N(Math.max(traced, regCount))} flagged for follow-up` : `${pend} awaiting administrative verification`,
      ...inclusionProfile(traced),
      adminTotalEntries: isDef ? (3482 + (nr ? 1 : 0)).toLocaleString('en-US') : N(Math.max(traced + (nrIn ? 1 : 0), regCount)),
    },
  };
}

/** Inclusion profile (IP & PWD self-declared on registration) — aggregated counts for the traced respondents. */
function inclusionProfile(traced) {
  const t = Math.max(0, traced || 0);
  const ip = Math.round(t * 0.041);
  const pwd = Math.round(t * 0.023);
  const P2 = (n) => `${t ? ((n / t) * 100).toFixed(1) : '0.0'}%`;
  const split = (n, shares) => { const r = shares.map((s) => Math.floor(n * s)); r[r.length - 1] += n - r.reduce((a, b) => a + b, 0); return r; };
  const mk = (title, yes, color, rowsTitle, labels, shares) => {
    const c = split(yes, shares);
    const m = Math.max(1, ...c);
    return { title, yes: N(yes), yesPct: P2(yes), no: N(t - yes), noPct: P2(t - yes), color, rowsTitle, rows: labels.map((label, i) => ({ label, n: N(c[i]), w: `${Math.round((c[i] / m) * 100)}%`, color })) };
  };
  return {
    inclSub: `Self-declared on registration · ${N(t)} respondents`,
    inclGroups: [
      mk('Indigenous Peoples (IP)', ip, '#0F6B4F', 'By Indigenous group', ['Aeta', 'Igorot', 'Lumad', 'Mangyan', 'Others'], [0.29, 0.24, 0.18, 0.14, 0.15]),
      mk('Persons with Disability (PWD)', pwd, '#2F7FC1', 'By type of disability', ['Physical / Orthopedic', 'Visual', 'Hearing', 'Psychosocial', 'Others'], [0.34, 0.22, 0.16, 0.12, 0.16]),
    ],
  };
}

/** KPI cards (hero + side + mini stats) for the admin dashboard. */
export function buildKpis(d, hoverId, setHover, goRecords) {
  const hv = hoverId;
  const sg = (n) => { const r = +n.toFixed(1); return `${r >= 0 ? '↑ ' : '↓ '}${Math.abs(r).toFixed(1)}`; };
  const sgn = (n) => { const r = +n.toFixed(1); return `${r >= 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}`; };
  const wire = (id, o, noArrow) => ({
    ...o, onEnter: () => setHover(id), onLeave: () => setHover((h) => (h === id ? null : h)),
    arrowOp: hv === id && !noArrow ? 1 : 0, arrowX: hv === id ? 'translateX(0)' : 'translateX(-4px)',
  });
  return {
    kpiHero: wire('emp', { label: 'Employability rate', value: P1(d.emp), unit: '%', subLead: N(d.employed), sub: `employed of ${N(d.lf)} in the labour force`, pct: `${Math.round(d.emp)}%`, context: `${sg(d.empD)} pts vs 2025 cycle` }),
    kpiSide: [
      wire('traced', { label: 'Graduates traced', value: N(d.traced), unit: `/ ${N(d.total)} total`, subLead: `${P1(d.covP)}%`, sub: 'of alumni records reached this cycle', hasBar: true, isDelta: false, pct: `${P1(d.goalP)}%`, context: `Goal: ${N(d.goal)}` }),
      wire('survey', { label: 'Survey completion', value: P1(d.comp), unit: '%', subLead: N(d.completed), sub: 'fully completed survey forms', hasBar: false, isDelta: true, context: `${sg(d.compD)} pts vs 2025 cycle` }),
      wire('firstgen', { label: 'First-generation graduates', caption: 'Are you the first in your family to graduate college?', value: N(d.fg), unit: 'respondents', subLead: `${P1(d.fgP)}%`, sub: 'answered “Yes”', hasBar: false, isDelta: false }),
    ],
    miniStats: [
      wire('m1', { label: 'Degree-aligned jobs', value: `${P1(d.al)}%`, sub: `${N(d.alN)} working in their field`, icon: 'M4 8h16v11H4z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M9 13.5l2 2 4-4', iconBg: '#E7F6EE', iconColor: '#0E7A5A', pill: `${sgn(d.alD)}% field alignment`, pillBg: '#E1F3EA', pillColor: '#0F6B4F', isPill: true, isLink: false, cardBg: '#fff', cardBorder: '#E7E9ED' }),
      wire('m2', { label: 'Pursuing further studies', value: N(d.fs), sub: `${P1(d.fsP)}% of respondents`, icon: 'M2 9l10-5 10 5-10 5-10-5z M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5', iconBg: '#E8EEF5', iconColor: '#3E5C7A', pill: 'Graduate & Professional', pillBg: '#EEF2F7', pillColor: '#334E68', isPill: true, isLink: false, cardBg: '#fff', cardBorder: '#E7E9ED' }),
      wire('m3', { label: 'Still seeking work', value: N(d.sk), sub: `${P1(d.skP)}% of survey responses`, icon: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5L20 20', iconBg: '#FBEBC4', iconColor: '#9A6400', pill: 'View outreach list →', isPill: false, isLink: true, cardBg: '#FFFAEE', cardBorder: '#F0D9A0', onClick: goRecords }, true),
    ],
  };
}
