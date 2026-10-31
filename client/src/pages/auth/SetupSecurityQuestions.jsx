import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordView from '../../views/ForgotPasswordView';
import { useAuth } from '../../context/AuthContext';
import { SECURITY_QUESTIONS, securityQuestionErrors } from '../../data/securityQuestions';
import { post } from '../../lib/api';
import { homeFor } from '../../routes/guards';

const button = (ok) => ({ bg: ok ? '#062A20' : '#E5E7EB', color: ok ? '#fff' : 'rgba(0,0,0,.38)', cursor: ok ? 'pointer' : 'not-allowed' });

/**
 * Security Questions setup — shown once after signing in when two-step verification is on and the account has none
 * yet (`needsSecurityQuestions`): admin and college accounts, and alumni who registered before the questions existed.
 */
export default function SetupSecurityQuestions() {
  const navigate = useNavigate();
  const { refresh, signOut } = useAuth();
  const [form, setForm] = useState({ sq1: '', sq1_answer: '', sq2: '', sq2_answer: '' });
  const [errors, setErrors] = useState({});
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (id) => (e) => {
    setForm((f) => ({ ...f, [id]: e.target.value }));
    setErrors((s) => { const n = { ...s }; delete n[id]; return n; });
    setFormErr('');
  };
  const next = (fresh) => navigate(fresh ? homeFor(fresh) : '/signin', { replace: true });
  const ok = !busy && Object.values(form).every((x) => x.trim());
  const save = async () => {
    if (!ok) return;
    const e = securityQuestionErrors(form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setBusy(true);
    try {
      await post('/auth/security-questions', form);
      next(await refresh());
    } catch (err) {
      setBusy(false);
      if (err.code === 'already_set') { next(await refresh()); return; }
      if (err.fields) setErrors(err.fields);
      else setFormErr(err.message);
    }
  };
  const sb = button(ok);

  return (
    <ForgotPasswordView
      setup
      step="sq-setup"
      showSteps={false}
      setupOptions={SECURITY_QUESTIONS}
      setupRows={[1, 2].map((n) => ({
        n,
        q: form[`sq${n}`],
        setQ: set(`sq${n}`),
        a: form[`sq${n}_answer`],
        setA: set(`sq${n}_answer`),
        qErr: errors[`sq${n}`] || '',
        aErr: errors[`sq${n}_answer`] || '',
      }))}
      pwErr={formErr}
      pwKey={(e) => { if (e.key === 'Enter') save(); }}
      save={save}
      saveBg={sb.bg}
      saveColor={sb.color}
      saveCursor={sb.cursor}
      backSignin={async (e) => { if (e && e.preventDefault) e.preventDefault(); await signOut(); navigate('/signin', { replace: true }); }}
    />
  );
}
