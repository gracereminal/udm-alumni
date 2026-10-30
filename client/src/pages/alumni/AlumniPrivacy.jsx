import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalPage from '../../layouts/PortalPage';
import Icon from '../../components/Icon';
import Modal, { modalBtn } from '../../components/Modal';
import PrivacyToggles from '../../components/alumni/PrivacyToggles';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import { visibleQs, isAnswered } from '../../data/formDefs';
import { ICONS } from '../../data/navigation';
import { get } from '../../lib/api';
import { filledPlatforms, privacyDraft } from '../../lib/privacy';
import { profileGroups } from '../../lib/profileProgress';
import { useQuestionConfig } from '../../lib/questionStore';
import { hv } from '../../lib/stateStyle';
import { PRIVACY_SECTIONS } from '../auth/PrivacyConsent';

const OFFICE_EMAIL = 'udmalumni@udm.edu.ph';
const NPC_URL = 'https://privacy.gov.ph/';

const panel = { background: '#fff', border: '1px solid #E3EBE8', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,37,31,.05)', boxSizing: 'border-box' };
const kicker = { margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 1.3, color: '#6B7D75', textTransform: 'uppercase' };
const lead = { margin: '6px 0 0', fontSize: 13.5, color: '#5A6D65', lineHeight: 1.55 };
const btn = (primary) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'var(--udm-sans)', minHeight: 40, padding: '0 14px',
  borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box',
  ...(primary ? { border: 0, background: '#004D40', color: '#fff' } : { border: '1px solid #D5E0DB', background: '#fff', color: '#00251F' }),
});
const GREEN = ['#E6F0EB', '#0F3D2E'];
const GREY = ['#EEF1F4', '#475467'];
const AMBER = ['#FBF0D8', '#6B5300'];
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null);

// One row per profile step (keyed by profileGroups()' short names): icon, summary and who the data is shown to.
const CATS = {
  Personal: { icon: ICONS.user, title: 'Personal information', summary: 'Name, gender, civil status, address', tag: ['Private', GREEN] },
  Contact: { icon: 'M3 5h18v14H3zM3 6l9 7 9-7', title: 'Contact details', summary: 'Email, mobile number, social accounts', tag: ['Hidden by default', GREEN] },
  Education: { icon: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5', title: 'Educational background', summary: 'College, program, year graduated', tag: ['Visible to alumni', AMBER] },
  Employment: { icon: ICONS.briefcase, title: 'Employment and career', summary: 'Employer, job title, tracer survey answers', tag: ['Used in reports', AMBER] },
};
const FEEDBACK = { icon: 'M4 4h16v12H9l-5 4zM8 9h8M8 12h5', title: 'Survey feedback', summary: 'Your recommendations to the university', tag: ['Private', GREEN] };

/** Shield badge used by the side cards (per the mockup's Data Protection Officer card). */
const Shield = () => (
  <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: '#E6F0EC', display: 'grid', placeItems: 'center' }}>
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="#004D40" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 1.5 2.5 4.5v6c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10v-6L10 1.5Z" />
      <path d="m6.8 11 2.3 2.3 4.2-4.6" strokeLinecap="round" />
    </svg>
  </div>
);

const shown = (a, q) => {
  if (!isAnswered(a, q.id)) return '—';
  const v = a[q.id];
  return Array.isArray(v) ? v.join(', ') : String(v);
};

/**
 * Privacy & My Data (per "UDM Alumni.dc.html"): what the portal keeps (view each category, or edit it on the matching
 * Edit Profile step), directory and contact visibility (saved at once), a JSON copy of the record (GET /me/export) and
 * the data-subject rights of RA 10173 with how to use each.
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
  const [open, setOpen] = useState(null); // the category whose details are shown

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
  const editStep = (step) => navigate('/alumni/profile/edit', { state: { step } });

  // What the portal keeps: one category per Edit Profile step, then the directory extras and account activity.
  const groups = profileGroups(a);
  const cats = groups.map((g, i) => {
    const meta = CATS[g.short] || FEEDBACK;
    const tag = g.short === 'Education' && !value.directoryOptIn ? ['Private', GREEN] : meta.tag;
    const rows = visibleQs(g, a).filter((q) => q.type !== 'password').map((q) => ({ label: q.label.replace(/\s*:\s*$/, ''), value: shown(a, q) }));
    return { id: g.title, ...meta, tag, rows, step: i };
  });
  cats.push(
    {
      id: 'directory', icon: ICONS.people, title: 'Photo, skills and interests', summary: 'What your directory card shows', tag: ['Opt-in', GREY],
      rows: [{ label: 'Profile photo', value: avatar ? 'Uploaded' : 'None' }, { label: 'Skills and interests', value: skills.length ? skills.map((s) => s.name).join(', ') : 'None' }],
      step: 0,
    },
    {
      id: 'activity', icon: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', title: 'Account activity', summary: 'Tracer survey, saved jobs, applications and event RSVPs', tag: ['System log', GREY],
      rows: [
        { label: 'Tracer survey', value: survey?.submitted ? 'Submitted' : 'Not submitted' },
        { label: 'Jobs', value: dashboard ? `${dashboard.savedJobs} saved · ${dashboard.applications} applied` : '—' },
        { label: 'Events', value: dashboard ? `${dashboard.upcomingEvents} upcoming` : '—' },
        { label: 'In the alumni record since', value: fmtDate(record?.registeredAt) || '—' },
      ],
      note: 'This log is created by the system, so it can be erased but not edited.',
    },
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
    { title: 'Erasure or blocking', body: 'Ask us to delete or block your record once it is no longer needed.', action: <a style={{ ...btn(false), color: '#B42318', borderColor: '#F3C9C5' }} href={mailto('Request to delete or block my record')}>Request deletion</a> },
    { title: 'File a complaint', body: 'Raise a concern with the National Privacy Commission.', action: <a style={btn(false)} href={NPC_URL} target="_blank" rel="noopener noreferrer">privacy.gov.ph ↗</a> },
  ];

  return (
    <PortalPage label="Privacy & My Data" title="Privacy & My Data" caption="UDM ALUMNI RELATIONS OFFICE • ALUMNI → PRIVACY & MY DATA" contentStyle={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
      <section
        data-m="md-hero"
        aria-labelledby="pv-title"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px 24px', flexWrap: 'wrap', padding: '22px 26px', borderRadius: 20, background: 'linear-gradient(165deg,#00251F,#004D40)', color: '#fff' }}
      >
        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#F0C428', color: '#00251F', fontSize: 11.5, fontWeight: 800, letterSpacing: 0.8, padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.3 }}>RA 10173 · DATA PRIVACY ACT</span>
            {consentAt ? <span style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', lineHeight: 1.3 }}>✓ Consent given {consentAt}</span> : null}
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff', lineHeight: 1.3 }}>{value.directoryOptIn ? 'Listed in directory' : 'Hidden from directory'}</span>
          </div>
          <h1 id="pv-title" style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.25 }}>You own your data. See it, correct it, or ask us to erase it.</h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#CFE3DC', maxWidth: '62ch', textWrap: 'pretty' }}>
            Everything the Alumni Office keeps about you is listed below. Changes you make are applied right away; deletion requests are reviewed by the university&apos;s Data Protection Officer.
          </p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={exporting || !me}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'var(--udm-sans)', minHeight: 46, padding: '0 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 13.5, fontWeight: 600, opacity: me ? 1 : 0.6 }}
          {...hv({ background: 'rgba(255,255,255,.2)' })}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
          </svg>
          {exporting ? 'Preparing…' : 'Download my data'}
        </button>
      </section>

      <div data-m="md-cols" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <section data-m="md-card" aria-labelledby="pv-held" style={{ ...panel, flex: '3 1 520px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 22px', borderBottom: '1px solid #EDF2F0' }}>
            <h2 id="pv-held" style={kicker}>What we hold about you</h2>
            <div style={{ marginTop: 4, fontSize: 13.5, color: '#5A6D65', lineHeight: 1.5 }}>{cats.length} categories. Open one to view the details, or edit to correct them.</div>
          </div>
          {cats.map((c) => {
            const on = open === c.id;
            return (
              <div key={c.id} style={{ borderBottom: '1px solid #EDF2F0' }}>
                <div data-m="md-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: '#E6F0EC', color: '#004D40', display: 'grid', placeItems: 'center' }}>
                    <Icon d={c.icon} size={20} />
                  </div>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#00251F' }}>{c.title}</h3>
                    <div style={{ marginTop: 2, fontSize: 13, color: '#5A6D65', lineHeight: 1.4 }}>{c.summary}</div>
                  </div>
                  <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, padding: '4px 9px', borderRadius: 999, background: c.tag[1][0], color: c.tag[1][1] }}>{c.tag[0]}</span>
                  <div data-m="md-btns" style={{ display: 'flex', gap: 8, flex: 'none' }}>
                    <button type="button" onClick={() => setOpen(on ? null : c.id)} aria-expanded={on} aria-label={`${on ? 'Hide' : 'View'} ${c.title}`} style={btn(false)} {...hv({ background: '#F1F6F4' })}>
                      {on ? 'Hide' : 'View'}
                    </button>
                    {c.step != null ? (
                      <button type="button" onClick={() => editStep(c.step)} aria-label={`Edit ${c.title}`} style={btn(true)} {...hv({ background: '#00251F' })}>
                        Edit
                      </button>
                    ) : null}
                  </div>
                </div>
                {on ? (
                  <dl style={{ margin: 0, padding: '0 22px 18px 76px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: '12px 20px' }}>
                    {c.rows.map((r) => (
                      <div key={r.label} style={{ minWidth: 0 }}>
                        <dt style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.8, color: '#6B7280', textTransform: 'uppercase' }}>{r.label}</dt>
                        <dd style={{ margin: '3px 0 0', fontSize: 14, color: '#0F1F1A', overflowWrap: 'anywhere' }}>{r.value}</dd>
                      </div>
                    ))}
                    {c.note ? <div style={{ gridColumn: '1/-1', fontSize: 12.5, color: '#6B7D75', lineHeight: 1.5 }}>{c.note}</div> : null}
                  </dl>
                ) : null}
              </div>
            );
          })}
        </section>

        <aside data-m="md-aside" aria-label="Your privacy controls" style={{ flex: '2 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section aria-labelledby="pv-dir" style={{ ...panel, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 id="pv-dir" style={kicker}>Directory visibility</h2>
                <p style={lead}>Changes save as soon as you flip a switch. Everything starts hidden.</p>
              </div>
              {busy ? <span role="status" style={{ flex: 'none', fontSize: 11.5, fontWeight: 600, color: '#64748B' }}>Saving…</span> : null}
            </div>
            <div style={{ marginTop: 6 }}>
              <PrivacyToggles value={value} onChange={change} platforms={filledPlatforms(a).filter(([k]) => k in value.links)} busy={busy || !me} />
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid #EEF0F3' }}>
              Hidden details are blank for other alumni. The Alumni Relations Office still sees them and can still contact you. Add or change your links in Edit Profile.
            </div>
          </section>

          <section aria-labelledby="pv-who" style={{ ...panel, padding: 22 }}>
            <h2 id="pv-who" style={kicker}>Who can see your record</h2>
            <p style={lead}>Access is limited by role on the server, not just hidden on screen.</p>
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
              {audiences.map(([who, what], i) => (
                <li key={who} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i ? '1px solid #EEF0F3' : 0 }}>
                  <span aria-hidden="true" style={{ flex: 'none', width: 8, height: 8, borderRadius: '50%', marginTop: 6, background: i === 3 && !value.directoryOptIn ? '#CBD5E1' : '#004D40' }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#00251F' }}>{who}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: '#5A6D65', lineHeight: 1.5, marginTop: 2 }}>{what}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="pv-rights" style={{ ...panel, padding: 22 }}>
            <h2 id="pv-rights" style={kicker}>Your rights under RA 10173</h2>
            <p style={lead}>The Data Privacy Act of 2012 gives you these rights over your personal data.</p>
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
              {rights.map((r, i) => (
                <li key={r.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px 12px', flexWrap: 'wrap', padding: '12px 0', borderTop: i ? '1px solid #EEF0F3' : 0 }}>
                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#00251F' }}>{r.title}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#5A6D65', lineHeight: 1.45 }}>{r.body}</p>
                  </div>
                  <div style={{ flex: 'none' }}>{r.action}</div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="pv-dpo" style={{ ...panel, padding: '18px 20px', display: 'flex', gap: 14, boxShadow: 'none' }}>
            <Shield />
            <div>
              <h2 id="pv-dpo" style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#00251F' }}>Data Protection Officer</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#5A6D65', lineHeight: 1.55 }}>
                Questions or complaints? Email the UDM Alumni Relations Office at{' '}
                <a href={mailto('Data privacy request')} style={{ color: '#004D40', fontWeight: 700 }}>{OFFICE_EMAIL}</a>, Monday to Friday, 8:00 AM – 5:00 PM. You may also lodge a complaint with the{' '}
                <a href={NPC_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#004D40', fontWeight: 700 }}>National Privacy Commission</a>.
              </p>
            </div>
          </section>
        </aside>
      </div>

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
