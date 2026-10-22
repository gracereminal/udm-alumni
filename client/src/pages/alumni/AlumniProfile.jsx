import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PortalPage, { card } from '../../layouts/PortalPage';
import Icon from '../../components/Icon';
import { useProfile } from '../../context/ProfileContext';
import useDialogDismiss from '../../hooks/useDialogDismiss';
import { visibleQs, isAnswered } from '../../data/formDefs';
import { ICONS } from '../../data/navigation';
import { onBackdrop } from '../../lib/a11y';
import { initials, RECORD_STATUS } from '../../lib/format';
import { hv } from '../../lib/stateStyle';
import { profileGroups, profileProgress } from '../../lib/profileProgress';
import { useQuestionConfig } from '../../lib/questionStore';

// Card titles and icons per "UDM Alumni.dc.html", keyed by profileGroups()' short names.
const CARDS = {
  Personal: { title: 'Personal Details', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z' },
  Contact: { title: 'Contact & Social Media Details', icon: 'M3 5h18v14H3z M8 11a2 2 0 100-4 2 2 0 000 4z M5 16c.5-2 5.5-2 6 0 M14 9h4 M14 13h4' },
  Education: { title: 'Educational Background', icon: 'M2 9l10-5 10 5-10 5z M6 11v5c3 2.5 9 2.5 12 0v-5' },
  Employment: { title: 'Employment & Career', icon: 'M3 8h18v12H3z M9 8V5h6v3 M3 13h18' },
};
const FEEDBACK = { title: 'Alumni Feedback', icon: 'M4 4h16v12H9l-5 4z M8 9h8 M8 12h5' };
const ADDRESS = ['present_address', 'permanent_address'];
const WIDE = ['married_name', 'stay_reasons', 'fb_contribute', 'fb_activity'];

// Social links render as cards under the Contact details instead of rows: [label, icon, profile URL base].
const SOCIAL = {
  facebook: ['Facebook', 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z', 'facebook.com/'],
  twitter: ['X', 'M4 4l16 16 M20 4L4 20', 'x.com/'],
  instagram: ['Instagram', 'M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z M16 11.4a4 4 0 11-7.9 1.2 4 4 0 017.9-1.2z M17.5 6.5h.01', 'instagram.com/'],
  linkedin: ['LinkedIn', 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z M2 9h4v12H2z M4 2a2 2 0 110 4 2 2 0 010-4z', 'linkedin.com/in/'],
};

const badge = (color, bg) => ({ fontSize: 10.5, fontWeight: 700, color, background: bg, padding: '4px 10px', borderRadius: 8, letterSpacing: 0.3, textTransform: 'uppercase' });

const display = (a, q) => {
  if (!isAnswered(a, q.id)) return '—';
  if (q.type === 'password') return '••••••••';
  const v = a[q.id];
  return Array.isArray(v) ? v.join(', ') : String(v);
};

/** A typed handle or link -> an https URL, or '' when it can't be turned into one. */
function socialHref(raw, base) {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w-]+\.[a-z]{2,}\//i.test(raw)) return `https://${raw}`;
  if (/^@?[\w.]+$/.test(raw)) return `https://${base}${raw.replace(/^@/, '')}`;
  return '';
}

/** The alumnus' ID card dialog ("View Alumni ID"): photo, name, program, batch and Membership ID. */
function AlumniIdCard({ name, course, batch, avatar, idNo, verified, onClose }) {
  const closeRef = useRef(null);
  useDialogDismiss(true, onClose, closeRef);
  return (
    <div
      role="presentation"
      onClick={onBackdrop(onClose)}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,37,31,.55)', display: 'flex', alignItems: 'safe center', justifyContent: 'center', overflowY: 'auto', padding: 20, boxSizing: 'border-box' }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="alumni-id-name" style={{ flex: 'none', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
        <div style={{ flex: 'none', background: 'linear-gradient(165deg,#00251F,#0F3D2E)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 60px -20px rgba(0,0,0,.55)', color: '#fff', fontFamily: 'Inter,sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.14)' }}>
            <img src="/alumni-logo.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: '50%', background: '#fff' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>UNIVERSIDAD DE MANILA</div>
              <div style={{ fontSize: 10.5, color: '#F0C428', fontWeight: 600, letterSpacing: 0.8 }}>ALUMNI IDENTIFICATION</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 20px', gap: 4, textAlign: 'center' }}>
            {avatar ? (
              <div role="img" aria-label="Profile photo" style={{ width: 96, height: 96, borderRadius: '50%', border: '3px solid #F0C428', boxSizing: 'border-box', background: `url("${avatar}") center/cover no-repeat` }} />
            ) : (
              <div aria-hidden="true" style={{ width: 96, height: 96, borderRadius: '50%', border: '3px solid #F0C428', boxSizing: 'border-box', background: '#F0C428', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 30 }}>
                {initials(name) || 'AL'}
              </div>
            )}
            <div id="alumni-id-name" style={{ fontWeight: 700, fontSize: 21, marginTop: 12, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{name}</div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.78)', lineHeight: 1.45 }}>{course}</div>
            <div style={{ flex: 'none', whiteSpace: 'nowrap', marginTop: 10, fontSize: 10.5, fontWeight: 700, color: '#00251F', background: '#F0C428', padding: '4px 12px', borderRadius: 8, letterSpacing: 0.4, textTransform: 'uppercase' }}>{batch}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px 18px', background: 'rgba(0,0,0,.22)' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 0.8, color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>ALUMNI ID NO.</div>
              <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 700, fontSize: 16, letterSpacing: 0.6 }}>{idNo || 'Not yet assigned'}</div>
            </div>
            {verified ? <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7FE0B4', whiteSpace: 'nowrap' }}>✓ VERIFIED</div> : null}
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          style={{ alignSelf: 'center', background: '#fff', color: '#0F3D2E', fontFamily: 'inherit', fontWeight: 600, fontSize: 13.5, padding: '10px 28px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/** Alumni Profile: read-only summary of the alumnus' record, per "UDM Alumni.dc.html", with Edit Profile and View Alumni ID actions. */
export default function AlumniProfile() {
  const navigate = useNavigate();
  useQuestionConfig(); // re-render when an Admin edits the questions
  const { a, alumniName, avatar, savedAt, record } = useProfile();
  const [idOpen, setIdOpen] = useState(false);

  const { total, done } = profileProgress(a);
  const groups = profileGroups(a);
  const cards = groups.map((g, i) => {
    const meta = CARDS[g.short] || (i === groups.length - 1 ? FEEDBACK : { title: g.title, icon: FEEDBACK.icon });
    const isContact = g.short === 'Contact';
    const rows = visibleQs(g, a)
      .filter((q) => !(isContact && SOCIAL[q.id]))
      .map((q) => ({
        id: q.id,
        label: q.label.replace(/\s*:\s*$/, ''),
        value: display(a, q),
        color: isAnswered(a, q.id) ? '#0B1F1A' : '#98A2B3',
        col: ADDRESS.includes(q.id) ? 'span 2' : WIDE.includes(q.id) ? '1 / -1' : 'auto',
      }));
    const socials = isContact
      ? Object.keys(SOCIAL).filter((k) => isAnswered(a, k)).map((k) => {
          const [name, path, base] = SOCIAL[k];
          const text = String(a[k]).trim();
          return { k, name, path, text, href: socialHref(text, base) };
        })
      : [];
    return { key: g.title, ...meta, rows, socials, isContact };
  });

  const course = a.course || a.course_other || 'Course not set';
  const batch = a.year_graduated ? `Class of ${String(a.year_graduated).slice(0, 4)}` : 'Batch year not set';
  const status = RECORD_STATUS[record?.status] || null;
  const updated = savedAt ? new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const actionBtn = (primary) => ({
    flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', fontWeight: 600, fontSize: 14, borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap',
    ...(primary ? { background: '#0F3D2E', color: '#fff', padding: '12px 20px', border: 'none' } : { background: '#fff', color: '#0F3D2E', padding: '11px 20px', border: '1.5px solid #0F3D2E' }),
  });

  return (
    <PortalPage label="Alumni Profile" title="Alumni Profile" caption="UDM ALUMNI RELATIONS OFFICE · ALUMNI" contentStyle={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div data-m="pf-head" role="region" aria-label="Profile summary" style={{ ...card, padding: '24px 28px', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0, flex: '1 1 320px' }}>
          {avatar ? (
            <div role="img" aria-label="Profile photo" style={{ flex: 'none', width: 64, height: 64, borderRadius: '50%', border: '2px solid #F0C428', boxSizing: 'border-box', background: `url("${avatar}") center/cover no-repeat` }} />
          ) : (
            <div aria-hidden="true" style={{ flex: 'none', width: 64, height: 64, borderRadius: '50%', background: '#F0C428', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>
              {initials(alumniName) || 'AL'}
            </div>
          )}
          <div data-m="pf-info" style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {status ? <div style={badge(status[1], status[2])}>{status[0]}</div> : null}
              <div style={badge('#0F3D2E', '#E6F0EB')}>{batch}</div>
              <div style={badge('#8A6D1F', '#FBF0D8')}>
                {done} of {total} profile fields filled
              </div>
            </div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: 30, letterSpacing: -0.7, lineHeight: 1.15, color: '#0B1220', overflowWrap: 'anywhere' }}>{alumniName}</h1>
            <div style={{ fontSize: 14, color: '#64748B', marginTop: 6, lineHeight: 1.5 }}>
              {course}
              {updated ? <span style={{ color: '#94A3B8' }}> · Last updated {updated}</span> : null}
            </div>
          </div>
        </div>
        <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={() => navigate('/alumni/profile/edit')} style={actionBtn(true)} {...hv({ background: '#00251F' })}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F0C428" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            Edit Profile
          </button>
          <button type="button" onClick={() => setIdOpen(true)} aria-haspopup="dialog" style={actionBtn(false)} {...hv({ background: '#E6F0EB' })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F3D2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="11" r="2.2" />
              <path d="M14 9.5h4M14 13h4M6 17c.6-1.7 1.8-2.5 3-2.5s2.4.8 3 2.5" />
            </svg>
            View Alumni ID
          </button>
        </div>
      </div>

      {idOpen ? (
        <AlumniIdCard name={alumniName} course={course} batch={batch} avatar={avatar} idNo={record?.membershipId} verified={record?.status === 'verified'} onClose={() => setIdOpen(false)} />
      ) : null}

      {cards.map((c) => (
        <div key={c.key} data-m="pf-card" role="region" aria-label={c.title} style={{ ...card, padding: '24px 28px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 18, borderBottom: '1px solid #EEF1EF' }}>
            <div style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', background: '#E3F1EA', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={c.icon} size={19} />
            </div>
            <h2 style={{ flex: 1, minWidth: 0, margin: 0, fontWeight: 700, fontSize: 19, letterSpacing: -0.3, color: '#0B1F1A' }}>{c.title}</h2>
            {c.isContact ? (
              <Link to="/alumni/privacy" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#004D40', textDecoration: 'none' }}>
                <Icon d={ICONS.shield} size={15} />
                Who can see this
              </Link>
            ) : null}
          </div>
          <dl data-m="pf-grid" style={{ display: 'grid', gap: '24px 32px', margin: '22px 0 0' }}>
            {c.rows.map((r) => (
              <div key={r.id} style={{ minWidth: 0, gridColumn: r.col }}>
                <dt style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6, lineHeight: 1.4 }}>{r.label}</dt>
                <dd style={{ margin: 0, fontSize: 15, fontWeight: 500, color: r.color, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{r.value}</dd>
              </div>
            ))}
          </dl>
          {c.socials.length ? (
            <div style={{ marginTop: 26 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8A949E' }}>Social media &amp; profiles</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,230px),1fr))', gap: 10 }}>
                {c.socials.map((so) => {
                  const inner = (
                    <>
                      <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 10, background: '#E8F2ED', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon d={so.path} size={18} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8A949E', letterSpacing: 0.4, textTransform: 'uppercase' }}>{so.name}</span>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#0B1F1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{so.text}</span>
                      </span>
                    </>
                  );
                  const box = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px solid #E2E7E4', textDecoration: 'none' };
                  return so.href ? (
                    <a key={so.k} href={so.href} target="_blank" rel="noopener noreferrer" aria-label={`${so.name}: ${so.text} (opens in a new tab)`} style={box}>
                      {inner}
                      <span aria-hidden="true" style={{ flex: 'none', fontSize: 14, color: '#0F3D2E' }}>↗</span>
                    </a>
                  ) : (
                    <div key={so.k} style={{ ...box, opacity: 0.6 }}>{inner}</div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </PortalPage>
  );
}
