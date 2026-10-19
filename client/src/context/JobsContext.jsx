import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { dataUrlToBlob, del, list, patch, post, upload } from '../lib/api';

const JobsContext = createContext(null);

const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00+08:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }) : '');
function ago(iso, verb) {
  if (!iso) return '';
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
  if (h < 1) return `${verb} just now`;
  if (h < 24) return `${verb} ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${verb} ${d} day${d === 1 ? '' : 's'} ago`;
  if (d < 30) return `${verb} ${Math.round(d / 7)} week${Math.round(d / 7) === 1 ? '' : 's'} ago`;
  return `${verb} ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
/** Free-text "Employment type" from the composers -> the JOB_POSTING enum label. */
export const empType = (t) => {
  const s = String(t || '').toLowerCase();
  return /intern/.test(s) ? 'Internship' : /part/.test(s) ? 'Part-time' : /contract/.test(s) ? 'Contract' : /freelanc/.test(s) ? 'Freelance' : 'Full-time';
};

/** How an application was sent: the apply dialog's channel label <-> `saved_job.applied_via`. */
const VIA_CODE = { Email: 'email', 'careers page': 'website', Messenger: 'messenger' };
const VIA_LABEL = { email: 'Email', website: 'careers page', messenger: 'Messenger' };
/** API `applied` { via, at } -> what the job card and details modal show. */
const toApplication = (ap) => {
  if (!ap) return null;
  const via = VIA_LABEL[ap.via] || '';
  return { status: via ? `Application sent via ${via}` : 'Application submitted', at: ap.at, via };
};

/** API job -> the shape the job board, the details modal and the admin list render. */
function toJob(j) {
  return {
    id: j.id, title: j.title, company: j.company, location: j.location || 'Location TBA', type: j.type, badge: j.badge || (j.source === 'admin' ? 'Posted by Admin' : 'Alumni Referral'),
    badgeKind: /urgent/i.test(j.badge || '') ? 'urgent' : 'alumni', salary: j.salary || 'Salary undisclosed', salaryNote: j.salaryNote || '', posted: ago(j.publishedAt || j.createdAt, 'Posted'),
    publishedAt: j.publishedAt || j.createdAt, tags: j.tags || [], note: j.note || (j.source === 'alumni' && j.by ? `Referred by ${j.by}${j.batch ? ` · ${j.batch}` : ''}` : ''),
    desc: j.desc || '', deadline: fmtDate(j.deadline), deadlineIso: j.deadline, applyVia: j.applyVia || '', messenger: j.messenger || '', status: j.status, photo: j.photo, source: j.source,
    by: j.by, batch: j.batch, email: j.email || '', when: ago(j.createdAt, 'Submitted'), approvalStatus: j.approvalStatus, saved: j.saved, applied: toApplication(j.applied), mine: j.mine,
  };
}

/**
 * Job board shared by the Alumni and Admin portals: approved listings, admin postings, edits, deactivation,
 * the alumni-submission approval queue, and the alumnus' saved jobs / applications — all through /jobs.
 */
export function JobsProvider({ children }) {
  const { user, role } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [queue, setQueue] = useState([]);
  const [mine, setMine] = useState([]);

  const reload = useCallback(async () => {
    if (!user || (role !== 'admin' && role !== 'alumni')) { setJobs([]); setQueue([]); setMine([]); return; }
    if (role === 'admin') {
      const [all, q] = await Promise.all([list('/jobs', { view: 'all' }), list('/jobs', { view: 'queue' })]);
      setJobs(all.map(toJob)); setQueue(q.map(toJob));
    } else {
      const [board, own] = await Promise.all([list('/jobs'), list('/jobs', { view: 'mine' })]);
      setJobs(board.map(toJob)); setMine(own.map(toJob));
    }
  }, [user, role]);
  useEffect(() => { reload().catch(() => {}); }, [reload]);

  const replace = (j) => setJobs((all) => all.map((x) => (x.id === j.id ? toJob(j) : x)));
  const attachPhoto = async (id, photo) => (photo && String(photo).startsWith('data:') ? upload(`/jobs/${id}/photo`, 'photo', dataUrlToBlob(photo), 'company.jpg') : null);
  const body = (job) => ({
    title: job.title, company: job.company, location: job.location, type: empType(job.type), salary: job.salary, salaryNote: job.salaryNote,
    tags: job.tags, desc: job.desc, applyVia: job.applyVia || '', messenger: job.messenger || '', deadline: job.deadline, badge: job.badge, note: job.note,
  });

  /** Admin posting: live at once. */
  const postJob = useCallback(async (job) => {
    const j = await post('/jobs', body(job));
    await attachPhoto(j.id, job.photo);
    await reload();
    return j;
  }, [reload]);
  /** Alumnus posting: waits in the admin approval queue (admins are notified). */
  const submitForReview = useCallback(async (job) => {
    const j = await post('/jobs', body(job));
    await attachPhoto(j.id, job.photo);
    await reload();
    return j;
  }, [reload]);
  const updateJob = useCallback(async (id, p) => {
    const j = await patch(`/jobs/${id}`, body(p));
    const withPhoto = await attachPhoto(id, p.photo);
    replace(withPhoto || j);
  }, []);
  const deleteJob = useCallback(async (id) => { await del(`/jobs/${id}`); setJobs((l) => l.filter((x) => x.id !== id)); }, []);
  const restoreJob = useCallback(async (id) => { await post(`/jobs/${id}/restore`); await reload(); }, [reload]);
  const setJobStatus = useCallback(async (id, status) => replace(await post(`/jobs/${id}/${status === 'active' ? 'activate' : 'deactivate'}`)), []);
  const approveQueued = useCallback(async (q) => { await post(`/jobs/${q.id}/approve`); await reload(); }, [reload]);
  const rejectQueued = useCallback(async (q, reason) => { await post(`/jobs/${q.id}/reject`, reason ? { reason } : {}); setQueue((l) => l.filter((x) => x.id !== q.id)); }, []);
  const toggleSave = useCallback(async (id) => {
    const cur = jobs.find((x) => x.id === id);
    replace(cur && cur.saved ? await del(`/jobs/${id}/save`) : await post(`/jobs/${id}/save`));
  }, [jobs]);
  /** Apply (records the platform it was sent through: "Messenger", "Email" or "careers page") or withdraw. */
  const toggleApply = useCallback(async (id, via) => {
    const cur = jobs.find((x) => x.id === id);
    replace(cur && cur.applied ? await del(`/jobs/${id}/apply`) : await post(`/jobs/${id}/apply`, { via: VIA_CODE[via] || via }));
  }, [jobs]);

  const value = useMemo(() => {
    const activeJobs = jobs.filter((j) => j.status === 'active');
    const savedJobs = Object.fromEntries(jobs.filter((j) => j.saved).map((j) => [j.id, true]));
    const applied = Object.fromEntries(jobs.filter((j) => j.applied).map((j) => [j.id, j.applied]));
    return {
      jobs, activeJobs, queue, mine, savedJobs, applied, reload,
      postJob, updateJob, deleteJob, restoreJob, setJobStatus, approveQueued, rejectQueued, submitForReview, toggleSave, toggleApply,
    };
  }, [jobs, queue, mine, reload, postJob, updateJob, deleteJob, restoreJob, setJobStatus, approveQueued, rejectQueued, submitForReview, toggleSave, toggleApply]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export const useJobs = () => useContext(JobsContext);
