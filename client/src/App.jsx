import { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { JobsProvider } from './context/JobsContext';
import { EventsProvider } from './context/EventsContext';
import { SearchProvider } from './context/SearchContext';
import { ToastProvider } from './context/ToastContext';
import { ResetFlowProvider } from './context/ResetFlowContext';
import { StartupBoundary } from './components/StartupError';
import AppShell from './layouts/AppShell';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <ToastProvider>
          <AuthProvider>
            <ProfileProvider>
              <JobsProvider>
                <EventsProvider>
                  <SearchProvider>
                    <ResetFlowProvider>
                      {/* Most route pages are lazy (routes/AppRoutes.jsx); the AppShell background shows while one loads. */}
                      <StartupBoundary>
                        <Suspense fallback={null}>
                          <AppRoutes />
                        </Suspense>
                      </StartupBoundary>
                    </ResetFlowProvider>
                  </SearchProvider>
                </EventsProvider>
              </JobsProvider>
            </ProfileProvider>
          </AuthProvider>
        </ToastProvider>
      </AppShell>
    </BrowserRouter>
  );
}
