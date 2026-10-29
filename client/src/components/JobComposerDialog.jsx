import { useEffect, useRef } from 'react';
import { fv, hv } from '../lib/stateStyle';
import { onActivate, onBackdrop } from '../lib/a11y';

const label = { fontSize: '11px', fontWeight: '700', letterSpacing: '.4px', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '6px' };
const input = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #E2E5EA', borderRadius: '10px', padding: '11px 13px', fontFamily: 'inherit',
  fontSize: '13px', color: '#0B1220', background: '#fff', outline: 'none',
};
const btn = { fontFamily: 'inherit', fontSize: '13.5px', padding: '13px 20px', minHeight: '44px', borderRadius: '10px', cursor: 'pointer' };

/**
 * "Post a job opening" dialog shared by the alumni Job Board and admin Job Management.
 * `fields`: { key, label, placeholder, span, value, onChange, kind: 'text' | 'select' | 'money', options?, err? }.
 */
export default function JobComposerDialog({
  heading, badge, badgeColor = '#475569', badgeBg = '#EEF2F6', intro, fields, photo, urgent, onUrgent, tags, onTags, desc, onDesc,
  error, primaryLabel, onPrimary, clearLabel = 'Clear draft', onClear, onClose, inputFocus = { borderColor: '#0F3D2E' },
}) {
  const box = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  // Focus the first field once when the dialog opens; Esc closes it.
  useEffect(() => {
    const t = setTimeout(() => { const f = box.current && box.current.querySelector('input[type="text"]'); if (f) f.focus(); }, 0);
    const onKey = (e) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div onClick={onBackdrop(onClose)} role="presentation"
      style={{ position: 'fixed', inset: '0', zIndex: '80', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box', background: 'rgba(11,18,32,.45)' }}
    >
      <div ref={box} role="dialog" aria-modal="true" aria-label={heading}
        style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 60px rgba(16,24,40,.25)', padding: '24px 26px', boxSizing: 'border-box', fontFamily: 'Inter,system-ui,sans-serif' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: intro ? '4px' : '14px' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>{heading}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {badge ? (
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '.5px', color: badgeColor, background: badgeBg, padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>{badge}</div>
            ) : null}
            <button type="button" aria-label="Close" onClick={onClose}
              style={{ width: '34px', height: '34px', flex: 'none', border: 'none', borderRadius: '50%', background: '#F1F3F5', color: '#0B1220', fontSize: '18px', lineHeight: '1', cursor: 'pointer' }}
              {...hv({ background: '#E2E5EA' })}
            >
              ×
            </button>
          </div>
        </div>
        {intro ? <div style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '14px' }}>{intro}</div> : null}

        <div role="button" tabIndex={0} onKeyDown={onActivate(photo.open)} onClick={photo.open} title="Upload company photo"
          style={{ width: '100%', height: '120px', borderRadius: '14px', position: 'relative', cursor: 'pointer', overflow: 'hidden', border: '1px solid #E2E5EA', background: photo.css }}
        >
          {photo.none ? (
            <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '11.5px', color: '#94A3B8', textAlign: 'center', padding: '10px' }}>
              <span style={{ fontSize: '20px', lineHeight: '1' }}>+</span>
              <span>company photo / logo — 1200×800</span>
            </div>
          ) : null}
        </div>
        <input type="file" accept="image/*" ref={photo.ref} onChange={photo.onFile} style={{ display: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <button type="button" onClick={photo.open}
            style={{ background: '#fff', border: '1px solid #E2E5EA', borderRadius: '8px', padding: '8px 13px', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', color: '#0B1220', cursor: 'pointer' }}
          >
            Upload photo
          </button>
          {photo.has ? (
            <button type="button" onClick={photo.remove}
              style={{ background: 'none', border: 'none', padding: '4px 2px', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', color: '#9F1239', cursor: 'pointer' }}
            >
              Remove
            </button>
          ) : null}
          <div style={{ fontSize: '11.5px', color: '#94A3B8', minWidth: '0', wordBreak: 'break-all' }}>{photo.name}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,190px),1fr))', gap: '14px', marginTop: '20px' }}>
          {fields.map((f) => {
            const id = `job-${f.key}`;
            return (
              <div key={f.key} style={{ minWidth: '0', gridColumn: f.span || 'auto' }}>
                <label htmlFor={id} style={{ ...label, display: 'block' }}>{f.label}</label>
                {f.kind === 'select' ? (
                  <select id={id} value={f.value} onChange={f.onChange} style={{ ...input, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="">{f.placeholder}</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.kind === 'money' ? (
                  <div style={{ position: 'relative' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748B' }}>₱</span>
                    <input id={id} type="number" min="0" step="1000" inputMode="numeric" value={f.value} onChange={f.onChange} placeholder={f.placeholder}
                      aria-invalid={f.err ? 'true' : undefined}
                      style={{ ...input, paddingLeft: '28px', borderColor: f.err ? '#D92D20' : '#E2E5EA' }} {...fv(inputFocus)}
                    />
                  </div>
                ) : (
                  <input id={id} type="text" value={f.value} onChange={f.onChange} placeholder={f.placeholder} style={input} {...fv(inputFocus)} />
                )}
                {f.err ? <div style={{ fontSize: '11.5px', color: '#B3213C', marginTop: '5px' }}>{f.err}</div> : null}
              </div>
            );
          })}
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#0B1220', padding: '10px 12px', border: '1px solid #E2E5EA', borderRadius: '10px', minHeight: '44px', boxSizing: 'border-box' }}>
            <input type="checkbox" checked={urgent} onChange={onUrgent} style={{ width: '18px', height: '18px', accentColor: '#B3213C', margin: '0' }} />
            <span>Urgent hiring<span style={{ fontWeight: '500', color: '#64748B' }}> — shows an “Urgent Hiring” tag on the job card</span></span>
          </label>
          <div style={{ minWidth: '0', gridColumn: '1 / -1' }}>
            <label htmlFor="job-tags" style={{ ...label, display: 'block' }}>Skills / tags</label>
            <input id="job-tags" type="text" value={tags} onChange={onTags} placeholder="Comma separated — e.g. React, Figma, SQL" style={input} {...fv(inputFocus)} />
          </div>
          <div style={{ minWidth: '0', gridColumn: '1 / -1' }}>
            <label htmlFor="job-desc" style={{ ...label, display: 'block' }}>Description</label>
            <textarea id="job-desc" value={desc} onChange={onDesc} rows={4} placeholder="Role summary, requirements, how to apply…"
              style={{ ...input, padding: '12px 13px', lineHeight: '1.6', resize: 'vertical' }} {...fv(inputFocus)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #E7E9ED' }}>
          <button type="button" onClick={onPrimary} style={{ ...btn, background: '#0F3D2E', color: '#fff', fontWeight: '700', padding: '13px 24px', border: 'none' }}>{primaryLabel}</button>
          <button type="button" onClick={onClear} style={{ ...btn, background: '#fff', color: '#0B1220', fontWeight: '600', border: '1px solid #E2E5EA' }}>{clearLabel}</button>
          <button type="button" onClick={onClose} style={{ ...btn, background: 'none', color: '#64748B', fontWeight: '600', padding: '13px 10px', border: 'none' }}>Cancel</button>
          {error ? <div role="alert" style={{ fontSize: '12.5px', color: '#B3261E', fontWeight: '600' }}>{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
