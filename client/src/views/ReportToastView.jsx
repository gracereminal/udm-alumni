import { onActivate } from '../lib/a11y';

/* View layer for the "ReportToast" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function ReportToastView(v) {
  const { recUndo, recUndoOn, repToast, repToastClose } = v;
  return (
    <>
      <div
        style={{
          position: 'fixed',
          right: '22px',
          bottom: '22px',
          zIndex: '400',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#0B1220',
          color: '#fff',
          borderRadius: '12px',
          padding: '12px 14px 12px 16px',
          boxShadow: '0 14px 36px -10px rgba(0,0,0,.4)',
          fontFamily: 'var(--udm-sans)',
          fontSize: '13px',
          maxWidth: 'calc(100vw - 44px)',
        }}
      >
        <span
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#1F9D6B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            flex: 'none',
          }}
        >
          ✓
        </span>
        <span style={{ minWidth: '0' }}>{repToast}</span>
        {recUndoOn ? (
          <>
            <span role="button" tabIndex={0} onKeyDown={onActivate(recUndo)}
              onClick={recUndo}
              style={{ fontSize: '12px', fontWeight: '700', color: '#fff', textDecoration: 'underline', cursor: 'pointer', flex: 'none' }}
            >
              Undo
            </span>
          </>
        ) : null}
        <span role="button" tabIndex={0} onKeyDown={onActivate(repToastClose)} onClick={repToastClose} style={{ fontSize: '12px', fontWeight: '700', color: '#F0C428', cursor: 'pointer', flex: 'none' }}>
          Dismiss
        </span>
      </div>
    </>
  );
}
