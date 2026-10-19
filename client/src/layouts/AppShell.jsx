import useMobilePreview, { PREVIEW_MODES } from '../hooks/useMobilePreview';

/** Battery, signal and clock row drawn at the top of the device frame (from UDM Alumni.dc.html). */
function PhoneStatus() {
  return (
    <div data-m="phone-status" aria-hidden="true" style={{ display: 'none' }}>
      <div>9:41</div>
      <div style={{ position: 'absolute', left: '50%', top: 11, width: 104, height: 30, marginLeft: -52, borderRadius: 16, background: '#050807' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
          {[4, 6, 9, 12].map((h) => (
            <div key={h} style={{ width: 3, height: h, background: 'currentColor', borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ width: 26, height: 12, border: '1.5px solid currentColor', borderRadius: 4, boxSizing: 'border-box', padding: 1 }}>
          <div style={{ width: '75%', height: '100%', background: 'currentColor', borderRadius: 1.5 }} />
        </div>
      </div>
    </div>
  );
}

/** Auto / Phone frame / Desktop toggle, styled like the design file's preview bar. Shown in dev, or once a preview mode is picked with `?preview=`; hidden on an actual phone. */
function PreviewSwitcher({ mode, setMode }) {
  return (
    <div role="radiogroup" aria-label="Layout preview" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 500, display: 'flex', alignItems: 'center', gap: 4, padding: 5, borderRadius: 999, background: '#00332B', boxShadow: '0 10px 28px -8px rgba(0,25,18,.5)', fontFamily: 'Inter,system-ui,sans-serif' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(234,243,241,.45)', margin: '0 6px 0 10px' }}>Preview</div>
      {PREVIEW_MODES.map((m) => {
        const on = m.id === mode;
        return (
          <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMode(m.id)} style={{ border: 0, cursor: 'pointer', padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', background: on ? '#F0C428' : 'transparent', color: on ? '#00251F' : 'rgba(234,243,241,.75)' }}>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Root wrapper for the whole app (overlays and toasts included): sets the `data-mobile` / `data-frame`
 * hooks the prototype CSS keys off and, in the "Phone frame" preview, draws the device around the page.
 */
export default function AppShell({ children }) {
  const { mode, setMode, mobile, frame, narrow } = useMobilePreview();
  const showSwitcher = !narrow && (import.meta.env.DEV || mode !== 'auto');
  return (
    <div data-mobile={mobile ? '1' : '0'} data-frame={frame ? '1' : '0'} style={{ fontFamily: 'Inter,system-ui,sans-serif', background: '#F3F6F4', minHeight: '100vh' }}>
      {showSwitcher ? <PreviewSwitcher mode={mode} setMode={setMode} /> : null}
      <div data-m="phone" style={{ display: 'contents' }}>
        <PhoneStatus />
        <div data-m="phone-screen" style={{ display: 'contents' }}>{children}</div>
        <div data-m="phone-home" aria-hidden="true" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
