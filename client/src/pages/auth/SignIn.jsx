import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignInView from '../../views/SignInView';
import Modal, { modalBtn } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../data/navigation';

const INFO = {
  privacy: {
    title: 'Privacy',
    body: 'The Universidad de Manila collects personal information only for the alumni tracer study, CHED and accreditation reporting, and alumni events and opportunities. Only authorized UDM personnel can access your record, and reports shared outside the university contain aggregated, anonymized data only. You may access, correct or request erasure of your data at any time through My Profile or by writing to udmalumni@udm.edu.ph.',
  },
  terms: {
    title: 'Terms of Use',
    body: 'By signing in you agree to use the UDM Alumni portal for lawful, university-related purposes, to keep your information accurate and up to date, and to keep your credentials confidential. Staff accounts may only be used for authorized alumni-relations work. Misuse may result in suspension of access.',
  },
  contact: {
    title: 'Contact',
    body: 'UDM Alumni Relations Office — Universidad de Manila, Mehan Gardens, Ermita, Manila. Email udmalumni@udm.edu.ph. Office hours: Monday to Friday, 8:00 AM – 5:00 PM. For data privacy concerns, contact the same office.',
  },
};

/** Sign In screen. The signed-in account's role decides which dashboard opens. */
export default function SignIn() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState({ error: '', field: '' });
  const [info, setInfo] = useState(null);

  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await signIn(identifier, password);
    setBusy(false);
    if (!res.ok) { setErr({ error: res.error, field: res.field }); return; }
    navigate(ROLE_HOME[res.user.role], { replace: true });
  };

  const v = {
    identifier,
    password,
    showPassword,
    error: err.error,
    errorField: err.field,
    onIdentifier: (e) => { setIdentifier(e.target.value); setErr({ error: '', field: '' }); },
    onPassword: (e) => { setPassword(e.target.value); setErr({ error: '', field: '' }); },
    togglePassword: () => setShowPassword((s) => !s),
    passwordToggleLabel: showPassword ? 'HIDE' : 'SHOW',
    signIn: submit,
    goRegister: (e) => { e.preventDefault(); navigate('/register/consent'); },
    openForgot: (e) => { e.preventDefault(); navigate('/forgot-password'); },
    openInfo: (k) => setInfo(k),
  };

  return (
    <>
      <SignInView {...v} />
      <Modal open={!!info} onClose={() => setInfo(null)} title={info ? INFO[info].title : ''} footer={<button type="button" style={modalBtn(true)} onClick={() => setInfo(null)}>Close</button>}>
        {info ? INFO[info].body : null}
      </Modal>
    </>
  );
}
