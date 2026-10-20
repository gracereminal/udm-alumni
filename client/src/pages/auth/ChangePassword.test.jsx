import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { RequirePasswordChange, RequireRole } from '../../routes/guards';
import ChangePassword from './ChangePassword';
import { USERS, mockApi } from '../../test/mockApi';

function Where() {
  return <div data-testid="page">{useLocation().pathname}</div>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<RequirePasswordChange />}>
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>
          <Route path="/admin" element={<RequireRole role="admin" />}>
            <Route path="dashboard" element={<Where />} />
          </Route>
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Change Password (one-time password)', () => {
  it('sends an account on its one-time password to Change Password, then to its dashboard once changed', async () => {
    let mustChange = true;
    const api = mockApi([
      ['GET', '/auth/session', () => ({ user: { ...USERS.admin, mustChangePassword: mustChange } })],
      ['POST', '/auth/change-password', (req) => {
        if (req.body.current !== 'OneTime123') return { status: 422, body: { error: 'Your current password is incorrect.', fields: { current: 'Your current password is incorrect.' } } };
        mustChange = false;
        return { ok: true };
      }],
    ]);
    const { container } = renderAt('/admin/dashboard');

    expect(await screen.findByText('One-time password')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).toBeNull();

    const [current, pw, pw2] = container.querySelectorAll('input');
    await userEvent.type(current, 'wrong');
    await userEvent.type(pw, 'MyOwnPass123');
    await userEvent.type(pw2, 'MyOwnPass123');
    await userEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(await screen.findByText('Your current password is incorrect.')).toBeInTheDocument();

    await userEvent.clear(current);
    await userEvent.type(current, 'OneTime123');
    await userEvent.click(screen.getByRole('button', { name: 'Update Password' }));
    expect(await screen.findByTestId('page')).toHaveTextContent('/admin/dashboard');
    expect(api.last('POST', '/auth/change-password').body).toEqual({ current: 'OneTime123', password: 'MyOwnPass123' });
  });

  it('is not shown to an account that already has its own password', async () => {
    mockApi([['GET', '/auth/session', { user: { ...USERS.admin, mustChangePassword: false } }]]);
    renderAt('/change-password');
    expect(await screen.findByTestId('page')).toHaveTextContent('/admin/dashboard');
  });
});
