import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { JOBS_DATA, JOB_QUEUE, jobKey } from '../data/jobs';

const STORE = 'udm.jobs.v1';
const JobsContext = createContext(null);

const INITIAL_SAVED = { 'job-brightline': true, 'job-formwell': true, 'job-northpoint': true };
const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
};

/**
 * Job board data shared by the Alumni, College and Admin portals:
 * seeded listings, admin/alumni postings, edits, deactivation, the alumni-submission approval queue,
 * and the alumnus' saved jobs / applications.
 */
export function JobsProvider({ children }) {
  const saved = useMemo(load, []);
  const [posted, setPosted] = useState(saved.posted || []);
  const [edits, setEdits] = useState(saved.edits || {});
  const [removed, setRemoved] = useState(saved.removed || {});
  const [queue, setQueue] = useState(saved.queue || JOB_QUEUE);
  const [savedJobs, setSavedJobs] = useState(saved.savedJobs || INITIAL_SAVED);
  const [applied, setApplied] = useState(saved.applied || {});

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ posted, edits, removed, queue, savedJobs, applied })); } catch { /* photos may exceed quota */ }
  }, [posted, edits, removed, queue, savedJobs, applied]);

  const jobs = useMemo(
    () => posted.concat(JOBS_DATA).filter((j) => !removed[jobKey(j)]).map((j) => ({ status: 'active', ...(edits[jobKey(j)] ? { ...j, ...edits[jobKey(j)] } : j) })),
    [posted, edits, removed],
  );
  const activeJobs = useMemo(() => jobs.filter((j) => j.status === 'active'), [jobs]);

  const newId = () => `job-${Date.now()}-${Math.round(Math.random() * 1e4)}`;

  const postJob = useCallback((job, source = 'alumni') => {
    const nj = { id: newId(), status: 'active', source, ...job };
    setPosted((p) => [nj, ...p]);
    return nj;
  }, []);
  const updateJob = useCallback((key, patch) => setEdits((e) => ({ ...e, [key]: { ...(e[key] || {}), ...patch } })), []);
  const deleteJob = useCallback((key) => setRemoved((r) => ({ ...r, [key]: true })), []);
  const restoreJob = useCallback((key) => setRemoved((r) => { const n = { ...r }; delete n[key]; return n; }), []);
  const setJobStatus = useCallback((key, status) => updateJob(key, { status }), [updateJob]);

  const approveQueued = useCallback((q) => {
    const nj = {
      title: q.title, company: q.company || 'Alumni submission', location: q.location || 'Manila · On-site', type: q.type || 'Full-time',
      badge: 'Alumni Referral', badgeKind: 'alumni', salary: q.salary || 'Salary undisclosed', salaryNote: q.salaryNote || 'as submitted',
      posted: 'Approved just now', tags: q.tags || [], note: `Referred by ${q.by} · ${q.batch}`, photo: q.photo, desc: q.desc, deadline: q.deadline, applyVia: q.applyVia,
    };
    postJob(nj, 'alumni');
    setQueue((x) => x.filter((r) => r.title !== q.title));
  }, [postJob]);
  /** An alumnus submits a posting; it waits in the admin approval queue. */
  const submitForReview = useCallback((q) => setQueue((x) => [q, ...x]), []);
  const rejectQueued = useCallback((title) => setQueue((x) => x.filter((r) => r.title !== title)), []);

  const toggleSave = useCallback((key) => setSavedJobs((s) => ({ ...s, [key]: !s[key] })), []);
  /** Apply (status "Submitted") or withdraw an application. */
  const toggleApply = useCallback((key) => setApplied((a) => {
    if (a[key]) { const n = { ...a }; delete n[key]; return n; }
    return { ...a, [key]: { status: 'Application submitted', at: new Date().toISOString() } };
  }), []);

  const value = useMemo(() => ({
    jobs, activeJobs, posted, queue, savedJobs, applied,
    postJob, updateJob, deleteJob, restoreJob, setJobStatus, approveQueued, rejectQueued, submitForReview, toggleSave, toggleApply,
  }), [jobs, activeJobs, posted, queue, savedJobs, applied, postJob, updateJob, deleteJob, restoreJob, setJobStatus, approveQueued, rejectQueued, submitForReview, toggleSave, toggleApply]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export const useJobs = () => useContext(JobsContext);

