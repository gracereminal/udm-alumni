import { useRef, useState } from 'react';
import useDialogDismiss from '../hooks/useDialogDismiss';
import { onBackdrop } from '../lib/a11y';
import { hv } from '../lib/stateStyle';
import { copyText } from '../lib/contact';

const cap = { fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: '#94A3B8' };
const rowBox = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '12px 14px', background: '#F6F8F7', borderRadius: 12 };
const openBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, padding: '0 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap', background: '#fff', color: '#0F3D2E', border: '1px solid #B9CFC6', boxSizing: 'border-box' };
const copyBtn = { fontFamily: 'inherit', minHeight: 40, padding: '0 14px', borderRadius: 10, fontWeight: 600, fontSize: 13, background: '#fff', color: '#0B1220', border: '1px solid #E2E5EA', cursor: 'pointer' };

/**
 * "Contact offline" dialog per "UDM Alumni.dc.html": the portal sends nothing itself, so the user reaches out
 * through their own email / Messenger / careers page, then confirms here ("Mark as applied", "Mark as contacted").
 *
 * channels: [{ key, label, via, value, href, openLabel, copy, external, onOpen }] — only the ones on file.
 * onConfirm(via) receives the `via` (or label) of the channel the user last opened or copied (or the first one listed).
 */
export default function OfflineContactModal({
  title, lead, note, message, onMessage, messageHint, channels = [], noneText, doneLabel, onConfirm, onClose, undo,
}) {
  const cancelRef = useRef(null);
  const [copied, setCopied] = useState('');
  const [used, setUsed] = useState('');
  useDialogDismiss(true, onClose, cancelRef);

  const flash = (k) => { setCopied(k); setTimeout(() => setCopied((c) => (c === k ? '' : c)), 1500); };
  const copy = (k, text) => copyText(text).then((ok) => { if (ok) flash(k); });
  const via = used || (channels[0] && (channels[0].via || channels[0].label)) || '';

  return (
    <div
      role="presentation"
      onClick={onBackdrop(onClose)}
      style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(11,18,32,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box', fontFamily: 'var(--udm-sans)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offp-title"
        style={{ width: '100%', maxWidth: 460, maxHeight: '100%', overflowY: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 24px 60px rgba(11,18,32,.3)', padding: '22px 24px', boxSizing: 'border-box' }}
      >
        <div id="offp-title" style={{ fontWeight: 700, fontSize: 17, color: '#0B1220' }}>{title}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#475569', marginTop: 6, textWrap: 'pretty' }}>{lead}</div>
        {note ? <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F3D2E', marginTop: 8 }}>{note}</div> : null}

        {onMessage ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <label htmlFor="offp-message" style={cap}>Message</label>
              <button type="button" onClick={() => copy('msg', message)} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#0F3D2E', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                {copied === 'msg' ? 'Copied' : 'Copy message'}
              </button>
            </div>
            <textarea
              id="offp-message" value={message} onChange={onMessage} rows={4}
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E2E5EA', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13.5, lineHeight: 1.5, color: '#0B1220', resize: 'vertical', background: '#fff' }}
            />
            {messageHint ? <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{messageHint}</div> : null}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {channels.map((c) => (
            <div key={c.key} style={rowBox}>
              <div style={{ minWidth: 0 }}>
                <div style={cap}>{c.label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0B1220', wordBreak: 'break-all' }}>{c.value}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {c.copy ? (
                  <button type="button" aria-label={`Copy ${c.label}`} onClick={() => { setUsed(c.via || c.label); copy(c.key, c.copy); }} style={copyBtn}>
                    {copied === c.key ? 'Copied' : 'Copy'}
                  </button>
                ) : null}
                <a
                  href={c.href} target={c.external ? '_blank' : undefined} rel="noopener noreferrer"
                  onClick={() => { setUsed(c.via || c.label); if (c.onOpen) c.onOpen(); }}
                  style={openBtn} {...hv({ background: '#EEF6F1' })}
                >
                  {c.openLabel}
                </a>
              </div>
            </div>
          ))}
          {channels.length === 0 && noneText ? (
            <div style={{ ...rowBox, display: 'block', fontSize: 13, lineHeight: 1.55, color: '#475569', textWrap: 'pretty' }}>{noneText}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', justifyContent: undo ? 'space-between' : 'flex-end', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {undo ? (
            <button type="button" onClick={undo.onClick} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#B42318', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
              {undo.label}
            </button>
          ) : null}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" ref={cancelRef} onClick={onClose} style={{ fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, padding: '0 18px', minHeight: 44, border: '1px solid #E2E5EA', borderRadius: 10, background: '#fff', color: '#0B1220', cursor: 'pointer' }}>
              Cancel
            </button>
            {doneLabel ? (
              <button type="button" onClick={() => onConfirm(via)} style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, padding: '0 20px', minHeight: 44, border: 'none', borderRadius: 10, background: '#0F3D2E', color: '#fff', cursor: 'pointer' }}>
                {doneLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
