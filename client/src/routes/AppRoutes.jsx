import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireConsent, RequirePasswordChange, RequireRegistered, RequireRole, homeFor } from './guards';
import { useAuth } from '../context/AuthContext';
import SignIn from '../pages/auth/SignIn';
import ForgotPassword, { ResetPasswordLink } from '../pages/auth/ForgotPassword';
import PrivacyConsent from '../pages/auth/PrivacyConsent';
import ChangePassword from '../pages/auth/ChangePassword';

// Registration and signed-in pages load on demand (the Suspense in App.jsx) so sign-in ships a small first bundle.
const SampleInbox = lazy(() => import('../pages/auth/SampleInbox'));
const AlumniRegistration = lazy(() => import('../pages/auth/AlumniRegistration'));
const RegistrationSuccess = lazy(() => import('../pages/auth/RegistrationSuccess'));
const AlumniDashboard = lazy(() => import('../pages/alumni/AlumniDashboard'));
const AlumniProfile = lazy(() => import('../pages/alumni/AlumniProfile'));
const AlumniProfileEdit = lazy(() => import('../pages/alumni/AlumniProfileEdit'));
const AlumniPrivacy = lazy(() => import('../pages/alumni/AlumniPrivacy'));
const AlumniJobs = lazy(() => import('../pages/alumni/AlumniJobs'));
const AlumniEvents = lazy(() => import('../pages/alumni/AlumniEvents'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AlumniRecords = lazy(() => import('../pages/admin/AlumniRecords'));
const Reports = lazy(() => import('../pages/admin/Reports'));
const AdminJobs = lazy(() => import('../pages/admin/AdminJobs'));
const AdminEvents = lazy(() => import('../pages/admin/AdminEvents'));
const AlumniTracer = lazy(() => import('../pages/admin/AlumniTracer'));
const AiDataManagement = lazy(() => import('../pages/admin/AiDataManagement'));
const CollegeDashboard = lazy(() => import('../pages/college/CollegeDashboard'));

function Home() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return <Navigate to={user ? homeFor(user) : '/signin'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<PublicOnly />}>
        <Route path="/signin" element={<SignIn />} />
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
