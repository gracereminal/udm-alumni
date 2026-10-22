import { useCallback, useEffect, useRef, useState } from 'react';
import PortalPage from '../../layouts/PortalPage';
import Modal, { modalBtn } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { API_BASE, ApiError, del, get, post, qs, upload } from '../../lib/api';
import { hv } from '../../lib/stateStyle';

// Admin "AI Data Management" — per "UDM Alumni.dc.html": import the registrar masterlist (upload → AI review →
// preview & confirm → synced), export validated records, and the audit log. The API's validator proposes; nothing is
// written to the records until the admin confirms (backend ImportService).

const TEMPLATE = ['Student no.', 'Full name', 'College', 'Program', 'Year graduated', 'Personal email / mobile'];
const AI_DOES = [
  'Fixes name casing and spacing',
  'Maps programs to colleges; checks year 1999 – present',
  'Flags duplicates, missing fields and near-matches to existing records',
  'Scores every row with a confidence level',
  'Suggests fixes — and waits for you to decide',
];
const STEPS = ['Upload', 'AI review', 'Preview & confirm', 'Synced'];
const KIND = { new: ['New account', '#E6F0EB', '#0F3D2E'], update: ['Update existing', '#E6EFFA', '#1D4E89'], same: ['Already on file', '#EEF0F3', '#475569'] };
const DECIDED = { accept: 'AI suggestion accepted', keep: 'Kept as a new record', edit: 'Edited manually', reject: 'Rejected — row skipped' };
const TAG = { Import: ['#E6EFFA', '#1D4E89'], AI: ['#FBF0D8', '#6B4E00'], ID: ['#E6F0EB', '#0F3D2E'], Account: ['#E6F0EB', '#0F3D2E'], Password: ['#FBE9E7', '#B3261E'], Export: ['#EEF0F3', '#334155'], Rollback: ['#FBE9E7', '#B3261E'] };
const PAGE = 100;

const card = { background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column' };
const reset = { fontFamily: 'inherit', border: 'none', margin: 0 };
const chip = (on) => ({ ...reset, border: `1px solid ${on ? '#0F3D2E' : '#E7E9ED'}`, background: on ? '#0F3D2E' : '#fff', color: on ? '#fff' : '#334155', cursor: 'pointer' });
const ghost = { ...reset, fontSize: 13, fontWeight: 600, color: '#334155', border: '1px solid #E7E9ED', background: '#fff', borderRadius: 10, padding: '10px 16px', cursor: 'pointer' };
const gold = { ...reset, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: '#00332B', background: '#F0C428', borderRadius: 11, padding: '11px 16px', cursor: 'pointer' };
const green = { ...reset, fontSize: 13.5, fontWeight: 700, color: '#fff', background: '#0F3D2E', borderRadius: 11, padding: '11px 20px', cursor: 'pointer' };
const small = (color, bg, border) => ({ ...reset, fontSize: 12, fontWeight: 700, color, background: bg, border: border ? `1px solid ${border}` : 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' });
const label = { fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#94A3B8' };
const mono = { fontFamily: 'ui-monospace,Menlo,monospace' };
const confColor = (c) => (c >= 85 ? '#0F7A4F' : c >= 60 ? '#B07A00' : '#B3261E');
const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const errMsg = (e) => (e && e.message) || 'Something went wrong. Please try again.';

const TIME = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' });
const CLOCK = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' });
const logTime = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? '' : `${TIME.format(d)} · ${CLOCK.format(d)}`; };

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const BOM = String.fromCharCode(0xfeff);
const csvText = (rows) => `${BOM}${rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;

function Stat({ v, l, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.6, color }}>{Number(v || 0).toLocaleString()}</div>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{l}</div>
    </div>
  );
}
const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 };

export default function AiDataManagement() {
  const { toast } = useToast();
  const [tab, setTab] = useState('import');
  const [batch, setBatch] = useState(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState('');
  const [rollback, setRollback] = useState(false);

  useEffect(() => {
    let live = true;
    get('/imports').then((r) => { if (live) setBatch(r.data); }).catch(() => {}).finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  const work = async (key, fn) => {
    if (busy) return null;
    setBusy(key);
    try { return await fn(); } catch (e) { toast(errMsg(e), false); return null; } finally { setBusy(''); }
  };

  const synced = batch && batch.status !== 'review';
  const step = !batch || !batch.validated ? 1 : synced ? 4 : preview ? 3 : 2;

  const tabs = [['import', 'Import masterlist'], ['export', 'Export records'], ['log', 'Audit log']];

  return (
    <PortalPage
      label="AI Data Management"
      title="AI Data Management"
      caption="UDM ALUMNI · MASTERLIST IMPORT & EXPORT"
      tone="gold"
      actions={<div data-m="ai-pill" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: '#00332B', background: '#F0C428', borderRadius: 999, padding: '6px 12px' }}>ADMIN ONLY</div>}
      contentStyle={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 32 }}
    >
      <div data-m="ai-banner" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#0F3D2E', color: '#fff', borderRadius: 16, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}><span style={{ color: '#F0C428' }}>AI proposes</span><span style={{ opacity: 0.5 }}>→</span><span>Admin approves</span></div>
        <div style={{ fontSize: 12.5, color: '#CFE3DA', flex: '1 1 280px', minWidth: 0, textWrap: 'pretty' }}>AI never commits a change on its own. Every account, ID and password action is written to the audit log. Temporary passwords are hashed and never displayed.</div>
      </div>
      <div data-m="ai-tabs" role="tablist" aria-label="AI Data Management" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ ...chip(tab === k), display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{l}</button>
        ))}
      </div>

      {tab === 'import' && ready ? (
        <>
          <Steps step={step} />
          {step === 1 ? <UploadStep batch={batch} setBatch={setBatch} busy={busy} work={work} /> : null}
          {step === 2 ? <ReviewStep batch={batch} setBatch={setBatch} busy={busy} work={work} onBack={() => setBatch({ ...batch, validated: false })} onNext={() => setPreview(true)} /> : null}
          {step === 3 ? <PreviewStep batch={batch} busy={busy} onBack={() => setPreview(false)} onConfirm={() => work('confirm', async () => { const out = await post(`/imports/${batch.id}/confirm`); setBatch(out); setPreview(false); })} /> : null}
          {step === 4 ? <DoneStep batch={batch} onRollback={() => setRollback(true)} onLog={() => setTab('log')} onRestart={() => { setBatch(null); setPreview(false); }} /> : null}
        </>
      ) : null}
      {tab === 'export' ? <ExportTab /> : null}
      {tab === 'log' ? <LogTab /> : null}

      <Modal
        open={rollback}
        onClose={() => setRollback(false)}
        title="Roll back this batch?"
        labelledBy="ai-rollback-title"
        footer={(
          <>
            <button type="button" onClick={() => setRollback(false)} style={modalBtn(false)}>Keep batch</button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => work('rollback', async () => {
                const out = await post(`/imports/${batch.id}/rollback`);
                setBatch(null); setPreview(false);
                toast(`Batch ${out.code} rolled back · accounts and IDs reverted`);
              }).then(() => setRollback(false))}
              style={{ ...modalBtn(true), background: '#B42318' }}
            >
              Roll back
            </button>
          </>
        )}
      >
        {batch && batch.result ? `The ${plural(batch.result.created, 'account')} and records created by ${batch.code} will be removed and the ${plural(batch.result.updated, 'updated record')} restored. This is refused once any of these alumni has signed in.` : null}
      </Modal>
    </PortalPage>
  );
}

function Steps({ step }) {
  return (
    <div data-m="ai-steps" style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, padding: '14px 18px', flexWrap: 'wrap', rowGap: 10 }}>
      {STEPS.map((l, i) => {
        const n = i + 1;
        const on = n === step;
        const done = n < step;
        return (
          <div key={l} aria-current={on ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 160px', minWidth: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: on ? '#F0C428' : done ? '#0F3D2E' : '#fff', color: on ? '#00332B' : done ? '#fff' : '#94A3B8', border: `1px solid ${on ? '#F0C428' : done ? '#0F3D2E' : '#E3E8E5'}` }}>{done ? '✓' : n}</div>
            <div style={{ fontSize: 13, fontWeight: on ? 700 : 600, color: on || done ? '#0B1220' : '#94A3B8', whiteSpace: 'nowrap' }}>{l}</div>
            <div style={{ height: 1, background: '#E3E8E5', flex: 1, minWidth: 12 }} />
          </div>
        );
      })}
    </div>
  );
}

// --- Step 1: upload ----------------------------------------------------------------------------------

function UploadStep({ batch, setBatch, busy, work }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const pick = () => fileRef.current && fileRef.current.click();
  const send = (file) => work('upload', async () => {
    if (batch && batch.status === 'review') await del(`/imports/${batch.id}`);
    setBatch(null);
    setBatch(await upload('/imports', 'file', file));
  });
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) send(f); };
  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) send(f); };
  const cols = batch ? batch.columns : TEMPLATE.map((l) => ({ label: l, found: null }));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
      <div style={{ ...card, gap: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>1 · Import official masterlist</div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} style={{ display: 'none' }} aria-label="Masterlist file" />
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={{ border: `2px dashed ${drag ? '#0F3D2E' : '#CFE3DA'}`, background: '#F7FBF9', borderRadius: 14, padding: 22, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E6F0EB', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }} aria-hidden="true"><path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1220', overflowWrap: 'anywhere' }}>{busy === 'upload' ? 'Reading the file…' : batch ? batch.fileName : 'Drop the masterlist here'}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{batch ? `${plural(batch.rowCount, 'row')} · ${batch.code} · CSV or Excel accepted` : 'CSV or Excel (.xlsx) accepted · up to 2,000 rows'}</div>
          </div>
          <button type="button" onClick={pick} disabled={!!busy} style={{ ...reset, fontSize: 12.5, fontWeight: 600, color: '#334155', border: '1px solid #E7E9ED', background: '#fff', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>{batch ? 'Replace file' : 'Choose file'}</button>
        </div>
        <div style={label}>TEMPLATE CHECK</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
          {cols.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: c.found === false ? '#94A3B8' : '#0B1220', background: '#F7F8FA', borderRadius: 8, padding: '7px 10px' }} title={c.found === false ? 'Not in this file (optional)' : undefined}>
              <span aria-hidden="true" style={{ color: c.found ? '#0F7A4F' : '#94A3B8', fontWeight: 800 }}>{c.found ? '✓' : c.found === false ? '–' : '•'}</span>{c.label}
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card, gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>What the AI will do</div>
        {AI_DOES.map((d) => (
          <div key={d} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#334155', lineHeight: 1.45 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F0C428', flex: 'none', marginTop: 7 }} /><span style={{ textWrap: 'pretty' }}>{d}</span></div>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          disabled={!batch || !!busy}
          onClick={() => work('validate', async () => setBatch(await post(`/imports/${batch.id}/validate`)))}
          style={{ ...gold, ...(batch ? {} : { background: '#EEF0F3', color: '#94A3B8', cursor: 'not-allowed' }) }}
          {...(batch ? hv({ background: '#E6B91C' }) : {})}
        >
          {busy === 'validate' ? 'Validating…' : 'Run AI validation'}
        </button>
      </div>
    </div>
  );
}

// --- Step 2: AI review -------------------------------------------------------------------------------

function ReviewStep({ batch, setBatch, busy, work, onBack, onNext }) {
  const [filt, setFilt] = useState('all');
  const [editing, setEditing] = useState(null); // { id, val, error }
  const [limit, setLimit] = useState(PAGE);
  const s = batch.stats;
  const rows = batch.rows.filter((r) => filt === 'all' || r.flag);
  const decide = (r, body) => work(`row${r.id}`, async () => {
    try {
      setBatch(await post(`/imports/${batch.id}/rows/${r.id}`, body));
      setEditing(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && body.action === 'edit') setEditing((x) => ({ ...x, error: (e.fields && e.fields.value) || e.message }));
      else throw e;
    }
  });

  return (
    <>
      <div style={statGrid}>
        <Stat v={s.rows} l="Rows in batch" color="#0B1220" />
        <Stat v={s.ready} l="Ready" color="#0F7A4F" />
        <Stat v={s.flagged} l="Flagged by AI" color="#B07A00" />
        <Stat v={s.open} l="Awaiting your decision" color={s.open ? '#B3261E' : '#0F7A4F'} />
      </div>
      <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 18px', background: '#FBFAF7' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>AI review · proposed changes</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all', 'All rows'], ['flag', 'Flagged only']].map(([k, l]) => (
              <button key={k} type="button" aria-pressed={filt === k} onClick={() => { setFilt(k); setLimit(PAGE); }} style={{ ...chip(filt === k), fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{l}</button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? <div style={{ borderTop: '1px solid #F1F2F4', padding: '18px', fontSize: 13, color: '#64748B' }}>No flagged rows — every row passed the checks.</div> : null}
        {rows.slice(0, limit).map((r) => <ReviewRow key={r.id} r={r} busy={busy === `row${r.id}`} editing={editing && editing.id === r.id ? editing : null} setEditing={setEditing} decide={decide} />)}
        {rows.length > limit ? (
          <div style={{ borderTop: '1px solid #F1F2F4', padding: '12px 18px' }}>
            <button type="button" onClick={() => setLimit(limit + PAGE)} style={ghost}>Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}</button>
          </div>
        ) : null}
      </div>
      <div data-m="ai-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={ghost}>Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12.5, color: '#64748B' }}>{s.open ? `${plural(s.open, 'flagged row')} need${s.open === 1 ? 's' : ''} a decision` : 'All flagged rows resolved'}</div>
          <button type="button" disabled={s.open > 0} onClick={onNext} style={{ ...reset, fontSize: 13.5, fontWeight: 700, borderRadius: 11, padding: '10px 18px', cursor: s.open ? 'not-allowed' : 'pointer', background: s.open ? '#EEF0F3' : '#0F3D2E', color: s.open ? '#94A3B8' : '#fff' }}>Preview changes</button>
        </div>
      </div>
    </>
  );
}

function ReviewRow({ r, busy, editing, setEditing, decide }) {
  const kind = KIND[r.kind] || KIND.new;
  const f = r.flag;
  const pending = r.status === 'pending';
  const resolved = r.status === 'resolved' || r.status === 'rejected';
  const meta = [r.program, r.college, r.year, r.email].filter(Boolean).join(' · ') + (r.target ? ` · updates ${r.target.membershipId}` : '');
  const isYear = f && f.field === 'year';
  const val = editing ? editing.val : '';
  const now = new Date().getFullYear();
  const field = f && f.field;
  const CHECK = {
    year: [/^\d{4}$/.test(val) && +val >= 1999 && +val <= now, `Enter a 4-digit year between 1999 and ${now}.`],
    email: [/^\S+@\S+\.\S+$/.test(val), 'Enter a valid email address.'],
    student_no: [/^\d{2}-\d{2}-\d{3}$/.test(val.trim()), 'Use the format YY-NN-NNN (e.g. 21-05-123).'],
    mobile: [true, ''],
  };
  const [ok, wrong] = !field ? [false, ''] : CHECK[field] || [val.trim() !== '', 'Enter a value.'];
  const bad = !!val && !ok;
  const hint = { year: 'e.g. 2021', email: 'name@gmail.com', student_no: 'e.g. 21-05-123', mobile: '09XX XXX XXXX', college: 'e.g. CCS', program: 'e.g. BSIT', name: 'Last, First Middle' }[field] || '';
  const help = editing && editing.error ? editing.error : bad ? wrong : 'Your value replaces the source data for this row.';

  return (
    <div style={{ borderTop: '1px solid #F1F2F4', padding: '13px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start', background: pending ? '#FFFDF4' : '#fff' }}>
      <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0B1220' }}>{r.name || r.raw || `Row ${r.rowNo}`}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: kind[1], color: kind[2] }}>{kind[0]}</span>
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', ...mono, overflowWrap: 'anywhere' }}>source: {r.raw || '(blank)'} · row {r.rowNo}</div>
        <div style={{ fontSize: 12.5, color: '#64748B' }}>{meta}</div>
        {!f && r.notes.length ? <div style={{ fontSize: 12, color: '#1D4E89', background: '#E6EFFA', borderRadius: 6, padding: '3px 8px', width: 'fit-content', maxWidth: '100%' }}>AI: {r.notes.join(' · ')}</div> : null}
        {f ? (
          <div style={{ marginTop: 4, border: '1px solid #F0D9A6', background: '#FFF9E8', borderRadius: 10, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#6B4E00' }}>⚑ {f.message}</div>
            {f.suggestion ? <div style={{ fontSize: 12.5, color: '#334155' }}><b>AI suggestion:</b> {f.suggestion}</div> : null}
            {pending && editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                <label htmlFor={`ai-edit-${r.id}`} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#6B4E00' }}>{isYear ? `YEAR GRADUATED (1999 – ${now})` : f.fieldLabel}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    id={`ai-edit-${r.id}`}
                    value={val}
                    onChange={(e) => setEditing({ id: r.id, val: e.target.value, error: '' })}
                    onKeyDown={(e) => { if (e.key === 'Enter' && ok) decide(r, { action: 'edit', field: f.field, value: val }); }}
                    placeholder={hint}
                    style={{ flex: '1 1 140px', minWidth: 0, height: 38, boxSizing: 'border-box', border: `1px solid ${bad || (editing && editing.error) ? '#B3261E' : '#E7E9ED'}`, borderRadius: 8, padding: '0 10px', fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#0B1220', outline: 'none' }}
                  />
                  <button type="button" disabled={!ok || busy} onClick={() => decide(r, { action: 'edit', field: f.field, value: val })} style={{ ...reset, fontSize: 12, fontWeight: 700, color: ok ? '#fff' : '#94A3B8', background: ok ? '#0F3D2E' : '#EEF0F3', borderRadius: 8, padding: '10px 14px', cursor: ok ? 'pointer' : 'not-allowed' }}>Save</button>
                  <button type="button" onClick={() => setEditing(null)} style={{ ...reset, fontSize: 12, fontWeight: 700, color: '#334155', background: '#fff', border: '1px solid #E7E9ED', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>Cancel</button>
                </div>
                <div style={{ fontSize: 11.5, color: editing.error || bad ? '#B3261E' : '#64748B' }}>{help}</div>
              </div>
            ) : null}
            {pending && !editing ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                {f.suggestion ? <button type="button" disabled={busy} onClick={() => decide(r, { action: 'accept' })} style={small('#fff', '#0F3D2E')} {...hv({ background: '#00251F' })}>Accept suggestion</button> : null}
                {f.field ? <button type="button" disabled={busy} onClick={() => setEditing({ id: r.id, val: String((r.values && r.values[f.field]) || ''), error: '' })} style={small('#334155', '#fff', '#E7E9ED')}>Edit manually</button> : null}
                {f.keep ? <button type="button" disabled={busy} onClick={() => decide(r, { action: 'keep' })} style={small('#334155', '#fff', '#E7E9ED')}>{f.keep}</button> : null}
                <button type="button" disabled={busy} onClick={() => decide(r, { action: 'reject' })} style={small('#B3261E', '#fff', '#F3C9C5')}>Reject row</button>
              </div>
            ) : null}
            {resolved ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, color: r.status === 'rejected' ? '#B3261E' : '#0F7A4F' }}>
                {DECIDED[r.decision] || 'Resolved'}
                <button type="button" disabled={busy} onClick={() => decide(r, { action: 'undo' })} style={{ ...reset, background: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: '#64748B', textDecoration: 'underline', cursor: 'pointer' }}>Undo</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div data-m="ai-conf" style={{ flex: 'none', width: 96, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#94A3B8' }}>CONFIDENCE</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: confColor(r.confidence) }}>{r.confidence}%</div>
        <div style={{ width: 96, height: 5, borderRadius: 3, background: '#EEF0F3' }}><div style={{ height: 5, borderRadius: 3, background: confColor(r.confidence), width: `${r.confidence}%` }} /></div>
      </div>
    </div>
  );
}

// --- Step 3: preview & confirm -----------------------------------------------------------------------

function PreviewStep({ batch, busy, onBack, onConfirm }) {
  const [limit, setLimit] = useState(PAGE);
  const s = batch.stats;
  const inc = batch.rows.filter((r) => (r.status === 'ready' || r.status === 'resolved') && r.kind !== 'same');
  const line = (k, v, isMono) => (
    <div key={k + v}><span style={{ display: 'inline-block', width: 64, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: '#94A3B8' }}>{k}</span><span style={isMono ? mono : undefined}>{v}</span></div>
  );

  return (
    <>
      <div style={statGrid}>
        <Stat v={s.new} l="New accounts" color="#0F7A4F" />
        <Stat v={s.update} l="Updated" color="#1D4E89" />
        <Stat v={s.rejected + s.unchanged} l={s.unchanged ? `Skipped (${s.unchanged} already on file)` : 'Skipped'} color="#B3261E" />
        <Stat v={s.new} l="Temp passwords to email" color="#0B1220" />
      </div>
      <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', background: '#FBFAF7', fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Before → after · nothing is saved until you confirm</div>
        {inc.slice(0, limit).map((r) => (
          <div key={r.id} style={{ borderTop: '1px solid #F1F2F4', padding: '12px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0B1220' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{r.kind === 'new' ? 'New' : 'Update'} · {[r.program, r.college, r.year].filter(Boolean).join(' · ')}</div>
            </div>
            <div style={{ flex: '2 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: '#334155', overflowWrap: 'anywhere' }}>
              {r.kind === 'new' ? (
                <>
                  {line('ID', `AM-${r.year}-····· (assigned on confirm)`, true)}
                  {line('EMAIL', r.email)}
                  {line('ACCOUNT', 'Active · temporary password (hashed) · must change on first sign-in')}
                </>
              ) : (
                <>
                  {line('ID', `${r.target.membershipId} (kept)`, true)}
                  {r.changes.map((c) => line(c.label, `${c.from} → ${c.to}`))}
                  {line('ACCOUNT', 'Email and password unchanged')}
                </>
              )}
            </div>
          </div>
        ))}
        {inc.length > limit ? (
          <div style={{ borderTop: '1px solid #F1F2F4', padding: '12px 18px' }}>
            <button type="button" onClick={() => setLimit(limit + PAGE)} style={ghost}>Show {Math.min(PAGE, inc.length - limit)} more of {inc.length - limit}</button>
          </div>
        ) : null}
      </div>
      <div style={{ background: '#FFF9E8', border: '1px solid #F0D9A6', borderRadius: 14, padding: '14px 18px', fontSize: 12.5, color: '#4A3A10', lineHeight: 1.55, textWrap: 'pretty' }}>
        <b>Passwords:</b> a random 12-character temporary password is generated per new account, stored hashed and sent only to the alumnus&apos;s personal email (expires in 7 days; first sign-in forces a new password). It is never shown here or written to the log. Contact-privacy switches stay OFF until alumni opt in.
      </div>
      <div data-m="ai-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={onBack} style={ghost}>Back to review</button>
        <button type="button" disabled={!!busy || inc.length === 0} onClick={onConfirm} style={{ ...green, ...(inc.length ? {} : { background: '#EEF0F3', color: '#94A3B8', cursor: 'not-allowed' }) }} {...(inc.length ? hv({ background: '#00251F' }) : {})}>
          {busy === 'confirm' ? 'Syncing…' : `Confirm & sync ${plural(inc.length, 'record')}`}
        </button>
      </div>
    </>
  );
}

// --- Step 4: synced ----------------------------------------------------------------------------------

function DoneStep({ batch, onRollback, onLog, onRestart }) {
  const res = batch.result || {};
  const rolledBack = batch.status === 'rolled_back';
  const rejected = batch.rows.filter((r) => r.status === 'rejected');
  const total = (res.created || 0) + (res.updated || 0);
  const lines = [
    `${plural(res.created || 0, 'account')} created and ${(res.updated || 0).toLocaleString()} updated`,
    res.emailFailed ? `Temporary passwords emailed to ${plural(res.emailed || 0, 'personal address', 'personal addresses')} · ${res.emailFailed} could not be sent (they can use Forgot password)` : `Temporary passwords emailed to ${plural(res.emailed || 0, 'personal address', 'personal addresses')} (expire in 7 days)`,
    'Alumni Profile, College dashboards and directory refreshed',
    rejected.length ? `${plural(rejected.length, 'rejected row')} skipped — error report available as CSV` : 'No rows were rejected',
  ];
  const report = () => download('UDM_Import_Error_Report.csv', new Blob([csvText([['Row', 'Source name', 'Program', 'Year', 'Reason'], ...rejected.map((r) => [r.rowNo, r.raw, r.program, r.year, r.reason || 'Rejected by the admin'])])], { type: 'text/csv;charset=utf-8' }));

  return (
    <div style={{ ...card, padding: 28, gap: 16, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: rolledBack ? '#FBE9E7' : '#E6F0EB', color: rolledBack ? '#B3261E' : '#0F7A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flex: 'none' }} aria-hidden="true">{rolledBack ? '↺' : '✓'}</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: '#0B1220' }}>{rolledBack ? `Batch ${batch.code} rolled back` : `Synced ${plural(total, 'record')} to the portal`}</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Batch {batch.code} · confirmed by {batch.confirmedBy || 'an admin'} · written to the audit log</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5, color: '#334155' }}>
        {lines.map((l) => <div key={l} style={{ display: 'flex', gap: 10 }}><span style={{ color: '#0F7A4F', fontWeight: 800 }} aria-hidden="true">✓</span><span>{l}</span></div>)}
      </div>
      <div data-m="ai-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {rejected.length ? <button type="button" onClick={report} style={ghost}>Download error report (CSV)</button> : null}
        {!rolledBack ? <button type="button" onClick={onRollback} style={{ ...ghost, fontWeight: 700, color: '#B3261E', border: '1px solid #F3C9C5' }}>Roll back this batch</button> : null}
        <button type="button" onClick={onLog} style={ghost}>View audit log</button>
        <button type="button" onClick={onRestart} style={{ ...gold, fontSize: 13, borderRadius: 10, padding: '10px 16px' }}>New import</button>
      </div>
    </div>
  );
}

// --- Export records ----------------------------------------------------------------------------------

function ExportTab() {
  const { toast } = useToast();
  const [ex, setEx] = useState({ college: '', batch: '', status: 'verified' });
  const [fmt, setFmt] = useState('xlsx');
  const [data, setData] = useState(null);
  const [exported, setExported] = useState(false);
  const [busy, setBusy] = useState(false);
  const filters = { college_id: ex.college, batch: ex.batch, status: ex.status };

  useEffect(() => {
    let live = true;
    get(`/imports/export${qs(filters)}`).then((d) => { if (live) setData(d); }).catch((e) => toast(errMsg(e), false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.college, ex.batch, ex.status]);

  const set = (patch) => { setEx({ ...ex, ...patch }); setExported(false); };
  const groups = data ? [
    ['COLLEGE', [['', 'All colleges'], ...data.colleges.map((c) => [String(c.id), c.code])], 'college'],
    ['BATCH', [['', 'All years'], ...data.batches.map((y) => [String(y), String(y)])], 'batch'],
    ['STATUS', [['verified', 'Verified'], ['flagged', 'Flagged']], 'status'],
  ] : [];
  const go = async () => {
    if (!data || !data.total || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/imports/export${qs({ ...filters, format: fmt })}`, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (!res.ok) { let msg = 'The export failed. Please try again.'; try { msg = (await res.json()).error || msg; } catch { /* not JSON */ } throw new Error(msg); }
      const name = (/filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '') || [])[1] || `UDM_Alumni_Export.${fmt}`;
      download(name, await res.blob());
      setExported(true);
    } catch (e) { toast(errMsg(e), false); } finally { setBusy(false); }
  };
  const fmtLabel = fmt === 'csv' ? 'CSV' : 'Excel';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
      <div style={{ ...card, gap: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Export validated records</div>
        {groups.map(([title, opts, key]) => (
          <div key={title} role="group" aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={label}>{title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {opts.map(([v, l]) => (
                <button key={v || l} type="button" aria-pressed={ex[key] === v} onClick={() => set({ [key]: v })} style={{ ...chip(ex[key] === v), fontSize: 12.5, fontWeight: 600, padding: '6px 13px', borderRadius: 999 }}>{l}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6 }}>
          {[['csv', 'CSV'], ['xlsx', 'Excel']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={fmt === v} onClick={() => { setFmt(v); setExported(false); }} style={{ ...chip(fmt === v), flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, padding: 9, borderRadius: 10 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ ...card, gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Preview</div>
        <div style={{ fontSize: 13, color: '#64748B' }}>
          {!data ? 'Loading…' : data.total ? `${data.total.toLocaleString()} ${ex.status === 'verified' ? 'validated' : 'flagged'} record${data.total === 1 ? '' : 's'} match · showing first ${data.rows.length}` : `No ${ex.status} records match these filters`}
        </div>
        <div data-m="ai-exptable" style={{ border: '1px solid #EEF0F3', borderRadius: 12, overflow: 'hidden', fontSize: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr .8fr .6fr', gap: 8, padding: '8px 12px', background: '#FBFAF7', fontWeight: 700, color: '#64748B' }}><span>Alumni ID</span><span>Name</span><span>Program</span><span>Year</span></div>
          {(data ? data.rows : []).map((r) => (
            <div key={r.membershipId} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr .8fr .6fr', gap: 8, padding: '8px 12px', borderTop: '1px solid #F1F2F4', color: '#0B1220' }}><span style={mono}>{r.membershipId}</span><span>{r.name}</span><span>{r.program}</span><span>{r.year}</span></div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#64748B', textWrap: 'pretty' }}>
          {ex.status === 'verified' ? 'Only records that passed validation are included.' : 'Flagged records still need review — export them to correct the source list, then re-import.'} Same template as import, so data round-trips. Passwords are never exported.
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" disabled={!data || !data.total || busy} onClick={go} style={{ ...gold, ...(data && data.total ? {} : { background: '#EEF0F3', color: '#94A3B8', cursor: 'not-allowed' }) }} {...(data && data.total ? hv({ background: '#E6B91C' }) : {})}>
          {busy ? 'Exporting…' : exported ? '✓ Exported — logged' : `Export ${fmtLabel}`}
        </button>
      </div>
    </div>
  );
}

// --- Audit log ---------------------------------------------------------------------------------------

function LogTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => get('/imports/log').then((r) => setRows(r.data)).catch((e) => setError(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 18px', background: '#FBFAF7' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1220' }}>Audit log</div>
        <div style={{ fontSize: 12, color: '#64748B' }}>Append-only · cannot be edited or deleted · no passwords recorded</div>
      </div>
      {error ? <div style={{ borderTop: '1px solid #F1F2F4', padding: 18, fontSize: 13, color: '#B3261E' }}>{error}</div> : null}
      {rows && rows.length === 0 ? <div style={{ borderTop: '1px solid #F1F2F4', padding: 18, fontSize: 13, color: '#64748B' }}>No imports or exports yet.</div> : null}
      {(rows || []).map((e) => {
        const [bg, color] = TAG[e.tag] || TAG.Export;
        return (
          <div key={e.id} style={{ borderTop: '1px solid #F1F2F4', padding: '12px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 'none', width: 96, fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{logTime(e.at)}</div>
            <div style={{ flex: 'none', width: 84 }}><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: bg, color }}>{e.tag}</span></div>
            <div style={{ flex: '1 1 260px', minWidth: 0, fontSize: 13, color: '#0B1220', textWrap: 'pretty' }}>{e.text}</div>
            <div style={{ flex: 'none', fontSize: 12, color: '#64748B' }}>{e.who}</div>
          </div>
        );
      })}
    </div>
  );
}
