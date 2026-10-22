import { Suspense } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { ProfileProvider } from '../../context/ProfileContext';
import { JobsProvider } from '../../context/JobsContext';
import { EventsProvider } from '../../context/EventsContext';
import { SearchProvider } from '../../context/SearchContext';
import { ToastProvider } from '../../context/ToastContext';
import { ResetFlowProvider } from '../../context/ResetFlowContext';
import { listOf, loadTestCatalog, mockApi, session } from '../../test/mockApi';
import AppRoutes from '../../routes/AppRoutes';

function renderAt(path) {
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

// A complete, valid profile (the validation.test.js fixture), so Edit Profile can save.
const A = {
  last_name: 'Cruz', first_name: 'Ana', dob: '1999-05-01', present_address: '1520 Dalupan St., Sampaloc, Manila', permanent_address: '1520 Dalupan St., Sampaloc, Manila',
  gender: 'Female', marital_status: 'Single', indigenous: 'No', pwd: 'No', mobile: '0917 123 4567', email: 'ana@example.com', facebook: 'ana.cruz', linkedin: 'linkedin.com/in/ana-cruz',
  college: 'College of Computer Studies', course: 'BS Information Technology', year_graduated: '2022',
  first_grad: 'No', udmcat: 'Yes', honors: 'None', prof_exams: 'None', ever_employed: 'No', unemployed_reason: ['Advance or further study'], fb_contribute: 'Mentoring', fb_activity: 'Batch reunions',
};
const ME = {
  a: A,
  survey: { submitted: true },
  record: { status: 'verified', membershipId: 'AM-2026-AB123', photoUrl: null, updatedAt: '2026-10-01T00:00:00Z', registeredAt: '2026-09-01T00:00:00Z', consentAt: '2026-09-01T00:00:00Z' },
  privacy: { directoryOptIn: false, showEmail: false, showMobile: false, links: { facebook: { url: 'ana.cruz', isVisible: false }, linkedin: { url: 'linkedin.com/in/ana-cruz', isVisible: true } } },
  skills: [{ name: 'Web development', isTop: true }],
  dashboard: { upcomingEvents: 1, savedJobs: 2, applications: 1 },
};
const lists = ['GET', /^\/(jobs|events|announcements|notifications)(\?|$)/, listOf([])];

afterEach(() => vi.unstubAllGlobals());

describe('Alumni Profile', () => {
  it('shows the verified badge, the detail cards and the social links', async () => {
    mockApi([session('alumni'), ['GET', '/me', ME], lists]);
    renderAt('/alumni/profile');
    expect(await screen.findByText('✓ VERIFIED GRADUATE')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Cruz' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact & Social Media Details' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /LinkedIn: linkedin.com\/in\/ana-cruz/ })).toHaveAttribute('href', 'https://linkedin.com/in/ana-cruz');
    expect(screen.getByRole('link', { name: /Facebook: ana.cruz/ })).toHaveAttribute('href', 'https://facebook.com/ana.cruz');
    expect(screen.getByRole('link', { name: /Who can see this/ })).toHaveAttribute('href', '/alumni/privacy');
  });
});

describe('Privacy & My Data', () => {
  it('saves a visibility switch at once', async () => {
    const user = userEvent.setup();
    const api = mockApi([session('alumni'), ['GET', '/me', ME], lists, ['PATCH', '/me', (req) => ({ ...ME, privacy: { ...ME.privacy, directoryOptIn: req.body.privacy.directoryOptIn } })]]);
    renderAt('/alumni/privacy');
    expect(await screen.findByText(/Consent given September 1, 2026/)).toBeInTheDocument();
    const listed = screen.getByRole('switch', { name: /Show me in the alumni directory/ });
    expect(listed).toHaveAttribute('aria-checked', 'false');
    // LinkedIn keeps the visibility saved on the server.
    expect(screen.getByRole('switch', { name: /Show LinkedIn/ })).toHaveAttribute('aria-checked', 'true');

    await user.click(listed);
    await waitFor(() => expect(api.last('PATCH', '/me')).toBeTruthy());
    expect(api.last('PATCH', '/me').body).toEqual({ privacy: { directoryOptIn: true, showEmail: false, showMobile: false, links: { facebook: false, linkedin: true } } });
    await waitFor(() => expect(screen.getByRole('switch', { name: /Show me in the alumni directory/ })).toHaveAttribute('aria-checked', 'true'));
  });

  it('downloads a copy of the data from /me/export', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const api = mockApi([session('alumni'), ['GET', '/me', ME], lists, ['GET', '/me/export', { exportedAt: '2026-10-20T00:00:00Z', profile: A }]]);
    renderAt('/alumni/privacy');
    const hero = await screen.findByRole('region', { name: /You own your data/ });
    await user.click(within(hero).getByRole('button', { name: /Download my data/i }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(api.find('GET', '/me/export')).toHaveLength(1);
  });
});

describe('Edit Profile', () => {
  it('saves contact privacy and skills with the profile', async () => {
    const user = userEvent.setup();
    const api = mockApi([session('alumni'), ['GET', '/me', ME], lists, ['PATCH', '/me', ME], ['PUT', '/me/survey', ME]]);
    renderAt('/alumni/profile/edit');
    const email = await screen.findByRole('switch', { name: /Show Email address/ });
    await waitFor(() => expect(screen.getByLabelText('Skills & interests')).toHaveValue('Web development'));
    await user.click(email);
    const skills = screen.getByLabelText('Skills & interests');
    await user.type(skills, ', Teaching');
    await user.click(screen.getAllByRole('button', { name: 'Save Changes' })[0]);

    await waitFor(() => expect(api.last('PATCH', '/me')).toBeTruthy());
    const body = api.last('PATCH', '/me').body;
    expect(body.privacy).toEqual({ directoryOptIn: false, showEmail: true, showMobile: false, links: { facebook: false, linkedin: true } });
    expect(body.skills).toEqual(['Web development', 'Teaching']);
    expect(body.last_name).toBe('Cruz');
  });
});
