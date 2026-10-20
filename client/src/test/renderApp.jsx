import { Suspense } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { JobsProvider } from '../context/JobsContext';
import { EventsProvider } from '../context/EventsContext';
import { SearchProvider } from '../context/SearchContext';
import { ToastProvider } from '../context/ToastContext';
import { ResetFlowProvider } from '../context/ResetFlowContext';
import { loadTestCatalog } from './mockApi';
import AppRoutes from '../routes/AppRoutes';

/** Renders the whole app (every provider + AppRoutes) at `path`, as main.jsx does, for page-level tests. */
export function renderAt(path) {
  loadTestCatalog();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <ProfileProvider>
            <JobsProvider>
              <EventsProvider>
                <SearchProvider>
                  <ResetFlowProvider>
                    <Suspense fallback={null}>
                      <AppRoutes />
                    </Suspense>
                  </ResetFlowProvider>
                </SearchProvider>
              </EventsProvider>
            </JobsProvider>
          </ProfileProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
