import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import { adminRequests, adminScope, buildAdminDash, buildKpis, emptyAdminData } from '../../lib/adminDash';
import { get } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

/** Admin Dashboard — system-wide KPIs, employability, coverage, outcomes and recent registrations (GET /stats/*). */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [sel, setSel] = useState({ college: 'all', course: 'all', batch: 'all', status: 'all' });
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

  const v = {
    ...d.vals,
    ...buildKpis(d.admK, hover, setHover, goRecords),
    ...tipVals,
    admOnCollege: (e) => setSel((s) => ({ ...s, college: e.target.value, course: 'all' })),
    admOnCourse: (e) => setSel((s) => ({ ...s, course: e.target.value })),
    admOnBatch: (e) => setSel((s) => ({ ...s, batch: e.target.value })),
    admOnStatus: (e) => setSel((s) => ({ ...s, status: e.target.value })),
    onStatusMove: donutMove(d.slices, 'ring'),
    goRecords,
    goReports: () => navigate('/admin/reports'),
    goReportsIncl: () => navigate('/admin/reports', { state: { repType: 'inclusion' } }),
    filterHover: { borderColor: '#CBD5E1' },
    exportHover: { background: '#0B3123' },
    rowHover: { background: '#FBFCFC' },
  };
  return <AdminDashboardView {...v} />;
}
