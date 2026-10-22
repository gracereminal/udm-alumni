import { act, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { ProfileProvider, useProfile } from './ProfileContext';
import RegistrationSuccess from '../pages/auth/RegistrationSuccess';
import { USERS, mockApi, session } from '../test/mockApi';

const setup = () => renderHook(() => ({ auth: useAuth(), profile: useProfile() }), {
  wrapper: ({ children }) => <AuthProvider><ProfileProvider>{children}</ProfileProvider></AuthProvider>,
});

describe('self-registered alumni accounts', () => {
  it('are created active and do not sign in by themselves', async () => {
    const api = mockApi([session(null), ['POST', '/auth/register', { status: 201, body: { ok: true, status: 'active', membershipId: 'AM-2025-00001', message: 'Registration received.' } }]]);
    const { result } = setup();
    let res;
    await act(async () => { res = await result.current.auth.registerAlumni({ email: 'juan.reyes@gmail.com', reg_pw: 'Secret123', reg_pw2: 'Secret123' }); });
    expect(res).toMatchObject({ status: 'active', membershipId: 'AM-2025-00001' });
    expect(result.current.auth.user).toBeNull();
    expect(api.find('GET', '/me')).toHaveLength(0);
  });

  it('sign in right away, with no approval step', async () => {
    mockApi([session(null), ['POST', '/auth/login', { user: USERS.alumni }]]);
    const { result } = setup();
    let res;
    await act(async () => { res = await result.current.auth.signIn('ana@example.com', 'Secret123'); });
    expect(res.ok).toBe(true);
    expect(result.current.auth.user).toEqual(USERS.alumni);
  });

  it('the success screen shows what was submitted and says the account is ready', async () => {
    mockApi([session(null)]);
    const { result } = setup();
    act(() => result.current.profile.completeRegistration({ first_name: 'Juan', last_name: 'Reyes', email: 'juan.reyes@gmail.com' }, { membershipId: 'AM-2025-00001' }));
    expect(result.current.profile.lastRegistration).toMatchObject({ a: { first_name: 'Juan' }, membershipId: 'AM-2025-00001', status: 'active' });
    render(<MemoryRouter><AuthProvider><ProfileProvider><RegistrationSuccess /></ProfileProvider></AuthProvider></MemoryRouter>);
    expect(screen.getAllByText(/juan\.reyes@gmail\.com/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Your account is ready/)).toBeInTheDocument();
    expect(screen.queryByText(/pending/i)).toBeNull();
  });
});
