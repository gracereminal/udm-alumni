import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { ROLE_HOME } from '../data/navigation';
import { PRIVACY_KEY } from '../pages/auth/PrivacyConsent';

/** Signed-in users are sent to their own dashboard instead of the auth screens. */
export function PublicOnly() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return user ? <Navigate to={ROLE_HOME[user.role]} replace /> : <Outlet />;
}

/** Only the given role may open these routes; everyone else is redirected (to sign-in, or to their own dashboard). */
export function RequireRole({ role }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
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
  const { registered } = useProfile();
  return registered ? <Outlet /> : <Navigate to="/register/consent" replace />;
}
