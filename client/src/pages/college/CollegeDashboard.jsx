import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollegeDashboardView from '../../views/CollegeDashboardView';
import useChartTip from '../../hooks/useChartTip';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { buildCollegeDash, deptRequests, emptyDeptData } from '../../lib/collegeDash';
import { get, post } from '../../lib/api';

const PAGES = {
  dashboard: { title: 'College Dashboard', kpis: true, insights: true, outreach: true },
  outreach: { title: 'Outreach', kpis: false, insights: false, outreach: true },
};

/**
 * College / Department dashboard, scoped by the API to the signed-in user's college.
 * `section` selects the page: the full dashboard or Outreach. "Contact" sends a real email (POST /outreach).
 */
export default function CollegeDashboard({ section = 'dashboard' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [course, setCourse] = useState('all');
  const [batch, setBatch] = useState('all');
  const [hover, setHover] = useState(null);
  const [data, setData] = useState(emptyDeptData);
  const [contacting, setContacting] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const page = PAGES[section] || PAGES.dashboard;

  const reqKey = JSON.stringify(deptRequests({ course, batch }));
  useEffect(() => {
    let live = true;
    const r = JSON.parse(reqKey);
    const keys = Object.keys(r);
    Promise.all(keys.map((k) => get(r[k])))
      .then((res) => { if (live) setData(Object.fromEntries(keys.map((k, i) => [k, res[i]]))); })
      .catch((err) => { if (live) toast(err.message, false); });
    return () => { live = false; };
  }, [reqKey, reloadKey, toast]);

  // The toast shows only after the API confirms the email was sent; a failed send records nothing.
  const contact = useCallback(async (row) => {
    setContacting(row.alumni_id);
    try {
      await post('/outreach', { alumniId: row.alumni_id, method: 'email', template: 'survey_followup' });
      toast(`Outreach email sent to ${row.name}.`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast(err.message, false);
    } finally {
      setContacting(null);
    }
  }, [toast]);

  const { vals, slices } = buildCollegeDash({ course, batch }, data, {
    user, contact, contacting, setHover, hoverId: hover, tipH,
    setCourse: (c) => { setCourse(c); setHover(null); },
    setBatch,
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
