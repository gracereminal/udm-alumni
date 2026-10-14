import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, findAccount } from '../data/demoAccounts';

const STORE = 'udm.auth.v1';
const AuthContext = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Holds the signed-in user (role-based). Credentials are validated against the prototype demo accounts. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(load);

  const persist = useCallback((u) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(STORE, JSON.stringify(u));
      else localStorage.removeItem(STORE);
    } catch { /* storage unavailable */ }
  }, []);

  const signIn = useCallback((identifier, password) => {
    const id = String(identifier || '').trim();
    if (!id) return { ok: false, field: 'identifier', error: 'Enter your email or Alumni ID.' };
    if (!password) return { ok: false, field: 'password', error: 'Enter your password.' };
    const match = findAccount(id);
    if (!match || password !== DEMO_PASSWORD) {
      return { ok: false, field: 'password', error: 'Incorrect email / Alumni ID or password. Use one of the demo accounts to sign in.' };
    }
    const [key, acct] = match;
    const u = { key, role: acct.role, email: acct.email, name: acct.name, roleLabel: acct.roleLabel, initials: acct.initials, college: acct.college };
    persist(u);
    return { ok: true, user: u };
  }, [persist]);

  /** Used after self-registration: the new alumnus is signed in as an alumni user. */
  const signInAsAlumni = useCallback((name) => {
    const a = DEMO_ACCOUNTS.alumni;
    const u = { key: 'alumni', role: 'alumni', email: a.email, name: name || a.name };
    persist(u);
    return u;
  }, [persist]);

  const signOut = useCallback(() => persist(null), [persist]);

  const value = useMemo(() => ({ user, role: user ? user.role : null, signIn, signInAsAlumni, signOut }), [user, signIn, signInAsAlumni, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
