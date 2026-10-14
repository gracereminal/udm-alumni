import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORE = 'udm.tracer.draft.v1';
const ProfileContext = createContext(null);

const read = () => {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * The alumnus' own registration + profile + survey answers (shared by Registration, Edit Profile,
 * Alumni Survey, the Alumni Dashboard and the Admin / College record views).
 */
export function ProfileProvider({ children }) {
  const saved = useMemo(read, []);
  const [a, setAnswers] = useState(saved?.a || {});
  const [meta, setMeta] = useState({
    surveySection: saved?.surveySection || 0,
    surveySubmitted: !!saved?.surveySubmitted,
    registered: !!saved?.registered,
    regAt: saved?.regAt || null,
    profileSavedAt: saved?.profileSavedAt || null,
    savedAt: saved?.savedAt || null,
    restored: !!saved,
  });
  const [avatar, setAvatar] = useState(() => {
    try { return localStorage.getItem(`${STORE}.avatar`); } catch { return null; }
  });
  const [avatarName, setAvatarName] = useState(() => {
    try { return localStorage.getItem(`${STORE}.avatarName`); } catch { return null; }
  });

  useEffect(() => {
    try {
      if (avatar) { localStorage.setItem(`${STORE}.avatar`, avatar); localStorage.setItem(`${STORE}.avatarName`, avatarName || ''); }
      else { localStorage.removeItem(`${STORE}.avatar`); localStorage.removeItem(`${STORE}.avatarName`); }
    } catch { /* image too large for storage — keep it in memory only */ }
  }, [avatar, avatarName]);

  const write = useCallback((nextA, nextMeta) => {
    const savedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORE, JSON.stringify({
        a: nextA, surveySection: nextMeta.surveySection, surveySubmitted: nextMeta.surveySubmitted,
        registered: nextMeta.registered, regAt: nextMeta.regAt, profileSavedAt: nextMeta.profileSavedAt, savedAt,
      }));
    } catch { /* storage unavailable */ }
    return savedAt;
  }, []);

  /** Persist answers and/or meta (surveySection, surveySubmitted, registered, regAt, profileSavedAt). */
  const persist = useCallback((patch = {}) => {
    const { a: patchA, ...patchMeta } = patch;
    const nextA = patchA || a;
    const nextMeta = { ...meta, ...patchMeta };
    nextMeta.savedAt = write(nextA, nextMeta);
    if (patchA) setAnswers(nextA);
    setMeta(nextMeta);
  }, [a, meta, write]);

  const setA = useCallback((id, v) => persist({ a: { ...a, [id]: v } }), [a, persist]);
  const setMany = useCallback((obj) => persist({ a: { ...a, ...obj } }), [a, persist]);
  const toggleA = useCallback((id, v) => {
    const cur = a[id] || [];
    persist({ a: { ...a, [id]: cur.indexOf(v) > -1 ? cur.filter((x) => x !== v) : cur.concat(v) } });
  }, [a, persist]);

  const alumniName = useMemo(() => [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Maria Dela Cruz', [a]);

  const resetRegistration = useCallback(() => {
    setAnswers({});
    setMeta({ surveySection: 0, surveySubmitted: false, registered: false, regAt: null, profileSavedAt: null, savedAt: null, restored: false });
    try { localStorage.removeItem(STORE); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => ({
    a, ...meta, alumniName, avatar, avatarName, setAvatar, setAvatarName,
    persist, setA, setMany, toggleA, resetRegistration,
  }), [a, meta, alumniName, avatar, avatarName, persist, setA, setMany, toggleA, resetRegistration]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
