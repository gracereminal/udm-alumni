import { useState } from 'react';
import { fv } from '../lib/stateStyle';

const ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%2364748B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

/** Type-or-select year input with a filtered dropdown (mockup "combo" field). */
function Combo({ f, id, control, focus }) {
  const [open, setOpen] = useState(false);
  const typed = String(f.value || '');
  const list = f.comboOptions.filter((o) => o.startsWith(typed));
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={f.value}
        placeholder={f.placeholder}
        aria-invalid={!!f.error}
        onChange={f.onInput}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        style={{ ...control, minHeight: '44px', padding: '0 40px 0 14px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}
        {...focus}
      />
      <button
        type="button"
        aria-label="Show years"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', border: 0, background: 'transparent', cursor: 'pointer', color: '#64748B', fontSize: '11px' }}
      >
        ▾
      </button>
      {open ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 30, maxHeight: '220px', overflowY: 'auto', background: '#fff', border: '1px solid #D5DBE3', borderRadius: '10px', boxShadow: '0 12px 28px rgba(16,24,40,.14)', padding: '4px' }}>
          {list.map((o) => (
            <div
              key={o}
              role="option"
              aria-selected={o === typed}
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); f.onPick(o); setOpen(false); }}
              style={{ padding: '9px 12px', borderRadius: '7px', fontSize: '13.5px', cursor: 'pointer', color: o === typed ? '#0F3D2E' : '#0A0A0A', background: o === typed ? '#E7F0EE' : 'transparent', fontWeight: o === typed ? 700 : 400 }}
            >
              {o}
            </div>
          ))}
          {list.length === 0 ? <div style={{ padding: '9px 12px', fontSize: '13px', color: '#64748B' }}>Only years 1999–{f.comboOptions[0]} are allowed</div> : null}
        </div>
      ) : null}
    </div>
  );
}

const VARIANTS = {
  register: { label: { fontSize: '12.5px', fontWeight: '700', marginBottom: '6px' }, radius: '10px', hintTop: '6px', hintAttr: 'f-hint' },
  survey: { label: { fontSize: '13px', fontWeight: '700', lineHeight: '1.45', marginBottom: '8px' }, radius: '12px', hintTop: '7px', hintAttr: undefined },
};

/**
 * One form question (text / date / textarea / select / choice chips) with label, hint and validation message.
 * `f` is the view-model produced by `buildField` (src/lib/fields.jsx).
 */
export default function FormField({ f, variant = 'register' }) {
  const t = VARIANTS[variant];
  const control = {
    width: '100%', boxSizing: 'border-box', border: `1px solid ${f.borderColor}`, borderRadius: t.radius, padding: '12px 14px',
    fontSize: '13.5px', background: '#FBFAF8', color: '#0A0A0A', fontFamily: 'inherit', outline: 'none',
  };
  const focus = fv({ borderColor: '#0F3D2E' });
  const id = `fld-${f.id}`;
  return (
    <div data-m="fcell" style={{ minWidth: '0', gridColumn: f.span }}>
      <label htmlFor={f.isChoice || f.isDate ? undefined : id} style={{ display: 'block', color: '#0A0A0A', ...t.label }}>{f.label}</label>
      {f.sameAs ? (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.sameAs.checked} onChange={f.sameAs.onToggle} style={{ width: '16px', height: '16px', margin: 0, accentColor: '#0F3D2E', cursor: 'pointer' }} />
          {f.sameAs.label}
        </label>
      ) : null}
      {f.isText ? (
        <input
          id={id} type={f.inputType} value={f.value} onChange={f.onInput} placeholder={f.placeholder} disabled={f.disabled} autoCapitalize={f.autoCapitalize} aria-invalid={!!f.error}
          style={f.disabled ? { ...control, opacity: 0.55, cursor: 'not-allowed' } : control}
          {...focus}
          onBlur={(e) => { focus.onBlur?.(e); f.onBlur?.(e); }}
        />
      ) : null}
      {f.isDate ? <>{f.dateEl}</> : null}
      {f.isTextarea ? (
        <textarea id={id} value={f.value} onChange={f.onInput} placeholder={f.placeholder} rows={4} aria-invalid={!!f.error} style={{ ...control, resize: 'vertical' }} {...focus} />
      ) : null}
      {f.isSelect ? (
        <select
          id={id}
          value={f.value}
          onChange={f.onInput}
          aria-invalid={!!f.error}
          style={{
            ...control, appearance: 'none', WebkitAppearance: 'none', minHeight: '44px', padding: '0 40px 0 14px', cursor: 'pointer', lineHeight: 1.3, textOverflow: 'ellipsis',
            backgroundColor: '#FBFAF8', backgroundImage: ARROW, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '12px 12px',
            boxShadow: '0 1px 2px rgba(16,24,40,.04)',
          }}
          {...focus}
        >
          {(f.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : null}
      {f.isCombo ? <Combo f={f} id={id} control={control} focus={focus} /> : null}
      {f.isChoice ? (
        <div role="group" aria-label={f.label} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(f.chips || []).map((c) => (
            <div
              key={c.label}
              data-m="chip"
              role="button"
              tabIndex={0}
              aria-pressed={c.bg === '#0F3D2E'}
              onClick={c.onClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onClick(); } }}
              style={{ cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', padding: '9px 14px', borderRadius: '999px', background: c.bg, color: c.color, border: `1px solid ${f.error && c.bg !== '#0F3D2E' ? '#E9A9A4' : c.border}` }}
            >
              {c.label}
            </div>
          ))}
        </div>
      ) : null}
      <div data-m={t.hintAttr} role={f.error ? 'alert' : undefined} style={{ fontSize: '11.5px', color: f.error ? '#B3261E' : 'rgba(0,0,0,.42)', marginTop: t.hintTop }}>
        {f.error || f.hint}
      </div>
    </div>
  );
}
