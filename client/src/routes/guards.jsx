import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { ROLE_HOME } from '../data/navigation';
import { PRIVACY_KEY } from '../pages/auth/PrivacyConsent';

/** Where a signed-in user belongs: Change Password while on a one-time password, else their own dashboard. */
export const homeFor = (user) => (user.mustChangePassword ? '/change-password' : ROLE_HOME[user.role]);

/** Signed-in users are sent to their own dashboard instead of the auth screens. */
export function PublicOnly() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? <Navigate to={homeFor(user)} replace /> : <Outlet />;
}

/** Change Password is only for a signed-in account that still has to replace its one-time password. */
export function RequirePasswordChange() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/signin" replace />;
  return user.mustChangePassword ? <Outlet /> : <Navigate to={ROLE_HOME[user.role]} replace />;
}

/** Only the given role may open these routes; everyone else is redirected (to sign-in, or to their own dashboard). */
export function RequireRole({ role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (user.mustChangePassword || user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

/** The registration form can only be opened after the Data Privacy consent. */
export function RequireConsent() {
  let ok = false;
  try { ok = !!sessionStorage.getItem(PRIVACY_KEY); } catch { /* ignore */ }
  return ok ? <Outlet /> : <Navigate to="/register/consent" replace />;
}

/** The success screen is only shown to someone who has just registered. */
export function RequireRegistered() {
  const { lastRegistration } = useProfile();
  return lastRegistration ? <Outlet /> : <Navigate to="/register/consent" replace />;
}
