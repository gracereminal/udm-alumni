import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { RequireRole, RequireSecurityQuestions } from '../../routes/guards';
import SetupSecurityQuestions from './SetupSecurityQuestions';
import { USERS, mockApi } from '../../test/mockApi';

function Where() {
  return <div data-testid="page">{useLocation().pathname}</div>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<RequireSecurityQuestions />}>
            <Route path="/security-questions" element={<SetupSecurityQuestions />} />
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

const SQ1 = 'What was the name of your first-year adviser?';
const SQ2 = 'In what city were you born?';

describe('Security Questions setup', () => {
  it('sends an account without questions to the setup, then to its dashboard once saved', async () => {
    let needs = true;
    const api = mockApi([
      ['GET', '/auth/session', () => ({ user: { ...USERS.admin, needsSecurityQuestions: needs } })],
      ['POST', '/auth/security-questions', () => { needs = false; return { ok: true }; }],
    ]);
    renderAt('/admin/dashboard');
    const button = await screen.findByRole('button', { name: 'Save & Continue' });

    await userEvent.selectOptions(screen.getByLabelText('Question 1'), SQ1);
    await userEvent.type(screen.getByLabelText('Answer 1'), 'Santos');
    await userEvent.selectOptions(screen.getByLabelText('Question 2'), SQ1);
    await userEvent.type(screen.getByLabelText('Answer 2'), 'Manila');
    await userEvent.click(button);
    expect(screen.getByText('Choose a different question.')).toBeInTheDocument();
    expect(api.find('POST', '/auth/security-questions')).toHaveLength(0);

    await userEvent.selectOptions(screen.getByLabelText('Question 2'), SQ2);
    await userEvent.click(button);
    expect(await screen.findByTestId('page')).toHaveTextContent('/admin/dashboard');
    expect(api.last('POST', '/auth/security-questions').body).toEqual({ sq1: SQ1, sq1_answer: 'Santos', sq2: SQ2, sq2_answer: 'Manila' });
  });

  it('sends an account that already has questions away from the setup', async () => {
    mockApi([['GET', '/auth/session', { user: { ...USERS.admin, needsSecurityQuestions: false } }]]);
    renderAt('/security-questions');
    expect(await screen.findByTestId('page')).toHaveTextContent('/admin/dashboard');
  });
});
