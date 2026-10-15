import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { JobsProvider } from './context/JobsContext';
import { EventsProvider } from './context/EventsContext';
import { SearchProvider } from './context/SearchContext';
import { ToastProvider } from './context/ToastContext';
import { ResetFlowProvider } from './context/ResetFlowContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ProfileProvider>
            <JobsProvider>
              <EventsProvider>
                <SearchProvider>
                  <ResetFlowProvider>
                    <AppRoutes />
                  </ResetFlowProvider>
                </SearchProvider>
              </EventsProvider>
            </JobsProvider>
          </ProfileProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
