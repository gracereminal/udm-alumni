import { useEffect } from 'react';
import { onBackdrop } from '../lib/a11y';

/** Generic centered dialog (backdrop, Esc to close). */
export default function Modal({ open = true, onClose, title, eyebrow, width = 460, children, footer, labelledBy = 'modal-title' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onBackdrop(onClose)}
      role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(6,42,32,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ width: '100%', maxWidth: width, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px -12px rgba(0,20,16,.45)', padding: '26px 28px 22px', boxSizing: 'border-box' }}
      >
        {eyebrow ? (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#004D40', marginBottom: 6 }}>{eyebrow}</div>
        ) : null}
        {title ? (
          <div id={labelledBy} style={{ fontFamily: 'var(--udm-display)', fontWeight: 800, fontSize: 20, letterSpacing: -0.4, color: '#0A1F18', marginBottom: 10 }}>{title}</div>
        ) : null}
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(0,0,0,.65)' }}>{children}</div>
        {footer ? <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 20 }}>{footer}</div> : null}
      </div>
    </div>
  );
}

export const modalBtn = (primary) => ({
  border: primary ? 'none' : '1px solid rgba(0,0,0,.16)',
  background: primary ? '#062A20' : '#fff',
  color: primary ? '#fff' : '#0A0A0A',
  borderRadius: 10,
  padding: '11px 18px',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: 13.5,
  cursor: 'pointer',
});
