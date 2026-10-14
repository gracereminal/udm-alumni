import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollegeDashboardView from '../../views/CollegeDashboardView';
import useChartTip from '../../hooks/useChartTip';
import { useRecords } from '../../context/RecordsContext';
import { useToast } from '../../context/ToastContext';
import { buildCollegeDash } from '../../lib/collegeDash';

const PAGES = {
  dashboard: { title: 'College Dashboard', kpis: true, insights: true, outreach: true },
  outreach: { title: 'Outreach', kpis: false, insights: false, outreach: true },
};

/**
 * College / Department dashboard, scoped to the dean's own college (College of Computing Studies).
 * `section` selects the page: the full dashboard or Outreach.
 */
export default function CollegeDashboard({ section = 'dashboard' }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { regRecord } = useRecords();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [course, setCourse] = useState('all');
  const [batch, setBatch] = useState('all');
  const [contacted, setContacted] = useState({});
  const [hover, setHover] = useState(null);
  const page = PAGES[section] || PAGES.dashboard;

  const { vals, slices } = buildCollegeDash({ course, batch, contacted }, regRecord, {
    setCourse: (c) => { setCourse(c); setHover(null); },
    setBatch,
    setHover,
    hoverId: hover,
    tipH,
    toggleContact: (id, name) => setContacted((s) => {
      const on = !s[id];
      toast(on ? `Outreach email sent to ${name}.` : `Contact mark removed for ${name}.`);
      return { ...s, [id]: on };
    }),
  });
  const v = {
    ...vals,
    ...tipVals,
    pageTitle: page.title,
    showKpis: page.kpis,
    showInsights: page.insights,
    showOutreach: page.outreach,
    onDeptCourseChange: (e) => { setCourse(e.target.value); setHover(null); },
    onDeptBatchChange: (e) => setBatch(e.target.value),
    onDeptStatusMove: donutMove(slices, 'edge'),
    goRecords: () => navigate('/college/records'),
    goReports: () => navigate('/college/reports'),
    exportHover: { background: '#0B3123' },
    rowHover: { background: '#FBFCFC' },
  };
  return <CollegeDashboardView {...v} />;
}
