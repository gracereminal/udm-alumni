import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import { useAuth } from '../../context/AuthContext';
import { post } from '../../lib/api';
import { homeFor } from '../../routes/guards';

/**
 * Two-step verification ("MFA Verification" in UDM Alumni.dc.html): after the password, either the 6-digit code emailed
 * by POST /auth/login ("Email code") or the answers to the account's two security questions ("Security questions").
 * The challenge arrives in the route state, so a reload goes back to Sign In for a new code.
 */
export default function VerifySignIn() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { verifyMfa } = useAuth();
  const [method, setMethod] = useState('email');
  const [code, setCode] = useState('');
  const [answers, setAnswers] = useState(['', '']);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state || !state.challenge) return <Navigate to="/signin" replace />;

  const questions = state.questions || [];
  const isSq = method === 'sq';
  const ok = !busy && (isSq ? questions.length > 0 && answers.every((x) => x.trim()) : code.length === 6);
  const verify = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      const user = await verifyMfa(state.challenge, isSq ? { answers } : code, trust);
      navigate(homeFor(user), { replace: true });
    } catch (e) {
      setBusy(false);
      setInfo('');
      setErr((e.fields && (e.fields.code || e.fields.answers)) || e.message);
      if (e.code === 'mfa_expired') { setCode(''); setAnswers(['', '']); }
    }
  };
  const resend = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErr('');
    try {
      const r = await post('/auth/mfa/resend', { challenge: state.challenge });
      setCode('');
      setInfo(`We sent a new code to ${r.sentTo}.`);
    } catch (e2) {
      setInfo('');
      setErr(e2.message);
    }
  };
  const pick = (m) => () => { if (m !== method) { setMethod(m); setErr(''); setInfo(''); } };

  return (
    <ForgotPasswordView
      mfa
      step="mfa"
      showSteps={false}
      method={method}
      useEmail={pick('email')}
      useSq={pick('sq')}
      sqList={questions.map((q, i) => ({
        n: i + 1,
        q,
        val: answers[i],
        set: (e) => { const next = answers.slice(); next[i] = e.target.value; setAnswers(next); setErr(''); },
      }))}
      masked={state.sentTo}
      expiresMinutes={state.expiresMinutes || 10}
      code={code}
      setCode={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
      codeKey={(e) => { if (e.key === 'Enter') verify(); }}
      codeMsg={err || info}
      codeMsgColor={err ? '#B3261E' : '#0B5A40'}
      codeBorder={err ? '#B3261E' : '#9CA3AF'}
      trust={trust}
      toggleTrust={() => setTrust((t) => !t)}
      verify={verify}
      verifyBg={ok ? '#062A20' : '#E5E7EB'}
      verifyColor={ok ? '#fff' : 'rgba(0,0,0,.4)'}
      verifyCursor={ok ? 'pointer' : 'not-allowed'}
      resend={resend}
      backSignin={(e) => { if (e && e.preventDefault) e.preventDefault(); navigate('/signin', { replace: true }); }}
    />
  );
}
