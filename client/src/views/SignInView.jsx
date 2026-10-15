import { hv } from '../lib/stateStyle';

const inputReset = {
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  font: 'inherit',
  color: '#0A0A0A',
  padding: 0,
  minWidth: 0,
};
const footLink = { border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' };

/* View layer for the "SignIn" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function SignInView(v) {
  const {
    identifier,
    onIdentifier,
    password,
    onPassword,
    showPassword,
    error,
    errorField,
    openForgot,
    openInfo,
    goRegister,
    passwordToggleLabel,
    signIn,
    togglePassword,
  } = v;
  return (
    <>
      <div
        data-screen-label="Sign In"
        data-auth="1"
        data-m="si-root"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,11fr) minmax(min(400px,100%),9fr)', minHeight: '100vh' }}
      >
        <div
          data-m="si-hero"
          style={{
            minWidth: '0',
            minHeight: '0',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            backgroundColor: '#062A20',
            backgroundImage:
              'radial-gradient(ellipse 70% 50% at 15% 0%,rgba(22,120,86,.38),transparent 70%),radial-gradient(ellipse 60% 40% at 100% 100%,rgba(0,0,0,.35),transparent 70%),linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px)',
            backgroundSize: '100% 100%,100% 100%,44px 44px,44px 44px',
            padding: 'clamp(24px,5dvh,64px) clamp(28px,5.2vw,104px) clamp(20px,4dvh,48px)',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            boxSizing: 'border-box',
            fontFamily: "'Plus Jakarta Sans',Inter,sans-serif",
            transition: 'padding .25s ease',
          }}
        >
          <div data-m="si-brand" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 'clamp(14px,1.4vw,24px)' }}>
            <img
              data-m="si-seal"
              src="/alumni-logo.png"
              alt="Universidad de Manila seal"
              style={{
                width: 'clamp(64px,min(6vw,10.5dvh),112px)',
                height: 'clamp(64px,min(6vw,10.5dvh),112px)',
                flex: 'none',
                objectFit: 'contain',
                transition: 'width .25s ease,height .25s ease',
              }}
            />
            <div style={{ minWidth: '0' }}>
              <div
                data-m="si-name"
                style={{
                  fontWeight: '800',
                  fontSize: 'clamp(21px,min(1.75vw,3.2dvh),32px)',
                  letterSpacing: '-.015em',
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap',
                }}
              >
                UDM Alumni
              </div>
              <div
                data-m="si-sub"
                style={{
                  fontSize: 'clamp(11px,min(.85vw,1.5dvh),15px)',
                  letterSpacing: '.17em',
                  textTransform: 'uppercase',
                  color: '#D9B45A',
                  fontWeight: '700',
                  marginTop: '.45em',
                  whiteSpace: 'nowrap',
                }}
              >
                Universidad de Manila
              </div>
            </div>
          </div>
          <div
            data-m="si-main"
            style={{ margin: 'auto 0', padding: 'clamp(24px,5dvh,72px) 0', maxWidth: '820px', display: 'flex', flexDirection: 'column' }}
          >
            <div
              data-m="si-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: 'fit-content',
                border: '1px solid rgba(143,217,182,.22)',
                background: 'rgba(143,217,182,.06)',
                borderRadius: '6px',
                padding: '.6em 1.1em',
                marginBottom: 'clamp(14px,2.8dvh,32px)',
                fontSize: 'clamp(11px,.8vw,13.5px)',
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D9B45A' }} />
              <div style={{ whiteSpace: 'nowrap', fontWeight: '700', letterSpacing: '.1em', textTransform: 'uppercase', color: '#8FD9B6' }}>
                3,400+ Alumni Connected
              </div>
            </div>
            <div
              data-m="si-title"
              style={{
                fontWeight: '800',
                fontSize: 'clamp(40px,min(5.4vw,8.8dvh),104px)',
                lineHeight: '1',
                letterSpacing: '-.035em',
                marginBottom: 'clamp(14px,2.8dvh,32px)',
              }}
            >
              Welcome Back,
              <br />
              <span
                style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontWeight: '600', letterSpacing: '-.008em', color: '#D9B45A' }}
              >
                Alumni!
              </span>
            </div>
            <div
              data-m="si-desc"
              style={{
                fontSize: 'clamp(15px,min(1.2vw,2.1dvh),21px)',
                lineHeight: '1.6',
                color: 'rgba(214,234,225,.72)',
                maxWidth: '34em',
                marginBottom: 'clamp(22px,4.4dvh,52px)',
                textWrap: 'pretty',
              }}
            >
              Track your career journey, reconnect with classmates, and discover opportunities from your alma mater&apos;s growing network.
            </div>
          </div>
          <div
            data-m="si-foot"
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '11.25px',
              fontWeight: '700',
              letterSpacing: '.17em',
              textTransform: 'uppercase',
              color: 'rgba(143,217,182,.55)',
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
              maxWidth: '420px',
              background: '#fff',
              border: '1px solid rgba(0,0,0,.06)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,51,43,.12)',
              padding: '40px',
            }}
          >
            <div
              data-m="f-title"
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontWeight: '800',
                fontSize: '28px',
                letterSpacing: '-.8px',
                color: '#0A1F18',
                marginBottom: '14px',
                lineHeight: '1.15',
              }}
            >
              Sign in to your{' '}
              <span style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontWeight: '600', color: '#0B5A40' }}>portal</span>
            </div>
            <div data-m="f-desc" style={{ fontSize: '13.5px', color: 'rgba(0,0,0,.55)', marginBottom: '28px' }}>
              Enter your credentials to access your alumni portal.
            </div>
            <form onSubmit={signIn} noValidate>
              <label htmlFor="si-id" style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#0A0A0A', marginBottom: '6px' }}>
                Email or Alumni ID
              </label>
              <div
                data-m="f-input"
                style={{
                  border: `1px solid ${errorField === 'identifier' ? '#B3261E' : '#9CA3AF'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13.5px',
                  color: '#0A0A0A',
                  marginBottom: '18px',
                  background: '#FBFAF8',
                }}
              >
                <input
                  id="si-id"
                  type="text"
                  value={identifier}
                  onChange={onIdentifier}
                  autoComplete="username"
                  placeholder="name@udmalumni.edu or Alumni ID"
                  aria-invalid={errorField === 'identifier'}
                  style={inputReset}
                />
              </div>
              <label htmlFor="si-pw" style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#0A0A0A', marginBottom: '6px' }}>
                Password
              </label>
              <div
                data-m="f-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  border: `1px solid ${errorField === 'password' ? '#B3261E' : '#9CA3AF'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  background: '#FBFAF8',
                }}
              >
                <input
                  id="si-pw"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={onPassword}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  aria-invalid={errorField === 'password'}
                  style={{ ...inputReset, fontFamily: showPassword ? 'ui-monospace,monospace' : 'inherit' }}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    flex: 'none',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#004D40',
                    cursor: 'pointer',
                    letterSpacing: '.3px',
                  }}
                >
                  {passwordToggleLabel}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: error ? '10px' : '22px' }}>
                <button type="button" className="link-btn" onClick={openForgot} style={{ fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                  Forgot password?
                </button>
              </div>
              {error ? (
                <div role="alert" style={{ fontSize: '12.5px', lineHeight: '1.45', color: '#B3261E', marginBottom: '14px' }}>
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                data-m="f-btn"
                style={{
                  width: '100%',
                  border: 'none',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#062A20',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '14px',
                  fontWeight: '700',
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  marginBottom: '22px',
                }}
                {...hv({ background: '#0B3125' })}
              >
                Sign In
              </button>
            </form>
            <div style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(0,0,0,.6)' }}>
              New graduate?{' '}
              <button type="button" className="link-btn" onClick={goRegister} style={{ fontWeight: '700', textDecoration: 'none' }}>
                Register as Alumni
              </button>
            </div>
            <div
              data-m="f-foot"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '18px',
                marginTop: '24px',
                fontSize: '11.5px',
                fontWeight: '600',
                color: 'rgba(0,0,0,.4)',
              }}
            >
              {['privacy', 'terms', 'contact'].map((k) => (
                <button key={k} type="button" onClick={() => openInfo(k)} style={footLink} {...hv({ color: '#004D40' })}>
                  {k[0].toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
