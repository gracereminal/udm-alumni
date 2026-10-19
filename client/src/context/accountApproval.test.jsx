import { act, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { ProfileProvider, useProfile } from './ProfileContext';
import RegistrationSuccess from '../pages/auth/RegistrationSuccess';
import { USERS, mockApi, session } from '../test/mockApi';

const PENDING = 'Your account is pending approval. You can sign in once the UDM Alumni Office Admin approves your registration.';
const setup = () => renderHook(() => ({ auth: useAuth(), profile: useProfile() }), {
  wrapper: ({ children }) => <AuthProvider><ProfileProvider>{children}</ProfileProvider></AuthProvider>,
});

describe('self-registered alumni accounts', () => {
  it('are created PENDING and do not sign in', async () => {
    const api = mockApi([session(null), ['POST', '/auth/register', { status: 201, body: { ok: true, status: 'pending', membershipId: 'AM-2025-N0001', message: 'Registration received.' } }]]);
    const { result } = setup();
    let res;
    await act(async () => { res = await result.current.auth.registerAlumni({ email: 'juan.reyes@gmail.com', reg_pw: 'Secret123', reg_pw2: 'Secret123' }); });
    expect(res).toMatchObject({ status: 'pending', membershipId: 'AM-2025-N0001' });
    expect(result.current.auth.user).toBeNull();
    expect(api.find('GET', '/me')).toHaveLength(0);
  });

  it('cannot sign in until approved; the pending message comes only after the password matches', async () => {
    mockApi([
      session(null),
      ['POST', '/auth/login', (req) => (req.body.password === 'Secret123'
        ? { status: 403, body: { error: PENDING, code: 'account_pending', fields: { identifier: PENDING } } }
        : { status: 401, body: { error: 'Incorrect email / Alumni ID or password.', code: 'invalid_credentials' } })],
    ]);
    const { result } = setup();
    let res;
    await act(async () => { res = await result.current.auth.signIn('juan.reyes@gmail.com', 'wrong'); });
    expect(res).toEqual({ ok: false, field: 'password', error: 'Incorrect email / Alumni ID or password.' });
    await act(async () => { res = await result.current.auth.signIn('juan.reyes@gmail.com', 'Secret123'); });
    expect(res).toEqual({ ok: false, field: 'identifier', pending: true, error: PENDING });
    expect(result.current.auth.user).toBeNull();
  });

  it('signs in once an Admin approved the account', async () => {
    mockApi([session(null), ['POST', '/auth/login', { user: USERS.alumni }]]);
    const { result } = setup();
    let res;
    await act(async () => { res = await result.current.auth.signIn('ana@example.com', 'Secret123'); });
    expect(res.ok).toBe(true);
    expect(result.current.auth.user).toEqual(USERS.alumni);
  });

  it('the success screen shows what was submitted and says the account is pending', async () => {
    mockApi([session(null)]);
    const { result } = setup();
    act(() => result.current.profile.completeRegistration({ first_name: 'Juan', last_name: 'Reyes', email: 'juan.reyes@gmail.com' }, { membershipId: 'AM-2025-N0001' }));
    expect(result.current.profile.lastRegistration).toMatchObject({ a: { first_name: 'Juan' }, membershipId: 'AM-2025-N0001' });
    render(<MemoryRouter><AuthProvider><ProfileProvider><RegistrationSuccess /></ProfileProvider></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText(/juan\.reyes@gmail\.com/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
  });
});
