import { useNavigate } from 'react-router-dom';
import NavSidebar from '../../components/NavSidebar';
import Icon from '../../components/Icon';
import { card } from '../../layouts/PortalPage';
import { useProfile } from '../../context/ProfileContext';
import { visibleQs, isAnswered } from '../../data/formDefs';
import { ICONS } from '../../data/navigation';
import { initials } from '../../lib/format';
import { profileGroups, profileProgress } from '../../lib/profileProgress';
import { useQuestionConfig } from '../../lib/questionStore';

const BG = 'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),#F3F6F4';
const pill = { fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff' };

const display = (a, q) => {
  if (!isAnswered(a, q.id)) return '—';
  if (q.type === 'password') return '••••••••';
  const v = a[q.id];
  return Array.isArray(v) ? v.join(', ') : String(v);
};

/** Alumni Profile: read-only summary of the alumnus' record, with an Edit action into Edit Profile. */
export default function AlumniProfile() {
  const navigate = useNavigate();
  useQuestionConfig(); // re-render when an Admin edits the questions
  const { a, alumniName, avatar, savedAt } = useProfile();

  const { total, done } = profileProgress(a);
  const groups = profileGroups(a).map((g) => ({
    title: g.title,
    rows: visibleQs(g, a).map((q) => {
      const answered = isAnswered(a, q.id);
      return { id: q.id, label: q.label, value: display(a, q), color: answered ? '#0B1220' : '#94A3B8' };
    }),
  }));

  const course = a.course || a.course_other || 'Course not set';
  const batch = a.year_graduated ? `Class of ${String(a.year_graduated).slice(0, 4)}` : 'Batch year not set';
  const savedLabel = savedAt
    ? `Last updated · ${new Date(savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : null;

  return (
    <div data-screen-label="Alumni Profile" style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <NavSidebar style={{ flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 28px', display: 'flex', flexDirection: 'column', gap: 14, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: 'linear-gradient(165deg,#00251F,#004D40)', color: '#fff', padding: '26px 28px', boxShadow: '0 14px 34px -14px rgba(0,37,31,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
              {avatar ? (
                <div role="img" aria-label="Profile photo" style={{ flex: 'none', width: 96, height: 96, borderRadius: '50%', border: '3px solid #F0C428', boxSizing: 'border-box', background: `url("${avatar}") center/cover no-repeat` }} />
              ) : (
                <div style={{ flex: 'none', width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: '2px dashed rgba(240,196,40,.7)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 30, color: '#F0C428' }}>
                  {initials(alumniName) || 'AL'}
                </div>
              )}
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <h1 style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: '#F0C428' }}>Alumni Profile</h1>
                <div style={{ fontWeight: 800, fontSize: 28, letterSpacing: -0.6, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{alumniName}</div>
                <div style={{ fontSize: 14, color: '#EAF3F1', marginTop: 6, lineHeight: 1.5 }}>
                  {course} · {batch}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  <div style={pill}>
                    {done} of {total} profile fields filled
                  </div>
                  {savedLabel && <div style={pill}>{savedLabel}</div>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/alumni/profile/edit')}
                style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', background: '#F0C428', color: '#00251F', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '11px 18px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
              >
                <Icon d={ICONS.pencil} size={16} />
                Edit
              </button>
            </div>
          </div>
          {groups.map((g) => (
            <section key={g.title} style={{ ...card, padding: '22px 24px' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#0F3D2E', paddingBottom: 12, borderBottom: '1px solid #EEF1F4' }}>
                {g.title}
              </h2>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(240px,100%),1fr))', gap: '18px 28px', margin: '16px 0 0' }}>
                {g.rows.map((r) => (
                  <div key={r.id} style={{ minWidth: 0 }}>
                    <dt style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4, letterSpacing: 0.2 }}>{r.label}</dt>
                    <dd style={{ margin: 0, fontSize: 14, fontWeight: 600, color: r.color, overflowWrap: 'anywhere' }}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
