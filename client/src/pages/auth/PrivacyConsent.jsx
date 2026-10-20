import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrivacyConsentView from '../../views/PrivacyConsentView';

export const PRIVACY_KEY = 'udm.privacy.consented';

/** The Data Privacy Notice, also shown again from Privacy & My Data. */
export const PRIVACY_SECTIONS = [
  { n: 1, title: 'Who we are', body: 'The UDM Alumni Relations Office is the personal information controller for UDM Alumni.' },
  { n: 2, title: 'What we collect', body: 'Your personal details, educational background, and career information from the Alumni Survey. With consent, also sensitive data: Indigenous People (IP) membership and PWD status. Answering these is voluntary.' },
  { n: 3, title: 'Why we collect it', body: 'To run the graduate outcomes study, meet CHED and accreditation reporting, and connect you with events and jobs. IP and PWD data supports inclusion programs and accommodations.' },
  { n: 4, title: 'Who can see it', body: 'Authorized UDM personnel only. IP and PWD data is limited to the Alumni Relations Office. Shared reports are aggregated and anonymized. We never sell your data.' },
  { n: 5, title: 'Storage & retention', body: 'Kept on secured university systems while your record is active or as required by law, then securely disposed of.' },
  { n: 6, title: 'Your rights', body: 'Access, correct, object, erase, or withdraw consent anytime via Privacy & My Data or our office. You may also complain to the National Privacy Commission.' },
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
    privacySections: PRIVACY_SECTIONS,
    privacyConsents: CONSENTS.map((it) => {
      const on = !!pc[it.k];
      return {
        label: it.label,
        checked: on,
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
      requestAnimationFrame(() => document.querySelector('[data-screen-label="Data Privacy Notice"]')?.scrollTo({ top: 0 }));
    },
    goSignin: () => navigate('/signin'),
  };
  return <PrivacyConsentView {...v} />;
}
