import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../layouts/AppShell';
import { PublicOnly, RequireConsent, RequireRegistered, RequireRole } from './guards';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../data/demoAccounts';
import SignIn from '../pages/auth/SignIn';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetInbox from '../pages/auth/ResetInbox';
import PrivacyConsent from '../pages/auth/PrivacyConsent';
import AlumniRegistration from '../pages/auth/AlumniRegistration';
import RegistrationSuccess from '../pages/auth/RegistrationSuccess';
import AlumniDashboard from '../pages/alumni/AlumniDashboard';
import AlumniProfile from '../pages/alumni/AlumniProfile';
import AlumniJobs from '../pages/alumni/AlumniJobs';
import AlumniEvents from '../pages/alumni/AlumniEvents';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AlumniRecords from '../pages/admin/AlumniRecords';
import Reports from '../pages/admin/Reports';
import AdminJobs from '../pages/admin/AdminJobs';
import AdminEvents from '../pages/admin/AdminEvents';
import CollegeDashboard from '../pages/college/CollegeDashboard';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? ROLE_HOME[user.role] : '/signin'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route element={<PublicOnly />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-password/inbox" element={<ResetInbox />} />
        </Route>
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
          <Route path="survey" element={<Navigate to="/alumni/profile" replace />} />
          <Route path="jobs" element={<AlumniJobs />} />
          <Route path="events" element={<AlumniEvents />} />
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
        </Route>
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}



