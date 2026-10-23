import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import { useAuth } from '../../context/AuthContext';
import { post } from '../../lib/api';
import { homeFor } from '../../routes/guards';

/**
 * Two-step verification ("MFA Verification" in UDM Alumni.dc.html): after the password, the 6-digit code emailed by
 * POST /auth/login. The challenge arrives in the route state, so a reload goes back to Sign In for a new code.
 */
export default function VerifySignIn() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { verifyMfa } = useAuth();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!state || !state.challenge) return <Navigate to="/signin" replace />;

  const ok = code.length === 6 && !busy;
  const verify = async () => {
    if (!ok) return;
    setBusy(true);
    try {
      const user = await verifyMfa(state.challenge, code, trust);
      navigate(homeFor(user), { replace: true });
    } catch (e) {
      setBusy(false);
      setInfo('');
      setErr((e.fields && e.fields.code) || e.message);
      if (e.code === 'mfa_expired') setCode('');
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

  return (
    <ForgotPasswordView
      mfa
      step="mfa"
      showSteps={false}
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
