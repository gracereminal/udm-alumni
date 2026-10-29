import { useRef, useState } from 'react';
import AdminPostsView from '../../views/AdminPostsView';
import Modal, { modalBtn } from '../../components/Modal';
import useConfirmToast from '../../hooks/useConfirmToast';
import { useJobs } from '../../context/JobsContext';
import { DEADLINES, EMP_TYPES, STRIPE, WORK_SETUPS, deadlineFrom, jobKey, queueKey, salaryFrom } from '../../data/jobs';
import { initials } from '../../lib/format';
import { readImage } from '../../lib/files';
import { applyUrl, messengerUrl } from '../../lib/contact';

const EMPTY = {
  title: '', company: '', location: '', setup: '', type: '', closes: '', salMin: '', salMax: '', applyVia: '', messenger: '', tags: '', desc: '', urgent: false,
};

/** A posting's stored values -> the composer draft: "Manila · Hybrid" splits into city and setup, "₱35,000 - ₱48,000" into min / max. */
function draftOf(j) {
  const parts = String(j.location || '').split('·').map((x) => x.trim());
  const setup = WORK_SETUPS.find((w) => w.toLowerCase() === (parts[parts.length - 1] || '').toLowerCase()) || '';
  const city = (setup ? parts.slice(0, -1) : parts).join(' · ');
  const nums = String(j.salary || '').match(/\d[\d,]*/g) || [];
  const n = (x) => (x ? String(Number(x.replace(/,/g, ''))) : '');
  const upTo = /^up to/i.test(j.salary || '');
  return {
    ...EMPTY, title: j.title, company: j.company, location: city === 'Location TBA' ? '' : city, setup,
    type: EMP_TYPES.includes(j.type) ? j.type : '', salMin: upTo ? '' : n(nums[0]), salMax: upTo ? n(nums[0]) : n(nums[1]),
    applyVia: j.applyVia || '', messenger: j.messenger || '', tags: (j.tags || []).join(', '),
    desc: j.desc && j.desc !== 'No description provided.' ? j.desc : '', urgent: j.badgeKind === 'urgent',
  };
}

/** Admin · Job Management: post, edit, close / reopen, delete listings and review alumni submissions. */
export default function AdminJobs() {
  const jobsCtx = useJobs();
  const ct = useConfirmToast();
  const [draft, setDraft] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editKey, setEditKey] = useState(null);
  const [error, setError] = useState('');
  const [jqSel, setJqSel] = useState(null);
  const [menu, setMenu] = useState(null);
  const [appsKey, setAppsKey] = useState(null);
  const [preview, setPreview] = useState(false);
  const photoRef = useRef(null);

  const jobs = jobsCtx.jobs;
  const live = jobs.filter((j) => j.status === 'active');
  const set = (k) => (e) => { const val = e.target.value; setDraft((d) => ({ ...d, [k]: val })); setError(''); };
  const sal = salaryFrom(draft.salMin, draft.salMax);
  const field = (key, label, placeholder, span, extra) => ({ key, label, placeholder, span, kind: 'text', value: draft[key] || '', onChange: set(key), ...extra });

  const clear = () => { setDraft(EMPTY); setPhoto(null); setPhotoName(''); setEditKey(null); setError(''); if (photoRef.current) photoRef.current.value = ''; };
  const close = () => { setFormOpen(false); clear(); };
  const openNew = () => { clear(); setFormOpen(true); };

  const publish = () => {
    if (!draft.title.trim()) { setError('Enter a job title.'); return; }
    if (!draft.company.trim()) { setError('Enter the company name.'); return; }
    if (sal.error) { setError(sal.error); return; }
    if (draft.applyVia.trim() && !applyUrl(draft.applyVia)) { setError('Enter an email address or a website for applications.'); return; }
    if (draft.messenger.trim() && !messengerUrl(draft.messenger)) { setError('Enter a Facebook username or profile link for Messenger.'); return; }
    const cur = editKey ? jobs.find((j) => jobKey(j) === editKey) : null;
    const data = {
      title: draft.title.trim(), company: draft.company.trim(), location: [draft.location.trim() || 'Location TBA', draft.setup].filter(Boolean).join(' · '), type: draft.type || 'Full-time',
      // When editing, an untouched salary or deadline keeps what the posting already has.
      salary: sal.text || (cur ? cur.salary : 'Salary undisclosed'), deadline: deadlineFrom(draft.closes) || (cur ? undefined : null),
      badge: draft.urgent ? 'Urgent Hiring' : cur && cur.badgeKind !== 'urgent' ? cur.badge : 'Posted by Admin',
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean), desc: draft.desc.trim() || 'No description provided.', photo,
      applyVia: draft.applyVia.trim() || undefined,
      messenger: draft.messenger.trim() || undefined,
    };
    const work = editKey
      ? jobsCtx.updateJob(editKey, data).then(() => `Saved changes to “${data.title}”.`)
      : jobsCtx.postJob({ ...data, salaryNote: 'as posted', note: '' }).then(() => `“${data.title}” is live on the Job Board.`);
    work.then((msg) => { ct.toast(msg); close(); }, (err) => setError(err.message || 'The posting could not be saved. Please try again.'));
  };

  const edit = (j) => {
    setMenu(null);
    setEditKey(jobKey(j));
    setDraft(draftOf(j));
    setPhoto(j.photo || null); setPhotoName(''); setError('');
    setFormOpen(true);
  };
  const toggleStatus = (j) => {
    setMenu(null);
    const key = jobKey(j);
    const next = j.status === 'active' ? 'inactive' : 'active';
    jobsCtx.setJobStatus(key, next).then(
      () => ct.toast(next === 'active' ? `“${j.title}” is live again.` : `“${j.title}” was closed and hidden from alumni.`),
      (err) => ct.toast(err.message || 'Couldn’t update the posting. Please try again.', false),
    );
  };
  const remove = (j) => {
    setMenu(null);
    ct.askConfirm({
      title: 'Delete this job posting?', body: 'It is removed from the Job Board for every alumnus. Applications already submitted are kept in the alumnus’ history.', detail: `${j.title} · ${j.company}`,
      cancelLabel: 'Keep posting', okLabel: 'Delete posting', busyLabel: 'Deleting…', danger: true, async: true,
      onOk: () => ct.runAsync(async () => { await jobsCtx.deleteJob(jobKey(j)); if (editKey === jobKey(j)) close(); ct.toast('Job posting deleted.'); }, 'Couldn’t delete the posting. Please try again.'),
    });
  };

  const queue = jobsCtx.queue;
  const q = queue.find((x) => queueKey(x) === jqSel);
  const closeJq = () => setJqSel(null);
  const decide = (entry, action, okMsg) => {
    if (!entry) { closeJq(); return; }
    action(entry).then(() => { ct.toast(okMsg); closeJq(); }, (err) => ct.toast(err.message || 'Couldn’t update the submission. Please try again.', false));
  };
  const appsJob = appsKey != null ? jobs.find((j) => jobKey(j) === appsKey) : null;
  const appLabel = (j) => `applicants (${j.applications})`;

  const v = {
    ...ct.vals,
    tabJobs: true, tabEvents: false, adminPostsLabel: 'Admin Jobs',
    postsSubtitle: 'Post openings directly and approve job listings submitted by alumni',
    postsPreviewGo: () => setPreview(true),
    addJob: openNew,
    jobLiveCount: live.length,
    jobPendingCount: queue.length,
    inputFocus: { borderColor: '#0F3D2E' }, rowHover: { background: '#FBFCFC' }, exportHover: { background: '#0B3123' },
    jobComposer: formOpen ? {
      heading: editKey ? 'Edit job posting' : 'Post a job opening',
      badge: editKey ? null : 'PUBLISHES INSTANTLY', badgeColor: '#0F3D2E', badgeBg: '#E6F0EB',
      intro: editKey ? null : 'Admin postings skip review. Alumni-submitted jobs land in the queue for approval.',
      photo: {
        ref: photoRef, css: photo ? `url("${photo}") center/cover no-repeat` : STRIPE, none: !photo, has: !!photo, name: photoName || (photo ? 'Current photo' : 'No photo attached yet.'),
        open: () => { if (photoRef.current) photoRef.current.click(); },
        onFile: async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          try { setPhoto(await readImage(file)); setPhotoName(file.name); setError(''); } catch (err) { setError(err.message); }
        },
        remove: () => { setPhoto(null); setPhotoName(''); if (photoRef.current) photoRef.current.value = ''; },
      },
      fields: [
        field('title', 'Job title', 'e.g. Junior Backend Developer', '1 / -1'),
        field('company', 'Company', 'e.g. Brightline Tech'),
        field('location', 'Location', 'City, e.g. Manila'),
        field('setup', 'Work setup', 'Select work setup', null, { kind: 'select', options: WORK_SETUPS }),
        field('type', 'Employment type', 'Select employment type', null, { kind: 'select', options: EMP_TYPES }),
        field('closes', 'Application deadline', editKey ? 'Keep current deadline' : 'Select deadline', null, { kind: 'select', options: DEADLINES }),
        field('salMin', 'Minimum salary (monthly)', 'e.g. 35000', null, { kind: 'money' }),
        field('salMax', 'Maximum salary (monthly)', 'e.g. 48000', null, { kind: 'money', err: sal.error }),
        field('applyVia', 'How to apply', 'e.g. careers@company.com or company.com/careers'),
        field('messenger', 'Facebook / Messenger', 'Page username or profile link'),
      ],
      urgent: draft.urgent, onUrgent: (e) => { const on = e.target.checked; setDraft((d) => ({ ...d, urgent: on })); },
      tags: draft.tags, onTags: set('tags'), desc: draft.desc, onDesc: set('desc'),
      error, primaryLabel: editKey ? 'Save changes' : 'Publish job', onPrimary: publish,
      clearLabel: editKey ? 'Reset changes' : 'Clear draft', onClear: editKey ? () => { const j = jobs.find((x) => jobKey(x) === editKey); if (j) edit(j); } : clear,
      onClose: close,
    } : null,
    jobApps: appsJob ? {
      label: `Applicants (${appsJob.applications})`, title: appsJob.title, onClose: () => setAppsKey(null),
      rows: [{ label: 'Applications marked as sent', value: String(appsJob.applications) }, { label: 'Alumni who saved it', value: String(appsJob.saves) }],
      note: 'Alumni send applications to the employer by Messenger, email or the careers page; the portal records only that they applied and how.',
    } : null,
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
      const key = jobKey(j);
      const mine = j.source === 'admin';
      const closed = j.status !== 'active';
      return {
        key, title: j.title, meta: [j.company, j.location, j.type].filter(Boolean).join(' · '),
        source: closed ? 'Closed' : mine ? 'Posted by admin' : j.badgeKind === 'alumni' ? 'Alumni referral' : 'Partner employer',
        sourceColor: closed ? '#9F1239' : mine ? '#0F3D2E' : '#475569', sourceBg: closed ? '#FEF0F2' : mine ? '#E6F0EB' : '#F2F4F5',
        dim: closed ? 0.62 : 1,
        menuOpen: menu === key, onMenu: () => setMenu((m) => (m === key ? null : key)),
        appLabel: appLabel(j),
        toggleLabel: closed ? 'Reopen listing' : 'Unpublish / Close listing', toggleColor: closed ? '#0F3D2E' : '#9F1239',
        onEdit: () => edit(j), onApps: () => { setMenu(null); setAppsKey(key); }, onToggle: () => toggleStatus(j), onDelete: () => remove(j),
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
