import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalPage, { card } from '../../layouts/PortalPage';
import FormField from '../../components/FormField';
import Modal, { modalBtn } from '../../components/Modal';
import ProfilePhotoCard from '../../components/alumni/ProfilePhotoCard';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import { regStepDefs, surveySectionDefs, visibleQs, isAnswered } from '../../data/formDefs';
import { buildField } from '../../lib/fields';
import { validateProfile } from '../../lib/validation';

const TAGS = ['SECTION II', 'SECTION II', 'SECTION III'];

/** Personal, contact, education and employment fields shown on the Profile page. */
function profileGroups(a) {
  const steps = regStepDefs(a).map((s, i) => ({ title: s.title, sub: s.sub, tag: TAGS[i] || 'PROFILE', questions: s.questions }));
  const defs = surveySectionDefs();
  const emp = defs.find((s) => s.id === 'employment');
  const details = defs.find((s) => s.id === 'details');
  steps.push({
    title: 'Employment & Career',
    sub: 'Current job, employer and how you got there',
    tag: 'SECTIONS IV–V',
    questions: [...emp.questions, ...(a.ever_employed === 'Yes' ? details.questions : [])],
  });
  return steps;
}

/** Alumni Profile: personal, educational and career information with explicit Save / Cancel. */
export default function AlumniProfile() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { toast } = useToast();
  const [draft, setDraft] = useState(profile.a);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [leave, setLeave] = useState(false);

  const clear = useCallback(
    (id) => {
      if (errors[id])
        setErrors((s) => {
          const n = { ...s };
          delete n[id];
          return n;
        });
    },
    [errors],
  );
  const handlers = useMemo(
    () => ({
      setA: (id, v) => {
        clear(id);
        setDirty(true);
        setDraft((d) => ({ ...d, [id]: v, ...(id === 'college' ? { course: '', ...(v !== 'Others' ? { course_other: '' } : {}) } : {}) }));
      },
      toggleA: (id, v) => {
        clear(id);
        setDirty(true);
        setDraft((d) => {
          const cur = d[id] || [];
          return { ...d, [id]: cur.indexOf(v) > -1 ? cur.filter((x) => x !== v) : cur.concat(v) };
        });
      },
    }),
    [clear],
  );

  const groups = profileGroups(draft);
  let total = 0;
  let done = 0;
  const groupStats = groups.map((g) => {
    const qs = visibleQs(g, draft);
    const d = qs.filter((q) => isAnswered(draft, q.id)).length;
    total += qs.length;
    done += d;
    return { title: g.title, done: d, total: qs.length };
  });
  const pct = total ? Math.round((done / total) * 100) : 0;

  const save = () => {
    const e = validateProfile(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields before saving.', false);
      setTimeout(() => {
        const el = document.querySelector('[aria-invalid="true"]');
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 30);
      return;
    }
    profile.persist({ a: draft, profileSavedAt: new Date().toISOString() });
    setDirty(false);
    toast('Profile saved — your record in Alumni Records was updated.');
    navigate('/alumni/dashboard');
  };
  const cancel = () => (dirty ? setLeave(true) : navigate('/alumni/dashboard'));

  const actions = (
    <>
      <button
        type="button"
        onClick={cancel}
        style={{
          border: '1px solid #E2E5EA',
          background: '#fff',
          color: '#0B1220',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 12.5,
          padding: '9px 14px',
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={save}
        style={{
          border: 'none',
          background: '#0F3D2E',
          color: '#fff',
          fontFamily: 'inherit',
          fontWeight: 700,
          fontSize: 12.5,
          padding: '10px 16px',
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        Save Changes
      </button>
    </>
  );

  return (
    <PortalPage
      label="Edit Profile"
      title="Edit Profile"
      caption={dirty ? 'You have unsaved changes' : 'Keep your details current — they sync to Alumni Records'}
      actions={actions}
      tools={false}
      contentStyle={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, flex: '1 1 280px', maxWidth: 340 }}>
        <ProfilePhotoCard course={draft.course || draft.course_other} batch={draft.year_graduated} />
        <div style={{ ...card, padding: '20px 24px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(0,0,0,.45)' }}>
            Profile completion
          </div>
          <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 24, color: '#0A0A0A', margin: '4px 0 10px' }}>{pct}%</div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,.08)', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', background: '#004D40', width: `${pct}%`, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(0,0,0,.55)', fontWeight: 600, marginBottom: 12 }}>
            {done} of {total} profile fields filled
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupStats.map((g) => (
              <div key={g.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, color: '#334155' }}>
                <span>{g.title}</span>
                <span style={{ fontWeight: 700, color: g.done === g.total ? '#0F8A5F' : '#8A6D1F' }}>
                  {g.done}/{g.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, flex: '4 1 420px' }}>
        {groups.map((g) => (
          <div key={g.title} data-m="sv-card" style={{ ...card, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
              <div data-m="sv-title" style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 21, color: '#0A0A0A' }}>
                {g.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#004D40',
                  background: '#E7F0EE',
                  padding: '5px 11px',
                  borderRadius: 8,
                  letterSpacing: 0.4,
                  flex: 'none',
                }}
              >
                {g.tag}
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(0,0,0,.55)', marginBottom: 14 }}>{g.sub}</div>
            <div data-m="fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
              {visibleQs(g, draft).map((q) => {
                const f = buildField(q, draft, handlers, errors);
                return <FormField key={q.id} f={{ ...f, span: f.span === 'span 1' ? 'auto' : '1 / -1' }} variant="survey" />;
              })}
            </div>
          </div>
        ))}
        <div data-m="actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={cancel} style={{ ...modalBtn(false), padding: '14px 22px', borderRadius: 12 }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            style={{ ...modalBtn(true), background: '#004D40', padding: '14px 26px', borderRadius: 12, fontSize: 14.5 }}
          >
            Save Changes
          </button>
        </div>
      </div>
      <Modal
        open={leave}
        onClose={() => setLeave(false)}
        title="Discard your changes?"
        footer={
          <>
            <button type="button" style={modalBtn(false)} onClick={() => setLeave(false)}>
              Keep editing
            </button>
            <button type="button" style={modalBtn(true)} onClick={() => navigate('/alumni/dashboard')}>
              Discard
            </button>
          </>
        }
      >
        You have unsaved changes to your profile. Leaving now will discard them.
      </Modal>
    </PortalPage>
  );
}
