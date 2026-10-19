// College (department) dashboard view-model, scoped by the API to the signed-in user's college
// (USER_ACCOUNT.college_id). Shapes GET /stats/* responses into the props CollegeDashboardView renders.
import { CATALOG, collegeById, programById } from '../data/colleges';
import { qs } from './api';

const fx = (n) => (Number.isFinite(n) ? n : 0).toFixed(1);
const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const pct = (n, d) => (d ? (n / d) * 100 : 0);
const thisYear = () => new Date().getFullYear();
const YRS = () => [0, 1, 2, 3, 4, 5].map((i) => thisYear() - 5 + i);

/**
 * The batch range picked in the filter bar (`from` / `to` in either order, within the last six batches).
 * A range covering all six counts as every batch, so no batch filter is sent.
 */
export function deptRange(st) {
  const years = YRS();
  const f = years.includes(Number(st.from)) ? Number(st.from) : years[years.length - 1];
  const t = years.includes(Number(st.to)) ? Number(st.to) : years[0];
  const lo = Math.min(f, t);
  const hi = Math.max(f, t);
  const all = lo === years[0] && hi === years[years.length - 1];
  return { from: f, to: t, lo, hi, all, label: all ? 'All batches' : lo === hi ? `Batch ${lo}` : `Batches ${lo}–${hi}` };
}

export function deptRequests(st) {
  const program_id = st.course !== 'all' ? st.course : undefined;
  const r = deptRange(st);
  const range = r.all ? {} : { batch_from: r.lo, batch_to: r.hi };
  const now = [0, 1, 2, 3].map((i) => thisYear() - 3 + i);
  return {
    summary: `/stats/summary${qs({ program_id, ...range })}`,
    now: `/stats/summary${qs({ program_id, batches: now })}`,
    prev: `/stats/summary${qs({ program_id, batches: now.map((y) => y - 1) })}`,
    byProgram: `/stats/by-program${qs({ group: 'program' })}`,
    byBatch: `/stats/by-batch${qs({ program_id })}`,
    sectors: `/stats/sectors${qs({ program_id, ...range })}`,
    benchmark: '/stats/benchmark',
    outreach: `/stats/unresponsive${qs({ program_id, ...range, per_page: 5 })}`,
  };
}

const zero = { total: 0, traced: 0, employed: 0, wageEmployed: 0, selfEmployed: 0, furtherStudies: 0, notEmployed: 0, laborForce: 0, aligned: 0, firstGen: 0, employmentRate: null, alignedRate: null, firstGenRate: null, coverage: null };
export const emptyDeptData = () => ({
  summary: zero, now: zero, prev: zero, byProgram: { data: [] }, byBatch: { data: [] }, sectors: { topJobTitles: [] }, benchmark: {}, outreach: { data: [], meta: { total: 0, byReason: {} } },
});

const REASON = { seeking: ['Seeking work', '#8A6D1F', '#FBF0D8'], no_response: ['No survey response', '#334E68', '#EEF2F7'], new: ['New registration', '#0F6B4F', '#E1F3EA'] };

/** `outreach_contact.method` <-> the contact dialog's channel label. */
export const OUTREACH_METHOD = { Email: 'email', Messenger: 'messenger' };
const METHOD_LABEL = { email: 'Email', messenger: 'Messenger', facebook: 'Facebook', phone: 'Phone', linkedin: 'LinkedIn' };

/** "Today · Messenger" for an outreach mark ({ at, via }). */
export function contactedLabel(mark) {
  if (!mark) return '';
  const at = mark.at ? new Date(mark.at) : null;
  const when = at && at.toDateString() !== new Date().toDateString()
    ? at.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Today';
  return mark.via ? `${when} · ${mark.via}` : when;
}

/**
 * @param st   { course, from, to } (program id or 'all'; batch years)
 * @param data responses keyed like deptRequests()
 * @param fn   { user, setCourse, openContact, setHover, hoverId, tipH }
 */
export function buildCollegeDash(st, data, fn) {
  const { user, setCourse, openContact, setHover, hoverId, tipH } = fn;
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

  // Coverage by batch, with the batches outside the selected range muted.
  const batchRows = (data.byBatch && data.byBatch.data) || [];
  const byBatch = new Map(batchRows.map((r) => [r.key, r]));
  const years = YRS();
  const bRow = (y) => byBatch.get(y) || { total: 0, traced: 0, coverage: null };
  const rg = deptRange(st);
  const allTotal = batchRows.reduce((a, r) => a + r.total, 0);
  const allTraced = batchRows.reduce((a, r) => a + r.traced, 0);
  const lab = S.employed + S.notEmployed;
  const notAligned = S.employed - S.aligned;
  const out = (label, v, base, color, bg, desc, pctColor) => ({ label, value: N(v), pct: `${fx(pct(v, base))}%`, w: `${fx(pct(v, base))}%`, color, bg, desc, pctColor });
  const jobs = (data.sectors.topJobTitles || []).slice(0, 10);
  const topJob = jobs.length ? jobs[0].n : 1;
  const bl = rg.label;

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

  const progTotals = new Map((data.byProgram.data || []).map((r) => [String(r.key), r.total]));
  const allCount = (data.byProgram.data || []).reduce((a, r) => a + r.total, 0);
  const tab = (key, lbl, count, full) => ({
    label: lbl, full, count: N(count), onClick: () => setCourse(String(key)),
    bg: String(sel) === String(key) ? '#0F3D2E' : 'transparent', color: String(sel) === String(key) ? '#fff' : '#334155',
    countColor: String(sel) === String(key) ? 'rgba(255,255,255,.7)' : '#64748B', shadow: String(sel) === String(key) ? '0 1px 2px rgba(16,24,40,.15)' : 'none',
  });
  const oRows = data.outreach.data || [];
  const oTotal = data.outreach.meta ? data.outreach.meta.total : 0;

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
    deptEmpDelta: !rg.all ? rg.label : d == null ? 'Latest survey cycle' : `${d >= 0 ? '↑ ' : '↓ '}${fx(Math.abs(d))} pts vs the previous batches`,
    deptHeroEmployed: N(S.employed),
    deptReachNote: 'Share of each batch reached by the survey',
    deptCoverageAvg: `${sel === 'all' ? 'College' : 'Course'} coverage: ${fx(pct(allTraced, allTotal))}% (target ${target.coverage}%)`,
    deptNote: `N = ${N(traced)} survey responses`, deptTraced: N(traced),
    deptEmployedAll: `Employed (all types): ${fx(pct(S.employed, traced))}%`,
    deptOutreachNote: `${N(oTotal)} ${code} alumni seeking work, without a survey response, or newly registered`,
    deptOutShown: String(oRows.length), deptOutTotal: N(oTotal),
    deptHero: wire('d-emp', {}),
    deptSide: [
      wire('d-firstgen', { label: 'First-generation graduates', value: N(S.firstGen), unit: 'respondents', hasBar: false, isText: true, context: `${fx(S.firstGenRate ?? 0)}% of traced graduates answered “Yes”` }),
      wire('d-traced', { label: 'Graduates traced', value: N(S.traced), unit: `/ ${N(S.total)} total`, hasBar: true, isText: false, pct: `${fx(S.coverage ?? 0)}%`, context: `${fx(S.coverage ?? 0)}% of records reached` }),
    ],
    deptFromVal: String(rg.from), deptToVal: String(rg.to),
    deptFromOpts: [...years].reverse().map((y) => ({ value: String(y), label: `From ${y}` })),
    deptToOpts: [...years].reverse().map((y) => ({ value: String(y), label: `To ${y}` })),
    deptBatchNote: `${bl} · ${code} · change the batch range in the filter bar above`,
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
      const muted = !rg.all && (y < rg.lo || y > rg.hi);
      return { label: String(y), pct: `${v}%`, pctColor: muted ? '#94A3B8' : ok ? '#0B1220' : '#8A6D1F', color: muted ? '#D5DED9' : ok ? '#0F3D2E' : '#E0A915', ...tipH(`Batch ${y}`, `${v}% traced · ${ok ? 'meets' : 'below'} ${target.coverage}% target`) };
    }),
    deptStatus: stc.map((n, i) => ({ label: labels[i], count: String(n), pct: `${fx(pct(n, traced))}%`, pctColor: i === 3 ? '#B4500A' : '#0B1220', color: colors[i] })),
    deptDonut: traced ? `conic-gradient(${segs.join(', ')})` : 'conic-gradient(#E7E9ED 0% 100%)',
    deptCompare: [['Employability', S.employmentRate, uni.employmentRate], ['Degree-aligned jobs', S.alignedRate, uni.alignedRate]].map(([lb, c, u]) => ({
      label: lb, col: `${fx(c ?? 0)}%`, uni: `${fx(u ?? 0)}%`, cw: `${fx(c ?? 0)}%`, uw: `${fx(u ?? 0)}%`, diff: `${(c ?? 0) >= (u ?? 0) ? '+' : '−'}${fx(Math.abs((c ?? 0) - (u ?? 0)))} pts`,
      ...tipH(lb, `${sel === 'all' ? 'College ' : `${code} `}${fx(c ?? 0)}% · University ${fx(u ?? 0)}%`),
    })),
    deptInsights: insights.map(([lead, text, t]) => ({ lead, text, color: tone[t][0], leadColor: tone[t][1], bg: tone[t][2], border: tone[t][3] })),
    // "Contact" opens the offline contact dialog (Messenger / email outside the portal); the API only records the attempt.
    deptOutreach: oRows.map((r) => {
      const S2 = REASON[r.reason] || REASON.no_response;
      const mark = r.lastContactedAt ? { id: r.lastContactId, at: r.lastContactedAt, via: METHOD_LABEL[r.lastContactedVia] || '' } : null;
      return {
        name: r.name, batch: String(r.batch), program: r.program, status: S2[0], statusColor: S2[1], statusBg: S2[2],
        last: mark ? contactedLabel(mark) : r.reason === 'new' ? `Registered ${new Date(r.registeredAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}` : 'Never',
        btnLabel: mark ? 'Contacted ✓' : 'Contact', btnColor: mark ? '#475569' : '#0F3D2E', btnBg: mark ? '#F4F6F8' : '#fff', btnBorder: mark ? '#E2E5EA' : '#B9CFC6',
        onContact: () => openContact({ id: r.id, name: r.name, status: S2[0], contacts: { facebook: r.facebook, email: r.email }, contacted: mark }),
      };
    }),
  };
  return { vals, slices };
}

