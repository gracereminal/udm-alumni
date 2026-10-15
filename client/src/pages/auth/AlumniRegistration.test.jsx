import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ProfileProvider } from '../../context/ProfileContext';
import { ToastProvider } from '../../context/ToastContext';
import AlumniRegistration from './AlumniRegistration';
import { PRIVACY_KEY } from './PrivacyConsent';
import { USERS, loadTestCatalog, mockApi, session } from '../../test/mockApi';

const DRAFT_KEY = 'udm.tracer.draft.v1';
const VALID = {
  last_name: 'Cruz', first_name: 'Ana', dob: '1999-05-01', present_address: '1 Main St', permanent_address: '1 Main St',
  gender: 'Female', marital_status: 'Single', indigenous: 'No', pwd: 'No',
  mobile: '09171234567', email: 'ana@example.com',
  college: 'College of Computer Studies', course: 'BS Information Technology', year_graduated: '2022',
};

function Where() {
  return <div data-testid="page">{useLocation().pathname}</div>;
}

function renderRegistration(draft) {
  loadTestCatalog();
  sessionStorage.setItem(PRIVACY_KEY, JSON.stringify({ at: Date.now(), comms: true }));
  if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify({ a: draft }));
  return render(
    <MemoryRouter initialEntries={['/register/details']}>
      <ToastProvider>
        <AuthProvider>
          <ProfileProvider>
            <Routes>
              <Route path="/register/details" element={<AlumniRegistration />} />
              <Route path="*" element={<Where />} />
            </Routes>
          </ProfileProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

const next = () => userEvent.click(screen.getByRole('button', { name: /Continue|Submit Registration/ }));

describe('Alumni registration', () => {
  it('shows field errors and stays on the step when required answers are missing', async () => {
    mockApi([session(null)]);
    renderRegistration();
    expect(screen.getByText('STEP 1 OF 4')).toBeInTheDocument();
    await next();
    expect(screen.getByText('Enter your last name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('STEP 1 OF 4')).toBeInTheDocument();
  });

  it('clears a field error as soon as the field is edited', async () => {
    mockApi([session(null)]);
    renderRegistration();
    await next();
    await userEvent.type(screen.getByLabelText('Last Name'), 'Cruz');
    expect(screen.queryByText('Enter your last name.')).toBeNull();
    expect(screen.getByText('Enter your first name.')).toBeInTheDocument();
  });

  it('validates the contact step before moving on', async () => {
    mockApi([session(null)]);
    renderRegistration({ ...VALID, mobile: '12345', email: 'not-an-email' });
    await next();
    expect(screen.getByText('STEP 2 OF 4')).toBeInTheDocument();
    await next();
    expect(screen.getByText('Enter a valid mobile number (e.g. 09XX XXX XXXX).')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('STEP 2 OF 4')).toBeInTheDocument();
  });

  it('jumping ahead from the step list stops at the first step with errors', async () => {
    mockApi([session(null)]);
    renderRegistration({ ...VALID, email: '' });
    await userEvent.click(screen.getByText('Account Password'));
    expect(screen.getByText('STEP 2 OF 4')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
  });

  it('checks the password rules, then registers and opens the success screen', async () => {
    const api = mockApi([session(null), ['POST', '/auth/register', { user: USERS.alumni }], ['GET', '/me', { a: VALID }]]);
    renderRegistration(VALID);
    await next(); await next(); await next();
    expect(screen.getByText('STEP 4 OF 4')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Password'), 'weakpass');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'different');
    await next();
    expect(screen.getByText('Use at least 8 characters, including 1 number and 1 uppercase letter.')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(api.find('POST', '/auth/register')).toHaveLength(0);

    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123');
    await userEvent.clear(screen.getByLabelText('Confirm Password'));
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'Secret123');
    await next();

    expect(await screen.findByTestId('page')).toHaveTextContent('/register/success');
    const sent = api.last('POST', '/auth/register').body;
    expect(sent).toMatchObject({ ...VALID, reg_pw: 'Secret123', reg_pw2: 'Secret123', privacy_consent: true, marketing_opt_in: true });
    // The draft and the consent are cleared once the account exists; the password is never stored.
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(PRIVACY_KEY)).toBeNull();
  });

  it('never writes the password into the saved draft', async () => {
    mockApi([session(null)]);
    renderRegistration(VALID);
    await next(); await next(); await next();
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123');
    expect(localStorage.getItem(DRAFT_KEY)).not.toMatch(/Secret123/);
  });

  it('shows server field errors on the step they belong to', async () => {
    mockApi([session(null), ['POST', '/auth/register', { status: 409, body: { error: 'That email is already registered.', fields: { email: 'That email is already registered.' } } }]]);
    renderRegistration(VALID);
    await next(); await next(); await next();
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'Secret123');
    await next();
    expect(await screen.findByText('STEP 2 OF 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByText('That email is already registered.').length).toBeGreaterThan(0);
  });
});
