import React from 'react';
import FormField from '../components/FormField';
import { onActivate } from '../lib/a11y';

/* View layer for the "Register" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function RegisterView(v) {
  const {
    goSignin,
    regBack,
    regFields,
    regNext,
    regNextLabel,
    regProgress,
    regStepCounter,
    regStepDesc,
    regStepTitle,
    regSteps,
  } = v;
  return (
    <>
      <div data-screen-label="Register as Alumni" data-auth="1" style={{ display: 'flex', minHeight: '100vh' }}>
        <div
          data-m="hero"
          style={{
            flex: '1',
            minWidth: '0',
            backgroundColor: '#062A20',
            backgroundImage:
              'radial-gradient(ellipse 70% 50% at 15% 0%,rgba(22,120,86,.38),transparent 70%),radial-gradient(ellipse 60% 40% at 100% 100%,rgba(0,0,0,.35),transparent 70%),linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)',
            backgroundSize: '100% 100%,100% 100%,44px 44px,44px 44px',
            padding: '52px 60px 44px',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            boxSizing: 'border-box',
            fontFamily: "'Plus Jakarta Sans',Inter,sans-serif",
          }}
        >
          <div data-m="hero-logo" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '56px' }}>
            <img
              src="/alumni-logo.png"
              alt="Universidad de Manila seal"
              style={{
                width: '60px',
                height: '60px',
                flex: 'none',
                objectFit: 'contain',
              }}
            />
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '-.3px' }}>UDM Alumni</div>
              <div
                style={{
                  fontSize: '10.5px',
                  letterSpacing: '1.8px',
                  textTransform: 'uppercase',
                  color: '#D9B45A',
                  fontWeight: '700',
                  marginTop: '3px',
                }}
              >
                Universidad de Manila
              </div>
            </div>
          </div>
          <div
            data-m="hero-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: 'fit-content',
              border: '1px solid rgba(143,217,182,.22)',
              background: 'rgba(143,217,182,.06)',
              borderRadius: '6px',
              padding: '6px 11px',
              marginBottom: '26px',
            }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D9B45A' }} />
            <div
              style={{
                whiteSpace: 'nowrap',
                fontSize: '10.5px',
                fontWeight: '700',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: '#8FD9B6',
              }}
            >
              New Graduate Registration
            </div>
          </div>
          <div data-m="hero-title" style={{ fontWeight: '800', fontSize: '56px', lineHeight: '1.02', letterSpacing: '-2px', marginBottom: '22px' }}>
            Register as
            <br />
            <span
              style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontWeight: '600', letterSpacing: '-.5px', color: '#D9B45A' }}
            >
              Alumni.
            </span>
          </div>
          <div
            data-m="hero-desc"
            style={{
              fontSize: '15px',
              lineHeight: '1.65',
              color: 'rgba(214,234,225,.72)',
              maxWidth: '460px',
              marginBottom: '36px',
              textWrap: 'pretty',
            }}
          >
            Create your graduate record so the university can trace your career journey and keep you in the network.
          </div>
          <div data-m="reg-steps" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '480px', marginBottom: '16px' }}>
            {(regSteps || []).map((st, _i) => (
              <React.Fragment key={_i}>
                <div role="button" tabIndex={0} onKeyDown={onActivate(st.onClick)}
                  data-m="demo-row"
                  onClick={st.onClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    opacity: st.opacity,
                    background: st.rowBg,
                    border: `1px solid ${st.rowBorder}`,
                    borderRadius: '10px',
                    padding: '11px 14px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: '600',
                      fontSize: '12px',
                      background: st.badgeBg,
                      color: st.badgeColor,
                    }}
                  >
                    {st.badge}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{st.title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(214,234,225,.6)', marginTop: '2px' }}>{st.sub}</div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div
            data-m="reg-note"
            style={{
              position: 'relative',
              flex: '0 0 auto',
              background: 'rgba(255,255,255,.035)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '14px',
              padding: '16px 18px',
              maxWidth: '480px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D9B45A' }} />
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#D9B45A' }}>
                Before You Start
              </div>
            </div>
            <div style={{ fontSize: '12.5px', lineHeight: '1.6', color: 'rgba(214,234,225,.7)' }}>
              Registration collects your personal information and educational background only. Once submitted, you continue straight to the UDM Alumni
              Survey — nothing you enter here is asked again.
            </div>
          </div>
          <div style={{ flex: '1 1 auto', minHeight: '0' }} />
          <div
            data-m="hero-foot"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '10.5px',
              fontWeight: '700',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              color: 'rgba(143,217,182,.55)',
              marginTop: '40px',
              whiteSpace: 'nowrap',
              flexWrap: 'wrap',
            }}
          >
            <div>Connect</div>
            <div style={{ flex: 'none', width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor' }} />
            <div>Grow</div>
            <div style={{ flex: 'none', width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor' }} />
            <div>Give Back</div>
          </div>
        </div>
        <div
          data-m="form-panel"
          style={{
            flex: '1',
            minWidth: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            boxSizing: 'border-box',
          }}
        >
          <div
            data-m="form-card"
            style={{
              width: '100%',
              maxWidth: '600px',
              background: '#fff',
              border: '1px solid #E7E9ED',
              borderRadius: '16px',
              boxShadow: '0 1px 2px rgba(16,24,40,.04),0 16px 40px -12px rgba(0,51,43,.14)',
              padding: 'clamp(16px,3dvh,36px) clamp(22px,2.6vw,40px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: '800',
                  fontSize: '24px',
                  letterSpacing: '-.6px',
                  color: '#0A1F18',
                }}
              >
                {regStepTitle}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#004D40',
                  background: '#E7F0EE',
                  padding: '5px 11px',
                  borderRadius: '6px',
                  letterSpacing: '.4px',
                }}
              >
                {regStepCounter}
              </div>
            </div>
            <div data-m="f-desc" style={{ fontSize: '13.5px', color: 'rgba(0,0,0,.55)', marginBottom: '18px' }}>
              {regStepDesc}
            </div>
            <div data-m="f-prog" style={{ display: 'flex', gap: '6px', marginBottom: '26px' }}>
              {(regProgress || []).map((p, _i) => (
                <React.Fragment key={_i}>
                  <div style={{ flex: '1', height: '4px', borderRadius: '999px', background: p.bg }} />
                </React.Fragment>
              ))}
            </div>
            <div data-m="fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {(regFields || []).map((f, _i) => (
                <React.Fragment key={_i}>
                  <FormField f={f} variant="register" />
                </React.Fragment>
              ))}
            </div>
            <div data-m="actions" style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    regBack();
                  }
                }}
                onClick={regBack}
                style={{
                  flex: 'none',
                  border: '1px solid rgba(0,0,0,.16)',
                  color: '#0A0A0A',
                  borderRadius: '10px',
                  padding: '14px 20px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Back
              </div>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    regNext();
                  }
                }}
                onClick={regNext}
                style={{
                  flex: '1',
                  textAlign: 'center',
                  background: '#062A20',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '14px',
                  fontWeight: '700',
                  fontSize: '14.5px',
                  cursor: 'pointer',
                }}
              >
                {regNextLabel}
              </div>
            </div>
            <div data-m="f-alt" style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(0,0,0,.6)', marginTop: '22px' }}>
              Already registered?{' '}
              <button type="button" className="link-btn" onClick={goSignin} style={{ fontWeight: '700', textDecoration: 'none' }}>
                Sign in instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
