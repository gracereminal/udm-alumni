import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { del, get, patch, put, upload } from '../lib/api';
import { regStepDefs, surveySectionDefs } from '../data/formDefs';

// Only the unsent registration draft stays in the browser (never the password). Everything else lives in the API.
const STORE = 'udm.tracer.draft.v1';
const ProfileContext = createContext(null);

const readDraft = () => {
  try { const raw = localStorage.getItem(STORE); return (raw && JSON.parse(raw).a) || {}; } catch { return {}; }
};
const writeDraft = (a) => {
  try { if (a && Object.keys(a).length) localStorage.setItem(STORE, JSON.stringify({ a })); else localStorage.removeItem(STORE); } catch { /* storage unavailable */ }
};

const PROFILE_IDS = [...new Set(regStepDefs({}).flatMap((s) => s.questions.map((q) => q.id)))];
const SURVEY_IDS = surveySectionDefs().flatMap((s) => s.questions.map((q) => q.id));
const pick = (a, ids) => Object.fromEntries(ids.filter((k) => k in a).map((k) => [k, a[k]]));

/**
 * The alumnus' own registration + profile + survey answers (Registration, Edit Profile, the Alumni Dashboard),
 * read from GET /me — the same ALUMNUS row that Records, the Directory and the stats use.
 */
export function ProfileProvider({ children }) {
  const { user, role } = useAuth();
  const [me, setMe] = useState(null);
  const [draft, setDraft] = useState(readDraft);
  const [registered, setRegistered] = useState(false);

  const reload = useCallback(async () => {
    const data = await get('/me');
    setMe(data);
    return data;
  }, []);

  useEffect(() => {
    if (role === 'alumni' && user) reload().catch(() => setMe(null));
    else setMe(null);
  }, [role, user, reload]);

  // Registration draft editing (signed out).
  const updateDraft = useCallback((fn) => setDraft((d) => { const n = fn(d); writeDraft(n); return n; }), []);
  const setA = useCallback((id, v) => updateDraft((d) => ({ ...d, [id]: v })), [updateDraft]);
  const setMany = useCallback((obj) => updateDraft((d) => ({ ...d, ...obj })), [updateDraft]);
  const toggleA = useCallback((id, v) => updateDraft((d) => {
    const cur = d[id] || [];
    return { ...d, [id]: cur.indexOf(v) > -1 ? cur.filter((x) => x !== v) : cur.concat(v) };
  }), [updateDraft]);
  const resetRegistration = useCallback(() => { writeDraft({}); setDraft({}); }, []);
  /** After POST /auth/register: the draft is sent, so it is cleared; the success screen may show. */
  const completeRegistration = useCallback(async () => {
    setRegistered(true);
    writeDraft({});
    setDraft({});
    await reload().catch(() => {});
  }, [reload]);

  /**
   * Edit Profile save: profile fields -> PATCH /me; survey answers -> PUT /me/survey (submitted once
   * "Have you ever been employed?" is answered, so the alumnus counts as traced). Throws ApiError with field errors.
   */
  const saveProfile = useCallback(async (answers) => {
    await patch('/me', pick(answers, PROFILE_IDS));
    const survey = pick(answers, SURVEY_IDS);
    if (Object.values(survey).some((v) => (Array.isArray(v) ? v.length : v != null && v !== '')) || me?.survey?.submitted) {
      await put('/me/survey', { answers: survey, submit: !!survey.ever_employed });
    }
    return reload();
  }, [me, reload]);

  const uploadAvatar = useCallback(async (file) => { await upload('/me/photo', 'photo', file); return reload(); }, [reload]);
  const removeAvatar = useCallback(async () => { await del('/me/photo'); return reload(); }, [reload]);

  const a = useMemo(() => (me ? me.a : draft), [me, draft]);
  const alumniName = useMemo(() => [a.first_name, a.last_name].filter(Boolean).join(' ') || user?.name || 'Alumnus', [a, user]);

  const value = useMemo(() => ({
    me, a, loaded: !!me, alumniName, registered,
    surveySubmitted: !!me?.survey?.submitted,
    survey: me?.survey || null,
    record: me?.record || null,
    privacy: me?.privacy || null,
    regAt: me?.record?.registeredAt || null,
    profileSavedAt: me?.record?.profileSavedAt || null,
    avatar: me?.record?.photoUrl || null,
    setA, setMany, toggleA, resetRegistration, completeRegistration, saveProfile, uploadAvatar, removeAvatar, reload,
  }), [me, a, alumniName, registered, setA, setMany, toggleA, resetRegistration, completeRegistration, saveProfile, uploadAvatar, removeAvatar, reload]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
