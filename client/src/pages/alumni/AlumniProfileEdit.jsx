import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NavSidebar from '../../components/NavSidebar';
import Topbar from '../../components/Topbar';
import FormField from '../../components/FormField';
import Modal, { modalBtn } from '../../components/Modal';
import { useProfile } from '../../context/ProfileContext';
import { useToast } from '../../context/ToastContext';
import useAvatarPicker from '../../hooks/useAvatarPicker';
import { visibleQs, answerPatch } from '../../data/formDefs';
import { buildField } from '../../lib/fields';
import { initials } from '../../lib/format';
import { hv } from '../../lib/stateStyle';
import { validateProfile } from '../../lib/validation';
import { answered, countedQs, profileGroups, profileProgress } from '../../lib/profileProgress';
import { useQuestionConfig } from '../../lib/questionStore';
import { filledPlatforms, privacyDraft, samePrivacy } from '../../lib/privacy';
import PrivacyToggles from '../../components/alumni/PrivacyToggles';

const BG = 'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),radial-gradient(800px 500px at 100% 100%,#EAF2EE 0%,rgba(234,242,238,0) 70%),#F3F6F4';
const panel = { background: '#fff', border: '1px solid #E3EBE8', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,37,31,.05)', boxSizing: 'border-box' };
const kicker = { margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: 1.3, color: '#6B7D75', textTransform: 'uppercase' };
const sideHead = { margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#94A3B8' };
const raBadge = { fontSize: 10.5, fontWeight: 700, color: '#0F3D2E', background: '#E6F0EB', padding: '2px 8px', borderRadius: 999 };
const pillBtn = (primary) => ({
  width: 'auto', whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 999, border: primary ? 0 : '1px solid #D5E0DB', background: primary ? '#F0C428' : '#fff', color: '#00251F',
  font: `${primary ? 700 : 600} 13.5px Inter,sans-serif`, cursor: 'pointer',
});
const barBtn = (primary) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap', minHeight: 42, padding: '0 16px', borderRadius: 12,
  border: primary ? 0 : '1px solid rgba(255,255,255,.28)', background: primary ? '#fff' : 'rgba(255,255,255,.1)', color: primary ? '#00251F' : '#fff',
  font: `${primary ? 700 : 600} 13px Inter,sans-serif`, cursor: 'pointer',
});
const Arrow = ({ back, color = 'currentColor' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }} aria-hidden="true">
    <path d={back ? 'M13 8H3M7.5 3.5 3 8l4.5 4.5' : 'M3 8h10M8.5 3.5 13 8l-4.5 4.5'} />
  </svg>
);
const Shield = () => (
  <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: '#E6F0EC', display: 'grid', placeItems: 'center' }}>
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="#004D40" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 1.5 2.5 4.5v6c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10v-6L10 1.5Z" />
      <path d="m6.8 11 2.3 2.3 4.2-4.6" strokeLinecap="round" />
    </svg>
  </div>
);
const pad2 = (n) => String(n).padStart(2, '0');

const skillList = (text) => [...new Set(String(text).split(',').map((s) => s.trim()).filter(Boolean))];
const skillsText = (skills) => (skills || []).map((s) => s.name).join(', ');

/** Edit Profile: a five-step flow (step tabs + Previous / Next) with a completion sidebar and explicit Save / Cancel — per "UDM Alumni.dc.html". */
export default function AlumniProfileEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  useQuestionConfig(); // re-render when an Admin edits the questions
  const profile = useProfile();
  const { toast } = useToast();
  const [dirty, setDirty] = useState(false);
  const photo = useAvatarPicker(() => setDirty(true));
  const [draft, setDraft] = useState(profile.a);
  const [errors, setErrors] = useState({});
  const [leave, setLeave] = useState(null); // where to go once unsaved changes are discarded
  const [tab, setTab] = useState(() => Number(location.state?.step) || 0); // Privacy & My Data's Edit buttons open a given step
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState(() => privacyDraft(profile.privacy));
  const [skills, setSkills] = useState(() => skillsText(profile.skills));

  // The profile arrives from GET /me after the first render; adopt it until the user starts editing.
  useEffect(() => {
    if (!profile.loaded || dirty) return;
    setDraft(profile.a);
    setPrivacy(privacyDraft(profile.privacy));
    setSkills(skillsText(profile.skills));
  }, [profile.loaded, profile.a, profile.privacy, profile.skills, dirty]);

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
  const complete = groupQs.map((qs) => qs.length > 0 && countedQs(qs).every((q) => answered(draft, q)));
  const { pct } = profileProgress(draft);
  const idx = Math.min(tab, groups.length - 1);
  const current = groups[idx];
  const last = idx === groups.length - 1;
  const stepNo = pad2(idx + 1);

  const name = [draft.first_name, draft.last_name].filter(Boolean).join(' ') || profile.alumniName;
  const savedLabel = dirty
    ? 'You have unsaved changes.'
    : profile.savedAt
      ? `Last saved ${new Date(profile.savedAt).toLocaleString()}.`
      : 'Keep your details current.';

  // Completion checklist: the photo, then one item per step.
  const checks = [{ label: 'Profile photo', done: !!photo.avatar, step: 0 }].concat(groups.map((g, i) => ({ label: g.title, done: complete[i], step: i })));
  const left = checks.filter((c) => !c.done);
  const ring = 2 * Math.PI * 40;

  const goTab = (i) => {
    setTab(Math.max(0, Math.min(groups.length - 1, i)));
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
  /** Saves everything; then moves to step `next`, or back to the Profile page when `next` is omitted. */
  const save = async (next) => {
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
      // Profile fields (+ privacy / skills when changed) -> PATCH /me, survey answers -> PUT /me/survey, then the photo.
      const extra = {};
      if (!samePrivacy(privacy, privacyDraft(profile.privacy))) extra.privacy = privacy;
      if (skillList(skills).join('\n') !== skillList(skillsText(profile.skills)).join('\n')) extra.skills = skillList(skills);
      await profile.saveProfile(draft, extra);
      await photo.commit();
      setDirty(false);
      toast('Profile saved — your record in Alumni Records was updated.');
      if (typeof next === 'number') goTab(next);
      else navigate('/alumni/profile');
    } catch (err) {
      if (err.fields) { setErrors(err.fields); showErrors(err.fields); }
      toast(err.message || 'Your profile could not be saved. Please try again.', false);
    } finally {
      setSaving(false);
    }
  };
  const leaveTo = (path) => (dirty ? setLeave(path) : navigate(path));
  const cancel = () => leaveTo('/alumni/profile');

  return (
    <div data-screen-label="Edit Profile" style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <NavSidebar style={{ flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title="Edit Profile" caption="UDM ALUMNI RELATIONS OFFICE • ALUMNI → EDIT PROFILE" />
        <div data-ep="wrap" style={{ flex: 1, minWidth: 0, padding: '14px 12px 40px', display: 'flex', flexDirection: 'column', gap: 14, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ ...panel, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px 20px', padding: '12px 20px', borderBottom: '1px solid #EDF2F0', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#00251F', lineHeight: 1.3 }}>Edit Profile Flow</h1>
                <div style={{ marginTop: 2, fontSize: 13, color: '#6B7D75', lineHeight: 1.4 }}>Manage your personal information, academic credentials, and career records.</div>
              </div>
              <div style={{ display: 'inline-flex', flexDirection: 'row', gap: 10, width: 'auto', flex: 'none' }}>
                <button type="button" onClick={cancel} style={pillBtn(false)} {...hv({ background: '#F1F6F4' })}>
                  Cancel
                </button>
                <button type="button" onClick={() => save()} style={pillBtn(true)} {...hv({ background: '#E0B515' })}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '16px 22px', background: 'linear-gradient(165deg,#00251F,#004D40)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ background: '#F0C428', color: '#00251F', fontSize: 12, fontWeight: 800, letterSpacing: 0.6, padding: '6px 12px', borderRadius: 999, textTransform: 'uppercase' }}>
                  Step {stepNo} of {pad2(groups.length)}
                </div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{current.title}</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => goTab(idx - 1)} disabled={idx === 0} style={{ ...barBtn(false), opacity: idx === 0 ? 0.45 : 1, cursor: idx === 0 ? 'default' : 'pointer' }} {...hv({ background: 'rgba(255,255,255,.2)' })}>
                  <Arrow back />
                  Previous Step
                </button>
                <button type="button" onClick={() => (last ? save() : goTab(idx + 1))} style={barBtn(true)} {...hv({ background: '#F0C428' })}>
                  {last ? 'Finish' : `Next: ${groups[idx + 1].title}`}
                  <Arrow />
                </button>
              </div>
            </div>
            <div role="tablist" aria-label="Edit profile steps" style={{ display: 'flex', gap: 10, padding: '18px 22px 20px', overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
              {groups.map((g, i) => {
                const on = i === idx;
                const done = complete[i];
                return (
                  <button
                    key={g.title}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => goTab(i)}
                    style={{ flex: '1 0 190px', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${on ? '#004D40' : '#E3EBE8'}`, background: on ? '#E6F0EC' : '#fff', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}
                  >
                    <span
                      style={{
                        flex: 'none', width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                        border: `1.5px solid ${done ? '#004D40' : on ? '#C9A100' : '#C5D5CF'}`, background: done ? '#004D40' : on ? '#F0C428' : '#fff', color: done ? '#fff' : on ? '#00251F' : '#6B7D75',
                      }}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, lineHeight: 1.3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, whiteSpace: 'nowrap', color: on ? '#004D40' : '#6B7D75' }}>
                        STEP {pad2(i + 1)} · {done ? 'DONE' : on ? 'ACTIVE' : 'UPCOMING'}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: on ? '#00251F' : '#55675F', lineHeight: 1.25 }}>{g.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
            <div role="tabpanel" aria-label={current.title} style={{ ...panel, flex: '2 1 560px', minWidth: 0, padding: 28, display: 'flex', flexDirection: 'column', gap: 26 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 'none', width: 48, height: 48, borderRadius: 14, background: '#E6F0EC', color: '#004D40', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16 }}>{stepNo}</div>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: -0.3, color: '#00251F' }}>{current.title}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#5A6D65', lineHeight: 1.5 }}>{current.sub}</p>
                </div>
              </div>

              {idx === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: 18, border: '1px dashed #C5D5CF', borderRadius: 16, background: '#F8FAF9' }}>
                  {photo.avatar ? (
                    <div role="img" aria-label="Profile photo" style={{ flex: 'none', width: 84, height: 84, borderRadius: '50%', background: `url("${photo.avatar}") center/cover no-repeat`, border: '3px solid #fff', boxShadow: '0 0 0 2px #F0C428' }} />
                  ) : (
                    <div aria-hidden="true" style={{ flex: 'none', width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(165deg,#00251F,#004D40)', color: '#F0C428', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800, border: '3px solid #fff', boxShadow: '0 0 0 2px #F0C428' }}>
                      {initials(name) || 'AL'}
                    </div>
                  )}
                  <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#00251F', overflowWrap: 'anywhere' }}>{name}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" onClick={photo.pick} style={{ minHeight: 40, padding: '0 16px', borderRadius: 12, border: 0, background: '#004D40', color: '#fff', font: '600 13px Inter,sans-serif', cursor: 'pointer' }} {...hv({ background: '#00251F' })}>
                        {photo.avatar ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      {photo.avatar ? (
                        <button type="button" onClick={photo.remove} style={{ minHeight: 40, padding: '0 16px', borderRadius: 12, border: '1px solid #D5E0DB', background: '#fff', color: '#00251F', font: '600 13px Inter,sans-serif', cursor: 'pointer' }}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div role={photo.error ? 'alert' : undefined} style={{ fontSize: 12, color: photo.error ? '#B3261E' : '#6B7D75' }}>
                      {photo.error || `${photo.avatar ? 'Photo selected' : 'No photo yet'} · optional · JPG or PNG, max 2 MB.`}
                    </div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" ref={photo.fileRef} onChange={photo.onFile} style={{ display: 'none' }} />
                  </div>
                </div>
              ) : null}

              <div data-m="ep-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>
                {groupQs[idx].map((q) => {
                  const f = buildField(q, draft, handlers, errors);
                  return <FormField key={q.id} f={{ ...f, span: f.span === 'span 1' ? 'auto' : '1 / -1' }} variant="survey" />;
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 20, borderTop: '1px solid #EDF2F0' }}>
                <button type="button" onClick={cancel} style={{ minHeight: 46, padding: '0 6px', border: 0, background: 'none', color: '#6B7D75', font: '600 13.5px Inter,sans-serif', cursor: 'pointer' }} {...hv({ color: '#C0392B' })}>
                  Cancel
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: '#6B7D75' }}>{savedLabel}</span>
                  <button
                    type="button"
                    onClick={() => save(last ? undefined : idx + 1)}
                    style={{ minHeight: 46, padding: '0 22px', borderRadius: 12, border: 0, background: '#00251F', color: '#fff', font: '700 13.5px Inter,sans-serif', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}
                    {...hv({ background: '#004D40' })}
                  >
                    {saving ? 'Saving…' : last ? 'Save & Finish' : `Save & Continue to Step ${idx + 2}`}
                    <Arrow color="#F0C428" />
                  </button>
                </div>
              </div>
            </div>

            <aside aria-label="Profile completion" style={{ flex: '1 1 320px', maxWidth: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <section style={{ ...panel, padding: 22, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <h2 style={kicker}>Complete your profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <svg width="96" height="96" viewBox="0 0 96 96" style={{ flex: 'none' }} role="img" aria-label={`${pct}% complete`}>
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#E6EEEA" strokeWidth="9" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#F0C428" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(pct / 100) * ring} ${ring}`} style={{ transition: 'stroke-dasharray .4s' }} transform="rotate(-90 48 48)" />
                    <text x="48" y="54" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="22" fontWeight="800" fill="#00251F">{pct}%</text>
                  </svg>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#00251F' }}>{pct}% Completed</div>
                    <div style={{ fontSize: 12.5, color: '#5A6D65', lineHeight: 1.45, marginTop: 3 }}>
                      {left.length ? `${left.length} ${left.length > 1 ? 'items' : 'item'} left to complete your profile.` : 'All set — your profile is complete.'}
                    </div>
                  </div>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {checks.map((c) => (
                    <li key={c.label}>
                      <button
                        type="button"
                        onClick={() => goTab(c.step)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 0', border: 0, background: 'none', textAlign: 'left', fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: c.done ? '#0F1F1A' : '#55675F', fontWeight: c.done ? 500 : 600, cursor: 'pointer' }}
                      >
                        <span aria-hidden="true" style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, background: c.done ? '#004D40' : '#fff', color: '#fff', border: `1.5px solid ${c.done ? '#004D40' : '#C5D5CF'}`, boxSizing: 'border-box' }}>
                          {c.done ? '✓' : ''}
                        </span>
                        {c.label}
                        <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{c.done ? ' (done)' : ' (to do)'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { if (left.length) goTab(left[0].step); }}
                  style={{ minHeight: 46, borderRadius: 12, border: 0, background: left.length ? '#F0C428' : '#E6EEEA', color: '#00251F', font: '700 13.5px Inter,sans-serif', cursor: left.length ? 'pointer' : 'default' }}
                  {...(left.length ? hv({ background: '#E0B515' }) : {})}
                >
                  {left.length ? 'Complete remaining fields' : 'Profile complete'}
                </button>
              </section>

              <section data-m="pf-priv" aria-labelledby="pf-priv-h" style={{ ...panel, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <h2 id="pf-priv-h" style={sideHead}>Contact Privacy</h2>
                  <div style={raBadge}>RA 10173</div>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 6 }}>Choose what other alumni see in the directory. All switches start hidden.</div>
                <PrivacyToggles
                  value={privacy}
                  platforms={filledPlatforms(draft)}
                  onChange={(p) => { setDirty(true); setPrivacy(p); }}
                />
                <div style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid #EEF0F3' }}>
                  Hidden details are blank for other alumni. You and Admin still see them; the university can still contact you.
                </div>
                <button
                  type="button"
                  onClick={() => leaveTo('/alumni/privacy')}
                  style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 10, padding: '10px 0 0', border: 0, borderTop: '1px solid #EEF0F3', background: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#004D40', cursor: 'pointer' }}
                  {...hv({ textDecoration: 'underline' })}
                >
                  View my data or request deletion →
                </button>
              </section>

              <section data-m="pf-skills" aria-labelledby="pf-skills-h" style={{ ...panel, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <h2 id="pf-skills-h" style={sideHead}>Skills &amp; Interests</h2>
                  <div style={raBadge}>Directory</div>
                </div>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, marginBottom: 10 }}>Shown on your directory card. Your first three appear as your top skills.</div>
                <label htmlFor="pf-skills-input" style={{ display: 'block', fontSize: 11.5, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: '#6B7280', marginBottom: 7 }}>
                  Skills &amp; interests
                </label>
                <input
                  id="pf-skills-input"
                  type="text"
                  value={skills}
                  onChange={(e) => { clear('skills'); setDirty(true); setSkills(e.target.value); }}
                  placeholder="e.g. web dev, accounting, teaching"
                  aria-invalid={errors.skills ? 'true' : undefined}
                  aria-describedby="pf-skills-hint"
                  style={{ width: '100%', height: 46, boxSizing: 'border-box', border: `1px solid ${errors.skills ? '#B3261E' : '#D5E0DB'}`, borderRadius: 12, padding: '0 14px', fontSize: 14, background: '#fff', color: '#0F1F1A', fontFamily: 'inherit', outline: 'none' }}
                />
                <div id="pf-skills-hint" role={errors.skills ? 'alert' : undefined} style={{ fontSize: 12, color: errors.skills ? '#B3261E' : '#7A8A83', marginTop: 6 }}>
                  {errors.skills || 'Separate tags with commas.'}
                </div>
                {skillList(skills).length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {skillList(skills).map((s, i) => (
                      <span key={s} style={{ fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 999, background: i < 3 ? '#E6F0EB' : '#F1F3F5', color: i < 3 ? '#0F3D2E' : '#475569' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>

              <section style={{ ...panel, padding: 20, display: 'flex', gap: 14 }}>
                <Shield />
                <div>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#00251F' }}>Data Privacy Notice</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#5A6D65', lineHeight: 1.55 }}>
                    Your information is collected for alumni tracer and institutional reporting only, and is protected under the Data Privacy Act of 2012 (RA 10173). It is never sold or shared without consent.
                  </p>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
      <Modal
        open={!!leave}
        onClose={() => setLeave(null)}
        title="Discard your changes?"
        footer={
          <>
            <button type="button" style={modalBtn(false)} onClick={() => setLeave(null)}>
              Keep editing
            </button>
            <button type="button" style={modalBtn(true)} onClick={() => navigate(leave)}>
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
