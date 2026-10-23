import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import SignIn from './SignIn';
import VerifySignIn from './VerifySignIn';
import { USERS, mockApi, session } from '../../test/mockApi';

function Where() {
  return <div data-testid="page">{useLocation().pathname}</div>;
}

const CHALLENGE = { mfaRequired: true, challenge: 'chal-1', sentTo: 'an***@example.com', expiresMinutes: 10 };

function renderFlow() {
  render(
    <MemoryRouter initialEntries={['/signin']}>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signin/verify" element={<VerifySignIn />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function signInToVerify() {
  await userEvent.type(screen.getByLabelText('Email or Alumni ID'), 'ana@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'demoPass123');
  await userEvent.click(document.querySelector('button[type="submit"]'));
  await screen.findByText('an***@example.com');
}

describe('Two-step verification', () => {
  it('asks for the emailed code after the password, then signs in', async () => {
    const api = mockApi([
      session(null),
      ['POST', '/auth/login', CHALLENGE],
      ['POST', '/auth/mfa/verify', { user: USERS.alumni }],
    ]);
    renderFlow();
    await signInToVerify();

    const button = screen.getByRole('button', { name: 'Verify & Sign In' });
    await userEvent.type(screen.getByLabelText('6-digit code'), '12a3456');
    expect(screen.getByLabelText('6-digit code')).toHaveValue('123456');
    await userEvent.click(screen.getByLabelText('Trust this device for 30 days'));
    await userEvent.click(button);

    expect(await screen.findByTestId('page')).toHaveTextContent('/alumni/dashboard');
    expect(api.last('POST', '/auth/mfa/verify').body).toEqual({ challenge: 'chal-1', code: '123456', trust: true });
  });

  it('shows the server message for a wrong code and stays on Verify', async () => {
    mockApi([
      session(null),
      ['POST', '/auth/login', CHALLENGE],
      ['POST', '/auth/mfa/verify', { status: 422, body: { error: 'x', code: 'invalid_code', fields: { code: 'That code is incorrect or expired. Try again.' } } }],
    ]);
    renderFlow();
    await signInToVerify();
    await userEvent.type(screen.getByLabelText('6-digit code'), '000000');
    await userEvent.click(screen.getByRole('button', { name: 'Verify & Sign In' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is incorrect or expired. Try again.');
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('resends a code', async () => {
    const api = mockApi([session(null), ['POST', '/auth/login', CHALLENGE], ['POST', '/auth/mfa/resend', { ok: true, sentTo: 'an***@example.com', expiresMinutes: 10 }]]);
    renderFlow();
    await signInToVerify();
    await userEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We sent a new code to an***@example.com.');
    expect(api.last('POST', '/auth/mfa/resend').body).toEqual({ challenge: 'chal-1' });
  });

  it('sends a direct visit without a challenge back to Sign In', async () => {
    mockApi([session(null)]);
    render(
      <MemoryRouter initialEntries={['/signin/verify']}>
        <AuthProvider>
          <Routes>
            <Route path="/signin/verify" element={<VerifySignIn />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('page')).toHaveTextContent('/signin');
  });
});
