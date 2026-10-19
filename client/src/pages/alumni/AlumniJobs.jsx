import { useMemo, useRef, useState } from 'react';
import JobsView from '../../views/JobsView';
import JobDetailsModal from '../../components/alumni/JobDetailsModal';
import OfflineContactModal from '../../components/OfflineContactModal';
import { useJobs } from '../../context/JobsContext';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import { STRIPE, jobKey } from '../../data/jobs';
import { readImage } from '../../lib/files';
import { applyUrl, copyText, isEmail, mailtoUrl, messengerLabel, messengerUrl } from '../../lib/contact';

const PAGE_SIZE = 5;

/** Default application message, filled from the alumnus' profile; editable before sending. */
function applicationMessage(j, a, name) {
  const course = a.course || a.course_other || '';
  const yr = (String(a.year_graduated || '').match(/\d{4}/) || [])[0];
  const grad = course ? `a ${yr ? `${yr} ` : ''}${course} graduate of Universidad de Manila` : 'a Universidad de Manila alumnus';
  const reach = [a.email, a.mobile].filter(Boolean).join(' · ');
  const now = a.employer && a.job_name ? ` I currently work as ${a.job_name} at ${a.employer}.` : '';
  return `Hi! I’m ${name}, ${grad}. I saw the ${j.title} opening at ${j.company} on the UDM Alumni job board and I’d like to apply.${now} I can send my résumé right away — please let me know the next steps.${reach ? `\n\nYou can reach me at ${reach}.` : ''}\n\nThank you!`;
}
const KEYS = ['All', 'Full-time', 'Remote', 'Internship', 'Contract'];
const matchKind = (j, k) => {
  const t = String(j.type || '').toLowerCase();
  const loc = String(j.location || '').toLowerCase();
  if (k === 'Full-time') return t.indexOf('full') > -1;
  if (k === 'Remote') return loc.indexOf('remote') > -1;
  if (k === 'Internship') return t.indexOf('intern') > -1;
  if (k === 'Contract') return t.indexOf('contract') > -1;
  return true;
};
const salaryMin = (j) => Number(String(j.salary || '').replace(/[^\d-]/g, '').split('-')[0]) || 0;
const postedRank = (j) => {
  const s = String(j.posted || '').toLowerCase();
  const n = parseInt((s.match(/\d+/) || [1])[0], 10);
  if (/just now|today/.test(s)) return 0;
  if (/hour/.test(s)) return n / 24;
  if (/day/.test(s)) return n;
  if (/week/.test(s)) return n * 7;
  return 99;
};

/** Alumni Job Board: search & filter, details, save, apply (with status) and "post a job" for review. */
export default function AlumniJobs() {
  const jobsCtx = useJobs();
  const { alumniName, a } = useProfile();
  const { toast } = useToast();
  const [filter, setFilter] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('all');
  const [place, setPlace] = useState('all');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoName, setPhotoName] = useState(null);
  const [formError, setFormError] = useState('');
  const [detail, setDetail] = useState(null);
  const photoRef = useRef(null);

  const all = jobsCtx.activeJobs;
  const [applying, setApplying] = useState(null); // job key whose apply chooser is open
  const [applyMsg, setApplyMsg] = useState('');
  const closeApply = () => setApplying(null);
  const failed = (err) => toast(err.message || 'Something went wrong. Please try again.', false);

  /** Apply opens a chooser to send the application on Facebook Messenger or by email (outside the portal); applying again withdraws. */
  const apply = (j) => {
    const key = jobKey(j);
    if (jobsCtx.applied[key]) { jobsCtx.toggleApply(key).then(() => toast(`Application withdrawn for ${j.title}.`), failed); return; }
    setDetail(null);
    setApplyMsg(applicationMessage(j, a, alumniName));
    setApplying(key);
  };
  const applyVals = () => {
    const j = applying && all.find((x) => jobKey(x) === applying);
    if (!j) return null;
    const key = jobKey(j);
    const subject = `Application — ${j.title} (UDM alumnus)`;
    const channels = [];
    if (isEmail(j.applyVia)) {
      channels.push({ key: 'email', label: 'Email', via: 'Email', value: j.applyVia.trim(), copy: j.applyVia.trim(), href: mailtoUrl(j.applyVia, subject, applyMsg), openLabel: 'Open email' });
    } else if (applyUrl(j.applyVia)) {
      channels.push({ key: 'page', label: 'Careers page', via: 'careers page', value: j.applyVia.trim(), copy: j.applyVia.trim(), href: applyUrl(j.applyVia), external: true, openLabel: 'Open page', onOpen: () => copyText(applyMsg) });
    }
    const fb = messengerUrl(j.messenger);
    // Messenger links can't carry a message, so it is copied to paste into the chat.
    if (fb) channels.push({ key: 'fb', label: 'Facebook Messenger', via: 'Messenger', value: messengerLabel(j.messenger), href: fb, external: true, openLabel: 'Open Messenger', onOpen: () => copyText(applyMsg) });
    return {
      title: `Apply for ${j.title}`,
      lead: `Choose how to send your application to ${j.company}, then mark it as applied here.`,
      message: applyMsg, onMessage: (e) => setApplyMsg(e.target.value),
      messageHint: 'Included automatically when you open email. Paste it into Messenger.',
      channels,
      noneText: `${j.company} hasn’t listed Messenger or email for this posting. Ask the UDM Alumni Relations Office (udmalumni@udm.edu.ph) to forward your application.`,
      // The API records which channel the application went through, so there is nothing to mark without one.
      doneLabel: channels.length ? 'Mark as applied' : null,
      onClose: closeApply,
      onConfirm: (via) => jobsCtx.toggleApply(key, via).then(() => { closeApply(); toast(`Application for ${j.title} marked as sent via ${via}.`); }, failed),
    };
  };
  const isSaved = (j) => !!jobsCtx.savedJobs[jobKey(j)];
  const modalityOf = (j) => { const l = String(j.location || '').toLowerCase(); return l.includes('remote') ? 'remote' : l.includes('hybrid') ? 'hybrid' : 'on-site'; };
  const cityOf = (j) => String(j.location || '').split('·')[0].trim();
  const cities = useMemo(() => Array.from(new Set(all.map(cityOf))).filter(Boolean).sort(), [all]);
  const q = query.trim().toLowerCase();
  const qm = (j) => !q || [j.title, j.company, j.location, j.type, j.badge, (j.tags || []).join(' ')].join(' ').toLowerCase().indexOf(q) > -1;

  const base = all.filter((j) => qm(j) && (modality === 'all' || modalityOf(j) === modality) && (place === 'all' || cityOf(j) === place) && (!savedOnly || isSaved(j)));
  const visible = base.filter((j) => matchKind(j, filter)).sort((x, y) => (sort === 'salary' ? salaryMin(y) - salaryMin(x) : sort === 'company' ? x.company.localeCompare(y.company) : postedRank(x) - postedRank(y)));
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const pageRows = visible.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const touch = (fn) => (e) => { fn(e); setPage(1); };

  const setField = (k) => (e) => { const v = e.target.value; setDraft((d) => ({ ...d, [k]: v })); setFormError(''); };
  const field = (key, label, placeholder, span) => ({ label, placeholder, span: span || 'auto', value: draft[key] || '', onChange: setField(key) });
  const clearDraft = () => { setDraft({}); setPhoto(null); setPhotoName(null); setFormError(''); if (photoRef.current) photoRef.current.value = ''; };

  const submit = () => {
    if (!String(draft.title || '').trim()) { setFormError('Enter a job title.'); return; }
    if (!String(draft.company || '').trim()) { setFormError('Enter the company name.'); return; }
    if (draft.applyVia && !applyUrl(draft.applyVia)) { setFormError('Enter an email address or a website for applications.'); return; }
    if (draft.messenger && !messengerUrl(draft.messenger)) { setFormError('Enter a Facebook username or profile link for Messenger.'); return; }
    // The API fills in the poster (name, program and batch) from the signed-in alumnus' record.
    jobsCtx.submitForReview({
      title: draft.title.trim(), company: draft.company.trim(), location: (draft.location || '').trim() || 'Location TBA', type: (draft.type || '').trim() || 'Full-time', photo,
      salary: (draft.salary || '').trim() || 'Salary undisclosed', salaryNote: 'as posted',
      tags: String(draft.tags || '').split(',').map((t) => t.trim()).filter(Boolean), desc: (draft.desc || '').trim() || 'No description provided.', applyVia: (draft.applyVia || '').trim(),
      messenger: (draft.messenger || '').trim(),
    }).then(() => {
      setFormOpen(false); clearDraft();
      toast('Thanks! Your job posting was sent to Alumni Affairs for review.');
    }, (err) => setFormError(err.message || 'Your posting could not be sent. Please try again.'));
  };

  const onPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try { const url = await readImage(file); setPhoto(url); setPhotoName(file.name); setFormError(''); } catch (err) { setFormError(err.message); }
  };

  const v = {
    jobFilters: KEYS.map((k) => {
      const n = base.filter((j) => matchKind(j, k)).length;
      const on = filter === k;
      return { label: `${k} (${n})`, bg: on ? '#0F3D2E' : 'transparent', color: on ? '#fff' : '#475569', border: on ? '#0F3D2E' : '#E2E5EA', onClick: () => { setFilter(k); setPage(1); } };
    }),
    filtersActive: filter !== 'All' || savedOnly || !!q || modality !== 'all' || place !== 'all',
    resetFilters: () => { setFilter('All'); setSavedOnly(false); setQuery(''); setModality('all'); setPlace('all'); setPage(1); },
    jobQuery: query,
    setJobQuery: touch((e) => setQuery(e.target.value)),
    toggleSavedOnly: () => { setSavedOnly((s) => !s); setPage(1); },
    savedFilterBg: savedOnly ? '#E6F0EB' : '#fff',
    savedFilterBorder: savedOnly ? '#0F3D2E' : '#E2E5EA',
    savedFilterFill: savedOnly ? '#0F3D2E' : 'none',
    savedCount: all.filter(isSaved).length,
    jobSelects: [
      { label: 'Modality', value: modality, onChange: touch((e) => setModality(e.target.value)), options: [{ value: 'all', label: 'All Modalities' }, { value: 'on-site', label: 'On-site' }, { value: 'hybrid', label: 'Hybrid' }, { value: 'remote', label: 'Remote' }] },
      { label: 'Location', value: place, onChange: touch((e) => setPlace(e.target.value)), options: [{ value: 'all', label: 'All Locations' }, ...cities.map((c) => ({ value: c, label: c }))] },
      { label: 'Sort', value: sort, onChange: touch((e) => setSort(e.target.value)), options: [{ value: 'recent', label: 'Most Recent' }, { value: 'salary', label: 'Highest Salary' }, { value: 'company', label: 'Company A–Z' }] },
    ],
    goldHover: { background: '#0B3123' },
    bookmarkHover: { background: '#F1F5F9', borderColor: '#CBD5E1' },
    resetHover: { color: '#0B3123' },
    inputFocus: { borderColor: '#0F3D2E' },
    jobStats: [
      { label: 'Open Positions', value: `${all.length} Openings` },
      { label: 'Alumni Employers', value: '42 Partners' },
      { label: 'Salary Benchmark', value: '₱45k – ₱85k Avg' },
      { label: 'Placement Response', value: '94% Response Rate' },
    ],
    showJobForm: formOpen,
    jobFormButtonLabel: formOpen ? 'Close composer' : 'Post a Job',
    toggleJobForm: () => setFormOpen((o) => !o),
    jobPhotoRef: photoRef,
    jobDraftPhotoCss: photo ? `url("${photo}") center/cover no-repeat` : STRIPE,
    jobDraftNoPhoto: !photo,
    jobDraftHasPhoto: !!photo,
    jobDraftPhotoName: photoName || 'No photo attached yet.',
    openJobPhoto: () => { if (photoRef.current) photoRef.current.click(); },
    onJobPhotoFile: onPhoto,
    removeJobPhoto: () => { setPhoto(null); setPhotoName(null); if (photoRef.current) photoRef.current.value = ''; },
    jobFormFields: [
      field('title', 'Job title', 'e.g. Junior Backend Developer', '1 / -1'),
      field('company', 'Company', 'e.g. Brightline Tech'),
      field('location', 'Location & setup', 'e.g. Manila · Hybrid'),
      field('type', 'Employment type', 'e.g. Full-time'),
      field('salary', 'Salary range', 'e.g. ₱35,000 - ₱48,000'),
      field('applyVia', 'How to apply', 'e.g. careers@company.com or company.com/careers'),
      field('messenger', 'Facebook / Messenger', 'Page username or profile link'),
    ],
    jobDraftTags: draft.tags || '',
    onJobDraftTags: setField('tags'),
    publishJob: submit,
    jobFormError: formError,
    jobsCountLabel: `Showing ${visible.length} of ${all.length} verified alumni job postings`,
    jobsPagingLabel: visible.length ? `Showing ${(cur - 1) * PAGE_SIZE + 1}–${(cur - 1) * PAGE_SIZE + pageRows.length} of ${visible.length} open positions` : 'Showing 0 open positions',
    jobPage: cur,
    jobPages: pages,
    setJobPage: setPage,
    jobsList: pageRows.map((j) => {
      const key = jobKey(j);
      const saved = !!jobsCtx.savedJobs[key];
      const app = jobsCtx.applied[key];
      const alumni = j.badgeKind === 'alumni';
      return {
        ...j,
        saved,
        photoCss: j.photo ? `url("${j.photo}") center/cover no-repeat` : STRIPE,
        noPhoto: !j.photo,
        badgeColor: alumni ? '#0F3D2E' : '#B3213C',
        badgeBg: alumni ? '#E6F0EB' : '#FDE7EC',
        badgeBorder: alumni ? 'rgba(15,61,46,.2)' : 'rgba(179,33,60,.2)',
        bookmarkLabel: saved ? `Remove ${j.title} from saved jobs` : `Save ${j.title} to saved jobs`,
        bookmarkBg: saved ? '#E6F0EB' : '#fff',
        bookmarkBorder: saved ? '#0F3D2E' : '#E2E5EA',
        bookmarkFill: saved ? '#0F3D2E' : 'none',
        bookmarkStroke: saved ? '#0F3D2E' : '#94A3B8',
        applyLabel: app ? '✓ Applied' : 'Apply',
        applyBg: app ? '#E6F0EB' : '#0F3D2E',
        applyColor: app ? '#0F3D2E' : '#fff',
        applyBorder: '#0F3D2E',
        appStatus: app ? app.status : '',
        openDetails: () => setDetail(key),
        toggleApply: () => apply(j),
        toggleSave: () => jobsCtx.toggleSave(key).catch(failed),
      };
    }),
  };

  const detailJob = detail ? all.find((j) => jobKey(j) === detail) : null;
  return (
    <>
      <JobsView {...v} />
      {applying ? <OfflineContactModal key={applying} {...applyVals()} /> : null}
      <JobDetailsModal
        job={detailJob} saved={detailJob ? !!jobsCtx.savedJobs[detail] : false} application={detailJob ? jobsCtx.applied[detail] : null}
        onClose={() => setDetail(null)} onSave={(k) => jobsCtx.toggleSave(k).catch(failed)}
        onApply={() => apply(detailJob)}
      />
    </>
  );
}
