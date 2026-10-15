import { hv, fv } from '../lib/stateStyle';
import { onActivate } from '../lib/a11y';

const FOCUS = { borderColor: '#0B5A40', boxShadow: '0 0 0 3px rgba(11,90,64,.14)' };
const titleStyle = { fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: '800', fontSize: '28px', letterSpacing: '-.8px', color: '#0A1F18', lineHeight: '1.15' };
const italic = { fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontWeight: '600', color: '#0B5A40' };
const descStyle = { fontSize: '13.5px', lineHeight: '1.55', color: 'rgba(0,0,0,.55)', textWrap: 'pretty' };
const labelStyle = { fontSize: '12.5px', fontWeight: '700', color: '#0A0A0A', marginBottom: '6px' };
const inputStyle = (border, extra) => ({
  display: 'block', width: '100%', boxSizing: 'border-box', border: `1px solid ${border}`, borderRadius: '10px', padding: '12px 14px',
  font: 'inherit', fontSize: '13.5px', color: '#0A0A0A', background: '#FBFAF8', outline: 'none', ...extra,
});
const btnStyle = (bg, color, cursor, extra) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: bg, color, cursor, borderRadius: '10px',
  padding: '14px', fontWeight: '700', fontSize: '14.5px', ...extra,
});
const msgStyle = (color) => ({ minHeight: '18px', margin: '6px 0 10px', fontSize: '12px', fontWeight: '600', color });

/* View layer for the "Forgot Password" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function ForgotPasswordView(v) {
  const {
    step, bars, stepLabel, showSteps,
    email, emailErr, emailBorder, setEmail, emailKey, send, masked,
    code, setCode, codeKey, codeMsg, codeMsgColor, verify, verifyBg, verifyColor, verifyCursor, resend, changeEmail,
    pw, pw2, pwType, pwToggle, togglePw, setPw, setPw2, pwKey, rules, save, saveBg, saveColor, saveCursor,
    finish, backSignin, viaLink, linkEmail, requestNew, pwErr,
  } = v;
  const btnHover = hv({ background: '#0B3D2E' });
  return (
    <div
      data-screen-label="Forgot Password"
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
        }}
      >
        <div data-m="si-brand" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 'clamp(14px,1.4vw,24px)' }}>
          <img
            data-m="si-seal"
            src="/alumni-logo.png"
            alt="Universidad de Manila seal"
            style={{ width: 'clamp(64px,min(6vw,10.5dvh),112px)', height: 'clamp(64px,min(6vw,10.5dvh),112px)', flex: 'none', objectFit: 'contain' }}
          />
          <div style={{ minWidth: '0' }}>
            <div data-m="si-name" style={{ fontWeight: '800', fontSize: 'clamp(21px,min(1.75vw,3.2dvh),32px)', letterSpacing: '-.015em', lineHeight: '1.1', whiteSpace: 'nowrap' }}>
              UDM Alumni
            </div>
            <div
              data-m="si-sub"
              style={{ fontSize: 'clamp(11px,min(.85vw,1.5dvh),15px)', letterSpacing: '.17em', textTransform: 'uppercase', color: '#D9B45A', fontWeight: '700', marginTop: '.45em', whiteSpace: 'nowrap' }}
            >
              Universidad de Manila
            </div>
          </div>
        </div>
        <div data-m="si-main" style={{ margin: 'auto 0', padding: 'clamp(24px,5dvh,72px) 0', maxWidth: '820px', display: 'flex', flexDirection: 'column' }}>
          <div
            data-m="si-pill"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content', border: '1px solid rgba(143,217,182,.22)', background: 'rgba(143,217,182,.06)',
              borderRadius: '6px', padding: '.6em 1.1em', marginBottom: 'clamp(14px,2.8dvh,32px)', fontSize: 'clamp(11px,.8vw,13.5px)',
            }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D9B45A' }} />
            <div style={{ whiteSpace: 'nowrap', fontWeight: '700', letterSpacing: '.1em', textTransform: 'uppercase', color: '#8FD9B6' }}>Account Recovery</div>
          </div>
          <div
            data-m="si-title"
            style={{ fontWeight: '800', fontSize: 'clamp(40px,min(5.4vw,8.8dvh),104px)', lineHeight: '1', letterSpacing: '-.035em', marginBottom: 'clamp(14px,2.8dvh,32px)' }}
          >
            Locked out?
            <br />
            <span style={{ fontFamily: "'Playfair Display',serif", fontStyle: 'italic', fontWeight: '600', letterSpacing: '-.008em', color: '#D9B45A' }}>We&apos;ve got you.</span>
          </div>
          <div data-m="si-desc" style={{ fontSize: 'clamp(15px,min(1.2vw,2.1dvh),21px)', lineHeight: '1.6', color: 'rgba(214,234,225,.72)', maxWidth: '34em', textWrap: 'pretty' }}>
            Verify the email linked to your alumni record and set a new password in three quick steps.
          </div>
        </div>
        <div
          data-m="si-foot"
          style={{
            flex: 'none', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11.25px', fontWeight: '700', letterSpacing: '.17em', textTransform: 'uppercase',
            color: 'rgba(143,217,182,.55)', whiteSpace: 'nowrap', flexWrap: 'wrap',
          }}
        >
          <div>Connect</div>
          <div style={{ flex: 'none', width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor' }} />
          <div>Grow</div>
          <div style={{ flex: 'none', width: '3px', height: '3px', borderRadius: '50%', background: 'currentColor' }} />
          <div>Give Back</div>
        </div>
      </div>

      <div data-m="form-panel" style={{ flex: '1', minWidth: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', boxSizing: 'border-box' }}>
        <div
          data-m="form-card"
          style={{ width: '100%', maxWidth: '500px', boxSizing: 'border-box', background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,51,43,.12)', padding: '40px' }}
        >
          {showSteps ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', gap: '6px', flex: '1', maxWidth: '160px' }}>
                {bars.map((b, i) => (
                  <div key={i} style={{ flex: '1', height: '4px', borderRadius: '2px', background: b.bg, transition: 'background .2s' }} />
                ))}
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,.45)', whiteSpace: 'nowrap' }}>{stepLabel}</div>
            </div>
          ) : null}

          {step === 1 ? (
            <>
              <div data-m="f-title" style={{ ...titleStyle, marginBottom: '14px' }}>Forgot your <span style={italic}>password?</span></div>
              <div data-m="f-desc" style={{ ...descStyle, marginBottom: '28px' }}>
                Enter the email or Alumni ID on your record. We&apos;ll send a 6-digit code to your registered email.
              </div>
              <div style={labelStyle}>Email or Alumni ID</div>
              <input
                data-m="f-input" type="text" value={email} onChange={setEmail} onKeyDown={emailKey} placeholder="e.g. maria.delacruz@udmalumni.edu" autoFocus
                style={inputStyle(emailBorder)} {...fv(FOCUS)}
              />
              <div role="alert" style={msgStyle('#B3261E')}>{emailErr}</div>
              <div tabIndex={0} onKeyDown={onActivate(send)} data-m="f-btn" role="button" onClick={send} style={btnStyle('#062A20', '#fff', 'pointer', { marginBottom: '22px' })} {...btnHover}>Send Reset Code</div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div data-m="f-title" style={{ ...titleStyle, marginBottom: '14px' }}>Check your <span style={italic}>email</span></div>
              <div data-m="f-desc" style={{ ...descStyle, marginBottom: '28px' }}>
                We sent a 6-digit code to <strong style={{ color: '#0A1F18' }}>{masked}</strong>. It expires in 30 minutes.
              </div>
              <div style={labelStyle}>Verification code</div>
              <input
                data-m="f-input" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={setCode} onKeyDown={codeKey} placeholder="••••••" autoFocus
                style={inputStyle('#9CA3AF', { fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: '22px', letterSpacing: '.6em', textAlign: 'center' })} {...fv(FOCUS)}
              />
              <div style={msgStyle(codeMsgColor)}>{codeMsg}</div>
              <div tabIndex={0} onKeyDown={onActivate(verify)} data-m="f-btn" role="button" onClick={verify} style={btnStyle(verifyBg, verifyColor, verifyCursor, { marginBottom: '18px' })}>Verify Code</div>
              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 16px', fontSize: '13px', color: 'rgba(0,0,0,.6)', marginBottom: '22px' }}>
                <div>Didn&apos;t get it? <button type="button" className="link-btn" onClick={resend} style={{ fontWeight: '700', textDecoration: 'none' }}>Resend code</button></div>
                <button type="button" className="link-btn" onClick={changeEmail} style={{ fontWeight: '600', textDecoration: 'none' }}>Use a different email</button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div data-m="f-title" style={{ ...titleStyle, marginBottom: '14px' }}>Set a new <span style={italic}>password</span></div>
              <div data-m="f-desc" style={{ ...descStyle, marginBottom: '24px' }}>Choose a password you haven&apos;t used before on this portal.</div>
              {viaLink ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#E3F1EA', borderRadius: '10px', padding: '10px 12px', margin: '-8px 0 20px', fontSize: '12.5px', color: '#0B5A40', fontWeight: '600' }}>
                  <div style={{ width: '18px', height: '18px', flex: 'none', borderRadius: '50%', background: '#0B5A40', color: '#fff', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                  <div style={{ minWidth: 0 }}>Reset link verified for {linkEmail}</div>
                </div>
              ) : null}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0A0A0A' }}>New password</div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(togglePw)} onClick={togglePw} style={{ fontSize: '11.5px', fontWeight: '700', color: '#004D40', cursor: 'pointer', letterSpacing: '.3px' }}>{pwToggle}</div>
              </div>
              <input data-m="f-input" type={pwType} value={pw} onChange={setPw} autoFocus autoComplete="new-password" style={inputStyle('#9CA3AF', { marginBottom: '16px' })} {...fv(FOCUS)} />
              <div style={labelStyle}>Confirm new password</div>
              <input data-m="f-input" type={pwType} value={pw2} onChange={setPw2} onKeyDown={pwKey} autoComplete="new-password" style={inputStyle('#9CA3AF', { marginBottom: '14px' })} {...fv(FOCUS)} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '6px 14px', marginBottom: '22px' }}>
                {rules.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: r.color }}>
                    <div style={{ width: '16px', height: '16px', flex: 'none', borderRadius: '50%', background: r.dotBg, color: '#fff', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.mark}</div>
                    <div>{r.label}</div>
                  </div>
                ))}
              </div>
              {pwErr ? <div role="alert" style={msgStyle('#B3261E')}>{pwErr}</div> : null}
              <div tabIndex={0} onKeyDown={onActivate(save)} data-m="f-btn" role="button" onClick={save} style={btnStyle(saveBg, saveColor, saveCursor, { marginBottom: '22px' })}>Update Password</div>
            </>
          ) : null}

          {step === 4 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#E3F1EA', color: '#0B5A40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '800', marginBottom: '18px' }}>✓</div>
              <div data-m="f-title" style={{ ...titleStyle, marginBottom: '12px' }}>Password <span style={italic}>updated</span></div>
              <div data-m="f-desc" style={{ ...descStyle, marginBottom: '26px', maxWidth: '340px' }}>
                You can now sign in with your new password. For your security, other active sessions have been signed out.
              </div>
              <div tabIndex={0} onKeyDown={onActivate(finish)} data-m="f-btn" role="button" onClick={finish} style={btnStyle('#062A20', '#fff', 'pointer', { alignSelf: 'stretch', marginBottom: '6px' })} {...btnHover}>Back to Sign In →</div>
            </div>
          ) : null}

          {step === 5 ? (
            <div data-screen-label="Reset Link Expired" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FBEDEC', color: '#B3261E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: '800', marginBottom: '18px' }}>!</div>
              <div data-m="f-title" style={{ ...titleStyle, marginBottom: '12px' }}>Link <span style={{ ...italic, color: '#B3261E' }}>expired</span></div>
              <div data-m="f-desc" style={{ ...descStyle, color: 'rgba(0,0,0,.6)', marginBottom: '26px', maxWidth: '360px' }}>
                This password reset link has already been used or has expired. Please request a new password reset link.
              </div>
              <div tabIndex={0} onKeyDown={onActivate(requestNew)} data-m="f-btn" role="button" onClick={requestNew} style={btnStyle('#062A20', '#fff', 'pointer', { alignSelf: 'stretch', marginBottom: '18px' })} {...btnHover}>Request a New Reset Link</div>
              <div style={{ fontSize: '13px' }}><button type="button" className="link-btn" onClick={backSignin} style={{ fontWeight: '700', textDecoration: 'none' }}>Back to Sign In</button></div>
            </div>
          ) : null}

          {showSteps ? (
            <div style={{ textAlign: 'center', fontSize: '13px' }}>
              <button type="button" className="link-btn" onClick={backSignin} style={{ fontWeight: '700', textDecoration: 'none' }}>Back to Sign In</button>
            </div>
          ) : null}
          <div data-m="f-foot" style={{ display: 'flex', justifyContent: 'center', gap: '18px', marginTop: '24px', fontSize: '11.5px', fontWeight: '600', color: 'rgba(0,0,0,.4)' }}>
            <div>Privacy</div>
            <div>Terms</div>
            <div>Contact</div>
          </div>
        </div>
      </div>
    </div>
  );
}
