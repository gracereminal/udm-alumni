// College (department) dashboard view-model, scoped by the API to the signed-in user's college
// (USER_ACCOUNT.college_id). Shapes GET /stats/* responses into the props CollegeDashboardView renders.
import { CATALOG, collegeById, programById } from '../data/colleges';
import { qs } from './api';

const fx = (n) => (Number.isFinite(n) ? n : 0).toFixed(1);
const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const pct = (n, d) => (d ? (n / d) * 100 : 0);
const thisYear = () => new Date().getFullYear();
const YRS = () => [0, 1, 2, 3, 4, 5].map((i) => thisYear() - 5 + i);

export function deptRequests(st) {
  const programId = st.course !== 'all' ? st.course : undefined;
  const batch = st.batch !== 'all' ? st.batch : undefined;
  const now = [0, 1, 2, 3].map((i) => thisYear() - 3 + i);
  return {
    summary: `/stats/summary${qs({ programId, batch })}`,
    now: `/stats/summary${qs({ programId, batches: now })}`,
    prev: `/stats/summary${qs({ programId, batches: now.map((y) => y - 1) })}`,
    byProgram: `/stats/by-program${qs({ group: 'program' })}`,
    byBatch: `/stats/by-batch${qs({ programId })}`,
    sectors: `/stats/sectors${qs({ programId, batch })}`,
    benchmark: '/stats/benchmark',
    outreach: `/stats/unresponsive${qs({ programId, batch, limit: 5 })}`,
  };
}

const zero = { total: 0, traced: 0, employed: 0, wageEmployed: 0, selfEmployed: 0, furtherStudies: 0, notEmployed: 0, laborForce: 0, aligned: 0, firstGen: 0, employmentRate: null, alignedRate: null, firstGenRate: null, coverage: null };
export const emptyDeptData = () => ({
  summary: zero, now: zero, prev: zero, byProgram: { rows: [] }, byBatch: [], sectors: { topJobTitles: [] }, benchmark: {}, outreach: { rows: [], total: 0, byReason: {} },
});

const REASON = { seeking: ['Seeking work', '#8A6D1F', '#FBF0D8'], no_response: ['No survey response', '#334E68', '#EEF2F7'], new: ['New registration', '#0F6B4F', '#E1F3EA'] };

/**
 * @param st   { course, batch } (program id / batch year, or 'all')
 * @param data responses keyed like deptRequests()
 * @param fn   { user, setCourse, setBatch, contact, contacting, setHover, hoverId, tipH }
 */
export function buildCollegeDash(st, data, fn) {
  const { user, setCourse, setBatch, contact, contacting, setHover, hoverId, tipH } = fn;
  const target = CATALOG.targets;
  const college = collegeById(user?.collegeId) || { name: user?.college || 'Your college', code: user?.collegeCode || '', programs: [] };
  const programs = college.programs || [];
  const sel = programById(st.course) ? Number(st.course) : 'all';
  const prog = sel !== 'all' ? programById(sel) : null;
  const code = prog ? prog.abbr : college.code;
  const S = data.summary;
  const wire = (id, o, noArrow) => ({
    ...o, onEnter: () => setHover(id), onLeave: () => setHover((h) => (h === id ? null : h)),
    arrowOp: hoverId === id && !noArrow ? 1 : 0, arrowX: hoverId === id ? 'translateX(0)' : 'translateX(-4px)',
  });

  // Status donut: the traced graduates by current employment.
  const labels = ['Employed', 'Self-employed', 'Further studies', 'Still seeking work'];
  const colors = ['#0F3D2E', '#F0C428', '#2F7FC1', '#D9620B'];
  const stc = [S.wageEmployed, S.selfEmployed, S.furtherStudies, S.notEmployed];
  const traced = S.traced || 0;
  let acc = 0;
  const segs = [];
  const slices = [];
  stc.forEach((n, i) => {
    const p = pct(n, traced); const a = acc; const b = acc + p; acc = b; const g = Math.max(a, b - 0.5);
    segs.push(`${colors[i]} ${a.toFixed(2)}% ${g.toFixed(2)}%`, `#fff ${g.toFixed(2)}% ${b.toFixed(2)}%`);
    slices.push({ end: b, title: labels[i], value: `${n} graduates · ${fx(p)}%` });
  });

  // Coverage by batch and the batch tiles.
  const byBatch = new Map((data.byBatch || []).map((r) => [r.key, r]));
  const years = YRS();
  const bRow = (y) => byBatch.get(y) || { total: 0, traced: 0, coverage: null };
  const bsel = years.includes(Number(st.batch)) ? Number(st.batch) : 'all';
  const tile = (k, label, t, tr) => {
    const on = String(bsel) === String(k);
    return { key: String(k), label, total: N(t), traced: N(tr), onClick: () => setBatch(String(k)), bg: on ? '#0F3D2E' : '#fff', border: on ? '#0F3D2E' : '#E2E5EA', color: on ? '#fff' : '#0B1220', sub: on ? 'rgba(255,255,255,.75)' : '#64748B' };
  };
  const allTotal = (data.byBatch || []).reduce((a, r) => a + r.total, 0);
  const allTraced = (data.byBatch || []).reduce((a, r) => a + r.traced, 0);
  const lab = S.employed + S.notEmployed;
  const notAligned = S.employed - S.aligned;
  const out = (label, v, base, color, bg, desc, pctColor) => ({ label, value: N(v), pct: `${fx(pct(v, base))}%`, w: `${fx(pct(v, base))}%`, color, bg, desc, pctColor });
  const jobs = (data.sectors.topJobTitles || []).slice(0, 10);
  const topJob = jobs.length ? jobs[0].n : 1;
  const bl = bsel === 'all' ? 'All batches' : `Batch ${bsel}`;

  // Hero: employment rate, with the change against the previous batch window.
  const empRate = S.employmentRate ?? 0;
  const d = data.now.employmentRate != null && data.prev.employmentRate != null ? data.now.employmentRate - data.prev.employmentRate : null;
  const uni = data.benchmark || {};
  const weakest = years.map((y) => ({ y, ...bRow(y) })).filter((r) => r.total > 0).sort((a, b) => (a.coverage ?? 0) - (b.coverage ?? 0))[0];
  const tone = { b: ['#2F7FC1', '#1F5F94', '#F2F7FC', '#DCE8F4'], y: ['#F0C428', '#8A6D1F', '#FDF9EE', '#F5E9CE'], g: ['#12A36F', '#0F6B4F', '#F0FAF4', '#D8EFE1'] };
  const insights = [];
  if (weakest) insights.push([`Batch ${weakest.y} coverage is ${fx(weakest.coverage ?? 0)}%${(weakest.coverage ?? 0) < target.coverage ? `, below the ${target.coverage}% target` : ''}.`, `Send survey reminders to the ${N(weakest.total - weakest.traced)} ${code} alumni who haven’t responded.`, (weakest.coverage ?? 0) < target.coverage ? 'y' : 'g']);
  if (S.notEmployed) insights.push([`${N(S.notEmployed)} graduates are still seeking work.`, 'Share matching job board posts with them and invite them to the next career fair.', 'b']);
  if (S.alignedRate != null) insights.push([`${fx(S.alignedRate)}% work in jobs related to their course.`, uni.alignedRate != null ? `The university average is ${fx(uni.alignedRate)}%.` : 'Degree alignment is self-reported in the survey.', S.alignedRate >= (uni.alignedRate ?? 0) ? 'g' : 'y']);
  if (!insights.length) insights.push(['No survey responses yet.', 'Insights appear once alumni in this college answer the survey.', 'y']);

  const progTotals = new Map((data.byProgram.rows || []).map((r) => [String(r.key), r.total]));
  const allCount = (data.byProgram.rows || []).reduce((a, r) => a + r.total, 0);
  const tab = (key, lbl, count, full) => ({
    label: lbl, full, count: N(count), onClick: () => setCourse(String(key)),
    bg: String(sel) === String(key) ? '#0F3D2E' : 'transparent', color: String(sel) === String(key) ? '#fff' : '#334155',
    countColor: String(sel) === String(key) ? 'rgba(255,255,255,.7)' : '#64748B', shadow: String(sel) === String(key) ? '0 1px 2px rgba(16,24,40,.15)' : 'none',
  });
  const oRows = data.outreach.rows || [];
  const recent = (iso) => iso && Date.now() - new Date(iso).getTime() < CATALOG_OUTREACH_DAYS * 864e5;

  const vals = {
    deptCourseTabs: [tab('all', 'All courses', allCount, college.name), ...programs.map((p) => tab(p.id, p.abbr, progTotals.get(String(p.id)) || 0, p.name))],
    deptCourseNote: sel === 'all' ? `All ${programs.length} ${college.code} courses · synced with alumni registration` : prog.name,
    deptScopeLabel: prog ? prog.abbr : college.name,
    deptTitle: `${prog ? prog.name : college.name}: Graduate Outcomes`,
    deptViewLabel: CATALOG.cycle ? `Survey cycle ${CATALOG.cycle.label}` : 'Survey cycle',
    deptThisLabel: sel === 'all' ? 'This college' : 'This course',
    deptCourseSelVal: String(sel),
    deptCourseOpts: [{ key: 'all', label: `All ${college.code} courses` }, ...programs.map((p) => ({ key: String(p.id), label: p.abbr }))],
    deptEmp: fx(empRate), deptEmpW: `${fx(empRate)}%`,
    deptEmpDelta: bsel !== 'all' ? `Batch ${bsel}` : d == null ? 'Latest survey cycle' : `${d >= 0 ? '↑ ' : '↓ '}${fx(Math.abs(d))} pts vs the previous batches`,
    deptHeroEmployed: N(S.employed),
    deptReachNote: 'Share of each batch reached by the survey',
    deptCoverageAvg: `${sel === 'all' ? 'College' : 'Course'} coverage: ${fx(pct(allTraced, allTotal))}% (target ${target.coverage}%)`,
    deptNote: `N = ${N(traced)} survey responses`, deptTraced: N(traced),
    deptEmployedAll: `Employed (all types): ${fx(pct(S.employed, traced))}%`,
    deptOutreachNote: `${N(data.outreach.total)} ${code} alumni seeking work, without a survey response, or newly registered`,
    deptOutShown: String(oRows.length), deptOutTotal: N(data.outreach.total),
    deptHero: wire('d-emp', {}),
    deptSide: [
      wire('d-firstgen', { label: 'First-generation graduates', value: N(S.firstGen), unit: 'respondents', hasBar: false, isText: true, context: `${fx(S.firstGenRate ?? 0)}% of traced graduates answered “Yes”` }),
      wire('d-traced', { label: 'Graduates traced', value: N(S.traced), unit: `/ ${N(S.total)} total`, hasBar: true, isText: false, pct: `${fx(S.coverage ?? 0)}%`, context: `${fx(S.coverage ?? 0)}% of records reached` }),
    ],
    deptBatchSelVal: String(bsel),
    deptBatchTiles: [tile('all', 'All batches', allTotal, allTraced), ...years.map((y) => tile(y, `Batch ${y}`, bRow(y).total, bRow(y).traced))],
    deptBatchNote: `${bl} · ${code} · change the batch in the filter bar above`,
    deptOutcome: [
      out('Unemployed', S.notEmployed, lab, '#D9620B', '#FFF8F1', 'Still seeking work · % of labor force', '#B4500A'),
      out('Aligned', S.aligned, S.employed, '#12A36F', '#fff', 'Job related to their course · % of employed', '#0F6B4F'),
      out('Not aligned', notAligned, S.employed, '#E0A915', '#FFFCF3', 'Job not related to their course · % of employed', '#8A6D1F'),
    ],
    deptJobs: jobs.map((j, i) => ({ rank: String(i + 1), title: j.key, count: String(j.n), pct: `${fx(pct(j.n, S.employed))}%`, w: `${fx(pct(j.n, topJob))}%`, rankBg: i < 3 ? '#0F3D2E' : '#F1F4F2', rankColor: i < 3 ? '#fff' : '#334155' })),
    deptJobsNote: `${bl} · ${code} · by job title reported in the survey · % of ${N(S.employed)} employed`,
    deptBatch: years.map((y) => {
      const v = Math.round(bRow(y).coverage ?? 0);
      const ok = v >= target.coverage;
      return { label: String(y), pct: `${v}%`, pctColor: ok ? '#0B1220' : '#8A6D1F', color: ok ? '#0F3D2E' : '#E0A915', ...tipH(`Batch ${y}`, `${v}% traced · ${ok ? 'meets' : 'below'} ${target.coverage}% target`) };
    }),
    deptStatus: stc.map((n, i) => ({ label: labels[i], count: String(n), pct: `${fx(pct(n, traced))}%`, pctColor: i === 3 ? '#B4500A' : '#0B1220', color: colors[i] })),
    deptDonut: traced ? `conic-gradient(${segs.join(', ')})` : 'conic-gradient(#E7E9ED 0% 100%)',
    deptCompare: [['Employability', S.employmentRate, uni.employmentRate], ['Degree-aligned jobs', S.alignedRate, uni.alignedRate]].map(([lb, c, u]) => ({
      label: lb, col: `${fx(c ?? 0)}%`, uni: `${fx(u ?? 0)}%`, cw: `${fx(c ?? 0)}%`, uw: `${fx(u ?? 0)}%`, diff: `${(c ?? 0) >= (u ?? 0) ? '+' : '−'}${fx(Math.abs((c ?? 0) - (u ?? 0)))} pts`,
      ...tipH(lb, `${sel === 'all' ? 'College ' : `${code} `}${fx(c ?? 0)}% · University ${fx(u ?? 0)}%`),
    })),
    deptInsights: insights.map(([lead, text, t]) => ({ lead, text, color: tone[t][0], leadColor: tone[t][1], bg: tone[t][2], border: tone[t][3] })),
    deptOutreach: oRows.map((r) => {
      const S2 = REASON[r.reason] || REASON.no_response;
      const done = recent(r.last_contacted_at);
      const busy = contacting === r.alumni_id;
      return {
        name: r.name, batch: String(r.batch), program: r.program, status: S2[0], statusColor: S2[1], statusBg: S2[2],
        last: r.last_contacted_at ? new Date(r.last_contacted_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : r.reason === 'new' ? `Registered ${new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}` : 'Never',
        btnLabel: busy ? 'Sending…' : done ? 'Contacted ✓' : 'Contact', btnColor: done ? '#475569' : '#0F3D2E', btnBg: done ? '#F4F6F8' : '#fff', btnBorder: done ? '#E2E5EA' : '#B9CFC6',
        onContact: () => { if (!done && !busy) contact(r); },
      };
    }),
  };
  return { vals, slices };
}

// One outreach email per alumnus per 7 days (APP_SETTING.outreach_interval_days); the API enforces it.
const CATALOG_OUTREACH_DAYS = 7;
