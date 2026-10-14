import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterView from '../../views/RegisterView';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { regStepDefs, regPasswordStep, visibleQs } from '../../data/formDefs';
import { buildField } from '../../lib/fields';
import { validateRegStep } from '../../lib/validation';

/** Multi-step alumni registration: Personal Information → Contact → Educational Background → Account Password. */
export default function AlumniRegistration() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { signInAsAlumni } = useAuth();
  const { a, setA, toggleA, persist, alumniName } = profile;
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  // Password values stay in component state only — never written to the persisted profile.
  const [pw, setPw] = useState({ reg_pw: '', reg_pw2: '' });
  const all = { ...a, ...pw };
  const steps = [...regStepDefs(a), regPasswordStep];
  const current = steps[step - 1];

  const clearErr = (id) => { if (errors[id]) setErrors((s) => { const n = { ...s }; delete n[id]; return n; }); };
  const handlers = {
    setA: (id, val) => {
      clearErr(id);
      if (id === 'college') { clearErr('course'); profile.setMany({ college: val, course: '', ...(val !== 'Others' ? { course_other: '' } : {}) }); return; }
      if (id in pw) { setPw((s) => ({ ...s, [id]: val })); return; }
      setA(id, val);
    },
    toggleA: (id, val) => { clearErr(id); toggleA(id, val); },
  };

  const validate = (idx) => {
    const e = validateRegStep(idx, all);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goStep = (target) => {
    if (target === step) return;
    if (target < step) { setErrors({}); setStep(target); return; }
    for (let i = step - 1; i < target - 1; i++) {
      if (Object.keys(validateRegStep(i, all)).length) { setStep(i + 1); setErrors(validateRegStep(i, all)); return; }
    }
    setErrors({});
    setStep(target);
  };

  const next = () => {
    if (!validate(step - 1)) return;
    if (step < steps.length) { setStep(step + 1); return; }
    persist({ registered: true, regAt: new Date().toISOString() });
    signInAsAlumni(alumniName);
    navigate('/register/success', { replace: true });
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
    regNextLabel: step < steps.length ? 'Continue →' : 'Submit Registration →',
    regNext: next,
    regBack: () => { setErrors({}); if (step > 1) setStep(step - 1); else navigate('/register/consent'); },
    goSignin: (e) => { if (e && e.preventDefault) e.preventDefault(); navigate('/signin'); },
  };
  return <RegisterView {...v} />;
}
