import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, UNAUTHORIZED_EVENT } from '../lib/api';

const AuthContext = createContext(null);

/**
 * The signed-in user, backed by the API's server-side session (httpOnly cookie). `ready` is false until the
 * session check on load has finished, so guards don't redirect a signed-in user to Sign In by mistake.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    get('/auth/session')
      .then((r) => { if (live) setUser(r.user); })
      .catch(() => { if (live) setUser(null); })
      .finally(() => { if (live) setReady(true); });
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => { live = false; window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized); };
  }, []);

  /** Email or Alumni ID (membership ID / student number) + password. */
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
  }, []);

  /** Registration creates the account and signs the new alumnus in. Throws ApiError (with field errors). */
  const register = useCallback(async (form) => {
    const r = await post('/auth/register', form);
    setUser(r.user);
    return r;
  }, []);

  const refresh = useCallback(async () => {
    try { const r = await get('/auth/session'); setUser(r.user); return r.user; } catch { setUser(null); return null; }
  }, []);

  // Clears the user first so the caller can navigate to Sign In right away; the server revokes the session.
  const signOut = useCallback(async () => {
    setUser(null);
    try { await post('/auth/logout'); } catch { /* the session is gone either way */ }
  }, []);

  const value = useMemo(() => ({ user, role: user ? user.role : null, ready, signIn, register, refresh, signOut }), [user, ready, signIn, register, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
