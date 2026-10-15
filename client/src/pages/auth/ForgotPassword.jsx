import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import { useResetFlow } from '../../context/ResetFlowContext';
import { get, post } from '../../lib/api';

const prevent = (e) => { if (e && e.preventDefault) e.preventDefault(); };
const button = (ok) => ({ bg: ok ? '#062A20' : '#E5E7EB', color: ok ? '#fff' : 'rgba(0,0,0,.38)', cursor: ok ? 'pointer' : 'not-allowed' });

/**
 * Forgot Password — email or Alumni ID → 6-digit code (or the emailed reset link) → new password → done.
 * Step 5 is the "Link expired" state. The email comes from the API (Gmail in production).
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { flow, patch, reset } = useResetFlow();
  const { step, email, viaLink, token, linkEmail } = flow;
  const setEmail = (v) => patch({ email: v });
  const [emailErr, setEmailErr] = useState('');
  const [code, setCode] = useState('');
  const [codeMsg, setCodeMsg] = useState({ text: 'Enter the 6-digit code from the email.', ok: false });
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const em = email.trim();
  const mask = (() => {
    if (!em.includes('@')) return 'the email on your account';
    const [u, d] = em.split('@');
    return `${u.slice(0, 1)}•••••${u.length > 1 ? u.slice(-1) : ''}@${d}`;
  })();

  const goStep = (n, x) => { patch({ step: n, ...x }); setEmailErr(''); };
  const run = async (fn) => { if (busy) return; setBusy(true); try { await fn(); } finally { setBusy(false); } };

  // Always the same answer, whether or not the account exists (no account enumeration).
  const send = () => run(async () => {
    if (!em) { setEmailErr('Enter your email or Alumni ID.'); return; }
    try {
      await post('/auth/forgot-password', { identifier: em });
      setCode('');
      setCodeMsg({ text: 'Enter the 6-digit code from the email.', ok: false });
      goStep(2, { viaLink: false, token: '' });
    } catch (err) { setEmailErr(err.message); }
  });
  const codeOk = /^\d{6}$/.test(code);
  const verify = () => run(async () => {
    if (!codeOk) return;
    try {
      const r = await post('/auth/reset-password/verify-code', { identifier: em, code });
      goStep(3, { token: r.resetSession, linkEmail: r.email, viaLink: false });
    } catch (err) { setCodeMsg({ text: err.message, ok: false }); setCode(''); }
  });
  const rules = [
    ['At least 8 characters', pw.length >= 8],
    ['One number', /\d/.test(pw)],
    ['One uppercase letter', /[A-Z]/.test(pw)],
    ['Passwords match', pw.length > 0 && pw === pw2],
  ];
  const pwOk = rules.every((r) => r[1]);
  const save = () => run(async () => {
    if (!pwOk) return;
    try {
      await post('/auth/reset-password', { [viaLink ? 'token' : 'resetSession']: token, password: pw });
      setPw(''); setPw2(''); setPwErr('');
      goStep(4, { token: '' });
    } catch (err) {
      if (err.code === 'expired') goStep(5, { token: '' });
      else setPwErr(err.message);
    }
  });
  const vb = button(codeOk && !busy);
  const sb = button(pwOk && !busy);

  return (
    <ForgotPasswordView
      step={step}
      showSteps={step < 4}
      viaLink={viaLink && step === 3}
      linkEmail={linkEmail}
      requestNew={() => { setCode(''); setPw(''); setPw2(''); reset(); navigate('/forgot-password', { replace: true }); }}
      bars={[1, 2, 3].map((i) => ({ bg: i <= step ? '#0B5A40' : '#E5E7EB' }))}
      stepLabel={`Step ${Math.min(step, 3)} of 3`}
      email={email}
      emailErr={emailErr}
      emailBorder={emailErr ? '#B3261E' : '#9CA3AF'}
      setEmail={(e) => { setEmail(e.target.value); setEmailErr(''); }}
      emailKey={(e) => { if (e.key === 'Enter') send(); }}
      send={send}
      masked={mask}
      code={code}
      setCode={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
      codeKey={(e) => { if (e.key === 'Enter') verify(); }}
      codeMsg={codeMsg.text}
      codeMsgColor={codeMsg.ok ? '#0B5A40' : 'rgba(0,0,0,.42)'}
      verify={verify}
      verifyBg={vb.bg}
      verifyColor={vb.color}
      verifyCursor={vb.cursor}
      resend={(e) => {
        prevent(e);
        run(async () => {
          try { await post('/auth/forgot-password', { identifier: em }); setCode(''); setCodeMsg({ text: 'A new code has been sent. Earlier codes no longer work.', ok: true }); } catch (err) { setCodeMsg({ text: err.message, ok: false }); }
        });
      }}
      changeEmail={(e) => { prevent(e); goStep(1); }}
      pw={pw}
      pw2={pw2}
      pwErr={pwErr}
      pwType={showPw ? 'text' : 'password'}
      pwToggle={showPw ? 'HIDE' : 'SHOW'}
      togglePw={() => setShowPw((s) => !s)}
      setPw={(e) => { setPw(e.target.value); setPwErr(''); }}
      setPw2={(e) => { setPw2(e.target.value); setPwErr(''); }}
      pwKey={(e) => { if (e.key === 'Enter') save(); }}
      rules={rules.map(([label, ok]) => ({ label, mark: ok ? '✓' : '', dotBg: ok ? '#0B5A40' : '#E5E7EB', color: ok ? '#0B5A40' : 'rgba(0,0,0,.5)' }))}
      save={save}
      saveBg={sb.bg}
      saveColor={sb.color}
      saveCursor={sb.cursor}
      finish={() => { reset(); navigate('/signin'); }}
      backSignin={(e) => { prevent(e); reset(); navigate('/signin'); }}
    />
  );
}

/** /reset-password?token=… — the link in the reset email. Verifies the token, then shows step 3 or "Link expired". */
export function ResetPasswordLink() {
  const [params] = useSearchParams();
  const { patch } = useResetFlow();
  const [checked, setChecked] = useState(false);
  const token = params.get('token') || '';

  useEffect(() => {
    let live = true;
    (token ? get(`/auth/reset-password/verify?token=${encodeURIComponent(token)}`) : Promise.resolve({ valid: false }))
      .catch(() => ({ valid: false }))
      .then((r) => {
        if (!live) return;
        patch(r.valid ? { step: 3, viaLink: true, token, linkEmail: r.email } : { step: 5, viaLink: false, token: '' });
        setChecked(true);
      });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return checked ? <ForgotPassword /> : null;
}
