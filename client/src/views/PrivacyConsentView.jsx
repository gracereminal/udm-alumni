import { onActivate } from '../lib/a11y';

/* View layer for the "Data Privacy Notice" screen — per "UDM Alumni.dc.html". */
export default function PrivacyConsentView(v) {
  const { declined, privacyHint, privacyDecline, reviewPolicy, goSignin, privacyAgree, privacyBtnBg, privacyBtnColor, privacyConsents, privacyCursor, privacySections } = v;
  return (
    <div
      data-screen-label="Data Privacy Notice"
      style={{
        height: '100vh',
        overflow: 'auto',
        background: 'linear-gradient(160deg,#00332B,#004D40 60%,#00251F)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {declined ? (
        <div
          data-screen-label="Privacy Consent Declined"
          style={{
            width: '100%',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 24px 60px -12px rgba(0,20,16,.35)',
            padding: '36px 40px 28px',
            boxSizing: 'border-box',
          }}
        >
          <img src="/alumni-logo.png" alt="Universidad de Manila seal" style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '16px' }} />
          <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#B3261E' }}>Consent Not Given</div>
          <div style={{ fontFamily: 'var(--udm-sans)', fontWeight: '700', fontSize: '24px', letterSpacing: '-.5px', color: '#0A0A0A', marginTop: '6px' }}>
            Consent is required to continue
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(0,0,0,.62)', marginTop: '12px', textWrap: 'pretty' }}>
            You chose not to agree to the Data Privacy Notice. We can&apos;t create your alumni record or give you access to alumni features without your consent. No
            information has been collected or saved. You can review the notice again or go back to sign in.
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '24px' }}>
            <div role="button" tabIndex={0} onKeyDown={onActivate(goSignin)}
              onClick={goSignin}
              style={{ flex: 'none', border: '1px solid rgba(0,0,0,.16)', color: '#0A0A0A', borderRadius: '12px', padding: '14px 20px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
            >
              Back to Sign In
            </div>
            <div role="button" tabIndex={0} onKeyDown={onActivate(reviewPolicy)}
              onClick={reviewPolicy}
              style={{ flex: '1', textAlign: 'center', borderRadius: '10px', padding: '14px', fontWeight: '700', fontSize: '14.5px', cursor: 'pointer', background: '#004D40', color: '#fff' }}
            >
              Review Notice Again
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(0,0,0,.45)', marginTop: '14px' }}>
            You can register any time. Questions? Contact the UDM Alumni Relations Office at udmalumni@udm.edu.ph
          </div>
        </div>
      ) : (
        <div
          data-m="done-card"
          style={{
            width: '100%',
            maxWidth: '1040px',
            margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 24px 60px -12px rgba(0,20,16,.35)',
            padding: '24px 30px 18px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
            <img src="/alumni-logo.png" alt="Universidad de Manila seal" style={{ width: '52px', height: '52px', flex: 'none', objectFit: 'contain' }} />
            <div style={{ minWidth: '0', flex: '1' }}>
              <div style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#004D40' }}>
                Before You Register · Republic Act No. 10173
              </div>
              <h1 style={{ margin: '2px 0 0', fontFamily: 'var(--udm-sans)', fontWeight: '700', fontSize: '28px', letterSpacing: '-.6px', color: '#0A0A0A' }}>
                Data Privacy Notice &amp; Consent
              </h1>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: '22px', minHeight: '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px', alignContent: 'start' }}>
              {(privacySections || []).map((ps) => (
                <div key={ps.n} style={{ display: 'flex', gap: '12px', padding: '14px 16px', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', background: '#FBFAF8' }}>
                  <div
                    style={{
                      flex: 'none',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#E7F0EE',
                      color: '#004D40',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {ps.n}
                  </div>
                  <div style={{ minWidth: '0' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0A0A0A', marginBottom: '4px' }}>{ps.title}</div>
                    <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(0,0,0,.72)', textWrap: 'pretty' }}>{ps.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', background: '#F1F6F4', borderRadius: '14px', padding: '20px 20px 16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#004D40', marginBottom: '12px' }}>Your consent</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: '1' }}>
                {(privacyConsents || []).map((pc) => (
                  <div
                    key={pc.label}
                    role="checkbox"
                    aria-checked={pc.checked}
                    tabIndex={0}
                    onKeyDown={onActivate(pc.onClick)}
                    onClick={pc.onClick}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        color: '#fff',
                        background: pc.bg,
                        border: `1.5px solid ${pc.border}`,
                        boxSizing: 'border-box',
                      }}
                    >
                      {pc.mark}
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: '1.45', color: '#1A1A1A' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.5px', textTransform: 'uppercase', color: pc.tagColor, marginRight: '6px' }}>
                        {pc.tag}
                      </span>
                      {pc.label}
                    </div>
                  </div>
                ))}
              </div>
              {privacyHint ? (
                <div role="alert" style={{ fontSize: '12.5px', color: '#B3261E', marginTop: '14px' }}>{privacyHint}</div>
              ) : null}
              <div data-m="actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '18px' }}>
                <div role="button" tabIndex={0} onKeyDown={onActivate(privacyAgree)}
                  onClick={privacyAgree}
                  style={{ textAlign: 'center', borderRadius: '10px', padding: '14px', fontWeight: '700', fontSize: '15px', cursor: privacyCursor, background: privacyBtnBg, color: privacyBtnColor }}
                >
                  I Agree — Continue
                </div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(privacyDecline)}
                  onClick={privacyDecline}
                  style={{ textAlign: 'center', border: '1px solid rgba(0,0,0,.16)', background: '#fff', color: '#0A0A0A', borderRadius: '10px', padding: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                >
                  I Do Not Agree
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'rgba(0,0,0,.55)', marginTop: '12px' }}>
            Questions or requests? Contact the UDM Alumni Relations Office at udmalumni@udm.edu.ph
          </div>
        </div>
      )}
    </div>
  );
}
