import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { PublicOnly, RequireConsent, RequireRegistered, RequireRole } from './guards';
import { PRIVACY_KEY } from '../pages/auth/PrivacyConsent';
import { mockApi, session } from '../test/mockApi';

function Where({ label }) {
  const { pathname, state } = useLocation();
  return <div data-testid="page">{label} @ {pathname}{state && state.from ? ` from ${state.from}` : ''}</div>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ProfileProvider>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route path="/signin" element={<Where label="Sign in" />} />
            </Route>
            <Route path="/register/consent" element={<Where label="Consent" />} />
            <Route element={<RequireConsent />}><Route path="/register/details" element={<Where label="Details" />} /></Route>
            <Route element={<RequireRegistered />}><Route path="/register/success" element={<Where label="Success" />} /></Route>
            {['alumni', 'dept', 'admin'].map((role) => (
              <Route key={role} path={role === 'dept' ? '/college' : `/${role}`} element={<RequireRole role={role} />}>
                <Route path="dashboard" element={<Where label={`${role} home`} />} />
                <Route path="records" element={<Where label={`${role} records`} />} />
              </Route>
            ))}
          </Routes>
        </ProfileProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('route guards', () => {
  it('renders nothing until the session check finishes', async () => {
    let release;
    mockApi([['GET', '/auth/session', () => new Promise((r) => { release = r; })]]);
    renderAt('/admin/records');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(screen.queryByTestId('page')).toBeNull();
    release({ status: 401, body: { error: 'Not signed in' } });
    expect(await screen.findByTestId('page')).toHaveTextContent('Sign in @ /signin from /admin/records');
  });

  it('sends a signed-out visitor to Sign In, remembering the page they wanted', async () => {
    mockApi([session(null)]);
    renderAt('/college/records');
    expect(await screen.findByTestId('page')).toHaveTextContent('Sign in @ /signin from /college/records');
  });

  it.each([
    ['alumni', '/admin/records', 'alumni home @ /alumni/dashboard'],
    ['alumni', '/college/dashboard', 'alumni home @ /alumni/dashboard'],
    ['dept', '/admin/records', 'dept home @ /college/dashboard'],
    ['dept', '/alumni/dashboard', 'dept home @ /college/dashboard'],
    ['admin', '/college/records', 'admin home @ /admin/dashboard'],
  ])('redirects a %s user away from %s to their own dashboard', async (role, path, expected) => {
    mockApi([session(role), ['GET', '/me', { a: {} }]]);
    renderAt(path);
    expect(await screen.findByTestId('page')).toHaveTextContent(expected);
  });

  it.each([
    ['alumni', '/alumni/records'],
    ['dept', '/college/records'],
    ['admin', '/admin/records'],
  ])('lets a %s user open their own routes (%s)', async (role, path) => {
    mockApi([session(role), ['GET', '/me', { a: {} }]]);
    renderAt(path);
    expect(await screen.findByTestId('page')).toHaveTextContent(`${role} records @ ${path}`);
  });

  it('sends a signed-in user away from Sign In to their dashboard', async () => {
    mockApi([session('admin')]);
    renderAt('/signin');
    expect(await screen.findByTestId('page')).toHaveTextContent('admin home @ /admin/dashboard');
  });

  it('treats a failed session check (server down) as signed out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderAt('/admin/dashboard');
    expect(await screen.findByTestId('page')).toHaveTextContent('Sign in @ /signin');
  });

  it('blocks the registration form until the privacy consent is given', async () => {
    mockApi([session(null)]);
    renderAt('/register/details');
    expect(await screen.findByTestId('page')).toHaveTextContent('Consent @ /register/consent');
  });

  it('opens the registration form after consent', async () => {
    mockApi([session(null)]);
    sessionStorage.setItem(PRIVACY_KEY, JSON.stringify({ at: Date.now(), comms: false }));
    renderAt('/register/details');
    expect(await screen.findByTestId('page')).toHaveTextContent('Details @ /register/details');
  });

  it('only shows the success screen right after registering', async () => {
    mockApi([session(null)]);
    renderAt('/register/success');
    expect(await screen.findByTestId('page')).toHaveTextContent('Consent @ /register/consent');
  });
});
