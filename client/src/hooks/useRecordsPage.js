import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useRecords, recInScope } from '../context/RecordsContext';
import { useProfile } from '../context/ProfileContext';
import { REC_STATUS_STYLE as STY } from '../data/records';
import { nowLabel, num } from '../lib/format';
import { progCode, progCollege, progCourses, progOpts } from '../lib/colleges';
import { CCS_COLLEGE } from '../data/records';

const EMP = ['Employed Full-time', 'Employed Part-time', 'Self-Employed / Freelancer', 'Business Owner', 'Further studies', 'Not yet employed'];
const DOCS = [
  ['coe', 'Certificate of employment', 'Signed by HR, issued within 6 months'],
  ['sss', 'SSS contribution record (R-5 / E-4)', 'Confirms current employer'],
  ['bir', 'BIR Form 2316 or 1701', 'Income tax filing for the latest year'],
  ['permit', 'DTI / business permit', 'For self-employed or business owners'],
  ['enrol', 'Certificate of enrolment', 'For further studies'],
];

/**
 * Alumni Records page state + view-model (admin = all records, dept = the dean's college only).
 * Includes list filters/sort/pagination, quick-view drawer, record actions (email, proof request, reassign,
 * archive, duplicate), add/edit/delete with undo, and bulk actions.
 */
export default function useRecordsPage(role) {
  const dept = role === 'dept';
  const rec = useRecords();
  const { alumniName, profileSavedAt } = useProfile();
  const location = useLocation();

  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [program, setProgram] = useState('all');
  const [batch, setBatch] = useState('all');
  const [emp, setEmp] = useState('all');
  const [sortK, setSortK] = useState('updated');
  const [pageSize, setPageSize] = useState(10);
  const [pageN, setPageN] = useState(1);
  const [sel, setSel] = useState({});
  const [rowMenu, setRowMenu] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [act, setAct] = useState(null); // { kind, sid }
  const [actF, setActF] = useState({});
  const [form, setForm] = useState(null); // { sid }
  const [recF, setRecF] = useState({});
  const [formTried, setFormTried] = useState(false);
  const [del, setDel] = useState(null);
  const [hi, setHi] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [undoIds, setUndoIds] = useState(null);
  const toastT = useRef(null);
  const hiT = useRef(null);

  const ROWS = rec.rows.filter((r) => !dept || recInScope(r));

  // open the quick view when arriving from the global search
  useEffect(() => {
    const sid = location.state && location.state.openSid;
    if (sid) { setDrawer(sid); setAdminNote(''); setTab('all'); }
  }, [location.state]);

  // close row menu / sheets with the keyboard or an outside click
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

  const toast = useCallback((t, undo) => {
    setToastMsg(t); setUndoIds(undo || null);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(null), undo ? 6000 : 4500);
  }, []);

  const TOT = rec.totals(dept);
  const COUNTS = ROWS.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; acc.all += 1; return acc; }, { pending: 0, flagged: 0, verified: 0, archived: 0, all: 0 });
  const q = query.trim().toLowerCase();
  const tabDefs = [
    { id: 'pending', label: 'Pending review', n: COUNTS.pending }, { id: 'flagged', label: 'Flagged', n: COUNTS.flagged },
    { id: 'verified', label: 'Verified', n: COUNTS.verified }, { id: 'archived', label: 'Archived', n: COUNTS.archived }, { id: 'all', label: 'All records', n: COUNTS.all },
  ];
  const progList = progCourses(dept ? CCS_COLLEGE : null);
  const prog = progList.includes(program) ? program : 'all';
  const filtered = ROWS.filter((r) => (tab === 'all' || r.status === tab) && (prog === 'all' || r.course === prog) && (batch === 'all' || String(r.batch) === batch)
    && (emp === 'all' || r.employment === emp) && (!q || `${r.name} ${r.sid} ${r.company} ${r.employment}`.toLowerCase().includes(q)));
  const dt = (r) => { const t = Date.parse(r.updated); return Number.isNaN(t) ? Infinity : t; };
  filtered.sort(sortK === 'name' ? (a, b) => a.name.localeCompare(b.name) : sortK === 'batch' ? (a, b) => b.batch - a.batch || a.name.localeCompare(b.name) : (a, b) => dt(b) - dt(a));
  const visIds = filtered.map((r) => r.sid);
  const selIds = visIds.filter((id) => sel[id]);
  const allOn = visIds.length > 0 && selIds.length === visIds.length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, pageN), totalPages);
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const setPage = (p) => { setPageN(Math.min(Math.max(1, p), totalPages)); setRowMenu(null); };
  const dr = ROWS.find((r) => r.sid === drawer);
  const resetPage = () => setPageN(1);

  // ---- record actions (email / proof / reassign / archive / duplicate / history) ----
  const actOpen = (kind, sid) => {
    const r = ROWS.find((x) => x.sid === sid);
    if (!r) return;
    const first = r.name.split(' ')[0];
    const f = {
      reason: '', docs: {}, due: 14, note: '', course: r.course, batch: r.batch, dupSid: null,
      subject: r.status === 'verified' ? 'UDM Alumni Tracer — annual employment update' : 'UDM Alumni Tracer — please complete your submission',
      body: r.status === 'verified'
        ? `Hi ${first},\n\nThank you for keeping your UDM alumni record current. It has been a while since your last update — could you take two minutes to confirm your current employment details?\n\nUse the secure link below to review your record.\n\n— UDM Alumni Relations Office`
        : `Hi ${first},\n\nWe are reviewing your Alumni Tracer submission and need a few details before we can verify it.${r.note ? `\n\nOpen item: ${r.note}` : ''}\n\nUse the secure link below to update your record.\n\n— UDM Alumni Relations Office`,
    };
    if (kind === 'proof') {
      if (/Self|Business|Freelance/i.test(r.employment)) f.docs = { bir: true, permit: true };
      else if (/Employed/i.test(r.employment)) f.docs = { coe: true };
      else if (/studies/i.test(r.employment)) f.docs = { enrol: true };
    }
    setAct({ kind, sid }); setActF(f); setRowMenu(null);
  };

  const actVals = () => {
    const r = act && ROWS.find((x) => x.sid === act.sid);
    if (!act || !r) return { recActOn: false };
    const f = actF;
    const k = act.kind;
    const setF = (patch) => setActF((s) => ({ ...s, ...patch }));
    const isArchived = r.status === 'archived';
    const isFlagged = r.status === 'flagged';
    const chip = (on) => ({ bg: on ? '#E7F0EE' : '#fff', border: on ? '#0F3D2E' : '#E2E5EA', color: on ? '#0F3D2E' : '#475569', mark: on ? '✓' : '', markBg: on ? '#0F3D2E' : '#fff', markBorder: on ? '#0F3D2E' : '#C9CFD6' });
    const email = rec.recEmail(r);
    const others = ROWS.filter((x) => x.sid !== r.sid);
    const cands = [...others.filter((x) => x.program === r.program), ...others.filter((x) => x.program !== r.program)].slice(0, 4);
    const log = rec.log[r.sid] || [];
    const seed = [];
    seed.push({ when: r.updated, who: r.source === 'Admin encoded' ? 'Alumni Office · encoder' : 'Alumnus · self-service', what: r.source === 'Admin encoded' ? 'Record encoded from graduation masterlist' : r.source === 'Alumni update' ? 'Employment details updated by alumnus' : 'Tracer survey response submitted' });
    if (r.status === 'verified') seed.unshift({ when: r.updated, who: 'Alumni Office · reviewer', what: 'Record verified against uploaded proof' });
    if (r.status === 'flagged' && r.note) seed.unshift({ when: r.updated, who: 'System check', what: `Flagged — ${r.note}` });
    if (r.status === 'archived') seed.unshift({ when: r.updated, who: 'Alumni Office · admin', what: 'Archived — no response after three follow-ups' });
    seed.push({ when: `Batch ${r.batch}`, who: 'Registrar import', what: `Alumni record created · ${r.program}` });
    const reasonNeeded = k === 'reassign' || k === 'archive' || k === 'dup';
    const changed = k !== 'reassign' || f.course !== r.course || f.batch !== r.batch;
    const docsN = Object.values(f.docs || {}).filter(Boolean).length;
    const valid = k === 'history' ? true
      : k === 'email' ? !!(f.subject || '').trim() && !!(f.body || '').trim()
        : k === 'proof' ? docsN > 0
          : k === 'dup' ? !!f.dupSid && !!(f.reason || '').trim()
            : changed && (!reasonNeeded || !!(f.reason || '').trim());
    const danger = (k === 'archive' && !isArchived) || k === 'dup';
    const T = {
      history: ['Edit history', 'Every change to this record, newest first. Entries cannot be edited or removed.'],
      email: [r.status === 'verified' ? 'Send follow-up email' : 'Send email / follow-up link', 'Includes a secure one-time link to the alumnus’s record.'],
      proof: ['Request document proof', 'The alumnus gets an upload link. The record stays unverified until proof is reviewed.'],
      reassign: ['Reassign program / batch', 'Corrects where this record is counted in employability reports.'],
      archive: isArchived ? ['Restore from archive', 'Returns the record to active tracking and report counts.'] : ['Archive record', 'Archived records are excluded from reports but kept for seven years.'],
      dup: isFlagged ? ['Confirm as duplicate', 'This record will be merged into the one you pick and archived.'] : ['Mark as duplicate / flag', 'Moves the record to Flagged until a reviewer resolves it.'],
    }[k];
    const submit = () => {
      if (!valid) return;
      let patch = null; let what = ''; let msg = '';
      if (k === 'email') { what = `Email sent — “${f.subject.trim()}”`; msg = `Email sent to ${email}`; }
      if (k === 'proof') {
        const names = DOCS.filter((d) => f.docs[d[0]]).map((d) => d[1]);
        what = `Proof requested (${names.join(', ')}) · due in ${f.due} days`;
        msg = `Document request sent to ${r.name}`;
        patch = { note: `Awaiting proof: ${names.join(', ')} — due in ${f.due} days.${f.note.trim() ? ` ${f.note.trim()}` : ''}` };
      }
      if (k === 'reassign') {
        const toCode = progCode(f.course);
        what = `Reassigned ${r.program} · ${r.batch} → ${toCode} · ${f.batch} — ${f.reason.trim()}`;
        msg = `${r.name} moved to ${toCode} · Batch ${f.batch}`;
        patch = { course: f.course, college: progCollege(f.course), program: toCode, batch: f.batch };
      }
      if (k === 'archive') { patch = isArchived ? { status: 'verified' } : { status: 'archived' }; what = `${isArchived ? 'Restored from archive — ' : 'Archived — '}${f.reason.trim()}`; msg = r.name + (isArchived ? ' restored to Verified' : ' archived'); }
      if (k === 'dup') {
        const d = ROWS.find((x) => x.sid === f.dupSid);
        if (isFlagged) { patch = { status: 'archived', note: `Merged into ${d.sid} (${d.name}).` }; what = `Confirmed duplicate of ${d.sid} — merged and archived. ${f.reason.trim()}`; msg = `Merged into ${d.name} and archived`; }
        else { patch = { status: 'flagged', note: `Possible duplicate of ${d.sid} (${d.name}) — ${f.reason.trim()}` }; what = `Flagged as possible duplicate of ${d.sid}`; msg = `${r.name} moved to Flagged`; }
      }
      rec.addLog(r.sid, what);
      if (patch) rec.patchRecord(r.sid, patch);
      setAct(null);
      toast(msg);
    };
    return {
      recActOn: true, recActTitle: T[0], recActDesc: T[1], recActWho: `${r.name} · ${r.sid} · ${r.program} ${r.batch}`, recActClose: () => setAct(null), recActStop: (e) => e.stopPropagation(),
      recActIsHistory: k === 'history', recActIsEmail: k === 'email', recActIsProof: k === 'proof', recActIsReassign: k === 'reassign', recActIsDup: k === 'dup',
      recActLog: [...log.map((x) => ({ ...x, dot: '#0F6B4F' })), ...seed.map((x) => ({ ...x, dot: '#C9CFD6' }))],
      recActTo: `${r.name} <${email}>`,
      recActSubject: f.subject || '', recActSetSubject: (e) => setF({ subject: e.target.value }),
      recActBody: f.body || '', recActSetBody: (e) => setF({ body: e.target.value }),
      recActDocs: DOCS.map((d) => ({ label: d[1], hint: d[2], ...chip(!!(f.docs || {})[d[0]]), toggle: () => setF({ docs: { ...(f.docs || {}), [d[0]]: !(f.docs || {})[d[0]] } }) })),
      recActDue: [7, 14, 30].map((n) => ({ label: `${n} days`, ...chip(f.due === n), onClick: () => setF({ due: n }) })),
      recActNote: f.note || '', recActSetNote: (e) => setF({ note: e.target.value }),
      recActCourse: f.course || '', recActSetCourse: (e) => setF({ course: e.target.value }),
      recActCourseOpts: progOpts(dept ? CCS_COLLEGE : null),
      recActBatches: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((b) => ({ label: String(b), ...chip(f.batch === b), onClick: () => setF({ batch: b }) })),
      recActDupList: cands.map((d) => ({ name: d.name, meta: `${d.sid} · ${d.program} ${d.batch} · ${d.company}`, ...chip(f.dupSid === d.sid), onClick: () => setF({ dupSid: d.sid }) })),
      recActShowReason: reasonNeeded,
      recActReasonLabel: k === 'reassign' ? 'REASON FOR CHANGE' : k === 'dup' ? 'WHY IS THIS A DUPLICATE?' : isArchived ? 'REASON FOR RESTORING' : 'REASON FOR ARCHIVING',
      recActReasonPh: k === 'reassign' ? 'e.g. Registrar masterlist shows BSBA, Batch 2023' : k === 'dup' ? 'e.g. Same birthdate and mobile number, two Membership IDs' : isArchived ? 'e.g. Alumnus responded to follow-up' : 'e.g. No response after three follow-ups',
      recActReason: f.reason || '', recActSetReason: (e) => setF({ reason: e.target.value }),
      recActHasPrimary: k !== 'history', recActCancel: k === 'history' ? 'Close' : 'Cancel',
      recActPrimary: { email: 'Send email', proof: 'Send request', reassign: 'Save change', archive: isArchived ? 'Restore record' : 'Archive record', dup: isFlagged ? 'Merge & archive' : 'Flag as duplicate' }[k] || '',
      recActPrimaryBg: danger ? '#B3213C' : '#0F6B4F', recActPrimaryOp: valid ? 1 : 0.45, recActPrimaryCursor: valid ? 'pointer' : 'not-allowed', recActSubmit: submit,
    };
  };

  // ---- add / edit / delete / bulk ----
  const formOpen = (sid) => {
    const r = sid && ROWS.find((x) => x.sid === sid);
    const f = r
      ? { name: r.name, email: rec.recEmail(r), course: r.course, batch: r.batch, employment: r.employment, company: r.company === '—' ? '' : r.company, source: r.source, status: r.status, note: r.note || '' }
      : { name: '', email: '', course: 'Bachelor of Science in Information Technology', batch: 2026, employment: 'Employed Full-time', company: '', source: 'Admin encoded', status: 'pending', note: '' };
    setForm({ sid: r ? r.sid : null }); setRecF(f); setFormTried(false); setDrawer(null); setRowMenu(null);
  };
  const crudVals = () => {
    const f = recF;
    const setF = (p) => setRecF((s) => ({ ...s, ...p }));
    const needsCo = f.employment !== 'Not yet employed';
    const errs = {
      Name: (f.name || '').trim().length < 3 ? 'Enter the alumnus’s full name' : '',
      Email: f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? 'Enter a valid email address' : '',
      Company: needsCo && !(f.company || '').trim() ? (f.employment === 'Further studies' ? 'Enter the school or institution' : 'Enter the employer or business name') : '',
    };
    const ok = !errs.Name && !errs.Email && !errs.Company;
    const editing = !!(form && form.sid);
    const newSid = `AM-${f.batch}-${String(9001 + rec.added.length).padStart(5, '0')}`;
    const flash = (sid) => { clearTimeout(hiT.current); setHi(sid); hiT.current = setTimeout(() => setHi(null), 2600); };
    const save = () => {
      if (!ok) { setFormTried(true); return; }
      const r = { name: f.name.trim(), email: (f.email || '').trim() || undefined, course: f.course, college: progCollege(f.course), program: progCode(f.course), batch: Number(f.batch), employment: f.employment, company: needsCo ? f.company.trim() : '—', source: f.source, status: f.status, note: (f.note || '').trim(), updated: 'Oct 05, 2026' };
      if (editing) {
        rec.patchRecord(form.sid, r); rec.addLog(form.sid, 'Record details updated'); setForm(null); flash(form.sid); toast(`Saved changes to ${r.name}`);
      } else {
        rec.addRecord({ ...r, sid: newSid }); rec.addLog(newSid, 'Record created manually'); setForm(null);
        setTab((t) => (t === r.status ? t : 'all')); setQuery(''); setProgram('all'); setSortK('updated'); resetPage(); flash(newSid); toast(`${r.name} added · ${newSid}`);
      }
    };
    const border = (k) => (formTried && errs[k] ? '#E8A3B1' : '#E2E5EA');
    const delRows = del ? ROWS.filter((r) => del.includes(r.sid)) : [];
    const ini = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('');
    const setMany = (ids, patch, msg) => { rec.patchRecord(ids, patch); setSel({}); toast(msg); };
    const n = selIds.length;
    const noun = n === 1 ? ' record' : ' records';
    return {
      recCreate: () => formOpen(null),
      recFormOn: !!form,
      recFormTitle: editing ? 'Edit alumni record' : 'Add alumni record',
      recFormDesc: editing ? 'Update the details on file. Every change is saved to the audit trail.' : 'Encode a record manually — for alumni who submitted on paper or by email.',
      recFormSave: editing ? 'Save changes' : 'Create record',
      recFormSid: editing ? form.sid : newSid,
      recFormSidNote: editing ? 'Can’t be changed' : 'Auto-assigned',
      recFormClose: () => setForm(null), recFormStop: (e) => e.stopPropagation(), recFormSubmit: save,
      recFName: f.name || '', recFSetName: (e) => setF({ name: e.target.value }), recFNameBorder: border('Name'),
      recFEmail: f.email || '', recFSetEmail: (e) => setF({ email: e.target.value }), recFEmailBorder: border('Email'),
      recFCompany: needsCo ? f.company || '' : '', recFSetCompany: (e) => setF({ company: e.target.value }), recFCompanyBorder: border('Company'),
      recFHasErrName: formTried && !!errs.Name, recFErrName: errs.Name,
      recFHasErrEmail: formTried && !!errs.Email, recFErrEmail: errs.Email,
      recFHasErrCompany: formTried && !!errs.Company, recFErrCompany: errs.Company,
      recFCoLabel: f.employment === 'Further studies' ? 'School / institution' : 'Employer / business',
      recFCoPh: needsCo ? (f.employment === 'Further studies' ? 'e.g. UP Diliman Graduate School' : 'e.g. Accenture Philippines') : 'Not applicable',
      recFCoDisabled: !needsCo, recFCoBg: needsCo ? '#fff' : '#F4F5F7',
      recFProgram: f.course, recFSetProgram: (e) => setF({ course: e.target.value }), recFProgOpts: progOpts(null),
      recFBatch: String(f.batch), recFSetBatch: (e) => setF({ batch: Number(e.target.value) }), recFBatchOpts: [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].map((b) => ({ value: String(b), label: `Batch ${b}` })),
      recFEmp: f.employment, recFSetEmp: (e) => setF({ employment: e.target.value }), recFEmpOpts: EMP.map((x) => ({ value: x, label: x })),
      recFSource: f.source, recFSetSource: (e) => setF({ source: e.target.value }), recFSourceOpts: ['Admin encoded', 'Survey form', 'Alumni update'].map((x) => ({ value: x, label: x })),
      recFStatusChips: ['pending', 'verified', 'flagged', 'archived'].map((k) => {
        const on = f.status === k;
        return { label: STY[k].label, checked: on ? 'true' : 'false', bg: on ? STY[k].bg : '#fff', color: on ? STY[k].color : '#475569', border: on ? STY[k].color : '#E2E5EA', dot: STY[k].color, onClick: () => setF({ status: k }) };
      }),
      recFNote: f.note || '', recFSetNote: (e) => setF({ note: e.target.value }),
      recDelOn: delRows.length > 0,
      recDelTitle: delRows.length === 1 ? 'Delete this record?' : `Delete ${delRows.length} records?`,
      recDelList: delRows.slice(0, 4).map((r) => ({ name: r.name, meta: `${r.sid} · ${r.program} ${r.batch}`, initials: ini(r.name) })),
      recDelHasMore: delRows.length > 4, recDelMore: `+ ${delRows.length - 4} more`,
      recDelBtn: delRows.length === 1 ? 'Delete record' : `Delete ${delRows.length} records`,
      recDelClose: () => setDel(null),
      recDelConfirm: () => {
        const ids = delRows.map((r) => r.sid);
        rec.removeRecords(ids);
        setSel((s) => { const x = { ...s }; ids.forEach((id) => delete x[id]); return x; });
        setDel(null); setDrawer(null);
        toast(ids.length === 1 ? `${delRows[0].name} deleted` : `${ids.length} records deleted`, ids);
      },
      recUndoOn: !!undoIds && !!toastMsg,
      recUndo: () => { const ids = undoIds || []; rec.restoreRecords(ids); toast(ids.length === 1 ? 'Record restored' : `${ids.length} records restored`); },
      recBulkVerify: () => setMany(selIds, { status: 'verified', note: '' }, `${n}${noun} marked verified`),
      recBulkFlag: () => setMany(selIds, { status: 'flagged' }, `${n}${noun} flagged for follow-up`),
      recBulkExport: () => { exportCsv(ROWS.filter((r) => selIds.includes(r.sid)), rec.recEmail); setSel({}); toast(`Exported ${n}${noun} to CSV`); },
      recBulkDelete: () => setDel([...selIds]),
      recDrawerCanApprove: !!(dr && dr.status !== 'verified'),
      recDrawerEdit: () => dr && formOpen(dr.sid),
      recDrawerDelete: () => dr && setDel([dr.sid]),
    };
  };

  const importRef = useRef(null);
  const onImport = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text).filter((r) => r.length >= 2 && r[0].trim());
    if (rows.length && /^name$/i.test(rows[0][0].trim())) rows.shift();
    if (!rows.length) { toast('No records found — expected columns: name, program, batch, employment, employer.'); return; }
    rows.forEach((r, i) => {
      const batchN = Number(r[2]) || 2026;
      const sid = `AM-${batchN}-${String(9500 + rec.added.length + i).padStart(5, '0')}`;
      rec.addRecord({ sid, name: r[0].trim(), ...importProgram((r[1] || 'BSIT').trim()), batch: batchN, employment: (r[3] || 'Employed Full-time').trim(), company: (r[4] || '—').trim() || '—', source: 'Admin encoded', status: 'pending', note: 'Imported from master list — awaiting verification.', updated: 'Oct 05, 2026' });
    });
    setTab('pending'); resetPage();
    toast(`Imported ${rows.length} record${rows.length === 1 ? '' : 's'} from ${file.name}`);
  };
  const crud = crudVals();
  const patchStatus = (sid, patch) => { rec.patchRecord(sid, patch); setDrawer(null); };
  const vals = {
    ...actVals(),
    ...crud,
    recResultLabel: num(filtered.length) + (filtered.length === 1 ? ' record' : ' records') + (q || prog !== 'all' || batch !== 'all' || emp !== 'all' ? ' match your filters' : ' in this view'),
    recHasQuery: !!q,
    recClearQuery: () => { setQuery(''); resetPage(); },
    recResetFilters: () => { setQuery(''); setProgram('all'); setBatch('all'); setEmp('all'); setTab('all'); resetPage(); },
    recNoSel: dept || !(selIds.length > 0),
    recProgSel: prog,
    recSetProgSel: (e) => { setProgram(e.target.value); resetPage(); setRowMenu(null); },
    recProgOpts: [{ value: 'all', label: dept ? 'All CCS programs' : 'All programs' }, ...progOpts(dept ? CCS_COLLEGE : null)],
    recIsDept: dept,
    recBatchSel: batch,
    recSetBatchSel: (e) => { setBatch(e.target.value); resetPage(); setRowMenu(null); },
    recBatchOpts: [{ value: 'all', label: 'All batches' }, ...Array.from(new Set(ROWS.map((r) => String(r.batch)))).sort((a, b) => b - a).map((b) => ({ value: b, label: `Batch ${b}` }))],
    recEmpSel: emp,
    recSetEmpSel: (e) => { setEmp(e.target.value); resetPage(); setRowMenu(null); },
    recEmpOpts: [{ value: 'all', label: 'All employment' }, ...Array.from(new Set(ROWS.map((r) => r.employment).filter(Boolean))).sort().map((v) => ({ value: v, label: v }))],
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
    recRowsView: pageRows.map((r) => {
      const on = !!sel[r.sid];
      const s = STY[r.status];
      const open = rowMenu === r.sid;
      return {
        ...r, statusLabel: s.label, statusBg: s.bg, statusColor: s.color, company: String(r.company || '').replace(/\s*\(self-reported\)$/, ''),
        isSelf: !!r.isSelf, syncLabel: profileSavedAt ? 'Profile synced' : 'Linked profile', initials: r.name.split(' ').map((w) => w[0]).slice(0, 2).join(''),
        progBatch: `${r.program} · Batch ${r.batch}`,
        checkBg: on ? '#0F3D2E' : '#fff', checkBorder: on ? '#0F3D2E' : '#C9CFD6', checkMark: on ? '✓' : '', hasNote: !!r.note,
        menuOpen: open, menuExpanded: open ? 'true' : 'false', dotsBg: open ? '#F1F3F5' : 'transparent', dotsColor: open ? '#5A6572' : '#A7B0BC',
        menuToggle: (e) => { e.stopPropagation(); setRowMenu(open ? null : r.sid); },
        menuHeading: r.status === 'flagged' ? 'FLAGGED RECORD' : r.status === 'verified' ? 'VERIFIED RECORD' : r.status === 'archived' ? 'ARCHIVED RECORD' : 'PENDING SUBMISSION',
        menuItems: [
          { k: 'history', label: 'View edit history / audit log', icon: '◷' },
          { k: 'email', label: r.status === 'verified' ? 'Send follow-up email' : 'Send email / follow-up link', icon: '✉' },
          { k: 'proof', label: r.status === 'flagged' ? 'Request document proof (SSS/BIR)' : 'Request document proof', icon: '⎙' },
          { k: 'reassign', label: 'Reassign program / batch', icon: '⇄' },
        ].map((m) => ({ ...m, color: '#334155', hover: { background: '#F4F6F8' }, onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); actOpen(m.k, r.sid); } })),
        menuDanger: [
          { k: 'archive', label: r.status === 'archived' ? 'Restore from archive' : 'Archive record', icon: '▣' },
          { k: 'dup', label: r.status === 'flagged' ? 'Confirm as duplicate' : 'Mark as duplicate / flag', icon: '⚑' },
        ].map((m) => ({ ...m, onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); actOpen(m.k, r.sid); } })),
        primaryAction: r.status === 'pending' ? 'Review' : r.status === 'flagged' ? 'Resolve' : r.status === 'archived' ? 'Restore' : 'View',
        rowBg: hi === r.sid ? '#FFF8E1' : on ? '#F5FAF7' : '#fff',
        onView: () => { setDrawer(r.sid); setRowMenu(null); },
        onEdit: () => formOpen(r.sid),
        onDelete: () => { setDel([r.sid]); setRowMenu(null); },
        toggle: () => setSel({ ...sel, [r.sid]: !on }),
        openReview: () => { setDrawer(r.sid); setRowMenu(null); },
      };
    }),
    recEmpty: filtered.length === 0,
    recAllMark: allOn ? '✓' : '', recAllBg: allOn ? '#0F3D2E' : '#fff', recAllBorder: allOn ? '#0F3D2E' : '#C9CFD6',
    recToggleAll: () => { const next = { ...sel }; visIds.forEach((id) => { next[id] = !allOn; }); setSel(next); },
    recPrevDisabled: page <= 1, recPrevBg: page <= 1 ? '#FAFBFB' : '#fff', recPrevColor: page <= 1 ? '#A7B0BC' : '#0B1220', recPrevCursor: page <= 1 ? 'not-allowed' : 'pointer', recPrevOpacity: page <= 1 ? 0.5 : 1,
    recPrev: () => { if (page > 1) setPage(page - 1); },
    recNextDisabled: page >= totalPages, recNextBg: page >= totalPages ? '#FAFBFB' : '#fff', recNextColor: page >= totalPages ? '#A7B0BC' : '#0B1220', recNextCursor: page >= totalPages ? 'not-allowed' : 'pointer', recNextOpacity: page >= totalPages ? 0.5 : 1,
    recNext: () => { if (page < totalPages) setPage(page + 1); },
    recPages: Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => ({ n: p, bg: p === page ? '#0F3D2E' : '#fff', color: p === page ? '#fff' : '#0B1220', border: p === page ? '#0F3D2E' : '#E2E5EA', weight: p === page ? 700 : 600, onClick: () => setPage(p) })),
    recDrawerOpen: !!dr,
    recDrawerName: dr ? dr.name : '', recDrawerSid: dr ? dr.sid : '', recDrawerInitials: dr ? dr.name.split(' ').map((w) => w[0]).slice(0, 2).join('') : '',
    recDrawerStatusLabel: dr ? STY[dr.status].label : '', recDrawerStatusBg: dr ? STY[dr.status].bg : '#fff', recDrawerStatusColor: dr ? STY[dr.status].color : '#000',
    recDrawerFacts: dr ? [
      { label: 'Degree program & batch', value: `${dr.program} · Batch ${dr.batch}` },
      { label: 'Self-reported employment', value: dr.employment },
      ...(dr.jobTitle ? [{ label: 'Job title', value: dr.jobTitle }] : []),
      { label: 'Employer (as reported)', value: String(dr.company || '').replace(/\s*\(self-reported\)$/, '') },
      ...(dr.mobile ? [{ label: 'Mobile', value: dr.mobile }] : []),
      ...(dr.address ? [{ label: 'Present address', value: dr.address }] : []),
      { label: 'Submitted via', value: dr.source }, { label: 'Last updated', value: dr.updated }, { label: 'Alumni membership ID', value: dr.sid }, { label: 'Email', value: rec.recEmail(dr) },
    ] : [],
    recDrawerHasFlag: !!(dr && dr.note), recDrawerFlag: dr ? dr.note : '',
    recDrawerProof: dr ? [
      { name: 'employment_certificate.pdf', meta: `Uploaded ${dr.updated} · 240 KB`, ok: true },
      { name: dr.status === 'flagged' ? 'SSS / BIR proof — missing' : 'company_id_front.jpg', meta: dr.status === 'flagged' ? 'Required for self-employment validation' : `Uploaded ${dr.updated} · 1.1 MB`, ok: dr.status !== 'flagged' },
    ] : [],
    recDrawerNote: adminNote, recDrawerSetNote: (e) => setAdminNote(e.target.value), recDrawerClose: () => setDrawer(null),
    recDrawerApprove: () => { if (dr) { patchStatus(dr.sid, { status: 'verified', note: '' }); rec.addLog(dr.sid, 'Record verified from the quick view'); } },
    recDrawerFlagAction: () => { if (dr) { patchStatus(dr.sid, { status: 'flagged', note: adminNote || 'More information requested from alumnus by Alumni Office.' }); rec.addLog(dr.sid, 'Flagged from the quick view'); } },
    recHasSel: !dept && selIds.length > 0,
    recCanEdit: !dept,
    recGridCols: dept ? 'minmax(0,1.8fr) minmax(0,1fr) minmax(0,1.5fr) minmax(0,.8fr) minmax(0,.8fr) 60px' : '34px minmax(0,1.8fr) minmax(0,1fr) minmax(0,1.5fr) minmax(0,.8fr) minmax(0,.8fr) 152px',
    recIsQueue: true,
    recDrawerStatusNote: dr ? ({ pending: 'Self-reported · awaiting Alumni Office verification', flagged: 'Flagged · needs follow-up before verification', verified: 'Verified by the Alumni Office · listed in Global Alumni Search', archived: 'Archived · hidden from search and reports' })[dr.status] || '' : '',
    recBatchBorder: selIds.length ? '#0F3D2E' : '#E2E5EA', recBatchBg: selIds.length ? '#0F3D2E' : '#F4F5F7', recBatchColor: selIds.length ? '#fff' : '#A7B0BC',
    recBatchOpacity: selIds.length ? 1 : 0.7, recBatchCursor: selIds.length ? 'pointer' : 'not-allowed', recBatchClick: selIds.length ? () => setSel({}) : () => {},
    recBatchNote: selIds.length ? `${selIds.length}${selIds.length === 1 ? ' record selected — batch actions available' : ' records selected — batch actions available'}` : 'Select one or more records to enable batch actions',
    recBatchNoteColor: selIds.length ? '#0F3D2E' : '#94A3B8',
    recSelLabel: selIds.length + (selIds.length === 1 ? ' record selected' : ' records selected'),
    recClearSel: () => setSel({}),
    recCountLabel: (() => {
      const total = filtered.length;
      const noun = tab === 'all' ? 'alumni records' : tab === 'pending' ? 'submissions pending review' : `${tab} records`;
      if (!total) return `Showing 0 of 0 ${noun}`;
      const from = (page - 1) * pageSize + 1;
      return `Showing ${from}–${from + pageRows.length - 1} of ${num(total)} ${noun} · Page ${page} of ${totalPages}`;
    })(),
    recStats: [
      { label: 'Total alumni records', value: num(TOT.all), sub: 'Membership IDs on file, batches 2017–2026', icon: 'M4 8h16v11H4z M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M4 13h16', iconBg: '#E7F0EE', iconColor: '#0F3D2E', pill: 'Last updated 11:40 PM', pillBg: '#F1F3F5', pillColor: '#475569', hasDot: false },
      { label: 'Pending review', value: num(TOT.pending), sub: 'Self-reported submissions awaiting Alumni Office review', icon: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4', iconBg: '#FBF0D8', iconColor: '#8A6D1F', pill: 'Oldest waiting 4 days', pillBg: '#FBF0D8', pillColor: '#8A6D1F', hasDot: true },
      { label: 'Flagged for follow-up', value: num(TOT.flagged), sub: 'Incomplete surveys, duplicates or unconfirmed IDs', icon: 'M5 21V4 M5 4h11l-2 4 2 4H5', iconBg: '#FDE7EC', iconColor: '#B3213C', pill: 'Needs resolution', pillBg: '#FDE7EC', pillColor: '#B3213C', hasDot: true },
      { label: 'Verified records', value: num(TOT.verified), sub: `${((TOT.verified / TOT.all) * 100).toFixed(1)}% of all alumni records (${num(TOT.archived)} archived)`, icon: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z M9 12l2 2 4-4', iconBg: '#E1F3EA', iconColor: '#0F6B4F', pill: '+184 this week', pillBg: '#E1F3EA', pillColor: '#0F6B4F', hasDot: false },
    ],
    recActionHover: { background: '#E7F0EE' },
    recDotsHover: { background: '#F1F3F5', color: '#5A6572' },
    recDotsFocus: { background: '#F1F3F5', color: '#5A6572', boxShadow: '0 0 0 3px rgba(15,61,46,.16)' },
    recDangerHover: { background: '#FDF2F5' },
    recAudit: [
      ...(profileSavedAt ? [{ who: alumniName, action: 'updated their profile —', target: 'record synced to Alumni Records', when: new Date(profileSavedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), color: '#0F6B4F', icon: 'M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5', iconBg: '#E7F0EE', iconBorder: '#D3E4DC', notLast: true }] : []),
      { who: 'System Admin (Alumni Office)', action: 'marked as reviewed', target: '14 self-reported submissions from Batch 2024', when: '2 hours ago', color: '#0F6B4F', icon: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z M9 12l2 2 4-4', iconBg: '#E1F3EA', iconBorder: '#CBE9DA', notLast: true },
      { who: 'M. Ocampo (Alumni Office)', action: 'imported', target: 'alumni_masterlist_2026.csv — 412 Membership IDs', when: 'Yesterday, 4:12 PM', color: '#0F3D2E', icon: 'M12 15V3 M7 8l5-5 5 5 M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4', iconBg: '#E7F0EE', iconBorder: '#D2E1DD', notLast: true },
      { who: 'Automated system task', action: 'flagged', target: '2 duplicate submissions under Membership ID AM-2022-01932', when: 'Sep 12, 2026', color: '#B3213C', icon: 'M5 21V4 M5 4h11l-2 4 2 4H5', iconBg: '#FDE7EC', iconBorder: '#F6CFD8', notLast: true },
      { who: 'R. Salvador (Alumni Office)', action: 'archived', target: '38 inactive records from pre-2018 cohorts', when: 'Sep 08, 2026', color: '#5A6572', icon: 'M3 4h18v4H3z M5 8v12h14V8 M10 12h4', iconBg: '#F1F3F5', iconBorder: '#E2E5EA', notLast: false },
    ],
    // shared toast (also used by the Reports page)
    recImport: () => importRef.current && importRef.current.click(),
    repToast: toastMsg || '',
    repToastClose: () => setToastMsg(null),
  };
  void nowLabel;
  return { vals, toastOn: !!toastMsg, importRef, onImport };
}

/** CSV imports give a program code or full name; resolve it onto a catalog course so college scoping works. */
function importProgram(p) {
  const course = progCourses(null).find((c) => c === p || progCode(c).toLowerCase() === p.toLowerCase());
  return course ? { course, college: progCollege(course), program: progCode(course) } : { program: p };
}

function exportCsv(rows, emailOf) {
  const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const head = ['Membership ID', 'Name', 'Email', 'Program', 'Batch', 'Employment', 'Employer', 'Status', 'Last updated'];
  const lines = [head, ...rows.map((r) => [r.sid, r.name, emailOf(r), r.program, r.batch, r.employment, String(r.company || '').replace(/\s*\(self-reported\)$/, ''), r.status, r.updated])];
  const blob = new Blob([`\uFEFF${lines.map((l) => l.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'alumni_records_export.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function parseCsv(text) {
  return String(text).replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim()).map((l) => { const out = []; let cur = ''; let q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; });
}

