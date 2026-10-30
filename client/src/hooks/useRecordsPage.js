import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EMPLOYMENT_LABEL, NO_SURVEY, REC_STATUS_STYLE as STY, SOURCE_LABEL, employmentCode, employmentLabel } from '../data/records';
import { CATALOG, programById } from '../data/colleges';
import { fmtShortDate, num } from '../lib/format';
import { get, page as getPage, patch, post } from '../lib/api';
import { mailtoUrl, openExternal } from '../lib/contact';
import { capitalizeInput } from '../lib/fields';

const portalUrl = () => `${window.location.origin}/signin`;

const SORT = { updated: { sort: 'updated_at' }, name: { sort: 'name', dir: 'asc' }, batch: { sort: 'batch', dir: 'desc' } };
const EMP_FILTERS = [...Object.entries(EMPLOYMENT_LABEL), ['unanswered', NO_SURVEY]];
const REVIEW_TEXT = {
  create: 'Record created', edit: 'Record details updated', verify: 'Record verified', flag: 'Flagged', unflag: 'Flag cleared — marked verified',
  archive: 'Archived', restore: 'Restored from archive', merge: 'Duplicate merge', map_program: 'Program mapped from the catalog',
};
const initialsOf = (n) => String(n || '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' }) : '');

/** API record -> the row shape RecordsView renders. */
function toRow(r) {
  return {
    id: r.id, sid: r.membershipId || '—', name: r.name, program: r.program, course: r.course, college: r.college, collegeId: r.collegeId, batch: r.batch,
    employment: employmentLabel(r.employmentStatus), employmentCode: r.employmentStatus || '', company: r.company || '—', jobTitle: r.jobTitle || '',
    email: r.email || '', mobile: r.mobile || '', address: r.address || '', source: SOURCE_LABEL[r.source] || r.source, sourceCode: r.source,
    updated: fmtShortDate(r.updatedAt), updatedAt: r.updatedAt, status: r.status, note: r.note || '', hasAccount: r.hasAccount, unmapped: r.unmapped, isSelf: false,
  };
}

/** One review-history entry -> { when, who, what }. */
function historyLine(h) {
  const d = h.diff || {};
  let what = REVIEW_TEXT[h.action] || h.action;
  if (h.action === 'merge') what = d.merged_into ? 'Merged into another record (duplicate)' : 'Absorbed a duplicate record';
  if (h.action === 'verify' && d.account === 'approved') what = 'Account approved and record verified';
  // Composed emails and proof requests are logged as edits whose note says what happened.
  if (h.action === 'edit' && (d.kind === 'email' || d.kind === 'request_proof')) return { when: dateTime(h.createdAt), who: h.who, what: h.note || what };
  if (h.note) what += ` — ${h.note}`;
  return { when: dateTime(h.createdAt), who: h.who, what };
}

/**
 * Alumni Records page state + view-model (admin = all records, dept = their college only — the API scopes it).
 * List filters / sort / pagination run on the server; actions call the API and every change lands in the
 * record's review history and the audit log.
 */
export default function useRecordsPage(role) {
  const dept = role === 'dept';
  const { user } = useAuth();
  const location = useLocation();

  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [program, setProgram] = useState('all');
  const [batch, setBatch] = useState('all');
  // The dashboard's Employment Status Breakdown opens the list filtered to a status.
  const [emp, setEmp] = useState(() => (location.state && location.state.emp) || 'all');
  const [sortK, setSortK] = useState('updated');
  const [pageSize, setPageSize] = useState(10);
  const [pageN, setPageN] = useState(1);
  const [sel, setSel] = useState({});
  const [rowMenu, setRowMenu] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [detail, setDetail] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [act, setAct] = useState(null);
  const [actF, setActF] = useState({});
  const [actBusy, setActBusy] = useState(false);
  const [cands, setCands] = useState([]);
  const [actDetail, setActDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [recF, setRecF] = useState({});
  const [formTried, setFormTried] = useState(false);
  const [formErrs, setFormErrs] = useState({});
  const [formBusy, setFormBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [hi, setHi] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [undoIds, setUndoIds] = useState(null);
  const [list, setList] = useState({ rows: [], total: 0 }); // the current page, as rows
  const [counters, setCounters] = useState(null);
  const [activity, setActivity] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const toastT = useRef(null);
  const hiT = useRef(null);
  const seen = useRef({});

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const toast = useCallback((t, undo) => {
    setToastMsg(t); setUndoIds(undo || null);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(null), undo ? 6000 : 4500);
  }, []);
  const fail = useCallback((err) => toast(err.message || 'That didn’t work. Please try again.'), [toast]);

  // Programs in scope (dept: their college), with the college code when a name repeats across colleges.
  const programs = useMemo(() => {
    const ps = CATALOG.programs.filter((p) => !dept || Number(p.collegeId) === Number(user?.collegeId));
    const dupe = (p) => ps.filter((x) => x.name === p.name).length > 1;
    return ps.map((p) => ({ value: String(p.id), label: `${p.abbr} — ${p.name}${dupe(p) ? ` (${p.collegeCode})` : ''}` }));
  }, [dept, user]);

  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(t); }, [query]);

  // The list (server-side filter, sort and paging).
  useEffect(() => {
    let live = true;
    const params = {
      status: tab, q: debounced, program_id: program, batch, employment: emp, page: pageN, per_page: pageSize, ...SORT[sortK],
    };
    getPage('/alumni', params).then((r) => {
      if (!live) return;
      const rows = r.data.map(toRow);
      rows.forEach((x) => { seen.current[x.id] = x; });
      setList({ rows, total: r.meta.total });
    }).catch((err) => { if (live) fail(err); });
    return () => { live = false; };
  }, [tab, debounced, program, batch, emp, sortK, pageSize, pageN, reloadKey, fail]);

  // Counter cards, tab counts and the activity feed.
  useEffect(() => {
    let live = true;
    Promise.all([get('/stats/counters'), get('/alumni/activity?limit=5')])
      .then(([c, a]) => { if (live) { setCounters(c); setActivity(a.data || []); } })
      .catch(() => {});
    return () => { live = false; };
  }, [reloadKey]);

  // Quick-view details (an audited read on the server).
  useEffect(() => {
    if (!drawer) { setDetail(null); return undefined; }
    let live = true;
    get(`/alumni/${drawer}`)
      .then((d) => { if (live) setDetail(d); })
      .catch((err) => { if (live) { fail(err); setDrawer(null); } });
    return () => { live = false; };
  }, [drawer, reloadKey, fail]);

  // Open the quick view when arriving from the global search.
  useEffect(() => {
    const id = location.state && location.state.openId;
    if (id) { setDrawer(id); setAdminNote(''); setTab('all'); }
  }, [location.state]);

  // Close row menu / sheets with the keyboard or an outside click.
  useEffect(() => {
    const onDown = (e) => { if (!rowMenu) return; const t = e.target; if (t && t.closest && t.closest('[data-row-menu]')) return; setRowMenu(null); };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (rowMenu) setRowMenu(null); else if (act) setAct(null); else if (drawer) setDrawer(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [rowMenu, act, drawer]);

  const ROWS = list.rows;
  const rowOf = (id) => ROWS.find((r) => r.id === id) || seen.current[id] || null;
  const TOT = counters || { flagged: 0, verified: 0, archived: 0, all: 0, batches: [] };
  const q = debounced.toLowerCase();
  const tabDefs = [
    { id: 'all', label: 'All records', n: TOT.all }, { id: 'verified', label: 'Verified', n: TOT.verified },
    { id: 'flagged', label: 'Flagged', n: TOT.flagged }, { id: 'archived', label: 'Archived', n: TOT.archived },
  ];
  const total = list.total;
  const visIds = ROWS.map((r) => r.id);
  const selIds = Object.keys(sel).filter((id) => sel[id]).map(Number);
  const allOn = visIds.length > 0 && visIds.every((id) => sel[id]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, pageN), totalPages);
  const setPage = (p) => { setPageN(Math.min(Math.max(1, p), totalPages)); setRowMenu(null); };
  const resetPage = () => setPageN(1);
  const dr = drawer ? (detail && detail.id === drawer ? { ...toRow(detail), note: detail.note || '' } : rowOf(drawer)) : null;
  const flash = (id) => { clearTimeout(hiT.current); setHi(id); hiT.current = setTimeout(() => setHi(null), 2600); };
  const done = (msg, undo) => { reload(); toast(msg, undo); };

  // ---- record actions (history / email / reassign / archive / duplicate) ----
  const actOpen = (kind, id) => {
    const r = rowOf(id);
    if (!r) return;
    const first = r.name.split(' ')[0];
    const f = {
      reason: '', programId: '', batch: r.batch, dupId: null,
      subject: r.status === 'verified' ? 'UDM Alumni Tracer — annual employment update' : 'UDM Alumni Tracer — please complete your submission',
      body: r.status === 'verified'
        ? `Hi ${first},\n\nThank you for keeping your UDM alumni record current. It has been a while since your last update — could you take two minutes to confirm your current employment details?\n\nSign in to the UDM Alumni portal to review your record: ${portalUrl()}\n\n— UDM Alumni Relations Office`
        : `Hi ${first},\n\nWe are reviewing your Alumni Tracer submission and need a few details before we can verify it.${r.note ? `\n\nOpen item: ${r.note}` : ''}\n\nSign in to the UDM Alumni portal to update your record: ${portalUrl()}\n\n— UDM Alumni Relations Office`,
    };
    const prog = CATALOG.programs.find((p) => p.name === r.course && Number(p.collegeId) === Number(r.collegeId));
    f.programId = prog ? String(prog.id) : '';
    setAct({ kind, id }); setActF(f); setRowMenu(null); setCands([]); setActDetail(null);
    if (kind === 'history') get(`/alumni/${id}`).then(setActDetail).catch(fail);
    if (kind === 'dup') {
      const last = r.name.split(' ').slice(-1)[0];
      getPage('/alumni', { q: last, status: 'all', per_page: 8 }).then((x) => setCands(x.data.map(toRow).filter((c) => c.id !== id).slice(0, 4))).catch(() => {});
    }
  };

  const actVals = () => {
    const r = act && rowOf(act.id);
    if (!act || !r) return { recActOn: false };
    const f = actF;
    const k = act.kind;
    const setF = (p) => setActF((s) => ({ ...s, ...p }));
    const isArchived = r.status === 'archived';
    const isFlagged = r.status === 'flagged';
    const chip = (on) => ({ bg: on ? '#E7F0EE' : '#fff', border: on ? '#0F3D2E' : '#E2E5EA', color: on ? '#0F3D2E' : '#475569', mark: on ? '✓' : '', markBg: on ? '#0F3D2E' : '#fff', markBorder: on ? '#0F3D2E' : '#C9CFD6' });
    const history = actDetail && actDetail.id === r.id ? actDetail.history.map(historyLine) : [];
    const reasonNeeded = k === 'reassign' || k === 'archive' || k === 'dup';
    const origProg = CATALOG.programs.find((p) => p.name === r.course && Number(p.collegeId) === Number(r.collegeId));
    const changed = k !== 'reassign' || f.programId !== (origProg ? String(origProg.id) : '') || f.batch !== r.batch;
    const valid = !actBusy && (k === 'history' ? true
      : k === 'email' ? !!r.email && !!(f.subject || '').trim() && !!(f.body || '').trim()
        : k === 'dup' ? !!f.dupId && !!(f.reason || '').trim()
          : changed && !!f.programId && (!reasonNeeded || !!(f.reason || '').trim()));
    const danger = (k === 'archive' && !isArchived) || k === 'dup';
    const T = {
      history: ['Edit history', 'Every change to this record, newest first. Entries cannot be edited or removed.'],
      email: [r.status === 'verified' ? 'Send follow-up email' : 'Send email / follow-up link', 'Opens in your email app with a link to the alumni portal.'],
      reassign: ['Reassign program / batch', 'Corrects where this record is counted in employability reports.'],
      archive: isArchived ? ['Restore from archive', 'Returns the record to active tracking and report counts.'] : ['Archive record', 'Archived records are excluded from reports but kept on file.'],
      dup: isFlagged ? ['Confirm as duplicate', 'This record will be merged into the one you pick.'] : ['Mark as duplicate / flag', 'Moves the record to Flagged until a reviewer resolves it.'],
    }[k];
    const submit = async () => {
      if (!valid) return;
      setActBusy(true);
      try {
        if (k === 'email') {
          // No mail server in the portal: the staff member's mail app opens with the message; the record's history says "Email composed".
          openExternal(mailtoUrl(r.email, f.subject.trim(), f.body.trim()));
          await post(`/alumni/${r.id}/emails`, { subject: f.subject.trim() });
          done(`Your email app opened with the message to ${r.email}`);
        } else if (k === 'reassign') {
          const p = programById(f.programId);
          await patch(`/alumni/${r.id}`, { college: p.collegeName, course: p.name, year_graduated: f.batch, reason: f.reason.trim() });
          done(`${r.name} moved to ${p.abbr} · Batch ${f.batch}`);
        } else if (k === 'archive') {
          await post(`/alumni/${r.id}/status`, { action: isArchived ? 'restore' : 'archive', reason: f.reason.trim() });
          done(r.name + (isArchived ? ' restored' : ' archived'));
        } else if (k === 'dup') {
          const d = cands.find((x) => x.id === f.dupId);
          if (isFlagged) { await post(`/alumni/${r.id}/merge`, { into_id: d.id }); setDrawer(null); done(`Merged into ${d.name}`); }
          else { await post(`/alumni/${r.id}/status`, { action: 'flag', reason: `Possible duplicate of ${d.sid} (${d.name}) — ${f.reason.trim()}` }); done(`${r.name} moved to Flagged`); }
        }
        setAct(null);
      } catch (err) { fail(err); } finally { setActBusy(false); }
    };
    return {
      recActOn: true, recActTitle: T[0], recActDesc: T[1], recActWho: `${r.name} · ${r.sid} · ${r.program} ${r.batch}`, recActClose: () => setAct(null), recActStop: (e) => e.stopPropagation(),
      recActIsHistory: k === 'history', recActIsEmail: k === 'email', recActIsReassign: k === 'reassign', recActIsDup: k === 'dup',
      recActLog: history.length ? history.map((x, i) => ({ ...x, dot: i === 0 ? '#0F6B4F' : '#C9CFD6' })) : [{ when: '', who: '', what: actDetail ? 'No history yet.' : 'Loading history…', dot: '#C9CFD6' }],
      recActTo: r.email ? `${r.name} <${r.email}>` : `${r.name} — no email on file`,
      recActSubject: f.subject || '', recActSetSubject: (e) => setF({ subject: e.target.value }),
      recActBody: f.body || '', recActSetBody: (e) => setF({ body: e.target.value }),
      recActCourse: f.programId || '', recActSetCourse: (e) => setF({ programId: e.target.value }),
      recActCourseOpts: programs,
      recActBatches: (() => { const y = new Date().getFullYear(); return Array.from({ length: 10 }, (_, i) => y - 9 + i); })().map((b) => ({ label: String(b), ...chip(f.batch === b), onClick: () => setF({ batch: b }) })),
      recActDupList: cands.map((d) => ({ name: d.name, meta: `${d.sid} · ${d.program} ${d.batch} · ${d.company}`, ...chip(f.dupId === d.id), onClick: () => setF({ dupId: d.id }) })),
      recActShowReason: reasonNeeded,
      recActReasonLabel: k === 'reassign' ? 'REASON FOR CHANGE' : k === 'dup' ? 'WHY IS THIS A DUPLICATE?' : isArchived ? 'REASON FOR RESTORING' : 'REASON FOR ARCHIVING',
      recActReasonPh: k === 'reassign' ? 'e.g. Registrar masterlist shows BSBA, Batch 2023' : k === 'dup' ? 'e.g. Same birthdate and mobile number, two Membership IDs' : isArchived ? 'e.g. Alumnus responded to follow-up' : 'e.g. No response after three follow-ups',
      recActReason: f.reason || '', recActSetReason: (e) => setF({ reason: e.target.value }),
      recActHasPrimary: k !== 'history', recActCancel: k === 'history' ? 'Close' : 'Cancel',
      recActPrimary: actBusy ? 'Saving…' : ({ email: 'Send email', reassign: 'Save change', archive: isArchived ? 'Restore record' : 'Archive record', dup: isFlagged ? 'Merge duplicate' : 'Flag as duplicate' }[k] || ''),
      recActPrimaryBg: danger ? '#B3213C' : '#0F6B4F', recActPrimaryOp: valid ? 1 : 0.45, recActPrimaryCursor: valid ? 'pointer' : 'not-allowed', recActSubmit: submit,
    };
  };

  // ---- add / edit / archive ("delete") / bulk ----
  const defaultProgram = () => (programs.find((p) => /BSIT/.test(p.label)) || programs[0] || { value: '' }).value;
  const formOpen = (id) => {
    const r = id && rowOf(id);
    const prog = r && CATALOG.programs.find((p) => p.name === r.course && Number(p.collegeId) === Number(r.collegeId));
    const f = r
      ? { name: r.name, email: r.email, programId: prog ? String(prog.id) : '', batch: r.batch, employment: r.employment, company: r.company === '—' ? '' : r.company, source: r.sourceCode, status: r.status, note: r.note || '', hasAccount: r.hasAccount }
      : { name: '', email: '', programId: defaultProgram(), batch: new Date().getFullYear(), employment: NO_SURVEY, company: '', source: 'admin_encoded', status: 'verified', note: '' };
    setForm({ id: r ? r.id : null, sid: r ? r.sid : null }); setRecF(f); setFormTried(false); setFormErrs({}); setDrawer(null); setRowMenu(null);
  };
  const crudVals = () => {
    const f = recF;
    const setF = (p) => { setRecF((s) => ({ ...s, ...p })); setFormErrs({}); };
    const code = employmentCode(f.employment);
    const needsCo = code === 'employed' || code === 'self_employed' || code === 'further_studies';
    const editing = !!(form && form.id);
    const origStatus = editing ? (rowOf(form.id) || {}).status : null;
    const errs = {
      Name: formErrs.name || formErrs.first_name || formErrs.last_name || ((f.name || '').trim().split(/\s+/).length < 2 ? 'Enter the alumnus’s first and last name' : ''),
      Email: formErrs.email || (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? 'Enter a valid email address' : ''),
      Company: needsCo && !(f.company || '').trim() ? (code === 'further_studies' ? 'Enter the school or institution' : 'Enter the employer or business name') : '',
      // Moving to Flagged needs to say what's wrong; moving to Archived needs a reason for the audit trail.
      Note: formErrs.note || (f.status !== origStatus && !(f.note || '').trim() ? ({ flagged: 'Say what needs follow-up before this can be verified', archived: 'Enter the reason for archiving' }[f.status] || '') : ''),
    };
    const ok = !errs.Name && !errs.Email && !errs.Company && !errs.Note && !!f.programId;
    const save = async () => {
      if (formBusy) return; // a second click would save (and log) the change twice
      if (!ok) { setFormTried(true); return; }
      const p = programById(f.programId);
      const body = {
        name: f.name.trim(), email: (f.email || '').trim(), college: p.collegeName, course: p.name, year_graduated: Number(f.batch),
        employment: code, company: needsCo ? f.company.trim() : '', source: f.source, status: f.status, note: (f.note || '').trim(),
      };
      if (editing && f.hasAccount) delete body.email; // the alumnus owns their sign-in email
      setFormBusy(true);
      try {
        const out = editing ? await patch(`/alumni/${form.id}`, body) : await post('/alumni', body);
        setForm(null);
        if (editing) {
          // Show the saved row now; the reload in done() refreshes the counts (and the row's tab) behind it.
          const row = toRow(out);
          seen.current[row.id] = row;
          setList((l) => ({ ...l, rows: l.rows.map((x) => (x.id === row.id ? row : x)) }));
        }
        if (!editing) { setTab((t) => (t === out.status ? t : 'all')); setQuery(''); setProgram('all'); setSortK('updated'); resetPage(); }
        flash(out.id);
        done(editing ? `Saved changes to ${out.name}` : `${out.name} added · ${out.membershipId}`);
      } catch (err) {
        if (err.fields) { setFormErrs(err.fields); setFormTried(true); }
        fail(err);
      } finally {
        setFormBusy(false);
      }
    };
    const border = (k) => (formTried && errs[k] ? '#E8A3B1' : '#E2E5EA');
    const delRows = del ? del.map(rowOf).filter(Boolean) : [];
    const ini = (n) => initialsOf(n);
    const bulk = async (action, msg, reason) => {
      try { await post('/alumni/bulk-status', { ids: selIds, action, reason }); setSel({}); done(msg); } catch (err) { fail(err); }
    };
    const n = selIds.length;
    const noun = n === 1 ? ' record' : ' records';
    const thisYear = new Date().getFullYear();
    return {
      recCreate: () => formOpen(null),
      recFormOn: !!form,
      recFormTitle: editing ? 'Edit alumni record' : 'Add alumni record',
      recFormDesc: editing ? 'Update the details on file. Every change is saved to the audit trail.' : 'Encode a record manually — for alumni who submitted on paper or by email.',
      recFormSave: formBusy ? 'Saving…' : editing ? 'Save changes' : 'Create record',
      recFormBusy: formBusy,
      recFormSid: editing ? form.sid : 'Assigned on save',
      recFormSidNote: editing ? 'Can’t be changed' : 'Auto-assigned',
      recFormClose: () => setForm(null), recFormStop: (e) => e.stopPropagation(), recFormSubmit: save,
      recFName: f.name || '', recFSetName: (e) => setF({ name: capitalizeInput(e) }), recFNameBorder: border('Name'),
      recFEmail: f.email || '', recFSetEmail: (e) => { if (!f.hasAccount) setF({ email: e.target.value }); }, recFEmailBorder: border('Email'),
      recFCompany: needsCo ? f.company || '' : '', recFSetCompany: (e) => setF({ company: e.target.value }), recFCompanyBorder: border('Company'),
      recFHasErrName: formTried && !!errs.Name, recFErrName: errs.Name,
      recFHasErrEmail: (formTried && !!errs.Email) || !!f.hasAccount, recFErrEmail: errs.Email || (f.hasAccount ? 'Sign-in email — the alumnus changes it in their profile.' : ''),
      recFHasErrCompany: formTried && !!errs.Company, recFErrCompany: errs.Company,
      recFCoLabel: code === 'further_studies' ? 'School / institution' : 'Employer / business',
      recFCoPh: needsCo ? (code === 'further_studies' ? 'e.g. UP Diliman Graduate School' : 'e.g. Accenture Philippines') : 'Not applicable',
      recFCoDisabled: !needsCo, recFCoBg: needsCo ? '#fff' : '#F4F5F7',
      recFProgram: f.programId || '', recFSetProgram: (e) => setF({ programId: e.target.value }), recFProgOpts: programs,
      recFBatch: String(f.batch), recFSetBatch: (e) => setF({ batch: Number(e.target.value) }), recFBatchOpts: Array.from({ length: thisYear - 1998 }, (_, i) => thisYear - i).map((b) => ({ value: String(b), label: `Batch ${b}` })),
      recFEmp: f.employment, recFSetEmp: (e) => setF({ employment: e.target.value }), recFEmpOpts: [NO_SURVEY, ...Object.values(EMPLOYMENT_LABEL)].map((x) => ({ value: x, label: x })),
      recFSource: f.source, recFSetSource: (e) => setF({ source: e.target.value }), recFSourceOpts: ['admin_encoded', 'survey', 'alumni_update', 'import'].map((x) => ({ value: x, label: SOURCE_LABEL[x] })),
      // An archived record can only be restored to Verified.
      recFStatusChips: ['verified', 'flagged', 'archived'].map((k) => {
        const on = f.status === k;
        const off = origStatus === 'archived' && k === 'flagged';
        const why = 'Archived records can only be restored to Verified';
        return {
          label: STY[k].label, checked: on ? 'true' : 'false', disabled: off ? 'true' : 'false', title: off ? why : undefined, cursor: off ? 'not-allowed' : 'pointer',
          bg: on ? STY[k].bg : off ? '#F4F5F7' : '#fff', color: on ? STY[k].color : off ? '#94A3B8' : '#475569', border: on ? STY[k].color : '#E2E5EA', dot: STY[k].color,
          onClick: () => { if (!off) setF({ status: k }); },
        };
      }),
      recFNote: f.note || '', recFSetNote: (e) => setF({ note: e.target.value }), recFNoteBorder: border('Note'),
      recFHasErrNote: formTried && !!errs.Note, recFErrNote: errs.Note,
      recFNoteLabel: f.status === origStatus ? 'Admin note' : { flagged: 'Admin note · required', archived: 'Reason for archiving · required' }[f.status] || 'Admin note',
      recFNotePh: { flagged: 'What needs follow-up, e.g. two submissions under one Membership ID', archived: 'e.g. No response after three follow-ups' }[f.status] || 'Optional — shown under the row, e.g. what still needs to be submitted',
      // Records are archived, not deleted: archived records leave every count but stay on file (and can be restored).
      recDelOn: delRows.length > 0,
      recDelTitle: delRows.length === 1 ? 'Archive this record?' : `Archive ${delRows.length} records?`,
      recDelList: delRows.slice(0, 4).map((r) => ({ name: r.name, meta: `${r.sid} · ${r.program} ${r.batch}`, initials: ini(r.name) })),
      recDelHasMore: delRows.length > 4, recDelMore: `+ ${delRows.length - 4} more`,
      recDelBtn: delRows.length === 1 ? 'Archive record' : `Archive ${delRows.length} records`,
      recDelClose: () => setDel(null),
      recDelConfirm: async () => {
        const ids = delRows.map((r) => r.id);
        try {
          await post('/alumni/bulk-status', { ids, action: 'archive', reason: 'Archived from Alumni Records' });
          setSel((s) => { const x = { ...s }; ids.forEach((id) => delete x[id]); return x; });
          setDel(null); setDrawer(null);
          done(ids.length === 1 ? `${delRows[0].name} archived` : `${ids.length} records archived`, ids);
        } catch (err) { fail(err); }
      },
      recUndoOn: !!undoIds && !!toastMsg,
      recUndo: async () => {
        const ids = undoIds || [];
        try { await post('/alumni/bulk-status', { ids, action: 'restore' }); done(ids.length === 1 ? 'Record restored' : `${ids.length} records restored`); } catch (err) { fail(err); }
      },
      recBulkVerify: () => bulk('verify', `${n}${noun} marked verified`),
      recBulkFlag: () => bulk('flag', `${n}${noun} flagged for follow-up`, 'Flagged for follow-up from Alumni Records.'),
      recBulkExport: () => { exportCsv(selIds.map(rowOf).filter(Boolean)); setSel({}); toast(`Exported ${n}${noun} to CSV`); },
      recBulkDelete: () => setDel([...selIds]),
      recDrawerCanApprove: !!(dr && dr.status === 'flagged'),
      recDrawerApproveLabel: 'Clear flag & mark verified',
      recDrawerEdit: () => dr && formOpen(dr.id),
      recDrawerDelete: () => dr && setDel([dr.id]),
    };
  };

  const importRef = useRef(null);
  const onImport = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const rows = parseCsv(await file.text()).filter((r) => r.length >= 2 && r[0].trim());
    if (rows.length && /^name$/i.test(rows[0][0].trim())) rows.shift();
    if (!rows.length) { toast('No records found — expected columns: name, program, batch, employment, employer, student no., email.'); return; }
    const scope = CATALOG.programs.filter((p) => !dept || Number(p.collegeId) === Number(user?.collegeId));
    const body = rows.map((r) => {
      const code = (r[1] || '').trim();
      const p = scope.find((x) => x.abbr.toLowerCase() === code.toLowerCase() || x.name.toLowerCase() === code.toLowerCase());
      const emp = employmentCode((r[3] || '').trim()) || (/self|freelanc|business/i.test(r[3] || '') ? 'self_employed' : /studies/i.test(r[3] || '') ? 'further_studies' : /not|unemployed/i.test(r[3] || '') ? 'not_employed' : /employ/i.test(r[3] || '') ? 'employed' : '');
      return {
        name: r[0].trim(), college: p ? p.collegeName : 'Others', ...(p ? { course: p.name } : { course_other: code || 'Not specified' }), year_graduated: Number(r[2]) || new Date().getFullYear(),
        employment: emp, company: (r[4] || '').trim(), student_no: (r[5] || '').trim() || undefined, email: (r[6] || '').trim() || undefined,
        note: 'Imported from master list.',
      };
    });
    try {
      const out = await post('/alumni/import', { rows: body });
      setTab('all'); resetPage();
      done(`Imported ${out.created} of ${rows.length} from ${file.name}${out.skipped ? ` · ${out.skipped} already on file` : ''}${out.failed ? ` · ${out.failed} need fixing (row ${out.errors.map((x) => x.row).slice(0, 3).join(', ')})` : ''}`);
    } catch (err) { fail(err); }
  };

  const crud = crudVals();
  const statusAction = async (id, action, reason, msg) => {
    try { await post(`/alumni/${id}/status`, { action, reason }); setDrawer(null); done(msg); } catch (err) { fail(err); }
  };
  const batches = TOT.batches || [];
  const verifiedPct = TOT.all ? (TOT.verified / TOT.all) * 100 : 0;
  const AUD = {
    verify: ['#0F6B4F', 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z M9 12l2 2 4-4', '#E1F3EA', '#CBE9DA', 'verified'],
    flag: ['#B3213C', 'M5 21V4 M5 4h11l-2 4 2 4H5', '#FDE7EC', '#F6CFD8', 'flagged'],
    archive: ['#5A6572', 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4', '#F1F3F5', '#E2E5EA', 'archived'],
    create: ['#0F3D2E', 'M12 15V3 M7 8l5-5 5 5 M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4', '#E7F0EE', '#D2E1DD', 'added'],
  };
  const vals = {
    ...actVals(),
    ...crud,
    recResultLabel: num(total) + (total === 1 ? ' record' : ' records') + (q || program !== 'all' || batch !== 'all' || emp !== 'all' ? ' match your filters' : ' in this view'),
    recHasQuery: !!query,
    recClearQuery: () => { setQuery(''); resetPage(); },
    recResetFilters: () => { setQuery(''); setProgram('all'); setBatch('all'); setEmp('all'); setTab('all'); resetPage(); },
    recNoSel: dept || !(selIds.length > 0),
    recProgSel: program,
    recSetProgSel: (e) => { setProgram(e.target.value); resetPage(); setRowMenu(null); },
    recProgOpts: [{ value: 'all', label: dept ? `All ${user?.collegeCode || ''} programs`.replace('  ', ' ') : 'All programs' }, ...programs],
    recIsDept: dept,
    recBatchSel: batch,
    recSetBatchSel: (e) => { setBatch(e.target.value); resetPage(); setRowMenu(null); },
    recBatchOpts: [{ value: 'all', label: 'All batches' }, ...batches.map((b) => ({ value: String(b), label: `Batch ${b}` }))],
    recEmpSel: emp,
    recSetEmpSel: (e) => { setEmp(e.target.value); resetPage(); setRowMenu(null); },
    recEmpOpts: [{ value: 'all', label: 'All employment' }, ...EMP_FILTERS.map(([value, label]) => ({ value, label }))],
    recSortVal: sortK,
    recSetSort: (e) => { setSortK(e.target.value); resetPage(); },
    recSortOpts: [{ value: 'updated', label: 'Sort: Last updated' }, { value: 'name', label: 'Sort: Name A–Z' }, { value: 'batch', label: 'Sort: Newest batch' }],
    recPageSizeVal: String(pageSize),
    recSetPageSize: (e) => { setPageSize(Number(e.target.value)); resetPage(); },
    recTabs: tabDefs.map((t) => ({
      label: t.label, count: num(t.n), bg: t.id === tab ? '#0F3D2E' : 'transparent', color: t.id === tab ? '#fff' : '#475569', border: t.id === tab ? '#0F3D2E' : '#E2E5EA',
      countBg: t.id === tab ? 'rgba(255,255,255,.18)' : '#fff', countColor: t.id === tab ? '#fff' : '#64748B', onClick: () => { setTab(t.id); resetPage(); setRowMenu(null); },
    })),
    recQuery: query,
    recSetQuery: (e) => { setQuery(e.target.value); resetPage(); },
    recRowsView: ROWS.map((r) => {
      const on = !!sel[r.id];
      const s = STY[r.status];
      const open = rowMenu === r.id;
      return {
        ...r, statusLabel: s.label, statusBg: s.bg, statusColor: s.color,
        isSelf: false, syncLabel: r.hasAccount ? 'Linked profile' : '', initials: initialsOf(r.name),
        progBatch: `${r.program} · Batch ${r.batch}`,
        checkBg: on ? '#0F3D2E' : '#fff', checkBorder: on ? '#0F3D2E' : '#C9CFD6', checkMark: on ? '✓' : '', hasNote: !!r.note,
        menuOpen: open, menuExpanded: open ? 'true' : 'false', dotsBg: open ? '#F1F3F5' : 'transparent', dotsColor: open ? '#5A6572' : '#A7B0BC',
        menuToggle: (e) => { e.stopPropagation(); setRowMenu(open ? null : r.id); },
        menuHeading: r.status === 'flagged' ? 'FLAGGED RECORD' : r.status === 'archived' ? 'ARCHIVED RECORD' : 'VERIFIED RECORD',
        menuItems: [
          { k: 'history', label: 'View edit history / audit log', icon: '◷' },
          { k: 'email', label: r.status === 'verified' ? 'Send follow-up email' : 'Send email / follow-up link', icon: '✉' },
          { k: 'reassign', label: 'Reassign program / batch', icon: '⇄' },
        ].map((m) => ({ ...m, color: '#334155', hover: { background: '#F4F6F8' }, onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); actOpen(m.k, r.id); } })),
        menuDanger: [
          { k: 'archive', label: r.status === 'archived' ? 'Restore from archive' : 'Archive record', icon: '▣' },
          { k: 'dup', label: r.status === 'flagged' ? 'Confirm as duplicate' : 'Mark as duplicate / flag', icon: '⚑' },
        ].map((m) => ({ ...m, onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); actOpen(m.k, r.id); } })),
        primaryAction: r.status === 'flagged' ? 'Resolve' : r.status === 'archived' ? 'Restore' : 'View',
        rowBg: hi === r.id ? '#FFF8E1' : on ? '#F5FAF7' : '#fff',
        onView: () => { setDrawer(r.id); setRowMenu(null); },
        onEdit: () => formOpen(r.id),
        onDelete: () => { setDel([r.id]); setRowMenu(null); },
        toggle: () => setSel({ ...sel, [r.id]: !on }),
        openReview: () => { setDrawer(r.id); setRowMenu(null); },
      };
    }),
    recEmpty: total === 0,
    recAllMark: allOn ? '✓' : '', recAllBg: allOn ? '#0F3D2E' : '#fff', recAllBorder: allOn ? '#0F3D2E' : '#C9CFD6',
    recToggleAll: () => { const next = { ...sel }; visIds.forEach((id) => { next[id] = !allOn; }); setSel(next); },
    recPrevDisabled: page <= 1, recPrevBg: page <= 1 ? '#FAFBFB' : '#fff', recPrevColor: page <= 1 ? '#A7B0BC' : '#0B1220', recPrevCursor: page <= 1 ? 'not-allowed' : 'pointer', recPrevOpacity: page <= 1 ? 0.5 : 1,
    recPrev: () => { if (page > 1) setPage(page - 1); },
    recNextDisabled: page >= totalPages, recNextBg: page >= totalPages ? '#FAFBFB' : '#fff', recNextColor: page >= totalPages ? '#A7B0BC' : '#0B1220', recNextCursor: page >= totalPages ? 'not-allowed' : 'pointer', recNextOpacity: page >= totalPages ? 0.5 : 1,
    recNext: () => { if (page < totalPages) setPage(page + 1); },
    recPages: pageWindow(page, totalPages).map((p) => ({ n: p, bg: p === page ? '#0F3D2E' : '#fff', color: p === page ? '#fff' : '#0B1220', border: p === page ? '#0F3D2E' : '#E2E5EA', weight: p === page ? 700 : 600, onClick: () => setPage(p) })),
    recDrawerOpen: !!dr,
    recDrawerName: dr ? dr.name : '', recDrawerSid: dr ? dr.sid : '', recDrawerInitials: dr ? initialsOf(dr.name) : '',
    recDrawerStatusLabel: dr ? STY[dr.status].label : '', recDrawerStatusBg: dr ? STY[dr.status].bg : '#fff', recDrawerStatusColor: dr ? STY[dr.status].color : '#000',
    recDrawerFacts: dr ? [
      { label: 'Degree program & batch', value: `${dr.program} · Batch ${dr.batch}` },
      { label: 'Self-reported employment', value: dr.employment },
      ...(dr.jobTitle ? [{ label: 'Job title', value: dr.jobTitle }] : []),
      { label: 'Employer (as reported)', value: dr.company },
      ...(dr.mobile ? [{ label: 'Mobile', value: dr.mobile }] : []),
      ...(dr.address ? [{ label: 'Present address', value: dr.address }] : []),
      { label: 'Submitted via', value: dr.source }, { label: 'Last updated', value: dr.updated }, { label: 'Alumni membership ID', value: dr.sid },
      { label: 'Email', value: dr.email || 'No email on file' },
    ] : [],
    recDrawerHasFlag: !!(dr && dr.note), recDrawerFlag: dr ? dr.note : '',
    recDrawerNote: adminNote, recDrawerSetNote: (e) => setAdminNote(e.target.value), recDrawerClose: () => setDrawer(null),
    recDrawerApprove: () => { if (dr) statusAction(dr.id, 'verify', null, `${dr.name} verified`); },
    recDrawerFlagAction: () => { if (dr) statusAction(dr.id, 'flag', adminNote.trim() || 'More information requested from alumnus by the Alumni Office.', `${dr.name} flagged for follow-up`); },
    recHasSel: !dept && selIds.length > 0,
    recCanEdit: !dept,
    recGridCols: dept ? 'minmax(0,1.8fr) minmax(0,1fr) minmax(0,1.5fr) minmax(0,.8fr) minmax(0,.8fr) 60px' : '34px minmax(0,1.8fr) minmax(0,1fr) minmax(0,1.5fr) minmax(0,.8fr) minmax(0,.8fr) 152px',
    recIsQueue: true,
    recDrawerStatusNote: dr ? ({ flagged: 'Flagged · needs follow-up before verification', verified: 'Verified by the Alumni Office · listed in Global Alumni Search', archived: 'Archived · excluded from search and reports' })[dr.status] || '' : '',
    recBatchBorder: selIds.length ? '#0F3D2E' : '#E2E5EA', recBatchBg: selIds.length ? '#0F3D2E' : '#F4F5F7', recBatchColor: selIds.length ? '#fff' : '#A7B0BC',
    recBatchOpacity: selIds.length ? 1 : 0.7, recBatchCursor: selIds.length ? 'pointer' : 'not-allowed', recBatchClick: selIds.length ? () => setSel({}) : () => {},
    recBatchNote: selIds.length ? `${selIds.length}${selIds.length === 1 ? ' record selected — batch actions available' : ' records selected — batch actions available'}` : 'Select one or more records to enable batch actions',
    recBatchNoteColor: selIds.length ? '#0F3D2E' : '#94A3B8',
    recSelLabel: selIds.length + (selIds.length === 1 ? ' record selected' : ' records selected'),
    recClearSel: () => setSel({}),
    recCountLabel: (() => {
      const noun = tab === 'all' ? 'alumni records' : `${tab} records`;
      if (!total) return `Showing 0 of 0 ${noun}`;
      const from = (page - 1) * pageSize + 1;
      return `Showing ${from}–${from + ROWS.length - 1} of ${num(total)} ${noun} · Page ${page} of ${totalPages}`;
    })(),
    recStats: [
      { label: 'Total alumni records', value: num(TOT.all), sub: batches.length ? `Membership IDs on file, batches ${batches[batches.length - 1]}–${batches[0]}` : 'Membership IDs on file', icon: 'M4 8h16v11H4z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M4 13h16', iconBg: '#E7F0EE', iconColor: '#0F3D2E', pill: TOT.lastUpdatedAt ? `Last updated ${new Date(TOT.lastUpdatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}` : 'No records yet', pillBg: '#F1F3F5', pillColor: '#475569', hasDot: false },
      { label: 'Flagged for follow-up', value: num(TOT.flagged), sub: 'Incomplete surveys, duplicates or unconfirmed IDs', icon: 'M5 21V4 M5 4h11l-2 4 2 4H5', iconBg: '#FDE7EC', iconColor: '#B3213C', pill: TOT.flagged ? 'Needs resolution' : 'All clear', pillBg: '#FDE7EC', pillColor: '#B3213C', hasDot: TOT.flagged > 0 },
      { label: 'Verified records', value: num(TOT.verified), sub: `${verifiedPct.toFixed(1)}% of all alumni records (${num(TOT.archived)} archived)`, icon: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z M9 12l2 2 4-4', iconBg: '#E1F3EA', iconColor: '#0F6B4F', pill: `+${num(TOT.verifiedLast7d || 0)} this week`, pillBg: '#E1F3EA', pillColor: '#0F6B4F', hasDot: false },
    ],
    recActionHover: { background: '#E7F0EE' },
    recDotsHover: { background: '#F1F3F5', color: '#5A6572' },
    recDotsFocus: { background: '#F1F3F5', color: '#5A6572', boxShadow: '0 0 0 3px rgba(15,61,46,.16)' },
    recDangerHover: { background: '#FDF2F5' },
    recAudit: activity.map((x, i, arr) => {
      const [color, icon, iconBg, iconBorder, verb] = AUD[x.action] || ['#0F6B4F', 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5', '#E7F0EE', '#D3E4DC', 'updated'];
      return { who: x.who, action: verb, target: `${x.alumnus} · ${x.membershipId || '—'}${x.reason ? ` — ${x.reason}` : ''}`, when: dateTime(x.createdAt), color, icon, iconBg, iconBorder, notLast: i < arr.length - 1 };
    }),
    // shared toast (also used by the Reports page)
    recImport: () => importRef.current && importRef.current.click(),
    repToast: toastMsg || '',
    repToastClose: () => setToastMsg(null),
  };
  return { vals, toastOn: !!toastMsg, importRef, onImport };
}

/** At most 7 page buttons around the current page. */
function pageWindow(page, total) {
  const start = Math.max(1, Math.min(page - 3, total - 6));
  return Array.from({ length: Math.min(7, total) }, (_, i) => start + i);
}

function exportCsv(rows) {
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const head = ['Membership ID', 'Name', 'Email', 'Program', 'Batch', 'Employment', 'Employer', 'Status', 'Last updated'];
  const lines = [head, ...rows.map((r) => [r.sid, r.name, r.email, r.program, r.batch, r.employment, r.company, r.status, r.updated])];
  const blob = new Blob([`\uFEFF${lines.map((l) => l.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'alumni_records_export.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function parseCsv(text) {
  return String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim()).map((l) => { const out = []; let cur = ''; let q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; });
}
