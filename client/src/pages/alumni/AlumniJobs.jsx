import { useMemo, useRef, useState } from 'react';
import JobsView from '../../views/JobsView';
import JobDetailsModal from '../../components/alumni/JobDetailsModal';
import { useJobs } from '../../context/JobsContext';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import { STRIPE, jobKey } from '../../data/jobs';
import { readImage } from '../../lib/files';

const PAGE_SIZE = 5;
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
    const course = a.course_other || a.course || '';
    const yr = (String(a.year_graduated || '').match(/\d{4}/) || [])[0];
    jobsCtx.submitForReview({
      title: draft.title.trim(), company: draft.company.trim(), location: (draft.location || '').trim() || 'Location TBA', type: (draft.type || '').trim() || 'Full-time',
      by: alumniName, batch: `${course ? course.replace(/^Bachelor of (Science|Arts) in /, 'BS ') : 'UDM'} ${yr || ''}`.trim(), when: 'Submitted just now', photo,
      salary: (draft.salary || '').trim() || 'Salary undisclosed', salaryNote: 'as posted',
      tags: String(draft.tags || '').split(',').map((t) => t.trim()).filter(Boolean), desc: (draft.desc || '').trim() || 'No description provided.', email: a.email || '',
    });
    setFormOpen(false); clearDraft();
    toast('Thanks! Your job posting was sent to Alumni Affairs for review.');
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
        toggleApply: () => { jobsCtx.toggleApply(key); toast(app ? `Application withdrawn for ${j.title}.` : `Application submitted for ${j.title} at ${j.company}.`); },
        toggleSave: () => jobsCtx.toggleSave(key),
      };
    }),
  };

  const detailJob = detail ? all.find((j) => jobKey(j) === detail) : null;
  return (
    <>
      <JobsView {...v} />
      <JobDetailsModal
        job={detailJob} saved={detailJob ? !!jobsCtx.savedJobs[detail] : false} application={detailJob ? jobsCtx.applied[detail] : null}
        onClose={() => setDetail(null)} onSave={jobsCtx.toggleSave}
        onApply={(key) => { jobsCtx.toggleApply(key); toast(jobsCtx.applied[key] ? 'Application withdrawn.' : `Application submitted for ${detailJob.title}.`); }}
      />
    </>
  );
}
