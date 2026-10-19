import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import { ADMIN_YEARS, adminRequests, adminScope, buildAdminDash, buildKpis, emptyAdminData } from '../../lib/adminDash';
import { get } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/** Admin Dashboard — system-wide KPIs, employability, coverage, outcomes and recent registrations (GET /stats/*). */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [sel, setSel] = useState({ college: 'all', course: 'all', from: ADMIN_YEARS[0], to: ADMIN_YEARS[ADMIN_YEARS.length - 1], status: 'all' });
  const [hover, setHover] = useState(null);
  const [data, setData] = useState(emptyAdminData);

  const reqs = adminRequests(adminScope(sel));
  const reqKey = JSON.stringify(reqs);
  useEffect(() => {
    let live = true;
    const r = JSON.parse(reqKey);
    const keys = Object.keys(r);
    Promise.all(keys.map((k) => get(r[k])))
      .then((res) => { if (live) setData(Object.fromEntries(keys.map((k, i) => [k, res[i]]))); })
      .catch((err) => { if (live) toast(err.message, false); });
    return () => { live = false; };
  }, [reqKey, toast]);

  const d = buildAdminDash(sel, data, tipH);
  const goRecords = () => navigate('/admin/records');
  const reportScope = { college: d.scope.college, course: d.scope.course, from: d.scope.from, to: d.scope.to };

  const v = {
    ...d.vals,
    ...buildKpis(d.admK, hover, setHover, goRecords),
    ...tipVals,
    admOnCollege: (e) => setSel((s) => ({ ...s, college: e.target.value, course: 'all' })),
    admOnCourse: (e) => setSel((s) => ({ ...s, course: e.target.value })),
    admOnFrom: (e) => setSel((s) => ({ ...s, from: e.target.value })),
    admOnTo: (e) => setSel((s) => ({ ...s, to: e.target.value })),
    admOnStatus: (e) => setSel((s) => ({ ...s, status: e.target.value })),
    onStatusMove: donutMove(d.slices, 'ring'),
    goRecords,
    // Hand the dashboard's scope to Reports so the export matches what is on screen.
    goReports: () => navigate('/admin/reports', { state: reportScope }),
    goReportsIncl: () => navigate('/admin/reports', { state: { ...reportScope, repType: 'inclusion' } }),
    filterHover: { borderColor: '#CBD5E1' },
    exportHover: { background: '#0B3123' },
    rowHover: { background: '#FBFCFC' },
  };
  return <AdminDashboardView {...v} />;
}
