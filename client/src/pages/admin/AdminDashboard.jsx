import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import {
  ADMIN_YEARS, adminRequests, adminScope, buildAdminDash, buildKpiCards, buildPopulation, detailVals, emptyAdminData, populationRequests,
} from '../../lib/adminDash';
import { ACTIVE_DAYS, activeColleges, buildOutcomeChart, engagementTrend, recentRegistrations, upcomingEvents } from '../../lib/adminOverview';
import { get } from '../../lib/api';
import { buildForecast } from '../../lib/forecast';
import { buildSignals, signalCount, signalRequests } from '../../lib/signals';
import { RANGE_ERROR, pickYear } from '../../lib/batchRange';
import { CATALOG } from '../../data/colleges';
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
  const [forecastOpen, setForecastOpen] = useState(false);
  const [det, setDet] = useState(null);
  const [popOpen, setPopOpen] = useState(false);
  const [pop, setPop] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const [chartTab, setChartTab] = useState('rate');
  const [chartHover, setChartHover] = useState(null);
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
  const years = d.vals.batchYears;

  // The population dialog's breakdowns load only while it is open.
  const popKey = popOpen ? JSON.stringify(populationRequests(d.scope, years)) : null;
  useEffect(() => {
    if (!popKey) return undefined;
    let live = true;
    setPop(null);
    fetchAll(JSON.parse(popKey))
      .then((res) => { if (live) setPop(res); })
      .catch((err) => { if (live) toast(err.message, false); });
    return () => { live = false; };
  }, [popKey, toast]);

  const goRecords = () => navigate('/admin/records');
  const reportScope = { college: d.scope.college, course: d.scope.course, from: d.scope.from, to: d.scope.to };
  const goReports = () => navigate('/admin/reports', { state: reportScope });

  const sxMode = loaded.err || sig.err ? 'error' : loaded.key !== reqKey || sig.key !== sigKey ? 'loading' : data.summary.total ? 'ready' : 'no-records';
  const signals = sxMode === 'ready' ? buildSignals(d.scope, data, sig.res, CATALOG.targets, d.vals.admScopeLabel, {
    records: goRecords, jobs: () => navigate('/admin/jobs'), events: () => navigate('/admin/events'), reports: goReports, tracer: () => navigate('/admin/tracer'),
  }) : [];
  const sxIdx = signals.findIndex((i) => i.id === sxSel);
  const sxStep = (n) => () => { if (signals.length) setSxSel(signals[((sxIdx < 0 ? 0 : sxIdx) + n + signals.length) % signals.length].id); };

  const kpi = buildKpiCards(d.admK, d.vals, data.units.data, {
    openDetail: setDet,
    openPopulation: () => setPopOpen(true),
    openForecast: () => setForecastOpen(true),
  });
  const v = {
    ...d.vals,
    ...kpi,
    ...detailVals(det),
    adDetClose: () => setDet(null),
    adDetGo: () => { setDet(null); goReports(); },
    popOpen,
    ...(popOpen ? buildPopulation(d.admK, data.byBatch.data, years, pop) : {}),
    popClose: () => setPopOpen(false),
    ...tipVals,
    admOnCollege: (e) => { setChartHover(null); setSel((s) => ({ ...s, college: e.target.value, course: 'all' })); },
    admOnCourse: (e) => setSel((s) => ({ ...s, course: e.target.value })),
    admOnFrom: onYear('from'),
    admOnTo: onYear('to'),
    rangeError,
    admOnStatus: (e) => setSel((s) => ({ ...s, status: e.target.value })),
    // Reset shows once any filter differs from the unfiltered scope.
    admFiltered: Object.keys(DEFAULT_SEL).some((k) => String(sel[k]) !== String(DEFAULT_SEL[k])),
    admOnReset: () => { setChartHover(null); setRangeError(''); setSel(DEFAULT_SEL); },
    // Outcomes chart (per-batch rows, unaffected by the batch range) and the overview panels.
    chart: buildOutcomeChart(data.byBatch.data, chartTab, chartHover, CATALOG.targets.employment, null),
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
    // Forecast dialog: projected from the per-batch rows already loaded (lib/forecast.js).
    forecastOpen,
    forecast: forecastOpen ? buildForecast(data.byBatch.data, CATALOG.targets) : null,
    closeForecast: () => setForecastOpen(false),
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
