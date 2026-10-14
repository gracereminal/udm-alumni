import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrivacyConsentView from '../../views/PrivacyConsentView';

export const PRIVACY_KEY = 'udm.privacy.consented';

const SECTIONS = [
  { n: 1, title: 'Who we are', body: 'The Universidad de Manila, through its UDM Alumni Relations Office, is the personal information controller for UDM Alumni.' },
  { n: 2, title: 'What we collect', body: 'Personal information (name, birthdate, sex, civil status, address, email, mobile number), educational background (student number, college, program, year graduated), and employment and career details you provide in the Alumni Survey.' },
  { n: 3, title: 'Why we collect it', body: 'To conduct the graduate outcomes study, monitor employability and program outcomes, comply with CHED and accreditation reporting, and connect you with alumni events and job opportunities.' },
  { n: 4, title: 'Who can see it', body: 'Only authorized UDM personnel. Reports shared with CHED, accrediting bodies, or partners contain aggregated, anonymized data only. We never sell your information.' },
  { n: 5, title: 'Storage & retention', body: 'Your data is stored on secured university systems with access controls and is kept while your alumni record is active or as required by law, then securely disposed of.' },
  { n: 6, title: 'Your rights', body: 'You may access, correct, object to processing, request erasure, or withdraw your consent at any time through My Profile or by contacting the UDM Alumni Relations Office. You may also file a complaint with the National Privacy Commission.' },
];

const CONSENTS = [
  { k: 'process', req: true, label: 'I have read and understood this Data Privacy Notice, and I consent to UDM collecting and processing my personal information for the purposes stated above.' },
  { k: 'accurate', req: true, label: 'I certify that the information I will provide is true and correct, and I will keep it updated.' },
  { k: 'comms', req: false, label: 'I agree to receive alumni news, event invitations, and job opportunities by email or SMS.' },
];

/** Data Privacy Notice & Consent — required before the registration form opens. */
export default function PrivacyConsent() {
  const navigate = useNavigate();
  const [pc, setPc] = useState({});
  const [declined, setDeclined] = useState(false);
  const [privacyHint, setPrivacyHint] = useState('');
  const ok = !!(pc.process && pc.accurate);

  const v = {
    privacySections: SECTIONS,
    privacyConsents: CONSENTS.map((it) => {
      const on = !!pc[it.k];
      return {
        label: it.label,
        tag: it.req ? 'Required' : 'Optional',
        tagColor: it.req ? '#B3261E' : 'rgba(0,0,0,.4)',
        bg: on ? '#004D40' : '#fff',
        border: on ? '#004D40' : 'rgba(0,0,0,.22)',
        mark: on ? '✓' : '',
        onClick: () => setPc((s) => ({ ...s, [it.k]: !s[it.k] })),
      };
    }),
    privacyBtnBg: ok ? '#004D40' : '#E4E7E6',
    privacyBtnColor: ok ? '#fff' : 'rgba(0,0,0,.38)',
    privacyCursor: ok ? 'pointer' : 'not-allowed',
    privacyAgree: () => {
      if (!ok) { setPrivacyHint('Please tick both required statements to continue.'); return; }
      try { sessionStorage.setItem(PRIVACY_KEY, JSON.stringify({ at: Date.now(), comms: !!pc.comms })); } catch { /* ignore */ }
      navigate('/register/details');
    },
    declined,
    privacyHint,
    // "I Do Not Agree": no consent is stored and registration stays blocked until the user agrees.
    privacyDecline: () => {
      try { sessionStorage.removeItem(PRIVACY_KEY); } catch { /* ignore */ }
      setPc({});
      setDeclined(true);
    },
    reviewPolicy: () => {
      setDeclined(false);
      requestAnimationFrame(() => document.getElementById('privacy-notice')?.scrollTo({ top: 0 }));
    },
    goSignin: () => navigate('/signin'),
  };
  return <PrivacyConsentView {...v} />;
}
