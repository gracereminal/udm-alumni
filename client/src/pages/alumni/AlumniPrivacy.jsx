import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalPage, { card } from '../../layouts/PortalPage';
import Icon from '../../components/Icon';
import Modal, { modalBtn } from '../../components/Modal';
import PrivacyToggles from '../../components/alumni/PrivacyToggles';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import { visibleQs } from '../../data/formDefs';
import { ICONS } from '../../data/navigation';
import { get } from '../../lib/api';
import { filledPlatforms, privacyDraft } from '../../lib/privacy';
import { answered, profileGroups } from '../../lib/profileProgress';
import { useQuestionConfig } from '../../lib/questionStore';
import { PRIVACY_SECTIONS } from '../auth/PrivacyConsent';

const OFFICE_EMAIL = 'udmalumni@udm.edu.ph';
const NPC_URL = 'https://privacy.gov.ph/';

const head = { margin: 0, fontWeight: 700, fontSize: 19, letterSpacing: -0.3, color: '#0B1F1A' };
const sub = { fontSize: 13, color: '#64748B', lineHeight: 1.55, margin: '4px 0 0' };
const badge = (color, bg) => ({ fontSize: 10.5, fontWeight: 700, color, background: bg, padding: '4px 10px', borderRadius: 8, letterSpacing: 0.3, textTransform: 'uppercase' });
const btn = (primary) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, padding: '11px 18px',
  borderRadius: 12, cursor: 'pointer', textDecoration: 'none', border: primary ? 'none' : '1px solid #D5DBE3', background: primary ? '#0F3D2E' : '#fff', color: primary ? '#fff' : '#0B1220',
});
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null);

/** Card header: round icon, title and a one-line description (the Profile cards' header). */
function CardHead({ icon, title, desc, id, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 16, borderBottom: '1px solid #EEF1EF' }}>
      <div style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', background: '#E3F1EA', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon d={icon} size={19} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 id={id} style={head}>{title}</h2>
        {desc ? <p style={sub}>{desc}</p> : null}
      </div>
      {right}
    </div>
  );
}

/**
 * Privacy & My Data: who sees the alumnus' record, directory and contact visibility (saved at once), what the portal
 * keeps, a JSON copy of it (GET /me/export) and the data-subject rights of RA 10173 with how to use each.
 */
export default function AlumniPrivacy() {
  const navigate = useNavigate();
  useQuestionConfig();
  const { toast } = useToast();
  const { a, me, privacy, skills, record, dashboard, avatar, survey, savePrivacy } = useProfile();
  const [value, setValue] = useState(() => privacyDraft(privacy));
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => { if (!busy) setValue(privacyDraft(privacy)); }, [privacy, busy]);

  const change = async (next) => {
    const before = value;
    setValue(next);
    setBusy(true);
    try {
      await savePrivacy(next);
      toast(next.directoryOptIn ? 'Directory visibility saved.' : 'Saved — you are hidden from the alumni directory.');
    } catch (err) {
      setValue(before);
      toast(err.message || 'Your privacy settings could not be saved. Please try again.', false);
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await get('/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `udm-alumni-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Your data was downloaded.');
    } catch (err) {
      toast(err.message || 'Your data could not be downloaded. Please try again.', false);
    } finally {
      setExporting(false);
    }
  };

  const ref = record?.membershipId || record?.studentNo || '';
  const mailto = (subject) => `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(`${subject}${ref ? ` — ${ref}` : ''}`)}`;
  const consentAt = fmtDate(record?.consentAt);

  // What the portal keeps, with how much of each is filled in.
  const held = profileGroups(a).map((g) => {
    const qs = visibleQs(g, a);
    const n = qs.filter((q) => answered(a, q)).length;
    return { k: g.title, label: g.short, value: `${n} of ${qs.length} answered` };
  });
  held.push(
    { k: 'photo', label: 'Profile photo', value: avatar ? 'Uploaded' : 'None' },
    { k: 'skills', label: 'Skills', value: skills.length ? `${skills.length} listed` : 'None' },
    { k: 'tracer', label: 'Tracer survey', value: survey?.submitted ? 'Submitted' : 'Not submitted' },
    { k: 'jobs', label: 'Jobs', value: dashboard ? `${dashboard.savedJobs} saved · ${dashboard.applications} applied` : '—' },
    { k: 'events', label: 'Events', value: dashboard ? `${dashboard.upcomingEvents} upcoming` : '—' },
  );

  const audiences = [
    ['You', 'Everything in your record. Change it any time in Edit Profile.'],
    ['UDM Alumni Relations Office', 'Your full record, to verify graduates and prepare tracer reports. Indigenous and PWD details stay with this office.'],
    ['Your college’s dean and staff', 'Only the records of their own college’s alumni, including yours, for outreach and accreditation.'],
    ['Other alumni', value.directoryOptIn ? 'Your directory card, plus only the contact details you switch on below.' : 'Nothing — you are not in the directory.'],
    ['CHED and reports', 'Aggregated counts only. Shared reports never name you.'],
  ];

  const rights = [
    { title: 'Be informed', body: 'Know what we collect, why, and for how long.', action: <button type="button" style={btn(false)} onClick={() => setNotice(true)}>Read the Privacy Notice</button> },
    { title: 'Access and portability', body: 'Get a copy of your data in a machine-readable file.', action: <button type="button" style={btn(false)} onClick={download} disabled={exporting}>{exporting ? 'Preparing…' : 'Download My Data'}</button> },
    { title: 'Correct your data', body: 'Fix anything that is wrong or out of date.', action: <button type="button" style={btn(false)} onClick={() => navigate('/alumni/profile/edit')}>Edit Profile</button> },
    { title: 'Object or withdraw consent', body: 'Stop a use of your data, or withdraw the consent you gave at registration.', action: <a style={btn(false)} href={mailto('Withdraw consent / object to processing')}>Email the office</a> },
    { title: 'Erasure or blocking', body: 'Ask us to delete or block your record once it is no longer needed.', action: <a style={btn(false)} href={mailto('Request to delete or block my record')}>Request deletion</a> },
    { title: 'File a complaint', body: 'Raise a concern with the National Privacy Commission.', action: <a style={btn(false)} href={NPC_URL} target="_blank" rel="noopener noreferrer">privacy.gov.ph ↗</a> },
  ];

  return (
    <PortalPage label="Privacy & My Data" title="Privacy & My Data" caption="UDM ALUMNI RELATIONS OFFICE · ALUMNI" contentStyle={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section data-m="pf-head" aria-labelledby="pv-title" style={{ ...card, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flex: '1 1 320px' }}>
          <div style={{ flex: 'none', width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(165deg,#00251F,#004D40)', color: '#F0C428', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={ICONS.shield} size={28} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={badge('#0F3D2E', '#E6F0EB')}>RA 10173 · Data Privacy Act</div>
              {consentAt ? <div style={badge('#0F8A5F', '#E1F3EA')}>✓ Consent given {consentAt}</div> : null}
              <div style={value.directoryOptIn ? badge('#8A6D1F', '#FBF0D8') : badge('#475569', '#EEF1F4')}>{value.directoryOptIn ? 'Listed in directory' : 'Hidden from directory'}</div>
            </div>
            <h1 id="pv-title" style={{ margin: 0, fontWeight: 700, fontSize: 28, letterSpacing: -0.6, lineHeight: 1.15, color: '#0B1220' }}>Your data, your choice</h1>
            <p style={{ ...sub, fontSize: 14, marginTop: 6 }}>See who can view your record, choose what other alumni see, and download a copy of everything we keep about you.</p>
          </div>
        </div>
        <button type="button" onClick={download} disabled={exporting || !me} style={{ ...btn(true), flex: 'none', padding: '12px 20px', fontSize: 14, opacity: me ? 1 : 0.6 }}>
          <Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" size={16} />
          {exporting ? 'Preparing…' : 'Download My Data'}
        </button>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))', gap: 14, alignItems: 'start' }}>
        <section data-m="pf-card" aria-labelledby="pv-dir" style={{ ...card, padding: '22px 24px' }}>
          <CardHead
            id="pv-dir"
            icon="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z M12 15a3 3 0 100-6 3 3 0 000 6z"
            title="Directory Visibility"
            desc="Changes save as soon as you flip a switch. Everything starts hidden."
            right={busy ? <span role="status" style={{ flex: 'none', fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>Saving…</span> : null}
          />
          <div style={{ marginTop: 6 }}>
            <PrivacyToggles value={value} onChange={change} platforms={filledPlatforms(a).filter(([k]) => k in value.links)} busy={busy || !me} />
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid #EEF0F3' }}>
            Hidden details are blank for other alumni. The Alumni Relations Office still sees them and can still contact you. Add or change your links in Edit Profile.
          </div>
        </section>

        <section data-m="pf-card" aria-labelledby="pv-who" style={{ ...card, padding: '22px 24px' }}>
          <CardHead id="pv-who" icon={ICONS.people} title="Who Can See Your Record" desc="Access is limited by role on the server, not just hidden on screen." />
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {audiences.map(([who, what], i) => (
              <li key={who} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i ? '1px solid #EEF0F3' : 0 }}>
                <span aria-hidden="true" style={{ flex: 'none', width: 8, height: 8, borderRadius: '50%', marginTop: 6, background: i === 3 && !value.directoryOptIn ? '#CBD5E1' : '#0F3D2E' }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0B1220' }}>{who}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: '#64748B', lineHeight: 1.5, marginTop: 2 }}>{what}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section data-m="pf-card" aria-labelledby="pv-held" style={{ ...card, padding: '24px 28px 28px' }}>
        <CardHead
          id="pv-held"
          icon={ICONS.records}
          title="What We Keep About You"
          desc={record?.registeredAt ? `Your record has been with the Alumni Relations Office since ${fmtDate(record.registeredAt)}.` : 'Everything in your alumni record.'}
          right={<button type="button" onClick={() => navigate('/alumni/profile')} style={{ ...btn(false), flex: 'none', padding: '8px 14px', fontSize: 12.5 }}>View Profile</button>}
        />
        <dl data-m="pf-grid" style={{ display: 'grid', gap: '22px 32px', margin: '22px 0 0' }}>
          {held.map((h) => (
            <div key={h.k} style={{ minWidth: 0 }}>
              <dt style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>{h.label}</dt>
              <dd style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#0B1F1A' }}>{h.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section data-m="pf-card" aria-labelledby="pv-rights" style={{ ...card, padding: '24px 28px 28px' }}>
        <CardHead id="pv-rights" icon={ICONS.shield} title="Your Rights Under RA 10173" desc="The Data Privacy Act of 2012 gives you these rights over your personal data." />
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 12 }}>
          {rights.map((r) => (
            <li key={r.title} style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between', padding: '16px 18px', borderRadius: 14, border: '1px solid #E2E7E4', background: '#FBFCFB' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0B1220' }}>{r.title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B', lineHeight: 1.5 }}>{r.body}</p>
              </div>
              <div>{r.action}</div>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, background: '#E6F0EB', fontSize: 12.5, color: '#0F3D2E', lineHeight: 1.55 }}>
          <strong>Data privacy contact:</strong> UDM Alumni Relations Office, Universidad de Manila, Mehan Gardens, Ermita, Manila ·{' '}
          <a href={mailto('Data privacy request')} style={{ color: '#0F3D2E', fontWeight: 700 }}>{OFFICE_EMAIL}</a> · Monday to Friday, 8:00 AM – 5:00 PM.
        </div>
      </section>

      <Modal
        open={notice}
        onClose={() => setNotice(false)}
        eyebrow="RA 10173"
        title="Data Privacy Notice"
        width={560}
        footer={<button type="button" style={modalBtn(true)} onClick={() => setNotice(false)}>Close</button>}
      >
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PRIVACY_SECTIONS.map((s) => (
            <li key={s.n}>
              <strong style={{ color: '#0B1220' }}>{s.title}.</strong> {s.body}
            </li>
          ))}
        </ol>
      </Modal>
    </PortalPage>
  );
}
