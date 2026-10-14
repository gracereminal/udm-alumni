import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BASE_RECORDS, CCS_COLLEGE, CCS_TOTALS, FULL_TOTALS } from '../data/records';
import { useProfile } from './ProfileContext';
import { progNorm } from '../lib/colleges';
import { courseCode, fmtShortDate, nowLabel } from '../lib/format';

const STORE = 'udm.records.v1';
const RecordsContext = createContext(null);

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
};

export const recInScope = (r) => r.college === CCS_COLLEGE;

/**
 * Alumni Records data shared by the Admin and College portals (and the staff-side search).
 * Includes the signed-in demo alumnus' own record, which always reflects what they saved in Profile / Survey.
 */
export function RecordsProvider({ children }) {
  const profile = useProfile();
  const saved = useMemo(load, []);
  const [statusOv, setStatusOv] = useState(saved.statusOv || {});
  const [added, setAdded] = useState(saved.added || []);
  const [deleted, setDeleted] = useState(saved.deleted || {});
  const [log, setLog] = useState(saved.log || {});

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ statusOv, added, deleted, log })); } catch { /* ignore */ }
  }, [statusOv, added, deleted, log]);

  const { a, registered, regAt, profileSavedAt, surveySubmitted, alumniName } = profile;

  /** Live record built from the alumnus' own registration (+ survey). */
  const regRecord = useMemo(() => {
    if (!registered) return null;
    const yr = (String(a.year_graduated || '').match(/\d{4}/) || [])[0];
    const course = a.course || a.course_other || '';
    const emp = a.ever_employed === 'Yes' ? (a.job_status === 'Self-employed' ? 'Self-Employed / Freelancer' : 'Employed Full-time')
      : a.ever_employed === 'No' ? 'Not yet employed' : 'Survey not yet answered';
    return {
      sid: `AM-${yr || '2026'}-NEW01`, name: alumniName, program: course ? courseCode(course) : '—',
      course, college: a.college || '', batch: yr ? Number(yr) : '—', employment: emp,
      company: a.employer || '—', jobTitle: a.job_name || '', email: a.email || '', mobile: a.mobile || '', address: a.present_address || '', isSelf: true,
      source: profileSavedAt ? 'Profile update' : surveySubmitted ? 'Survey form' : 'Self-registration',
      updated: fmtShortDate(profileSavedAt || regAt || Date.now()), status: 'pending',
      note: surveySubmitted ? 'New registrant — survey submitted, awaiting Alumni Office verification.' : 'New self-registration — Membership ID and survey still to be confirmed.',
      isNew: true,
    };
  }, [a, registered, regAt, profileSavedAt, surveySubmitted, alumniName]);

  /** The demo alumnus' record, reflecting what they last saved in Edit Profile. */
  const selfRecord = useMemo(() => {
    const yr = (String(a.year_graduated || '').match(/\d{4}/) || [])[0];
    const course = a.course || a.course_other || '';
    const emp = a.ever_employed === 'Yes' ? (a.job_status === 'Self-employed' ? 'Self-Employed / Freelancer' : 'Employed Full-time')
      : a.ever_employed === 'No' ? 'Not yet employed' : 'Employed Full-time';
    return {
      sid: 'AM-2024-00567', name: alumniName, program: course ? courseCode(course) : 'BSIT',
      course, college: a.college || '', batch: yr ? Number(yr) : 2024, employment: emp,
      company: a.ever_employed === 'No' ? '—' : a.employer || 'Maya Philippines',
      jobTitle: a.job_name || '', email: a.email || 'maria.delacruz@udmalumni.edu', mobile: a.mobile || '', address: a.present_address || '',
      source: profileSavedAt ? 'Profile update' : 'Survey form',
      updated: profileSavedAt ? fmtShortDate(profileSavedAt) : 'Sep 16, 2026', status: 'pending', isSelf: true,
      note: profileSavedAt ? '' : 'Survey items 9–12 (industry, income bracket) left blank — request completion from alumnus.',
    };
  }, [a, profileSavedAt, alumniName]);

  const rowsAll = useMemo(
    () => {
      const ov = (r) => (statusOv[r.sid] ? { ...r, ...statusOv[r.sid] } : r);
      // Seed records predate the program catalog, so only they are normalised onto catalog courses.
      return [...added, ...(regRecord ? [regRecord] : [selfRecord])].map(ov).concat(BASE_RECORDS.map((r) => progNorm(ov(r))));
    },
    [added, regRecord, selfRecord, statusOv],
  );
  const rows = useMemo(() => rowsAll.filter((r) => !deleted[r.sid]), [rowsAll, deleted]);

  const totals = useCallback((scoped) => {
    const base = { ...(scoped ? CCS_TOTALS : FULL_TOTALS) };
    if (regRecord && (!scoped || recInScope(regRecord))) { const s = (statusOv[regRecord.sid] || {}).status || 'pending'; base[s] += 1; base.all += 1; }
    rowsAll.forEach((r) => {
      if (scoped && !recInScope(r)) return;
      const isNew = added.some((x) => x.sid === r.sid);
      if (isNew && !deleted[r.sid]) { base[r.status] += 1; base.all += 1; }
      if (!isNew && deleted[r.sid]) { base[r.status] -= 1; base.all -= 1; }
    });
    return base;
  }, [regRecord, statusOv, rowsAll, added, deleted]);

  const patchRecord = useCallback((sids, patch) => {
    const ids = Array.isArray(sids) ? sids : [sids];
    setStatusOv((ov) => { const n = { ...ov }; ids.forEach((id) => { n[id] = { ...(n[id] || {}), ...patch }; }); return n; });
  }, []);
  const addLog = useCallback((sid, what, who = 'You · Alumni Office') => setLog((l) => ({ ...l, [sid]: [{ when: nowLabel(), who, what }, ...(l[sid] || [])] })), []);
  const addRecord = useCallback((rec) => setAdded((x) => [rec, ...x]), []);
  const removeRecords = useCallback((ids) => setDeleted((d) => { const n = { ...d }; ids.forEach((id) => { n[id] = true; }); return n; }), []);
  const restoreRecords = useCallback((ids) => setDeleted((d) => { const n = { ...d }; ids.forEach((id) => { delete n[id]; }); return n; }), []);

  const recEmail = useCallback((r) => {
    if (r.email) return r.email;
    const s = r.name.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/);
    return `${s[0]}.${s[s.length - 1]}@gmail.com`;
  }, []);

  const value = useMemo(() => ({
    rows, rowsAll, regRecord, totals, added, log, statusOv, patchRecord, addLog, addRecord, removeRecords, restoreRecords, recEmail, inScope: recInScope,
  }), [rows, rowsAll, regRecord, totals, added, log, statusOv, patchRecord, addLog, addRecord, removeRecords, restoreRecords, recEmail]);
  return <RecordsContext.Provider value={value}>{children}</RecordsContext.Provider>;
}

export const useRecords = () => useContext(RecordsContext);
