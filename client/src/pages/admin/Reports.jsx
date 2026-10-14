import { useNavigate } from 'react-router-dom';
import ReportsView from '../../views/ReportsView';
import ReportToastView from '../../views/ReportToastView';
import useReportsPage from '../../hooks/useReportsPage';
import { ROLE_BASE } from '../../data/navigation';

/** Reports: select a template, scope it by college / program, preview and export (Admin: all colleges · College: own college). */
export default function Reports({ role = 'admin' }) {
  const navigate = useNavigate();
  const { vals, toastOn } = useReportsPage(role);
  const v = {
    ...vals,
    goRecords: () => navigate(`${ROLE_BASE[role]}/records`),
    exportHover: { background: '#0B3123' },
    filterHover: { borderColor: '#CBD5E1' },
    rowHover: { background: '#FBFCFC' },
  };
  return (
    <>
      <ReportsView {...v} />
      {toastOn ? <ReportToastView {...v} /> : null}
    </>
  );
}
