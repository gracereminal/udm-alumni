import React from 'react';
import { hv } from '../lib/stateStyle';
import { onActivate } from '../lib/a11y';

/* View layer for the "RegSuccess" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function RegSuccessView(v) {
  const { carryOver, goSignin, goHome, regFirstName, regEmail } = v;
  return (
    <>
      <div
        data-screen-label="Registration Successful"
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
        <div
          data-m="done-card"
          style={{
            width: '100%',
            maxWidth: '880px',
            maxHeight: '100%',
            overflow: 'hidden',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 24px 60px -12px rgba(0,20,16,.35)',
            display: 'flex',
            flexWrap: 'wrap',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              flex: '1 1 260px',
              background: '#F3F8F6',
              padding: '24px 26px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/alumni-logo.png"
                alt="Universidad de Manila seal"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'contain',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,.08)',
                }}
              />
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: '#004D40' }}>
                UDM Alumni
              </div>
            </div>
            <div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#0F8A5F',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '700',
                  marginBottom: '12px',
                }}
              >
                ✓
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  color: '#0F8A5F',
                  marginBottom: '6px',
                }}
              >
                Registration Submitted
              </div>
              <div
                style={{
                  fontFamily: 'var(--udm-sans)',
                  fontWeight: '700',
                  fontSize: '24px',
                  lineHeight: '1.15',
                  letterSpacing: '-.5px',
                  color: '#0A0A0A',
                  textWrap: 'pretty',
                }}
              >
                Thanks, {regFirstName}. Your account is ready.
              </div>
              <div style={{ fontSize: '13.5px', lineHeight: '1.55', color: 'rgba(0,0,0,.6)', marginTop: '12px', textWrap: 'pretty' }}>
                You can now sign in with <strong style={{ color: '#0A0A0A' }}>{regEmail}</strong> and your password.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '22px', height: '4px', borderRadius: '2px', background: '#0F8A5F' }} />
              <div style={{ width: '22px', height: '4px', borderRadius: '2px', background: '#0F8A5F' }} />
              <div style={{ width: '22px', height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,.12)' }} />
              <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'rgba(0,0,0,.5)', marginLeft: '4px' }}>Step 2 of 3 · Sign in next</div>
            </div>
          </div>
          <div
            style={{
              flex: '1.6 1 380px',
              padding: '24px 26px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              minWidth: '0',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: '700',
                  letterSpacing: '.6px',
                  textTransform: 'uppercase',
                  color: 'rgba(0,0,0,.45)',
                  marginBottom: '10px',
                }}
              >
                Carried over to the survey
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '10px 16px' }}>
                {(carryOver || []).map((c, _i) => (
                  <React.Fragment key={_i}>
                    <div style={{ minWidth: '0', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          letterSpacing: '.4px',
                          textTransform: 'uppercase',
                          color: 'rgba(0,0,0,.42)',
                          marginBottom: '4px',
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#0A0A0A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.value}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap-reverse', gap: '10px', marginTop: 'auto' }}>
              <div role="button" tabIndex={0} onKeyDown={onActivate(goSignin)}
                onClick={goSignin}
                style={{
                  flex: '1.3 1 200px',
                  textAlign: 'center',
                  background: '#004D40',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '13px',
                  fontWeight: '700',
                  fontSize: '14.5px',
                  cursor: 'pointer',
                }}
                {...hv({ background: '#00382E' })}
              >
                Sign In →
              </div>
              <div role="button" tabIndex={0} onKeyDown={onActivate(goHome)}
                onClick={goHome}
                style={{
                  flex: '1 1 150px',
                  textAlign: 'center',
                  border: '1px solid rgba(0,0,0,.16)',
                  color: '#0A0A0A',
                  borderRadius: '12px',
                  padding: '13px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
                {...hv({ background: '#F6F7F7' })}
              >
                Back to Home
              </div>
              <div style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: 'rgba(0,0,0,.45)', order: '-1' }}>
                You can complete your Alumni Profile after your first sign-in.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
