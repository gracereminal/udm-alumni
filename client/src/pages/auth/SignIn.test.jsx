import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import SignIn from './SignIn';
import { USERS, mockApi, session } from '../../test/mockApi';

function Where() {
  return <div data-testid="page">{useLocation().pathname}</div>;
}

function renderSignIn() {
  const utils = render(
    <MemoryRouter initialEntries={['/signin']}>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  const submit = () => userEvent.click(utils.container.querySelector('button[type="submit"]'));
  return { ...utils, submit };
}

describe('Sign In', () => {
  it('asks for the identifier and password before calling the API', async () => {
    const api = mockApi([session(null)]);
    const { submit } = renderSignIn();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your email or Alumni ID.');
    expect(screen.getByLabelText('Email or Alumni ID')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(screen.getByLabelText('Email or Alumni ID'), 'ana@example.com');
    expect(screen.queryByRole('alert')).toBeNull();
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your password.');
    expect(api.find('POST', '/auth/login')).toHaveLength(0);
  });

  it('shows the server message on wrong credentials and stays on Sign In', async () => {
    mockApi([session(null), ['POST', '/auth/login', { status: 401, body: { error: 'Incorrect email/Alumni ID or password.' } }]]);
    const { submit } = renderSignIn();
    await userEvent.type(screen.getByLabelText('Email or Alumni ID'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email/Alumni ID or password.');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it.each([
    ['alumni', '/alumni/dashboard'],
    ['dept', '/college/dashboard'],
    ['admin', '/admin/dashboard'],
  ])('signs a %s user in and opens %s', async (role, home) => {
    const api = mockApi([session(null), ['POST', '/auth/login', { user: USERS[role] }]]);
    const { submit } = renderSignIn();
    await userEvent.type(screen.getByLabelText('Email or Alumni ID'), '  someone@udm.edu.ph ');
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123');
    await submit();
    expect(await screen.findByTestId('page')).toHaveTextContent(home);
    expect(api.last('POST', '/auth/login').body).toEqual({ identifier: 'someone@udm.edu.ph', password: 'Secret123' });
  });
});
