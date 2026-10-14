import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import { useResetFlow } from '../../context/ResetFlowContext';

const prevent = (e) => { if (e && e.preventDefault) e.preventDefault(); };
const button = (ok) => ({ bg: ok ? '#062A20' : '#E5E7EB', color: ok ? '#fff' : 'rgba(0,0,0,.38)', cursor: ok ? 'pointer' : 'not-allowed' });

/**
 * Forgot Password — email → 6-digit code (or the emailed reset link) → new password → done.
 * Step 5 is the "Link expired" state. Prototype only: any 6 digits are accepted.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { flow, patch, reset } = useResetFlow();
  const { step, email, viaLink } = flow;
  const setEmail = (v) => patch({ email: v });
  const [emailErr, setEmailErr] = useState('');
  const [code, setCode] = useState('');
  const [resent, setResent] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);

  const em = email.trim();
  const mask = (() => {
    const addr = em.includes('@') ? em : 'maria.delacruz@udmalumni.edu';
    const [u, d] = addr.split('@');
    return `${u.slice(0, 1)}•••••${u.length > 1 ? u.slice(-1) : ''}@${d}`;
  })();

  const goStep = (n, x) => { patch({ step: n, ...x }); setEmailErr(''); setResent(false); };
  const send = () => {
    if (!em) { setEmailErr('Enter your email or Alumni ID.'); return; }
    setCode('');
    goStep(2, { linkUsed: false, viaLink: false, sentAt: Date.now() });
  };
  const codeOk = /^\d{6}$/.test(code);
  const verify = () => { if (codeOk) goStep(3); };
  const rules = [
    ['At least 8 characters', pw.length >= 8],
    ['One number', /\d/.test(pw)],
    ['One uppercase letter', /[A-Z]/.test(pw)],
    ['Passwords match', pw.length > 0 && pw === pw2],
  ];
  const pwOk = rules.every((r) => r[1]);
  const save = () => { if (pwOk) goStep(4, { linkUsed: true }); };
  const vb = button(codeOk);
  const sb = button(pwOk);

  return (
    <ForgotPasswordView
      step={step}
      showSteps={step < 4}
      viaLink={viaLink && step === 3}
      linkEmail={em.includes('@') ? em : 'maria.delacruz@udmalumni.edu'}
      goInbox={(e) => { prevent(e); navigate('/forgot-password/inbox'); }}
      requestNew={() => { setCode(''); setPw(''); setPw2(''); reset(); }}
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
      setCode={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setResent(false); }}
      codeKey={(e) => { if (e.key === 'Enter') verify(); }}
      codeMsg={resent ? 'A new code has been sent.' : 'Prototype: any 6 digits will work.'}
      codeMsgColor={resent ? '#0B5A40' : 'rgba(0,0,0,.42)'}
      verify={verify}
      verifyBg={vb.bg}
      verifyColor={vb.color}
      verifyCursor={vb.cursor}
      resend={(e) => { prevent(e); setResent(true); setCode(''); }}
      changeEmail={(e) => { prevent(e); goStep(1); }}
      pw={pw}
      pw2={pw2}
      pwType={showPw ? 'text' : 'password'}
      pwToggle={showPw ? 'HIDE' : 'SHOW'}
      togglePw={() => setShowPw((s) => !s)}
      setPw={(e) => setPw(e.target.value)}
      setPw2={(e) => setPw2(e.target.value)}
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
