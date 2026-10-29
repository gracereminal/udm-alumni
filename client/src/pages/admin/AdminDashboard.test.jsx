import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const Y = new Date().getFullYear();
const batch = (key, employmentRate) => ({ key, total: 100, traced: 60, coverage: 60, laborForce: 50, employed: 40, alignedRate: 70, employmentRate });
const unit = (key, label, alignedRate) => ({ key, label, full: `College ${label}`, total: 100, traced: 60, alignedRate });

const recent = [{ id: 7, name: 'Rafael Dizon', course: 'BS Computer Science', program: 'BSCS', batch: 2024, createdAt: '2026-05-24T09:00:00+08:00' }];

function setup() {
  mockApi([
    session('admin'), ['GET', /^\/alumni\?/, listOf(recent)], ['GET', /^\/(jobs|notifications|events|announcements|alumni)(\?|$)/, listOf([])],
    ['GET', '/stats/by-batch', { data: [0, 1, 2, 3, 4].map((i) => batch(Y - 5 + i, 60 + i * 4)) }],
    ['GET', '/stats/by-program', { data: [unit(1, 'CCS', 82.5), unit(2, 'CBA', 61)] }],
    ['GET', /^\/stats\//, {}],
  ]);
  renderAt('/admin/dashboard');
}

describe('Admin Dashboard', () => {
  it('opens and closes the forecast from the employability card', async () => {
    const user = userEvent.setup();
    setup();

    const cardBtn = await screen.findByRole('button', { name: /Alumni Employed/ });
    expect(screen.queryByRole('region', { name: 'Forecast' })).toBeNull();
    await user.click(cardBtn);

    const panel = await screen.findByRole('region', { name: 'Forecast' });
    expect(within(panel).getByText('Employability forecast')).toBeInTheDocument();
    expect(within(panel).getByText('80.0%')).toBeInTheDocument();
    expect(within(panel).getByText('Employment rate on track to reach the 80% target')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Close forecast' }));
    expect(screen.queryByRole('region', { name: 'Forecast' })).toBeNull();
  });

  it('lists recent registrations and switches the outcomes chart', async () => {
    const user = userEvent.setup();
    setup();

    expect(await screen.findByText('Rafael Dizon')).toBeInTheDocument();
    expect(screen.getByText('BS Computer Science · 2024')).toBeInTheDocument();

    expect(screen.getByRole('img', { name: 'Employability Rate by Batch' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Total Alumni' }));
    expect(screen.getByRole('img', { name: 'Total Registered Alumni' })).toBeInTheDocument();
  });

  it('shows a KPI breakdown by college in the stat detail dialog', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Degree-aligned Jobs/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Degree-aligned jobs' });
    expect(within(dialog).getByText('By college')).toBeInTheDocument();
    expect(within(dialog).getAllByText('82.5%')).toHaveLength(2); // "Highest" chip and its bar
    expect(within(dialog).getByText('21.5')).toBeInTheDocument(); // spread, highest – lowest

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Degree-aligned jobs' })).toBeNull();
  });
});
