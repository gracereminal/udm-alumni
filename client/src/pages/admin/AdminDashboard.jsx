import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import useNarrow from '../../hooks/useNarrow';
import {
  ADMIN_YEARS, adminRequests, adminScope, buildAdminDash, buildKpiCards, buildPopulation, detailVals, emptyAdminData, populationRequests,
} from '../../lib/adminDash';
import { ACTIVE_DAYS, activeColleges, buildOutcomeChart, engagementTrend, recentRegistrations, upcomingEvents } from '../../lib/adminOverview';
import { get } from '../../lib/api';
import { buildForecast } from '../../lib/forecast';
import { RANGE_ERROR, pickYear } from '../../lib/batchRange';
import { CATALOG } from '../../data/colleges';
import { useToast } from '../../context/ToastContext';
import { useEvents } from '../../context/EventsContext';

/** Fetches every path of `reqs` (an object of API paths) and returns the responses under the same keys. */
const fetchAll = (reqs) => {
  const keys = Object.keys(reqs);
  return Promise.all(keys.map((k) => get(reqs[k]))).then((res) => Object.fromEntries(keys.map((k, i) => [k, res[i]])));
};

/** Matches the desktop grid layout in prototype.css (the outcomes chart is drawn wider and shorter there). */
const WIDE = '(min-width:1181px) and (min-height:620px)';
function useWide() {
  const mq = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(WIDE).matches;
  const [wide, setWide] = useState(mq);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const m = window.matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

/** [size, ref]: the attached element's content size ({ w, h }, whole pixels), kept current by a ResizeObserver. */
function useBoxSize() {
  const [size, setSize] = useState(null);
  const obs = useRef(null);
  const ref = useCallback((el) => {
    if (obs.current) { obs.current.disconnect(); obs.current = null; }
    if (!el || typeof ResizeObserver === 'undefined') return;
    obs.current = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    });
    obs.current.observe(el);
  }, []);
  return [size, ref];
}

/** Admin Dashboard —system-wide KPIs, outcomes by batch, registrations, engagement and events (GET /stats/*), on one screen. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { events } = useEvents();
  const narrow = useNarrow();
  const wide = useWide() && !narrow;
  const [chartBox, chartBoxRef] = useBoxSize();
  const { tipH, vals: tipVals } = useChartTip();
  const [sel, setSel] = useState({ college: 'all', course: 'all', from: ADMIN_YEARS[0], to: ADMIN_YEARS[ADMIN_YEARS.length - 1], status: 'all' });
  const [data, setData] = useState(emptyAdminData);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [det, setDet] = useState(null);
  const [popOpen, setPopOpen] = useState(false);
  const [pop, setPop] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const [chartTab, setChartTab] = useState('rate');
  const [chartHover, setChartHover] = useState(null);
  const onYear = (key) => (e) => {
    const next = pickYear(sel, key, e.target.value);
    setRangeError(next ? '' : RANGE_ERROR);
    if (next) setSel(next);
  };

  const reqs = adminRequests(adminScope(sel));
  const reqKey = JSON.stringify(reqs);
  useEffect(() => {
    let live = true;
    fetchAll(JSON.parse(reqKey))
      .then((res) => { if (live) setData(res); })
      .catch((err) => { if (live) toast(err.message, false); });
    return () => { live = false; };
  }, [reqKey, toast]);

  // College accounts (GET /users?role=dept) for "Active colleges"; loaded once, apart from the scoped statistics,
  // so the rest of the dashboard still loads if this list fails.
  const [deptUsers, setDeptUsers] = useState([]);
  useEffect(() => {
    let live = true;
    get('/users?role=dept').then((res) => { if (live) setDeptUsers(res.data || []); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const d = buildAdminDash(sel, data, tipH);
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
    // Outcomes chart (per-batch rows, unaffected by the batch range) and the overview panels.
    // On the desktop layout the chart is drawn at the size of its box, so the page fits the window.
    chart: buildOutcomeChart(data.byBatch.data, chartTab, chartHover, CATALOG.targets.employment, wide ? chartBox : null),
    chartBoxRef,
    chartTab,
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
  };
  return <AdminDashboardView {...v} />;
}
