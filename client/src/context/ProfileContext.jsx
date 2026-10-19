import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { del, get, patch, put, upload } from '../lib/api';
import { regStepDefs, surveySectionDefs } from '../data/formDefs';
import { profileProgress } from '../lib/profileProgress';
import { useQuestionConfig } from '../lib/questionStore';

// Only the unsent registration draft stays in the browser (never the password). Everything else lives in the API.
const STORE = 'udm.registration.draft.v1';
/** This tab's last submitted registration (for the success screen), kept for a refresh. */
const JUST_REGISTERED = 'udm.registration.done.v1';
const ProfileContext = createContext(null);
const NO_ANSWERS = {};

const readJson = (area, key) => {
  try { const raw = area.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const writeJson = (area, key, v) => {
  try { if (v == null) area.removeItem(key); else area.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
};
const readDraft = () => readJson(localStorage, STORE)?.a || {};
const writeDraft = (a) => writeJson(localStorage, STORE, a && Object.keys(a).length ? { a } : null);

const ids = (defs) => [...new Set(defs.flatMap((s) => s.questions.map((q) => q.id)))];
const pick = (a, keys) => Object.fromEntries(keys.filter((k) => k in a).map((k) => [k, a[k]]));
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== '');

/**
 * The signed-in alumnus' own registration + profile + survey answers (Edit Profile, the Alumni Dashboard, Jobs and the
 * topbar), read from GET /me — the same `alumnus` row that Records, the Directory and the stats use — and the
 * registration draft while signed out. Staff accounts have no profile of their own.
 */
export function ProfileProvider({ children }) {
  const { user, role } = useAuth();
  const [me, setMe] = useState(null);
  const [draft, setDraft] = useState(readDraft);
  const [lastRegistration, setLastRegistration] = useState(() => readJson(sessionStorage, JUST_REGISTERED));

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
  /** After POST /auth/register: the draft was sent, so it is cleared and the success screen shows what was submitted. */
  const completeRegistration = useCallback((answers, res) => {
    const done = { a: answers, membershipId: res?.membershipId || null, message: res?.message || '' };
    writeJson(sessionStorage, JUST_REGISTERED, done);
    setLastRegistration(done);
    writeDraft({});
    setDraft({});
  }, []);

  /**
   * Edit Profile save: profile fields -> PATCH /me; survey answers -> PUT /me/survey (submitted once
   * "Have you ever been employed?" is answered, so the alumnus counts as traced). Throws ApiError with field errors.
   */
  const saveProfile = useCallback(async (answers) => {
    // Built per save, so the Admin's added questions are included. Their answers are stored with the survey.
    const reg = regStepDefs(answers, { raw: true }).flatMap((s) => s.questions);
    const profileIds = reg.filter((q) => !q.custom).map((q) => q.id);
    const surveyIds = [...ids(surveySectionDefs({ raw: true })), ...reg.filter((q) => q.custom).map((q) => q.id)];
    const survey = pick(answers, surveyIds.filter((k) => !profileIds.includes(k)));
    await patch('/me', pick(answers, profileIds));
    if (Object.values(survey).some(filled) || me?.survey?.submitted) {
      await put('/me/survey', { answers: survey, submit: !!survey.ever_employed });
    }
    return reload();
  }, [me, reload]);

  const uploadAvatar = useCallback(async (file) => { await upload('/me/photo', 'photo', file); return reload(); }, [reload]);
  const removeAvatar = useCallback(async () => { await del('/me/photo'); return reload(); }, [reload]);

  // Signed in, the profile comes only from /me: the browser's registration draft may belong to someone else.
  const signedIn = role === 'alumni' && !!user;
  const a = useMemo(() => (me ? me.a : signedIn ? NO_ANSWERS : draft), [me, signedIn, draft]);
  const alumniName = useMemo(() => [a.first_name, a.last_name].filter(Boolean).join(' ') || user?.name || 'Alumnus', [a, user]);
  /** One definition of "survey done" for the Dashboard and notifications (the server keeps the same rule). */
  const questions = useQuestionConfig(); // the Admin's question edits change what counts toward progress
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const progress = useMemo(() => profileProgress(a), [a, questions]);
  const surveyComplete = !!me?.survey?.submitted || progress.pct >= 100;

  const value = useMemo(() => ({
    me, a, loaded: !!me, alumniName, progress, surveyComplete, lastRegistration,
    surveySubmitted: !!me?.survey?.submitted,
    survey: me?.survey || null,
    record: me?.record || null,
    privacy: me?.privacy || null,
    skills: me?.skills || [],
    dashboard: me?.dashboard || null,
    savedAt: me?.record?.updatedAt || null,
    avatar: me?.record?.photoUrl || null,
    setA, setMany, toggleA, resetRegistration, completeRegistration, saveProfile, uploadAvatar, removeAvatar, reload,
  }), [me, a, alumniName, progress, surveyComplete, lastRegistration, setA, setMany, toggleA, resetRegistration, completeRegistration, saveProfile, uploadAvatar, removeAvatar, reload]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
