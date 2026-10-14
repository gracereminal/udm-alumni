// College (department) dashboard view-model — scoped to the College of Computing Studies (ported from the prototype).
import { COLLEGES } from '../data/colleges';
import { courseCode } from './format';

export const DEPT_COLLEGE = 'College of Computing Studies';

export const DEPT_COURSE_DATA = {
  'Bachelor of Science in Information Technology': {
    total: 640, done: 476, st: [362, 48, 22, 30, 46], aligned: 78.6, prev: 87.1, batch: [86, 83, 79, 72, 66, 58],
    out: [['i1', 'Andrea Villanueva', '2024', 's', 'Aug 28, 2026'], ['i2', 'Mark Joseph Lim', '2023', 'n', 'Never'], ['i3', 'Kevin Soriano', '2022', 'n', 'Jul 15, 2026'], ['i4', 'Rhea Castillo', '2024', 's', 'Sep 10, 2026'], ['i5', 'John Paul Reyes', '2023', 's', 'Sep 18, 2026']], outTotal: 64,
  },
  'Bachelor of Science in Computer Science': {
    total: 280, done: 201, st: [148, 20, 9, 19, 18], aligned: 84.1, prev: 88.3, batch: [88, 85, 80, 76, 69, 61],
    out: [['c1', 'Patricia Gomez', '2024', 's', 'Sep 02, 2026'], ['c2', 'Carlo Mendoza', '2023', 'n', 'Never'], ['c3', 'Bea Navarro', '2024', 's', 'Aug 30, 2026'], ['c4', 'Luis Fernandez', '2022', 'n', 'Jun 21, 2026']], outTotal: 26,
  },
};

const fx = (n) => (Number.isFinite(n) ? n : 0).toFixed(1);

function batchVals(D, A, batchSel, setBatch, bsel0) {
  const YRS = ['2019', '2020', '2021', '2022', '2023', '2024'];
  const W = [0.15, 0.16, 0.17, 0.17, 0.17, 0.18];
  const UF = [0.6, 0.7, 0.8, 1, 1.3, 1.8];
  const JOBS = {
    BSIT: [['Software Engineer', 0.17], ['Network Support Engineer', 0.13], ['IT Support Specialist', 0.12], ['Web Developer', 0.1], ['Systems Administrator', 0.08], ['Technical Support Representative', 0.07], ['QA / Software Tester', 0.06], ['Database Administrator', 0.05], ['Cybersecurity Analyst', 0.04], ['Cloud Engineer', 0.03]],
    BSCS: [['Software Engineer', 0.24], ['Web Developer', 0.12], ['QA / Software Tester', 0.1], ['Data Analyst', 0.08], ['Mobile App Developer', 0.07], ['IT Support Specialist', 0.06], ['Systems Analyst', 0.05], ['Machine Learning Engineer', 0.04], ['Network Support Engineer', 0.03], ['Cloud Engineer', 0.03]],
  };
  const pc = (dd, i) => {
    const T = dd.st.reduce((a, b) => a + b, 0);
    const tb = i === 5 ? dd.total - W.slice(0, 5).reduce((a, w) => a + Math.round(dd.total * w), 0) : Math.round(dd.total * W[i]);
    const tr = Math.round((tb * dd.batch[i]) / 100);
    const un = Math.round(((tr * dd.st[4]) / T) * UF[i]);
    const fs = Math.round((tr * dd.st[3]) / T);
    const em = tr - un - fs;
    return { tb, tr, un, em, al: Math.round((em * dd.aligned) / 100) };
  };
  const byB = YRS.map((y, i) => D.reduce((a, dd) => { const r = pc(dd, i); return { t: a.t + r.tb, tr: a.tr + r.tr, un: a.un + r.un, em: a.em + r.em, al: a.al + r.al }; }, { t: 0, tr: 0, un: 0, em: 0, al: 0 }));
  const bi = YRS.indexOf(bsel0);
  const bsel = bi < 0 ? 'all' : YRS[bi];
  const cur = bi < 0 ? { t: A.total, tr: A.traced, un: A.unemployed, em: A.employed, al: Math.round((A.employed * A.aligned) / 100) } : byB[bi];
  const na = cur.em - cur.al;
  const lab = cur.em + cur.un;
  const tile = (k, label, b) => {
    const on = bsel === k;
    return { key: k, label, total: b.t.toLocaleString(), traced: b.tr.toLocaleString(), onClick: () => setBatch(k), bg: on ? '#0F3D2E' : '#fff', border: on ? '#0F3D2E' : '#E2E5EA', color: on ? '#fff' : '#0B1220', sub: on ? 'rgba(255,255,255,.75)' : '#64748B' };
  };
  const out = (label, v, base, color, bg, desc, pctColor) => ({ label, value: v.toLocaleString(), pct: `${fx((v / base) * 100)}%`, w: `${fx((v / base) * 100)}%`, color, bg, desc, pctColor });
  const emB = (dd) => (bi < 0 ? dd.st[0] + dd.st[1] + dd.st[2] : pc(dd, bi).em);
  const m = {};
  D.forEach((dd) => { const e = emB(dd); (JOBS[dd.code] || JOBS.BSIT).forEach(([t, w]) => { m[t] = (m[t] || 0) + Math.round(e * w); }); });
  const jobs = Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 10);
  const top = jobs.length ? jobs[0][1] : 1;
  const bl = bsel === 'all' ? 'All batches' : `Batch ${bsel}`;
  return {
    deptBatchSelVal: bsel,
    deptBatchTiles: [tile('all', 'All batches', { t: A.total, tr: A.traced }), ...YRS.map((y, i) => tile(y, `Batch ${y}`, byB[i]))],
    deptBatchNote: `${bl} · ${A.code} · change the batch in the filter bar above`,
    _cur: cur, _bi: bi, _yr: bsel, _b24miss: byB[5].t - byB[5].tr,
    deptOutcome: [
      out('Unemployed', cur.un, lab, '#D9620B', '#FFF8F1', 'Still seeking work · % of labor force', '#B4500A'),
      out('Aligned', cur.al, cur.em || 1, '#12A36F', '#fff', 'Job related to their course · % of employed', '#0F6B4F'),
      out('Not aligned', na, cur.em || 1, '#E0A915', '#FFFCF3', 'Job not related to their course · % of employed', '#8A6D1F'),
    ],
    deptJobs: jobs.map(([t, n], i) => ({ rank: String(i + 1), title: t, count: String(n), pct: `${fx((n / (cur.em || 1)) * 100)}%`, w: `${fx((n / top) * 100)}%`, rankBg: i < 3 ? '#0F3D2E' : '#F1F4F2', rankColor: i < 3 ? '#fff' : '#334155' })),
    deptJobsNote: `${bl} · ${A.code} · by job title reported in the survey · % of ${cur.em.toLocaleString()} employed`,
  };
}

/**
 * @param st { course, batch, contacted }
 * @param nr the live registrant's record (or null)
 * @param fn { setCourse, setBatch, toggleContact, setHover, hoverId, tipH }
 * Returns { vals, slices } where slices drive the donut tooltip.
 */
export function buildCollegeDash(st, nr, fn) {
  const { setCourse, setBatch, toggleContact, setHover, hoverId, tipH } = fn;
  const wire = (id, o, noArrow) => ({
    ...o, onEnter: () => setHover(id), onLeave: () => setHover((h) => (h === id ? null : h)),
    arrowOp: hoverId === id && !noArrow ? 1 : 0, arrowX: hoverId === id ? 'translateX(0)' : 'translateX(-4px)',
  });
  const done = st.contacted || {};
  const seek = ['Seeking work', '#8A6D1F', '#FBF0D8'];
  const nores = ['No survey response', '#334E68', '#EEF2F7'];
  const courses = (COLLEGES[DEPT_COLLEGE] || []).filter((c) => DEPT_COURSE_DATA[c]);
  const sel = courses.includes(st.course) ? st.course : 'all';
  const picked = sel === 'all' ? courses : [sel];
  const D = picked.map((c) => ({ ...DEPT_COURSE_DATA[c], code: courseCode(c), full: c }));
  const sum = (f) => D.reduce((a, d) => a + f(d), 0);
  const total = sum((d) => d.total);
  const stc = [0, 1, 2, 3, 4].map((i) => sum((d) => d.st[i]));
  const traced = stc.reduce((a, b) => a + b, 0);
  const employed = stc[0] + stc[1] + stc[2];
  const emp = (employed / (traced - stc[3])) * 100;
  const prev = sum((d) => d.prev * d.total) / total;
  const aligned = sum((d) => d.aligned * (d.st[0] + d.st[1] + d.st[2])) / employed;
  const batch = [0, 1, 2, 3, 4, 5].map((i) => Math.round(sum((d) => d.batch[i] * d.total) / total));
  const code = sel === 'all' ? 'CCS' : courseCode(sel);
  const label = sel === 'all' ? DEPT_COLLEGE : code;
  const labels = ['Employed full-time', 'Employed part-time', 'Self-employed', 'Further studies', 'Still seeking work'];
  const colors = ['#0F3D2E', '#7CC4A0', '#F0C428', '#2F7FC1', '#D9620B'];
  let acc = 0;
  const segs = [];
  const slices = [];
  stc.forEach((n, i) => {
    const p = (n / traced) * 100; const a = acc; const b = acc + p; acc = b; const g = Math.max(a, b - 0.5);
    segs.push(`${colors[i]} ${a.toFixed(2)}% ${g.toFixed(2)}%`, `#fff ${g.toFixed(2)}% ${b.toFixed(2)}%`);
    slices.push({ end: b, title: labels[i], value: `${n} graduates · ${fx(p)}%` });
  });
  const tone = { b: ['#2F7FC1', '#1F5F94', '#F2F7FC', '#DCE8F4'], y: ['#F0C428', '#8A6D1F', '#FDF9EE', '#F5E9CE'], g: ['#12A36F', '#0F6B4F', '#F0FAF4', '#D8EFE1'] };
  const nrIn = !!(nr && nr.college === DEPT_COLLEGE && (sel === 'all' || nr.course === sel));
  const bv = batchVals(D, { total: total + (nrIn ? 1 : 0), traced, employed, unemployed: stc[4], aligned, code, sel }, st.batch, setBatch, st.batch);
  const hEmp = bv._bi < 0 ? emp : (bv._cur.em / ((bv._cur.em + bv._cur.un) || 1)) * 100;
  const cs = sel !== 'all' && code === 'BSCS';
  const insights = [
    [`Batch 2024 coverage is ${batch[5]}%, below the 65% target.`, `Send survey reminders to the ${bv._b24miss} ${code} alumni who haven’t responded.`, 'y'],
    [`${stc[4]} graduates are still seeking work.`, 'Share matching job board posts with them and invite them to the next career fair.', 'b'],
    cs ? ['Line up software internships.', 'Partner with 2–3 local dev and QA firms so 2026 BSCS students graduate with work experience.', 'g']
      : ['Run a certification drive.', 'CCNA or AWS was asked for in 7 of 10 IT postings — schedule a review course before graduation.', 'g'],
  ];
  let outRows = sel === 'all'
    ? [0, 1, 2].flatMap((i) => D.map((d) => d.out[i] && [d.out[i], d.code])).filter(Boolean).slice(0, 5)
    : D[0].out.map((r) => [r, D[0].code]);
  if (nrIn) outRows = [[['__new', `${nr.name} · NEW`, String(nr.batch), 'n', `Registered ${nr.updated}`], nr.program], ...outRows].slice(0, 5);
  const outTotal = sum((d) => d.outTotal) + (nrIn ? 1 : 0);
  const nrCount = (c) => ((nr && nr.college === DEPT_COLLEGE && (c === 'all' || nr.course === c)) ? 1 : 0);
  const tab = (key, lbl, count, full) => ({
    label: lbl, full, count: count.toLocaleString(), onClick: () => setCourse(key),
    bg: sel === key ? '#0F3D2E' : 'transparent', color: sel === key ? '#fff' : '#334155', countColor: sel === key ? 'rgba(255,255,255,.7)' : '#64748B', shadow: sel === key ? '0 1px 2px rgba(16,24,40,.15)' : 'none',
  });
  const all = courses.reduce((a, c) => a + DEPT_COURSE_DATA[c].total, 0);
  const d = emp - prev;
  const vals = {
    deptCourseTabs: [tab('all', 'All courses', all + nrCount('all'), DEPT_COLLEGE), ...courses.map((c) => tab(c, courseCode(c), DEPT_COURSE_DATA[c].total + nrCount(c), c))],
    deptCourseNote: sel === 'all' ? `All ${courses.length} CCS courses · synced with alumni registration` : sel,
    deptScopeLabel: label,
    deptTitle: `${sel === 'all' ? DEPT_COLLEGE : sel}: Graduate Outcomes`,
    deptViewLabel: 'Survey cycle 2026',
    deptThisLabel: sel === 'all' ? 'This college' : 'This course',
    deptCourseSelVal: sel,
    deptCourseOpts: [{ key: 'all', label: 'All CCS courses' }, ...courses.map((c) => ({ key: c, label: courseCode(c) }))],
    deptEmp: fx(hEmp), deptEmpW: `${fx(hEmp)}%`, deptEmpDelta: bv._bi < 0 ? `${d >= 0 ? '↑ ' : '↓ '}${fx(Math.abs(d))} pts vs 2025` : `Batch ${bv._yr}`,
    deptHeroEmployed: bv._cur.em.toLocaleString(),
    deptReachNote: 'Share of each batch reached by the survey',
    deptCoverageAvg: `${sel === 'all' ? 'College' : 'Course'} coverage average: ${fx(batch.reduce((a, b) => a + b, 0) / 6)}%`,
    deptNote: `N = ${traced} verified responses`, deptTraced: String(traced),
    deptEmployedAll: `Employed (all types): ${fx((employed / traced) * 100)}%`,
    deptOutreachNote: `${outTotal} ${code} alumni seeking work or without a survey response`,
    deptOutShown: String(outRows.length), deptOutTotal: String(outTotal),
    deptHero: wire('d-emp', {}),
    deptSide: [
      wire('d-firstgen', { label: 'First-generation graduates', value: String(Math.round(traced * 0.367)), unit: 'respondents', hasBar: false, isText: true, context: `${fx(36.7)}% of traced graduates answered “Yes”` }),
      wire('d-traced', { label: 'Graduates traced', value: bv._cur.tr.toLocaleString(), unit: `/ ${bv._cur.t.toLocaleString()} total`, hasBar: true, isText: false, pct: `${fx((bv._cur.tr / bv._cur.t) * 100)}%`, context: `${fx((bv._cur.tr / bv._cur.t) * 100)}% of records reached` }),
    ],
    ...bv,
    deptBatch: ['2019', '2020', '2021', '2022', '2023', '2024'].map((lb, i) => {
      const v = batch[i];
      return { label: lb, pct: `${v}%`, pctColor: v >= 65 ? '#0B1220' : '#8A6D1F', color: v >= 65 ? '#0F3D2E' : '#E0A915', ...tipH(`Batch ${lb}`, `${v}% traced · ${v >= 65 ? 'meets' : 'below'} 65% target`) };
    }),
    deptStatus: stc.map((n, i) => ({ label: labels[i], count: String(n), pct: `${fx((n / traced) * 100)}%`, pctColor: i === 4 ? '#B4500A' : '#0B1220', color: colors[i] })),
    deptDonut: `conic-gradient(${segs.join(', ')})`,
    deptCompare: [['Employability', emp, 78.4], ['Degree-aligned jobs', aligned, 71.2]].map(([lb, c, u]) => ({
      label: lb, col: `${fx(c)}%`, uni: `${fx(u)}%`, cw: `${fx(c)}%`, uw: `${fx(u)}%`, diff: `${c >= u ? '+' : '−'}${fx(Math.abs(c - u))} pts`,
      ...tipH(lb, `${sel === 'all' ? 'College ' : `${code} `}${fx(c)}% · University ${fx(u)}%`),
    })),
    deptInsights: insights.map(([lead, text, t]) => ({ lead, text, color: tone[t][0], leadColor: tone[t][1], bg: tone[t][2], border: tone[t][3] })),
    deptOutreach: outRows.map(([[id, name, b, s, last], program]) => {
      const S = s === 's' ? seek : s === 'n' ? ['New registration', '#0F6B4F', '#E1F3EA'] : nores;
      return {
        name, batch: b, program, status: S[0], statusColor: S[1], statusBg: S[2], last: done[id] ? 'Today' : last,
        btnLabel: done[id] ? 'Contacted ✓' : 'Contact', btnColor: done[id] ? '#475569' : '#0F3D2E', btnBg: done[id] ? '#F4F6F8' : '#fff', btnBorder: done[id] ? '#E2E5EA' : '#B9CFC6',
        onContact: () => toggleContact(id, name),
      };
    }),
  };
  return { vals, slices };
}
