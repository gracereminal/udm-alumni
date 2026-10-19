import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavSidebar from '../../components/NavSidebar';
import FormField from '../../components/FormField';
import Icon from '../../components/Icon';
import Modal, { modalBtn } from '../../components/Modal';
import { card } from '../../layouts/PortalPage';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import useAvatarPicker from '../../hooks/useAvatarPicker';
import { visibleQs, answerPatch } from '../../data/formDefs';
import { ICONS } from '../../data/navigation';
import { buildField } from '../../lib/fields';
import { initials } from '../../lib/format';
import { validateProfile } from '../../lib/validation';
import { answered, countedQs, profileGroups, profileProgress } from '../../lib/profileProgress';
import { useQuestionConfig } from '../../lib/questionStore';

const BG = 'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),radial-gradient(800px 500px at 100% 100%,#EAF2EE 0%,rgba(234,242,238,0) 70%),#F3F6F4';
const pill = { whiteSpace: 'nowrap', fontSize: 11.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', color: '#fff' };
const pillBtn = { whiteSpace: 'nowrap', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer' };
const heroBtn = { whiteSpace: 'nowrap', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '11px 18px', borderRadius: 12, cursor: 'pointer' };

/** Edit Profile: one section at a time (tabs + Back / Continue) with explicit Save / Cancel — per "UDM Alumni.dc.html". */
export default function AlumniProfileEdit() {
  const navigate = useNavigate();
  useQuestionConfig(); // re-render when an Admin edits the questions
  const profile = useProfile();
  const { toast } = useToast();
  const [dirty, setDirty] = useState(false);
  const photo = useAvatarPicker(() => setDirty(true));
  const [draft, setDraft] = useState(profile.a);
  const [errors, setErrors] = useState({});
  const [leave, setLeave] = useState(false);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);

  // The profile arrives from GET /me after the first render; adopt it until the user starts editing.
  useEffect(() => { if (profile.loaded && !dirty) setDraft(profile.a); }, [profile.loaded, profile.a, dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

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
        setDraft((d) => ({ ...d, ...answerPatch(d, id, v) }));
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
  const groupQs = groups.map((g) => visibleQs(g, draft));
  const { total, done, pct } = profileProgress(draft);
  const idx = Math.min(tab, groups.length - 1);
  const current = groups[idx];
  const last = idx === groups.length - 1;

  const name = [draft.first_name, draft.last_name].filter(Boolean).join(' ') || profile.alumniName;
  const course = draft.course || draft.course_other || 'Course not set';
  const batch = draft.year_graduated ? `Class of ${String(draft.year_graduated).slice(0, 4)}` : 'Batch year not set';
  const savedLabel = dirty
    ? 'You have unsaved changes.'
    : profile.savedAt
      ? `Last saved ${new Date(profile.savedAt).toLocaleString()}.`
      : 'Keep your details current.';

  const goTab = (i) => {
    setTab(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showErrors = (e) => {
    const keys = Object.keys(e);
    const bad = groupQs.findIndex((qs) => qs.some((q) => keys.includes(q.id)));
    if (bad > -1) setTab(bad);
    setTimeout(() => {
      const el = document.querySelector('[aria-invalid="true"]');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 30);
  };
  const save = async () => {
    if (saving) return;
    const e = validateProfile(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      showErrors(e);
      toast('Please fix the highlighted fields before saving.', false);
      return;
    }
    setSaving(true);
    try {
      // Profile fields -> PATCH /me, survey answers -> PUT /me/survey, then the photo change (if any).
      await profile.saveProfile(draft);
      await photo.commit();
      setDirty(false);
      toast('Profile saved — your record in Alumni Records was updated.');
      navigate('/alumni/profile');
    } catch (err) {
      if (err.fields) { setErrors(err.fields); showErrors(err.fields); }
      toast(err.message || 'Your profile could not be saved. Please try again.', false);
    } finally {
      setSaving(false);
    }
  };
  const cancel = () => (dirty ? setLeave(true) : navigate('/alumni/profile'));

  return (
    <div data-screen-label="Edit Profile" style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <NavSidebar style={{ flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 12px 28px', display: 'flex', flexDirection: 'column', gap: 14, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', borderRadius: 22, background: 'linear-gradient(165deg,#00251F,#004D40)', color: '#fff', padding: 28, boxShadow: '0 14px 34px -14px rgba(0,37,31,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: '#F0C428' }}>Edit Profile</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={cancel} style={{ ...heroBtn, border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.1)', color: '#fff' }}>
                  Cancel
                </button>
                <button type="button" onClick={save} style={{ ...heroBtn, border: 'none', background: '#F0C428', color: '#00251F' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 'none', width: 96, height: 96 }}>
                {photo.avatar ? (
                  <div role="img" aria-label="Profile photo" style={{ width: 96, height: 96, borderRadius: '50%', border: '3px solid #F0C428', boxSizing: 'border-box', background: `url("${photo.avatar}") center/cover no-repeat` }} />
                ) : (
                  <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: '2px dashed rgba(240,196,40,.7)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 30, color: '#F0C428' }}>
                    {initials(name) || 'AL'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={photo.pick}
                  title="Change photo"
                  aria-label="Change photo"
                  style={{ position: 'absolute', right: -4, bottom: -4, width: 34, height: 34, borderRadius: '50%', background: '#F0C428', color: '#00251F', border: '3px solid #004D40', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', padding: 0 }}
                >
                  <Icon d={ICONS.pencil} size={15} />
                </button>
                <input type="file" accept="image/png,image/jpeg,image/webp" ref={photo.fileRef} onChange={photo.onFile} style={{ display: 'none' }} />
              </div>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: -0.6, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{name}</div>
                <div style={{ fontSize: 14, color: '#EAF3F1', marginTop: 6, lineHeight: 1.5 }}>
                  {course} · {batch}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
                  <div style={pill}>{pct}% complete</div>
                  <div style={pill}>
                    {done} of {total} questions answered
                  </div>
                  <button type="button" onClick={photo.pick} style={{ ...pillBtn, border: 'none', background: '#F0C428', color: '#00251F' }}>
                    {photo.avatar ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photo.avatar ? (
                    <button type="button" onClick={photo.remove} style={{ ...pillBtn, border: '1px solid rgba(255,255,255,.3)', background: 'transparent', color: '#fff' }}>
                      Remove
                    </button>
                  ) : null}
                </div>
                {photo.error ? (
                  <div role="alert" style={{ fontSize: 12, color: '#FFD9D4', marginTop: 10 }}>
                    {photo.error}
                  </div>
                ) : null}
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,.16)', overflow: 'hidden', marginTop: 22 }}>
              <div style={{ height: '100%', background: '#F0C428', width: `${pct}%`, transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 11.5, color: '#EAF3F1', marginTop: 10 }}>Saving updates your record in Alumni Records. {savedLabel}</div>
          </div>

          <div style={{ ...card, padding: '14px 18px' }}>
            <div role="tablist" aria-label="Profile sections" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groups.map((g, i) => {
                const qs = groupQs[i];
                const complete = qs.length > 0 && countedQs(qs).every((q) => answered(draft, q));
                const on = i === idx;
                return (
                  <button
                    key={g.title}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => goTab(i)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      fontFamily: 'inherit',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 13px',
                      borderRadius: 999,
                      background: on ? '#004D40' : complete ? '#E1F3EA' : '#fff',
                      color: on ? '#fff' : complete ? '#0F8A5F' : 'rgba(0,0,0,.6)',
                      border: `1px solid ${on ? '#004D40' : complete ? 'rgba(15,138,95,.3)' : 'rgba(0,0,0,.14)'}`,
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{complete ? '✓' : on ? '●' : '○'}</span>
                    <span>{g.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div data-m="sv-card" role="tabpanel" style={{ ...card, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
              <h2 data-m="sv-title" style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#0F3D2E' }}>
                {current.title}
              </h2>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#004D40', background: '#E7F0EE', padding: '5px 11px', borderRadius: 8, letterSpacing: 0.4, flex: 'none' }}>
                SECTION {idx + 1} OF {groups.length}
              </div>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(0,0,0,.55)', marginBottom: 14 }}>{current.sub}</div>
            <div data-m="fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
              {groupQs[idx].map((q) => {
                const f = buildField(q, draft, handlers, errors);
                return <FormField key={q.id} f={{ ...f, span: f.span === 'span 1' ? 'auto' : '1 / -1' }} variant="survey" />;
              })}
            </div>
            <div data-m="actions" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                onClick={() => (idx > 0 ? goTab(idx - 1) : cancel())}
                style={{ flex: 'none', border: '1px solid rgba(0,0,0,.16)', background: '#fff', color: '#0A0A0A', fontFamily: 'inherit', borderRadius: 12, padding: '14px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => (last ? save() : goTab(idx + 1))}
                style={{ flex: 1, textAlign: 'center', border: 'none', background: '#004D40', color: '#fff', fontFamily: 'inherit', borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }}
              >
                {last ? (saving ? 'Saving…' : 'Save Changes →') : 'Continue →'}
              </button>
            </div>
          </div>
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
            <button type="button" style={modalBtn(true)} onClick={() => navigate('/alumni/profile')}>
              Discard
            </button>
          </>
        }
      >
        You have unsaved changes to your profile. Leaving now will discard them.
      </Modal>
    </div>
  );
}
