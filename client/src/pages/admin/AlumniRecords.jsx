import { useNavigate } from 'react-router-dom';
import RecordsView from '../../views/RecordsView';
import ReportToastView from '../../views/ReportToastView';
import useRecordsPage from '../../hooks/useRecordsPage';
import { ROLE_BASE } from '../../data/navigation';

/** Alumni Records (Admin: all records · College: only the dean's college programs). */
export default function AlumniRecords({ role = 'admin' }) {
  const navigate = useNavigate();
  const { vals, toastOn, importRef, onImport } = useRecordsPage(role);
  const v = {
    ...vals,
    goReports: () => navigate(`${ROLE_BASE[role]}/reports`),
    exportHover: { background: '#0B3123' },
    filterHover: { borderColor: '#CBD5E1' },
    rowHover: { background: '#FBFCFC' },
  };
  return (
    <>
      <RecordsView {...v} />
      <input ref={importRef} type="file" accept=".csv,text/csv" onChange={onImport} style={{ display: 'none' }} />
      {toastOn ? <ReportToastView {...v} /> : null}
    </>
  );
}

