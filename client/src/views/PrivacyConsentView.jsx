import React from 'react';
import { onActivate } from '../lib/a11y';

/* View layer for the "PrivacyConsent" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function PrivacyConsentView(v) {
  const { declined, privacyHint, privacyDecline, reviewPolicy, goSignin, privacyAgree, privacyBtnBg, privacyBtnColor, privacyConsents, privacyCursor, privacySections } = v;
  return (
    <>
      <div
        data-screen-label="Data Privacy Notice"
        style={{
          height: '100vh',
          overflow: 'hidden',
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
            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '24px', letterSpacing: '-.5px', color: '#0A0A0A', marginTop: '6px' }}>
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
              maxWidth: '720px',
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
              borderRadius: '16px',
              boxShadow: '0 24px 60px -12px rgba(0,20,16,.35)',
              padding: '30px 40px 24px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <img
                src="/alumni-logo.png"
                alt="Universidad de Manila seal"
                style={{
                  width: '48px',
                  height: '48px',
                  flex: 'none',
                  borderRadius: '50%',
                  objectFit: 'contain',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,.08)',
                }}
              />
              <div style={{ minWidth: '0' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#004D40' }}>
                  Before You Register · Republic Act No. 10173
                </div>
                <div
                  style={{
                    fontFamily: 'Inter,sans-serif',
                    fontWeight: '700',
                    fontSize: '26px',
                    letterSpacing: '-.5px',
                    color: '#0A0A0A',
                    marginTop: '3px',
                  }}
                >
                  Data Privacy Notice & Consent
                </div>
              </div>
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(0,0,0,.62)', marginBottom: '18px', textWrap: 'pretty' }}>
              The Universidad de Manila respects your privacy. Please read how we collect, use, and protect your personal information before creating
              your alumni record.
            </div>
            <div
              id="privacy-notice"
              style={{
                flex: '1 1 auto',
                minHeight: '0',
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid rgba(0,0,0,.08)',
                borderRadius: '14px',
                background: '#FBFAF8',
                padding: '6px 20px',
                marginBottom: '14px',
              }}
            >
              {(privacySections || []).map((ps, _i) => (
                <React.Fragment key={_i}>
                  <div style={{ display: 'flex', gap: '14px', padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                    <div
                      style={{
                        flex: 'none',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#E7F0EE',
                        color: '#004D40',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {ps.n}
                    </div>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0A0A0A', marginBottom: '4px' }}>{ps.title}</div>
                      <div style={{ fontSize: '13px', lineHeight: '1.55', color: 'rgba(0,0,0,.62)', textWrap: 'pretty' }}>{ps.body}</div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
              {(privacyConsents || []).map((pc, _i) => (
                <React.Fragment key={_i}>
                  <div role="button" tabIndex={0} onKeyDown={onActivate(pc.onClick)} onClick={pc.onClick} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '6px',
                        flex: 'none',
                        marginTop: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: '#fff',
                        background: pc.bg,
                        border: `1px solid ${pc.border}`,
                      }}
                    >
                      {pc.mark}
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'rgba(0,0,0,.72)' }}>
                      {pc.label}{' '}
                      <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.4px', textTransform: 'uppercase', color: pc.tagColor }}>
                        {pc.tag}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            {privacyHint && !declined ? (
              <div role="alert" style={{ fontSize: '12.5px', color: '#B3261E', marginBottom: '12px' }}>{privacyHint}</div>
            ) : null}
            <div data-m="actions" style={{ display: 'flex', gap: '10px' }}>
              <div role="button" tabIndex={0} onKeyDown={onActivate(privacyDecline)}
                onClick={privacyDecline}
                style={{
                  flex: 'none',
                  border: '1px solid rgba(0,0,0,.16)',
                  color: '#0A0A0A',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                I Do Not Agree
              </div>
              <div role="button" tabIndex={0} onKeyDown={onActivate(privacyAgree)}
                onClick={privacyAgree}
                style={{
                  flex: '1',
                  textAlign: 'center',
                  borderRadius: '10px',
                  padding: '14px',
                  fontWeight: '700',
                  fontSize: '14.5px',
                  cursor: privacyCursor,
                  background: privacyBtnBg,
                  color: privacyBtnColor,
                }}
              >
                I Agree — Continue to Registration
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(0,0,0,.45)', marginTop: '14px' }}>
              Questions or requests? Contact the UDM Alumni Relations Office at udmalumni@udm.edu.ph
            </div>
          </div>
        )}
      </div>
    </>
  );
}
