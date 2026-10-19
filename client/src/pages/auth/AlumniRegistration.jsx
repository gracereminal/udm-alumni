import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterView from '../../views/RegisterView';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { regStepDefs, regPasswordStep, visibleQs, answerPatch } from '../../data/formDefs';
import { buildField } from '../../lib/fields';
import { validateRegStep } from '../../lib/validation';
import { useQuestionConfig } from '../../lib/questionStore';
import { useToast } from '../../context/ToastContext';
import { PRIVACY_KEY } from './PrivacyConsent';

/** Multi-step alumni registration: Personal Information → Contact → Educational Background → Account Password. */
export default function AlumniRegistration() {
  const navigate = useNavigate();
  useQuestionConfig(); // re-render when an Admin edits the questions
  const profile = useProfile();
  const { registerAlumni } = useAuth();
  const { toast } = useToast();
  const { a, toggleA, completeRegistration } = profile;
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Password values stay in component state only — never written to the persisted profile.
  const [pw, setPw] = useState({ reg_pw: '', reg_pw2: '' });
  const all = { ...a, ...pw };
  const steps = [...regStepDefs(a), regPasswordStep()];
  const current = steps[step - 1];

  const clearErr = (id) => { if (errors[id]) setErrors((s) => { const n = { ...s }; delete n[id]; return n; }); };
  const handlers = {
    setA: (id, val) => {
      clearErr(id);
      if (id in pw) { setPw((s) => ({ ...s, [id]: val })); return; }
      const patch = answerPatch(a, id, val);
      Object.keys(patch).forEach(clearErr);
      profile.setMany(patch);
    },
    toggleA: (id, val) => { clearErr(id); toggleA(id, val); },
  };

  // A duplicate email is reported by the API on submit (409 `email_taken` with a field error).
  const stepErrors = (idx) => validateRegStep(idx, all);

  const validate = (idx) => {
    const e = stepErrors(idx);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goStep = (target) => {
    if (target === step) return;
    if (target < step) { setErrors({}); setStep(target); return; }
    for (let i = step - 1; i < target - 1; i++) {
      const e = stepErrors(i);
      if (Object.keys(e).length) { setStep(i + 1); setErrors(e); return; }
    }
    setErrors({});
    setStep(target);
  };

  const next = async () => {
    if (busy || !validate(step - 1)) return;
    if (step < steps.length) { setStep(step + 1); return; }
    let consent = null;
    try { consent = JSON.parse(sessionStorage.getItem(PRIVACY_KEY) || 'null'); } catch { consent = null; }
    setBusy(true);
    try {
      // The password is sent once over HTTPS; the API stores only its hash. The new account starts PENDING:
      // no sign-in here — an Admin must approve it before the first login.
      const res = await registerAlumni({ ...a, ...pw, privacy_consent: !!consent, marketing_opt_in: !!(consent && consent.comms) });
      completeRegistration(a, res);
      try { sessionStorage.removeItem(PRIVACY_KEY); } catch { /* ignore */ }
      navigate('/register/success', { replace: true });
    } catch (err) {
      setBusy(false);
      if (err.fields && err.fields.privacy_consent) { navigate('/register/consent'); return; }
      if (err.fields) {
        // Show the server's field errors (e.g. an email that is already registered) on the first step that has one.
        const at = steps.findIndex((st) => st.questions.some((q) => err.fields[q.id]));
        if (at > -1) setStep(at + 1);
        setErrors(err.fields);
      }
      toast(err.message, false);
    }
  };

  const v = {
    regSteps: steps.map((st, i) => ({
      badge: i + 1 < step ? '✓' : String(i + 1),
      title: st.title,
      sub: st.sub,
      opacity: i + 1 <= step ? 1 : 0.55,
      rowBg: i + 1 === step ? 'rgba(217,180,90,.08)' : 'rgba(0,0,0,.18)',
      rowBorder: i + 1 === step ? 'rgba(217,180,90,.45)' : 'rgba(255,255,255,.07)',
      badgeBg: i + 1 < step ? 'rgba(240,196,40,.25)' : i + 1 === step ? '#F0C428' : 'rgba(255,255,255,.06)',
      badgeColor: i + 1 < step ? '#F0C428' : i + 1 === step ? '#00332B' : 'rgba(255,255,255,.7)',
      onClick: () => goStep(i + 1),
    })),
    regProgress: steps.map((_, i) => ({ bg: i + 1 <= step ? '#004D40' : 'rgba(0,0,0,.1)' })),
    regStepTitle: current.heading,
    regStepDesc: current.desc,
    regStepCounter: `STEP ${step} OF ${steps.length}`,
    regFields: visibleQs(current, a).map((q) => buildField(q, all, handlers, errors)),
    regNextLabel: step < steps.length ? 'Continue →' : busy ? 'Submitting…' : 'Submit Registration →',
    regNext: next,
    regBack: () => { setErrors({}); if (step > 1) setStep(step - 1); else navigate('/register/consent'); },
    goSignin: (e) => { if (e && e.preventDefault) e.preventDefault(); navigate('/signin'); },
  };
  return <RegisterView {...v} />;
}
