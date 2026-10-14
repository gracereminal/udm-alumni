import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboardView from '../../views/AdminDashboardView';
import useChartTip from '../../hooks/useChartTip';
import { useRecords } from '../../context/RecordsContext';
import { buildAdminDash, buildKpis } from '../../lib/adminDash';

/** Admin Dashboard — system-wide KPIs, employability, coverage, outcomes and recent registrations. */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { regRecord, statusOv } = useRecords();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [sel, setSel] = useState({ college: 'all', course: 'all', batch: 'all', status: 'all' });
  const [hover, setHover] = useState(null);

  const nrSt = regRecord ? ((statusOv[regRecord.sid] || {}).status || 'pending') : null;
  const d = buildAdminDash(sel, regRecord, nrSt, tipH);
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
