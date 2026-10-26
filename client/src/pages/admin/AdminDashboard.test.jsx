import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const Y = new Date().getFullYear();
const batch = (key, employmentRate) => ({ key, total: 100, traced: 60, coverage: 60, laborForce: 50, employed: 40, alignedRate: 70, employmentRate });

describe('Admin Dashboard forecast', () => {
  it('opens and closes the forecast panel from the header button', async () => {
    const user = userEvent.setup();
    mockApi([
      session('admin'), ['GET', /^\/(jobs|notifications|events|announcements|alumni)(\?|$)/, listOf([])],
      ['GET', '/stats/by-batch', { data: [0, 1, 2, 3, 4].map((i) => batch(Y - 5 + i, 60 + i * 4)) }],
      ['GET', /^\/stats\//, {}],
    ]);
    renderAt('/admin/dashboard');

    const button = await screen.findByRole('button', { name: /Forecast/ });
    expect(screen.queryByRole('region', { name: 'Forecast' })).toBeNull();
    await user.click(button);

    const panel = await screen.findByRole('region', { name: 'Forecast' });
    expect(within(panel).getByText('Forecast · next 3 batches')).toBeInTheDocument();
    expect(within(panel).getByText('80.0%')).toBeInTheDocument();
    expect(within(panel).getByText('Employment rate on track to reach the 80% target')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Close forecast' }));
    expect(screen.queryByRole('region', { name: 'Forecast' })).toBeNull();
  });
});
