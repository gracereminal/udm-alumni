import { useRef, useState } from 'react';
import AdminPostsView from '../../views/AdminPostsView';
import Modal, { modalBtn } from '../../components/Modal';
import useConfirmToast from '../../hooks/useConfirmToast';
import { useJobs } from '../../context/JobsContext';
import { STRIPE, jobKey, queueKey } from '../../data/jobs';
import { initials } from '../../lib/format';
import { readImage } from '../../lib/files';
import { applyUrl, messengerUrl } from '../../lib/contact';

const EMPTY = { title: '', company: '', location: '', type: '', salary: '', applyVia: '', messenger: '', tags: '', desc: '' };

/** Admin · Jobs management: post, edit, deactivate/activate, delete listings and review alumni submissions. */
export default function AdminJobs() {
  const jobsCtx = useJobs();
  const ct = useConfirmToast();
  const [draft, setDraft] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [editKey, setEditKey] = useState(null);
  const [error, setError] = useState('');
  const [jqSel, setJqSel] = useState(null);
  const [preview, setPreview] = useState(false);
  const formRef = useRef(null);
  const photoRef = useRef(null);

  const jobs = jobsCtx.jobs;
  const live = jobs.filter((j) => j.status === 'active');
  const set = (k) => (e) => { const val = e.target.value; setDraft((d) => ({ ...d, [k]: val })); setError(''); };
  const field = (key, label, placeholder, span) => ({ label, placeholder, span: span || 'auto', value: draft[key] || '', onChange: set(key) });

  const focusForm = () => {
    const el = formRef.current;
    if (!el) return;
    const f = el.querySelector('input[type="text"]');
    if (f) f.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (el.animate) el.animate([{ boxShadow: '0 0 0 3px rgba(240,196,40,.7)' }, { boxShadow: '0 0 0 0 rgba(240,196,40,0)' }], { duration: 1100 });
  };
  const clear = () => { setDraft(EMPTY); setPhoto(null); setPhotoName(''); setEditKey(null); setError(''); if (photoRef.current) photoRef.current.value = ''; };

  const publish = () => {
    if (!draft.title.trim()) { setError('Enter a job title.'); return; }
    if (!draft.company.trim()) { setError('Enter the company name.'); return; }
    if (draft.applyVia.trim() && !applyUrl(draft.applyVia)) { setError('Enter an email address or a website for applications.'); return; }
    if (draft.messenger.trim() && !messengerUrl(draft.messenger)) { setError('Enter a Facebook username or profile link for Messenger.'); return; }
    const data = {
      title: draft.title.trim(), company: draft.company.trim(), location: draft.location.trim() || 'Location TBA', type: draft.type.trim() || 'Full-time',
      salary: draft.salary.trim() || 'Salary undisclosed', tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean), desc: draft.desc.trim() || 'No description provided.', photo,
      applyVia: draft.applyVia.trim() || undefined,
      messenger: draft.messenger.trim() || undefined,
    };
    const work = editKey
      ? jobsCtx.updateJob(editKey, data).then(() => `Saved changes to “${data.title}”.`)
      : jobsCtx.postJob({ ...data, badge: 'Posted by Admin', salaryNote: 'as posted', note: '' }).then(() => `“${data.title}” is live on the Job Board.`);
    work.then((msg) => { ct.toast(msg); clear(); }, (err) => setError(err.message || 'The posting could not be saved. Please try again.'));
  };

  const edit = (j) => {
    setEditKey(jobKey(j));
    setDraft({ title: j.title, company: j.company, location: j.location, type: j.type, salary: j.salary, applyVia: j.applyVia || '', messenger: j.messenger || '', tags: (j.tags || []).join(', '), desc: j.desc && j.desc !== 'No description provided.' ? j.desc : '' });
    setPhoto(j.photo || null); setPhotoName(''); setError('');
    setTimeout(focusForm, 30);
  };
  const toggleStatus = (j) => {
    const key = jobKey(j);
    const next = j.status === 'active' ? 'inactive' : 'active';
    jobsCtx.setJobStatus(key, next).then(
      () => ct.toast(next === 'active' ? `“${j.title}” is live again.` : `“${j.title}” was deactivated and hidden from alumni.`),
      (err) => ct.toast(err.message || 'Couldn’t update the posting. Please try again.', false),
    );
  };
  const remove = (j) => ct.askConfirm({
    title: 'Delete this job posting?', body: 'It is removed from the Job Board for every alumnus. Applications already submitted are kept in the alumnus’ history.', detail: `${j.title} · ${j.company}`,
    cancelLabel: 'Keep posting', okLabel: 'Delete posting', busyLabel: 'Deleting…', danger: true, async: true,
    onOk: () => ct.runAsync(async () => { await jobsCtx.deleteJob(jobKey(j)); if (editKey === jobKey(j)) clear(); ct.toast('Job posting deleted.'); }, 'Couldn’t delete the posting. Please try again.'),
  });

  const queue = jobsCtx.queue;
  const q = queue.find((x) => queueKey(x) === jqSel);
  const closeJq = () => setJqSel(null);
  const decide = (entry, action, okMsg) => {
    if (!entry) { closeJq(); return; }
    action(entry).then(() => { ct.toast(okMsg); closeJq(); }, (err) => ct.toast(err.message || 'Couldn’t update the submission. Please try again.', false));
  };

  const v = {
    ...ct.vals,
    tabJobs: true, tabEvents: false, adminPostsLabel: 'Admin Jobs',
    postsSubtitle: 'Post openings directly and approve job listings submitted by alumni',
    postsPreviewGo: () => setPreview(true),
    addJob: focusForm,
    jobFormRef: formRef, jobPhotoRef: photoRef,
    jobLiveCount: live.length,
    jobPendingCount: queue.length,
    jobFormHead: editKey ? 'Edit job posting' : 'Post a job opening',
    jobSubmitLabel: editKey ? 'Save changes' : 'Publish job',
    jobClearLabel: editKey ? 'Cancel editing' : 'Clear draft',
    jobFormError: error,
    inputFocus: { borderColor: '#0F3D2E' }, rowHover: { background: '#FBFCFC' }, exportHover: { background: '#0B3123' },
    jobFormFields: [
      field('title', 'Job title', 'e.g. Junior Backend Developer', '1 / -1'), field('company', 'Company', 'e.g. Brightline Tech'), field('location', 'Location & setup', 'e.g. Manila · Hybrid'),
      field('type', 'Employment type', 'e.g. Full-time'), field('salary', 'Salary range', 'e.g. ₱35,000 - ₱48,000'),
      field('applyVia', 'How to apply', 'e.g. careers@company.com or company.com/careers'),
      field('messenger', 'Facebook / Messenger', 'Page username or profile link'),
    ],
    jobDraftTags: draft.tags, onJobDraftTags: set('tags'), jobDraftDesc: draft.desc, onJobDraftDesc: set('desc'),
    jobDraftPhotoCss: photo ? `url("${photo}") center/cover no-repeat` : STRIPE, jobDraftNoPhoto: !photo, jobDraftHasPhoto: !!photo, jobDraftPhotoName: photoName || 'No photo attached yet.',
    openJobPhoto: () => { if (photoRef.current) photoRef.current.click(); },
    onJobPhotoFile: async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try { setPhoto(await readImage(file)); setPhotoName(file.name); setError(''); } catch (err) { setError(err.message); }
    },
    removeJobPhoto: () => { setPhoto(null); setPhotoName(''); if (photoRef.current) photoRef.current.value = ''; },
    publishJob: publish, clearJobDraft: clear,
    jobQueueRows: queue.map((x) => ({ title: x.title, photoCss: x.photo ? `url("${x.photo}") center/cover no-repeat` : STRIPE, noPhoto: !x.photo, meta: `${x.by} · ${x.batch} · ${x.when}`, open: (e) => { if (e && e.stopPropagation) e.stopPropagation(); setJqSel(queueKey(x)); } })),
    jqOpen: !!q, jqClose: closeJq, jqStop: (e) => e.stopPropagation(),
    jq: q ? {
      ...q, photoCss: q.photo ? `url("${q.photo}") center/cover no-repeat` : STRIPE, noPhoto: !q.photo, company: q.company || 'Alumni submission', location: q.location || 'Location TBA', type: q.type || 'Full-time',
      salary: q.salary || 'Salary undisclosed', salaryNote: q.salaryNote || '', deadline: q.deadline || 'Not specified', applyVia: q.applyVia || 'Not specified', messenger: q.messenger || '', desc: q.desc || 'No description provided.', tags: q.tags || [], email: q.email || '',
      initials: initials(q.by || '?'),
    } : { tags: [] },
    jqApprove: () => decide(q, jobsCtx.approveQueued, `“${q?.title}” approved and published to the Job Board.`),
    jqReject: () => decide(q, jobsCtx.rejectQueued, `“${q?.title}” was declined.`),
    adminJobRows: jobs.map((j) => {
      const mine = j.source === 'admin';
      const active = j.status === 'active';
      return {
        title: j.title, meta: [j.company, j.location, j.type].filter(Boolean).join(' · '),
        source: mine ? 'Posted by admin' : j.badgeKind === 'alumni' ? 'Alumni referral' : 'Partner employer',
        sourceColor: mine ? '#0F3D2E' : '#475569', sourceBg: mine ? '#E6F0EB' : '#F2F4F5',
        statusLabel: active ? 'Active' : 'Deactivated', statusColor: active ? '#0F6B4F' : '#64748B', statusBg: active ? '#E1F3EA' : '#EEF2F6',
        toggleLabel: active ? 'Deactivate' : 'Activate', onEdit: () => edit(j), onToggle: () => toggleStatus(j), onDelete: () => remove(j),
      };
    }),
  };

  return (
    <>
      <AdminPostsView {...v} />
      <Modal open={preview} onClose={() => setPreview(false)} title="Job board preview" eyebrow="What alumni see" width={640} footer={<button type="button" style={modalBtn(true)} onClick={() => setPreview(false)}>Close</button>}>
        {live.length === 0 ? 'No active postings — alumni will see an empty board.' : live.map((j) => (
          <div key={jobKey(j)} style={{ padding: '10px 0', borderBottom: '1px solid #EEF0F3' }}>
            <div style={{ fontWeight: 700, color: '#0B1220' }}>{j.title}</div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>{j.company} · {j.location} · {j.type} · {j.salary}</div>
          </div>
        ))}
      </Modal>
    </>
  );
}
