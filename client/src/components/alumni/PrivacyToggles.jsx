/** One ON / HIDDEN switch row — the "Contact Privacy" toggle of "UDM Alumni.dc.html". */
function Toggle({ label, hint, on, offLabel = 'HIDDEN', onClick, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', border: 0, borderTop: '1px solid #EEF0F3',
        background: 'transparent', fontFamily: 'inherit', textAlign: 'left', cursor: disabled ? 'progress' : 'pointer',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0B1220' }}>{label}</span>
        {hint ? <span style={{ display: 'block', fontSize: 11.5, color: '#94A3B8', marginTop: 2, lineHeight: 1.4 }}>{hint}</span> : null}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: on ? '#0F3D2E' : '#64748B' }}>{on ? 'ON' : offLabel}</span>
        <span style={{ width: 38, height: 20, borderRadius: 999, background: on ? '#0F3D2E' : '#CBD5E1', position: 'relative', display: 'inline-block', transition: 'background .15s' }}>
          <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
        </span>
      </span>
    </button>
  );
}

/**
 * Directory and contact visibility switches, shared by Edit Profile (saved with the profile) and Privacy & My Data
 * (saved at once). `value` is privacyDraft()'s shape; `platforms` are the [id, label] links the alumnus filled in.
 */
export default function PrivacyToggles({ value, onChange, platforms, busy }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const listed = value.directoryOptIn;
  const later = listed ? null : 'Applies once you appear in the directory.';
  return (
    <div>
      <Toggle
        label="Show me in the alumni directory"
        hint={listed ? 'Other alumni can find your name, program, batch, photo, current job and skills.' : 'Other alumni cannot find you.'}
        on={listed}
        offLabel="OFF"
        disabled={busy}
        onClick={() => set({ directoryOptIn: !listed })}
      />
      <div style={{ opacity: listed ? 1 : 0.6, transition: 'opacity .15s' }}>
        <Toggle label="Show Mobile number" hint={later} on={value.showMobile} disabled={busy} onClick={() => set({ showMobile: !value.showMobile })} />
        <Toggle label="Show Email address" hint={later} on={value.showEmail} disabled={busy} onClick={() => set({ showEmail: !value.showEmail })} />
        {platforms.map(([k, label]) => (
          <Toggle key={k} label={`Show ${label}`} hint={later} on={!!value.links[k]} disabled={busy} onClick={() => set({ links: { ...value.links, [k]: !value.links[k] } })} />
        ))}
      </div>
    </div>
  );
}
