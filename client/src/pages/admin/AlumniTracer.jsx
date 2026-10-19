import { useState } from 'react';
import PortalPage from '../../layouts/PortalPage';
import Modal, { modalBtn } from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import useNarrow from '../../hooks/useNarrow';
import { hv } from '../../lib/stateStyle';
import { regStepDefs, regPasswordStep, surveySectionDefs } from '../../data/formDefs';
import { questionApi, useQuestionConfig } from '../../lib/questionStore';

const R = 'Register';
const P = 'Edit Profile';
const TYPE_LABEL = { text: 'Short text', textarea: 'Long text', choice: 'Single choice', select: 'Dropdown', multi: 'Multi-select', date: 'Date', password: 'Password', combo: 'Type or select' };
const OPT_TYPES = ['choice', 'select', 'multi'];
const PH_TYPES = ['text', 'textarea', 'select', 'combo', 'password'];
const ADD_TYPES = [['text', 'Short text'], ['textarea', 'Long text'], ['choice', 'Single choice'], ['select', 'Dropdown'], ['multi', 'Multi-select']];

const card = { background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, boxShadow: '0 1px 2px rgba(16,24,40,.04)', overflow: 'hidden' };
const input = { border: '1px solid #D5DAE0', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontFamily: 'inherit', color: '#0B1220', background: '#fff', width: '100%', boxSizing: 'border-box' };
const fieldLabel = { fontSize: 11.5, fontWeight: 700, color: '#475569', letterSpacing: 0.2 };
const tag = (bg, color) => ({ fontSize: 11, fontWeight: 600, color, background: bg, padding: '2px 8px', borderRadius: 6 });
const btnGhost = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#334155', border: '1px solid #E7E9ED', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', background: '#fff' };
const btnPrimary = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: '#0F3D2E', border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' };
const linkBtn = (color) => ({ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', padding: 0 });
const chip = (on) => ({ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? '#0F3D2E' : '#D5DAE0'}`, background: on ? '#0F3D2E' : '#fff', color: on ? '#fff' : '#334155' });
const lines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

/** The Register / Edit Profile sections the admin can manage, with every question (hidden ones included). */
function sectionDefs() {
  const reg = regStepDefs({}, { raw: true });
  const sv = surveySectionDefs({ raw: true });
  const s = (id) => sv.find((x) => x.id === id).questions;
  return [
    { key: 'personal', title: 'Personal Information', tag: 'SECTION II', qs: reg[0].questions, ap: [R, P] },
    { key: 'contact', title: 'Contact & Social Media', tag: 'SECTION II', qs: reg[1].questions, ap: [R, P] },
    { key: 'education', title: 'Educational Background', tag: 'SECTION III', qs: reg[2].questions, ap: [R, P] },
    { key: 'edu', title: 'Additional Education Details', tag: 'SECTION III', qs: s('edu'), ap: [P] },
    { key: 'password', title: 'Account Password', tag: 'REGISTRATION ONLY', qs: regPasswordStep({ raw: true }).questions, ap: [R] },
    { key: 'employment', title: 'Employment Information', tag: 'SECTION IV', qs: s('employment'), ap: [P] },
    { key: 'details', title: 'Employment Details', tag: 'SECTION V', qs: s('details'), ap: [P], cond: 'Shown if ever employed = Yes' },
    { key: 'self', title: 'Self-Employment Information', tag: 'SECTION VI', qs: s('self'), ap: [P], cond: 'Shown if self-employed' },
    { key: 'feedback', title: 'Alumni Feedback', tag: 'SECTION VII', qs: s('feedback'), ap: [P] },
  ];
}

function Toggle({ on, locked, label, onClick, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-disabled={locked || undefined}
      title={title}
      onClick={locked ? undefined : onClick}
      style={{ width: 34, height: 20, borderRadius: 999, background: on ? '#0F3D2E' : '#CBD2D9', position: 'relative', cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1, transition: 'background .15s', border: 'none', padding: 0, flex: 'none' }}
    >
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.25)', transition: 'left .15s' }} />
    </button>
  );
}

/** Admin "Alumni Tracer": manage the questions shown on the alumni Register form and Edit Profile page — per "UDM Alumni.dc.html". */
export default function AlumniTracer() {
  const config = useQuestionConfig();
  const { toast } = useToast();
  const narrow = useNarrow();
  const [tab, setTab] = useState('all');
  const [ed, setEd] = useState(null); // { id, label, placeholder, optText, hasOpt }
  const [add, setAdd] = useState(null); // { sec, label, type, optText }
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(null);

  const defs = sectionDefs();
  const close = () => { setEd(null); setAdd(null); setErr(''); };
  /** Saves through the API; every form uses the new questions once it answers. `done` runs on success. */
  const run = (work, done) => work.then(() => { if (done) done(); }).catch((e) => toast(e.message || 'The change could not be saved. Please try again.', false));
  const sum = (f) => defs.filter(f).reduce((n, d) => n + d.qs.length, 0);
  const tabs = [['all', 'All questions', sum(() => true)], ['register', R, sum((d) => d.ap.includes(R))], ['profile', P, sum((d) => d.ap.includes(P))]];
  const changes = Object.keys(config.ov).length + config.custom.length + Object.keys(config.order).length;
  const groups = defs.filter((d) => tab === 'all' || d.ap.includes(tab === 'register' ? R : P));

  const move = (d, i, dir) => {
    const ids = d.qs.map((q) => q.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(questionApi.order(d.key, ids));
  };
  const secOf = (id) => (defs.find((d) => d.qs.some((q) => q.id === id)) || {}).key;
  const setOv = (id, patch) => run(questionApi.update(id, secOf(id), patch));

  const openEdit = (q) => {
    if (ed && ed.id === q.id) { close(); return; }
    setAdd(null); setErr('');
    setEd({ id: q.id, label: q.label, placeholder: q.placeholder || '', optText: (q.options || []).join('\n'), hasOpt: OPT_TYPES.includes(q.type) && !q.linked });
  };
  const saveEdit = () => {
    const label = ed.label.trim();
    const opts = lines(ed.optText);
    if (!label) { setErr('Enter the question text.'); return; }
    if (ed.hasOpt && opts.length < 2) { setErr('Add at least 2 answer options, one per line.'); return; }
    run(questionApi.update(ed.id, secOf(ed.id), { label, placeholder: ed.placeholder, ...(ed.hasOpt ? { options: opts } : {}) }), () => {
      close();
      toast('Question updated on the alumni forms.');
    });
  };
  const resetText = (q) => {
    // Only the text edits are cleared; Required / Shown stay as the Admin set them.
    // (options only when they were edited: the API refuses any options change on linked / stats questions)
    run(questionApi.update(q.id, secOf(q.id), { label: null, placeholder: null, ...(config.ov[q.id]?.options ? { options: null } : {}) }), () => {
      close();
      toast('Question reset to its default text.');
    });
  };
  const removeCustom = (q) => setConfirm({
    title: 'Delete this question?', body: `“${q.label}” will be removed from the form.`, cancelLabel: 'Keep', okLabel: 'Delete', danger: true,
    onOk: () => {
      run(questionApi.remove(q.id), () => {
        close();
        toast('Question deleted.');
      });
    },
  });
  const resetAll = () => setConfirm({
    title: 'Reset all questions?', body: 'Every edit, hidden question and added question will be reverted to the default form.', cancelLabel: 'Cancel', okLabel: 'Reset all', danger: true,
    onOk: () => run(questionApi.resetAll(), () => { close(); toast('All questions reset to the default form.'); }),
  });
  const saveAdd = () => {
    const label = add.label.trim();
    const hasOpt = OPT_TYPES.includes(add.type);
    const opts = lines(add.optText);
    if (!label) { setErr('Enter the question text.'); return; }
    if (hasOpt && opts.length < 2) { setErr('Add at least 2 answer options, one per line.'); return; }
    run(questionApi.add(add.sec, { label, type: add.type, options: hasOpt ? opts : undefined }), () => {
      close();
      toast('Question added to the alumni forms.');
    });
  };

  const actions = changes > 0 ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none', flexWrap: 'wrap' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B4E00', background: '#FBF0D8', padding: '5px 11px', borderRadius: 999 }}>{changes} customised</div>
      <button type="button" onClick={resetAll} style={{ ...btnGhost, padding: '9px 14px' }} {...hv({ background: '#F7F8FA' })}>Reset all to default</button>
    </div>
  ) : null;

  const errLine = err ? <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#B42318' }}>{err}</div> : null;

  return (
    <PortalPage label="Alumni Tracer" title="Alumni Tracer" caption="UDM ALUMNI · QUESTION MANAGER" tone="gold" tools={false} actions={actions} contentStyle={{ padding: '14px 12px 32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px 12px', flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Form" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 'none' }}>
            {tabs.map(([k, label, count]) => {
              const on = k === tab;
              return (
                <button
                  key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? '#0F3D2E' : '#E7E9ED'}`, background: on ? '#0F3D2E' : '#fff', color: on ? '#fff' : '#334155' }}
                >
                  {label}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: on ? 'rgba(255,255,255,.18)' : '#F1F3F5', color: on ? '#fff' : '#64748B' }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12.5, color: '#64748B', flex: '1 1 260px', minWidth: 0, textWrap: 'pretty' }}>Edits apply immediately to the alumni Register form and Edit Profile page.</div>
        </div>

        {groups.map((d) => {
          const adding = !!(add && add.sec === d.key);
          const addHasOpt = adding && OPT_TYPES.includes(add.type);
          return (
            <section key={d.key} aria-label={d.title} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', flexWrap: 'wrap', background: '#FBFAF7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0B1220', letterSpacing: -0.2 }}>{d.title}</h2>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: '#94A3B8' }}>{d.tag}</div>
                  {d.ap.map((l) => (
                    <div key={l} style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: l === R ? '#E6F0EB' : '#FBF0D8', color: l === R ? '#0F3D2E' : '#6B4E00' }}>{l}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{d.qs.length} {d.qs.length === 1 ? 'question' : 'questions'}</div>
                  <button
                    type="button"
                    onClick={() => { setEd(null); setErr(''); setAdd({ sec: d.key, label: '', type: 'text', optText: '' }); }}
                    style={{ whiteSpace: 'nowrap', flex: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#00332B', background: '#F0C428', border: 'none', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}
                    {...hv({ background: '#E6B91C' })}
                  >
                    + Add question
                  </button>
                </div>
              </div>

              {d.qs.map((q, i) => {
                const editing = !!(ed && ed.id === q.id);
                const hidden = !!q.hidden;
                const hasOpt = OPT_TYPES.includes(q.type) && !q.linked;
                const optCount = q.options && q.type !== 'combo' && q.options.length ? `${q.options.length} options` : '';
                const cond = q.when ? (q.hint ? q.hint.replace('Shown because ', 'Shown if ') : 'Conditional') : d.cond;
                const ov = config.ov[q.id];
                const canReset = !q.custom && !!ov && (ov.label != null || ov.placeholder != null || ov.options != null);
                return (
                  <div key={q.id} style={{ borderTop: '1px solid #F1F2F4', background: editing ? '#FBF8EA' : '#fff' }}>
                    <div style={narrow
                      ? { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', flexWrap: 'wrap' }
                      : { display: 'grid', gridTemplateColumns: '22px 30px minmax(0,1fr) 112px 94px 64px', alignItems: 'center', columnGap: 14, padding: '12px 18px' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 22, flex: 'none' }}>
                        {[[-1, '▲', 'Move up', i === 0], [1, '▼', 'Move down', i === d.qs.length - 1]].map(([dir, sym, t, off]) => (
                          <button
                            key={sym} type="button" title={t} aria-label={`${t}: ${q.label}`} disabled={off} onClick={() => move(d, i, dir)}
                            style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#64748B', cursor: off ? 'default' : 'pointer', borderRadius: 4, opacity: off ? 0.25 : 1, border: 'none', background: 'transparent', padding: 0 }}
                          >
                            {sym}
                          </button>
                        ))}
                      </div>
                      <div style={{ width: 30, height: 30, boxSizing: 'border-box', borderRadius: '50%', background: '#F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#475569', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{i + 1}</div>
                      <div style={{ minWidth: 0, flex: narrow ? '1 1 180px' : undefined, opacity: hidden ? 0.5 : 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0B1220', lineHeight: 1.4, textWrap: 'pretty' }}>{q.label}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5, alignItems: 'center' }}>
                          <span style={tag('#F1F3F5', '#475569')}>{TYPE_LABEL[q.type] || q.type}</span>
                          {optCount ? <span style={tag('#F1F3F5', '#475569')}>{optCount}</span> : null}
                          {cond ? <span style={tag('#E6EFFA', '#1D4E89')}>{cond}</span> : null}
                          {q.core ? <span style={tag('#E6F0EB', '#0F3D2E')}>Core field</span> : null}
                          {q.custom ? <span style={tag('#FBF0D8', '#6B4E00')}>Added</span> : null}
                          {hidden ? <span style={tag('#F1F3F5', '#64748B')}>Hidden</span> : null}
                          <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'ui-monospace,Menlo,monospace' }}>{q.id}</span>
                        </div>
                      </div>
                      <div style={narrow ? { display: 'flex', alignItems: 'center', gap: 18, flex: 'none', flexWrap: 'wrap' } : { display: 'contents' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Toggle on={!!q.required} locked={q.core} label={`Required: ${q.label}`} title={q.core ? 'Core fields are always required' : 'Required on forms'} onClick={() => setOv(q.id, { required: !q.required })} />
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Required</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Toggle on={!hidden} locked={q.core} label={`Shown: ${q.label}`} title={q.core ? 'Core fields are always shown' : 'Show or hide on forms'} onClick={() => setOv(q.id, { hidden: !hidden })} />
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Shown</div>
                        </div>
                        <button
                          type="button" aria-expanded={editing} onClick={() => openEdit(q)}
                          style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#0F3D2E', border: '1px solid #CFE3DA', borderRadius: 9, padding: narrow ? '7px 14px' : '7px 0', cursor: 'pointer', background: '#fff', textAlign: 'center' }}
                          {...hv({ background: '#EEF6F1' })}
                        >
                          {editing ? 'Close' : 'Edit'}
                        </button>
                      </div>
                    </div>

                    {editing ? (
                      <div style={{ padding: narrow ? '4px 18px 18px' : '4px 18px 18px 74px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={fieldLabel}>Question text</span>
                          <input type="text" value={ed.label} onChange={(e) => { setErr(''); setEd({ ...ed, label: e.target.value }); }} style={input} />
                        </label>
                        {PH_TYPES.includes(q.type) && !q.linked ? (
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={fieldLabel}>Placeholder / helper text</span>
                            <input type="text" value={ed.placeholder} onChange={(e) => setEd({ ...ed, placeholder: e.target.value })} style={input} />
                          </label>
                        ) : null}
                        {hasOpt ? (
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={fieldLabel}>Answer options <span style={{ fontWeight: 500, color: '#94A3B8' }}>— one per line, at least 2</span></span>
                            <textarea rows={5} value={ed.optText} onChange={(e) => { setErr(''); setEd({ ...ed, optText: e.target.value }); }} style={{ ...input, fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
                          </label>
                        ) : null}
                        {q.linked ? (
                          <div style={{ fontSize: 12, color: '#64748B', background: '#F4F5F7', borderRadius: 10, padding: '9px 12px' }}>
                            Answer options for this field come from the Colleges &amp; Programs list and the graduation-year range, so they can’t be edited here.
                          </div>
                        ) : null}
                        {errLine}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: 14 }}>
                            {canReset ? <button type="button" onClick={() => resetText(q)} style={linkBtn('#475569')}>Reset to default text</button> : null}
                            {q.custom ? <button type="button" onClick={() => removeCustom(q)} style={linkBtn('#B42318')}>Delete question</button> : null}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={close} style={btnGhost}>Cancel</button>
                            <button type="button" onClick={saveEdit} style={btnPrimary} {...hv({ background: '#00251F' })}>Save changes</button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {adding ? (
                <div style={{ borderTop: '1px solid #F1F2F4', background: '#FBF8EA', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1220' }}>New question in {d.title}</div>
                  <input type="text" aria-label="Question text" value={add.label} onChange={(e) => { setErr(''); setAdd({ ...add, label: e.target.value }); }} placeholder="Question text" style={input} />
                  <div role="radiogroup" aria-label="Answer type" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ADD_TYPES.map(([k, l]) => (
                      <button key={k} type="button" role="radio" aria-checked={add.type === k} onClick={() => { setErr(''); setAdd({ ...add, type: k }); }} style={chip(add.type === k)}>{l}</button>
                    ))}
                  </div>
                  {addHasOpt ? (
                    <textarea
                      rows={4} aria-label="Answer options" value={add.optText} onChange={(e) => { setErr(''); setAdd({ ...add, optText: e.target.value }); }}
                      placeholder="Answer options — one per line, at least 2" style={{ ...input, fontSize: 13, resize: 'vertical', lineHeight: 1.5 }}
                    />
                  ) : null}
                  {errLine}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" onClick={close} style={btnGhost}>Cancel</button>
                    <button type="button" onClick={saveAdd} style={btnPrimary} {...hv({ background: '#00251F' })}>Add question</button>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm ? confirm.title : ''}
        labelledBy="tracer-confirm-title"
        footer={confirm ? (
          <>
            <button type="button" onClick={() => setConfirm(null)} style={modalBtn(false)}>{confirm.cancelLabel}</button>
            <button type="button" onClick={() => { const c = confirm; setConfirm(null); c.onOk(); }} style={{ ...modalBtn(true), background: confirm.danger ? '#B42318' : '#062A20' }}>{confirm.okLabel}</button>
          </>
        ) : null}
      >
        {confirm ? confirm.body : null}
      </Modal>
    </PortalPage>
  );
}
