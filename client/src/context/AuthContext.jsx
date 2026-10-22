import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { get, post, UNAUTHORIZED_EVENT } from '../lib/api';

const AuthContext = createContext(null);

/**
 * The signed-in user, backed by the API's server-side session (httpOnly cookie). `ready` is false until the
 * session check on load has finished, so guards don't redirect a signed-in user to Sign In by mistake.
 */
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [ready, setReady] = useState(false);
  // Bumped by every sign-in / sign-out, so a session check that answers later can't undo it.
  const version = useRef(0);
  const setUser = useCallback((u) => { version.current += 1; setUserState(u); }, []);

  useEffect(() => {
    let live = true;
    const at = version.current;
    const apply = (u) => { if (live && version.current === at) setUserState(u); };
    get('/auth/session')
      .then((r) => apply(r.user))
      .catch(() => apply(null))
      .finally(() => { if (live) setReady(true); });
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => { live = false; window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized); };
  }, [setUser]);

  /**
   * Email or Alumni ID (membership ID / student number) + password.
   */
  const signIn = useCallback(async (identifier, password) => {
    const id = String(identifier || '').trim();
    if (!id) return { ok: false, field: 'identifier', error: 'Enter your email or Alumni ID.' };
    if (!password) return { ok: false, field: 'password', error: 'Enter your password.' };
    try {
      const r = await post('/auth/login', { identifier: id, password });
      setUser(r.user);
      return { ok: true, user: r.user };
    } catch (err) {
      return { ok: false, field: err.status === 401 ? 'password' : '', error: err.message };
    }
  }, [setUser]);

  /**
   * Self-registration creates an active account but does not sign in: the alumnus signs in next.
   * Throws ApiError (409 `email_taken`, or 422 with field errors).
   */
  const registerAlumni = useCallback((form) => post('/auth/register', form), []);

  const refresh = useCallback(async () => {
    try { const r = await get('/auth/session'); setUser(r.user); return r.user; } catch { setUser(null); return null; }
  }, [setUser]);

  // Clears the user first so the caller can navigate to Sign In right away; the server revokes the session.
  const signOut = useCallback(async () => {
    setUser(null);
    try { await post('/auth/logout'); } catch { /* the session is gone either way */ }
  }, [setUser]);

  const value = useMemo(
    () => ({ user, role: user ? user.role : null, ready, signIn, registerAlumni, refresh, signOut }),
    [user, ready, signIn, registerAlumni, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
