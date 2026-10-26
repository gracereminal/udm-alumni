import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireConsent, RequirePasswordChange, RequireRegistered, RequireRole, homeFor } from './guards';
import { useAuth } from '../context/AuthContext';
import { startupData } from '../lib/startup';
import SignIn from '../pages/auth/SignIn';
import ForgotPassword, { ResetPasswordLink } from '../pages/auth/ForgotPassword';
import PrivacyConsent from '../pages/auth/PrivacyConsent';
import ChangePassword from '../pages/auth/ChangePassword';
import VerifySignIn from '../pages/auth/VerifySignIn';

// Registration and signed-in pages load on demand (the Suspense in App.jsx) so sign-in ships a small first bundle.
// Each also waits for the start-up catalog its forms read, fetched in parallel with its code.
const page = (load) => lazy(() => Promise.all([load(), startupData()]).then(([m]) => m));

const loadAlumniDashboard = () => import('../pages/alumni/AlumniDashboard');
const loadAdminDashboard = () => import('../pages/admin/AdminDashboard');
const loadCollegeDashboard = () => import('../pages/college/CollegeDashboard');
/** Each role's home page, fetched as soon as the user is known so it's ready by the time the redirect lands. */
const PRELOAD_HOME = { alumni: loadAlumniDashboard, admin: loadAdminDashboard, dept: loadCollegeDashboard };

const SampleInbox = page(() => import('../pages/auth/SampleInbox'));
const AlumniRegistration = page(() => import('../pages/auth/AlumniRegistration'));
const RegistrationSuccess = page(() => import('../pages/auth/RegistrationSuccess'));
const AlumniDashboard = page(loadAlumniDashboard);
const AlumniProfile = page(() => import('../pages/alumni/AlumniProfile'));
const AlumniProfileEdit = page(() => import('../pages/alumni/AlumniProfileEdit'));
const AlumniPrivacy = page(() => import('../pages/alumni/AlumniPrivacy'));
const AlumniJobs = page(() => import('../pages/alumni/AlumniJobs'));
const AlumniEvents = page(() => import('../pages/alumni/AlumniEvents'));
const AdminDashboard = page(loadAdminDashboard);
const AlumniRecords = page(() => import('../pages/admin/AlumniRecords'));
const Reports = page(() => import('../pages/admin/Reports'));
const AdminJobs = page(() => import('../pages/admin/AdminJobs'));
const AdminEvents = page(() => import('../pages/admin/AdminEvents'));
const AlumniTracer = page(() => import('../pages/admin/AlumniTracer'));
const AiDataManagement = page(() => import('../pages/admin/AiDataManagement'));
const CollegeDashboard = page(loadCollegeDashboard);

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return <Navigate to={user ? homeFor(user) : '/signin'} replace />;
}

export default function AppRoutes() {
  const { user } = useAuth();
  const role = user ? user.role : null;
  useEffect(() => {
    if (PRELOAD_HOME[role]) PRELOAD_HOME[role]().catch(() => { /* the route retries and reports it */ });
  }, [role]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<PublicOnly />}>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signin/verify" element={<VerifySignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route element={<RequirePasswordChange />}>
        <Route path="/change-password" element={<ChangePassword />} />
      </Route>
      {/* The emailed reset link works whether or not someone is signed in. */}
      <Route path="/reset-password" element={<ResetPasswordLink />} />
      <Route path="/register" element={<Navigate to="/register/consent" replace />} />
      <Route path="/register/consent" element={<PrivacyConsent />} />
      <Route element={<RequireConsent />}>
        <Route path="/register/details" element={<AlumniRegistration />} />
      </Route>
      <Route element={<RequireRegistered />}>
        <Route path="/register/success" element={<RegistrationSuccess />} />
      </Route>
      <Route path="/alumni" element={<RequireRole role="alumni" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AlumniDashboard />} />
        <Route path="profile" element={<AlumniProfile />} />
        <Route path="profile/edit" element={<AlumniProfileEdit />} />
        <Route path="privacy" element={<AlumniPrivacy />} />
        <Route path="survey" element={<Navigate to="/alumni/profile/edit" replace />} />
        <Route path="jobs" element={<AlumniJobs />} />
        <Route path="events" element={<AlumniEvents />} />
        <Route path="inbox" element={<SampleInbox />} />
      </Route>
      <Route path="/college" element={<RequireRole role="dept" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CollegeDashboard section="dashboard" />} />
        <Route path="records" element={<AlumniRecords role="dept" />} />
        <Route path="outreach" element={<CollegeDashboard section="outreach" />} />
        <Route path="reports" element={<Reports role="dept" />} />
      </Route>
      <Route path="/admin" element={<RequireRole role="admin" />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="records" element={<AlumniRecords role="admin" />} />
        <Route path="reports" element={<Reports role="admin" />} />
        <Route path="jobs" element={<AdminJobs />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="tracer" element={<AlumniTracer />} />
        <Route path="ai-data" element={<AiDataManagement />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
