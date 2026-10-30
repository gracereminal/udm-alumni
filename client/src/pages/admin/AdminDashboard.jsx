import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import {
  ADMIN_YEARS, adminRequests, adminScope, buildAdminDash, buildKpiCards, detailVals, emptyAdminData,
} from '../../lib/adminDash';
import {
  ACTIVE_DAYS, activeColleges, analysisRequests, buildBatchAnalysis, buildOutcomeChart, engagementTrend, recentRegistrations, upcomingEvents,
} from '../../lib/adminOverview';
import { degreeAlignment, employmentOverview, graduatesTraced, recordRows } from '../../lib/adminDialogs';
import { get } from '../../lib/api';
import { buildSignals, signalCount, signalRequests } from '../../lib/signals';
import { RANGE_ERROR, pickYear } from '../../lib/batchRange';
import { CATALOG, collegeById, programById } from '../../data/colleges';
import { useToast } from '../../context/ToastContext';
import { useEvents } from '../../context/EventsContext';

/** Fetches every path of `reqs` (an object of API paths) and returns the responses under the same keys. */
const fetchAll = (reqs) => {
  const keys = Object.keys(reqs);
  return Promise.all(keys.map((k) => get(reqs[k]))).then((res) => Object.fromEntries(keys.map((k, i) => [k, res[i]])));
};

/** The unfiltered scope: every college and course, the whole batch range, all statuses. */
const DEFAULT_SEL = { college: 'all', course: 'all', from: ADMIN_YEARS[0], to: ADMIN_YEARS[ADMIN_YEARS.length - 1], status: 'all' };

/** Admin Dashboard —system-wide KPIs, outcomes by batch, registrations, engagement and events (GET /stats/*), on one screen. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { events } = useEvents();
  const { tipH, vals: tipVals } = useChartTip();
  const [sel, setSel] = useState(DEFAULT_SEL);
  const [data, setData] = useState(emptyAdminData);
  const [det, setDet] = useState(null);
  // KPI dialogs: Graduates Traced (gt), Employment Overview (ovm), Degree-to-Career Alignment (da); null = closed.
  const [gt, setGt] = useState(null);
  const [ovm, setOvm] = useState(null);
  const [da, setDa] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const [chartTab, setChartTab] = useState('rate');
  const [chartHover, setChartHover] = useState(null);
  // Clicked batch (chart point index) whose Employment Analysis is open, and that panel's tab.
  const [chartPick, setChartPick] = useState(null);
  const [anTab, setAnTab] = useState('ov');
  const [sxSel, setSxSel] = useState(null);
  const [colMetric, setColMetric] = useState('rate');
  const [retry, setRetry] = useState(0);
  const onYear = (key) => (e) => {
    const next = pickYear(sel, key, e.target.value);
    setRangeError(next ? '' : RANGE_ERROR);
    if (next) setSel(next);
  };

  const reqs = adminRequests(adminScope(sel));
  const reqKey = JSON.stringify(reqs);
  // Key of the request set behind `data`, or an error: the signals wait for the statistics of the current scope.
  const [loaded, setLoaded] = useState({ key: null, err: false });
  useEffect(() => {
    let live = true;
    fetchAll(JSON.parse(reqKey))
      .then((res) => { if (live) { setData(res); setLoaded({ key: reqKey, err: false }); } })
      .catch((err) => { if (live) { setLoaded({ key: null, err: true }); toast(err.message, false); } });
    return () => { live = false; };
  }, [reqKey, retry, toast]);

  // Signals Worth Acting On: sector breakdowns and Job Board totals on top of the dashboard statistics.
  const sigKey = JSON.stringify(signalRequests(adminScope(sel)));
  const [sig, setSig] = useState({ key: null, res: null, err: false });
  useEffect(() => {
    let live = true;
    fetchAll(JSON.parse(sigKey))
      .then((res) => { if (live) setSig({ key: sigKey, res, err: false }); })
      .catch(() => { if (live) setSig({ key: null, res: null, err: true }); });
    return () => { live = false; };
  }, [sigKey, retry]);

  // College accounts (GET /users?role=dept) for "Active colleges"; loaded once, apart from the scoped statistics,
  // so the rest of the dashboard still loads if this list fails.
  const [deptUsers, setDeptUsers] = useState([]);
  useEffect(() => {
    let live = true;
    get('/users?role=dept').then((res) => { if (live) setDeptUsers(res.data || []); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const d = buildAdminDash(sel, data, tipH, colMetric);

  // The alumni rows behind the Graduates Traced and Degree-to-Career dialogs load when one of them opens (they filter
  // by college, program and batch themselves).
  const recNeeded = !!(gt || da);
  const [recs, setRecs] = useState({ rows: null, err: false, n: 0 });
  useEffect(() => {
    if (!recNeeded) return undefined;
    let live = true;
    setRecs((r) => ({ ...r, rows: null, err: false }));
    get('/stats/records')
      .then((res) => { if (live) setRecs((r) => ({ ...r, rows: recordRows(res.data) })); })
      .catch((err) => { if (live) { setRecs((r) => ({ ...r, err: true })); toast(err.message, false); } });
    return () => { live = false; };
  }, [recNeeded, recs.n, toast]);

  // Outcomes chart (per-batch rows, unaffected by the batch range) and the clicked batch's Employment Analysis.
  const col = collegeById(d.scope.college);
  const prog = programById(d.scope.course);
  const chart = buildOutcomeChart(data.byBatch.data, chartTab, chartHover, CATALOG.targets.employment, null, {
    pick: chartPick, scope: prog ? prog.abbr : col ? col.code : 'All colleges',
  });
  const anYear = chartPick != null && chartPick <= chart.last ? chart.yearAt(chartPick) : null;
  // The By College / By Program breakdowns of a historical batch load only while its analysis is open.
  const anKey = anYear == null ? null : JSON.stringify(analysisRequests(d.scope, anYear));
  const [anUnits, setAnUnits] = useState({ key: null, res: null });
  useEffect(() => {
    if (!anKey) return undefined;
    let live = true;
    fetchAll(JSON.parse(anKey))
      .then((res) => { if (live) setAnUnits({ key: anKey, res }); })
      .catch((err) => { if (live) toast(err.message, false); });
    return () => { live = false; };
  }, [anKey, toast]);
  const analysis = buildBatchAnalysis(chart, data.byBatch.data, chartPick, anTab, anUnits.key === anKey ? anUnits.res : null, {
    target: CATALOG.targets.employment, scope: prog ? prog.name : col ? col.name : 'All colleges', college: d.scope.college, course: d.scope.course,
  });

  const goRecords = () => navigate('/admin/records');
  const reportScope = { college: d.scope.college, course: d.scope.course, from: d.scope.from, to: d.scope.to };
  const goReports = () => navigate('/admin/reports', { state: reportScope });

  const sxMode = loaded.err || sig.err ? 'error' : loaded.key !== reqKey || sig.key !== sigKey ? 'loading' : data.summary.total ? 'ready' : 'no-records';
  const signals = sxMode === 'ready' ? buildSignals(d.scope, data, sig.res, CATALOG.targets, d.vals.admScopeLabel, {
    records: goRecords, jobs: () => navigate('/admin/jobs'), events: () => navigate('/admin/events'), reports: goReports, tracer: () => navigate('/admin/tracer'),
  }) : [];
  const sxIdx = signals.findIndex((i) => i.id === sxSel);
  const sxStep = (n) => () => { if (signals.length) setSxSel(signals[((sxIdx < 0 ? 0 : sxIdx) + n + signals.length) % signals.length].id); };

  // The KPI dialogs start from the dashboard's college / program filter.
  const dlgScope = { college: String(d.scope.college), course: String(d.scope.course) };
  const kpi = buildKpiCards(d.admK, d.vals, {
    openDetail: setDet,
    openTraced: () => setGt({ ...dlgScope, from: null, to: null, batch: null, tab: 'traced', q: '', page: 1 }),
    openEmployment: () => setOvm({ all: false }),
    openAlignment: () => setDa({ ...dlgScope, batch: 'all', sel: null, allProg: false, selExp: false, q: '', tAl: 'all', tProg: 'all', page: 1 }),
  });
  const patch = (setter) => (p) => setter((s) => ({ ...s, ...p }));
  // Reports holds the employment status breakdown; a college / program row hands its scope over.
  const goUnitReport = (u) => {
    const unitScope = d.scope.level === 'college' ? { college: u.key, course: 'all' } : d.scope.level === 'course' ? { college: d.scope.college, course: u.key } : { college: d.scope.college, course: d.scope.course };
    setOvm(null);
    navigate('/admin/reports', { state: { ...reportScope, ...unitScope } });
  };
  const v = {
    ...d.vals,
    ...kpi,
    ...detailVals(det),
    adDetClose: () => setDet(null),
    adDetGo: () => { setDet(null); goReports(); },
    gt: gt ? { ...graduatesTraced(recs.rows, gt, patch(setGt), recs.err), retry: () => setRecs((r) => ({ ...r, n: r.n + 1 })) } : null,
    gtClose: () => setGt(null),
    ovm: ovm ? employmentOverview(data.summary, data.units.data, data.byBatch.data, {
      scopeLabel: d.vals.admScopeLabel.replace(/^all colleges/, 'All colleges'),
      unitLabel: d.scope.level === 'college' ? 'college' : d.scope.level === 'course' ? 'program' : 'batch',
      all: ovm.all, toggle: () => setOvm((s) => ({ all: !s.all })),
      goStatus: () => { setOvm(null); goReports(); },
      goUnit: goUnitReport,
    }) : null,
    ovmClose: () => setOvm(null),
    da: da ? degreeAlignment(recs.rows, da, patch(setDa)) : null,
    daClose: () => setDa(null),
    ...tipVals,
    admOnCollege: (e) => { setChartHover(null); setChartPick(null); setSel((s) => ({ ...s, college: e.target.value, course: 'all' })); },
    admOnCourse: (e) => setSel((s) => ({ ...s, course: e.target.value })),
    admOnFrom: onYear('from'),
    admOnTo: onYear('to'),
    rangeError,
    admOnStatus: (e) => setSel((s) => ({ ...s, status: e.target.value })),
    // Reset shows once any filter differs from the unfiltered scope.
    admFiltered: Object.keys(DEFAULT_SEL).some((k) => String(sel[k]) !== String(DEFAULT_SEL[k])),
    admOnReset: () => { setChartHover(null); setChartPick(null); setRangeError(''); setSel(DEFAULT_SEL); },
    chart,
    analysis: {
      ...analysis,
      onTab: setAnTab,
      onClose: () => setChartPick(null),
    },
    onChartPick: (i) => setChartPick((p) => (p === i ? null : i)),
    chartTab,
    colMetric,
    onColMetric: setColMetric,
    onChartTab: (t) => { setChartTab(t); setChartHover(null); },
    onChartHover: setChartHover,
    regs: recentRegistrations(data.recent && data.recent.data),
    engagement: (() => { const e = engagementTrend(events); return { ...e, bars: e.bars.map((b) => ({ ...b, ...tipH(b.title, b.val) })) }; })(),
    activeCols: (() => {
      const a = activeColleges(deptUsers);
      return { ...a, days: ACTIVE_DAYS, rows: a.rows.map((r) => ({ ...r, ...tipH(r.name, `${r.seen} · ${r.accounts}`) })) };
    })(),
    upcoming: upcomingEvents(events),
    goRecords,
    goEvents: () => navigate('/admin/events'),
    // Hand the dashboard's scope to Reports so the export matches what is on screen.
    goReports,
    exportHover: { background: '#0B3123' },
    sx: {
      mode: sxMode, list: signals, count: sxMode === 'ready' ? signalCount(signals) : '',
      cur: sxIdx >= 0 ? signals[sxIdx] : null, pos: sxIdx >= 0 ? `${sxIdx + 1} of ${signals.length}` : '',
      open: setSxSel, close: () => setSxSel(null), prev: sxStep(-1), next: sxStep(1), retry: () => setRetry((n) => n + 1),
      // A related action leaves the drawer first.
      go: (fn) => () => { setSxSel(null); fn(); },
    },
  };
  return <AdminDashboardView {...v} />;
}
