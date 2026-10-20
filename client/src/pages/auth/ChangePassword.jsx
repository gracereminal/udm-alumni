import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../data/navigation';
import { post } from '../../lib/api';

const button = (ok) => ({ bg: ok ? '#062A20' : '#E5E7EB', color: ok ? '#fff' : 'rgba(0,0,0,.38)', cursor: ok ? 'pointer' : 'not-allowed' });

/**
 * Change Password — shown at first sign-in to an account still on its one-time password (`mustChangePassword`).
 * Until it is changed the API refuses everything but /auth/*, so the guards send the user here.
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, refresh, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [currentErr, setCurrentErr] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const rules = [
    ['At least 8 characters', pw.length >= 8],
    ['One number', /\d/.test(pw)],
    ['One uppercase letter', /[A-Z]/.test(pw)],
    ['Passwords match', pw.length > 0 && pw === pw2],
  ];
  const ok = !!current && rules.every((r) => r[1]) && !busy;
  const save = async () => {
    if (!ok) { if (!current) setCurrentErr('Enter your one-time password.'); return; }
    setBusy(true);
    try {
      await post('/auth/change-password', { current, password: pw });
      const fresh = await refresh();
      navigate(ROLE_HOME[(fresh || user).role], { replace: true });
    } catch (err) {
      setBusy(false);
      if (err.fields && err.fields.current) setCurrentErr(err.fields.current);
      else setPwErr((err.fields && err.fields.password) || err.message);
    }
  };
  const sb = button(ok);

  return (
    <ForgotPasswordView
      change
      step={3}
      showSteps={false}
      current={current}
      currentErr={currentErr}
      setCurrent={(e) => { setCurrent(e.target.value); setCurrentErr(''); }}
      pw={pw}
      pw2={pw2}
      pwErr={pwErr}
      pwType={showPw ? 'text' : 'password'}
      pwToggle={showPw ? 'HIDE' : 'SHOW'}
      togglePw={() => setShowPw((s) => !s)}
      setPw={(e) => { setPw(e.target.value); setPwErr(''); }}
      setPw2={(e) => { setPw2(e.target.value); setPwErr(''); }}
      pwKey={(e) => { if (e.key === 'Enter') save(); }}
      rules={rules.map(([label, done]) => ({ label, mark: done ? '✓' : '', dotBg: done ? '#0B5A40' : '#E5E7EB', color: done ? '#0B5A40' : 'rgba(0,0,0,.5)' }))}
      save={save}
      saveBg={sb.bg}
      saveColor={sb.color}
      saveCursor={sb.cursor}
      backSignin={async (e) => { if (e && e.preventDefault) e.preventDefault(); await signOut(); navigate('/signin', { replace: true }); }}
    />
  );
}
