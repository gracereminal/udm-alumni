import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import {
  ADMIN_YEARS, adminRequests, adminScope, buildAdminDash, buildKpiCards, buildPopulation, detailVals, emptyAdminData, populationRequests,
} from '../../lib/adminDash';
import { get } from '../../lib/api';
import { buildForecast } from '../../lib/forecast';
import { RANGE_ERROR, pickYear } from '../../lib/batchRange';
import { CATALOG } from '../../data/colleges';
import { useToast } from '../../context/ToastContext';

/** Fetches every path of `reqs` (an object of API paths) and returns the responses under the same keys. */
const fetchAll = (reqs) => {
  const keys = Object.keys(reqs);
  return Promise.all(keys.map((k) => get(reqs[k]))).then((res) => Object.fromEntries(keys.map((k, i) => [k, res[i]])));
};

/** Admin Dashboard — system-wide KPIs, employability, coverage, outcomes and inclusion (GET /stats/*), on one screen. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [sel, setSel] = useState({ college: 'all', course: 'all', from: ADMIN_YEARS[0], to: ADMIN_YEARS[ADMIN_YEARS.length - 1], status: 'all' });
  const [hover, setHover] = useState(null);
  const [data, setData] = useState(emptyAdminData);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [det, setDet] = useState(null);
  const [popOpen, setPopOpen] = useState(false);
  const [pop, setPop] = useState(null);
  const [rangeError, setRangeError] = useState('');
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

  const d = buildAdminDash(sel, data, tipH);
  const years = d.vals.batchBars.map((b) => Number(b.label));

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

  const v = {
    ...d.vals,
    ...buildKpiCards(d.admK, d.vals, data.units.data, {
      hoverId: hover, setHover, goRecords,
      openDetail: setDet,
      openPopulation: () => setPopOpen(true),
      openForecast: () => setForecastOpen(true),
    }),
    ...detailVals(det),
    adDetClose: () => setDet(null),
    adDetGo: () => { setDet(null); goReports(); },
    popOpen,
    ...(popOpen ? buildPopulation(d.admK, data.byBatch.data, years, pop) : {}),
    popClose: () => setPopOpen(false),
    ...tipVals,
    admOnCollege: (e) => setSel((s) => ({ ...s, college: e.target.value, course: 'all' })),
    admOnCourse: (e) => setSel((s) => ({ ...s, course: e.target.value })),
    admOnFrom: onYear('from'),
    admOnTo: onYear('to'),
    rangeError,
    admOnStatus: (e) => setSel((s) => ({ ...s, status: e.target.value })),
    onStatusMove: donutMove(d.slices, 'ring'),
    // Hand the dashboard's scope to Reports so the export matches what is on screen.
    goReports,
    goReportsIncl: () => navigate('/admin/reports', { state: { ...reportScope, repType: 'inclusion' } }),
    // Forecast dialog: projected from the per-batch rows already loaded (lib/forecast.js).
    forecastOpen,
    forecast: forecastOpen ? buildForecast(data.byBatch.data, CATALOG.targets) : null,
    closeForecast: () => setForecastOpen(false),
    exportHover: { background: '#0B3123' },
  };
  return <AdminDashboardView {...v} />;
}
