import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const Y = new Date().getFullYear();
const batch = (key, employmentRate) => ({ key, total: 100, traced: 60, coverage: 60, laborForce: 50, employed: 40, alignedRate: 70, employmentRate });
const unit = (key, label, alignedRate) => ({ key, label, full: `College ${label}`, total: 100, traced: 60, employed: 40, alignedRate });

const recent = [{ id: 7, name: 'Rafael Dizon', course: 'BS Computer Science', program: 'BSCS', batch: 2024, createdAt: '2026-05-24T09:00:00+08:00' }];

function setup() {
  mockApi([
    session('admin'), ['GET', /^\/alumni\?/, listOf(recent)], ['GET', /^\/(jobs|notifications|events|announcements|alumni)(\?|$)/, listOf([])],
    ['GET', '/stats/by-batch', { data: [0, 1, 2, 3, 4].map((i) => batch(Y - 5 + i, 60 + i * 4)) }],
    ['GET', '/stats/by-program', { data: [unit(1, 'CCS', 82.5), unit(2, 'CBA', 61)] }],
    ['GET', '/stats/summary', { total: 200, traced: 120, coverage: 60, notEmployed: 30, employed: 80, aligned: 50, alignedRate: 62.5, laborForce: 110, employmentRate: 72.7 }],
    ['GET', '/jobs/stats', { open: 4, employers: 3 }],
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

  it('opens the Employment Analysis of a clicked batch', async () => {
    const user = userEvent.setup();
    setup();

    await screen.findByText('Rafael Dizon');
    expect(screen.getByText(/· click a batch for details$/)).toBeInTheDocument();
    const chart = screen.getByRole('img', { name: 'Employability Rate by Batch' });
    await user.click(within(chart).getByText(`Batch ${Y - 1}`).parentNode);
    const panel = screen.getByText(`Employment Analysis · Batch ${Y - 1}`).closest('[data-screen-label]');
    expect(within(panel).getByText('76.0%')).toBeInTheDocument();
    expect(within(panel).getByText('−4.0 pts below the 80% target')).toBeInTheDocument();
    expect(within(panel).getByText('60 of 100 graduates')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close analysis' }));
    expect(screen.queryByText(`Employment Analysis · Batch ${Y - 1}`)).toBeNull();
  });

  it('resets every filter with the Reset button', async () => {
    const user = userEvent.setup();
    setup();

    const college = await screen.findByRole('combobox', { name: 'College' });
    const status = screen.getByRole('combobox', { name: 'Record status' });
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull();

    await user.selectOptions(college, college.options[1].value);
    await user.selectOptions(status, status.options[1].value);
    expect(college.value).not.toBe('all');

    await user.click(screen.getByRole('button', { name: /Reset/ }));
    expect(college.value).toBe('all');
    expect(status.value).toBe('all');
    expect(screen.queryByRole('button', { name: /Reset/ })).toBeNull();
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

  it('ranks the signals and opens one in the insight drawer', async () => {
    const user = userEvent.setup();
    setup();

    expect(await screen.findByText('5 signals · 2 high')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^30 traced alumni are not yet employed, High priority/ }));
    const drawer = await screen.findByRole('dialog', { name: '30 traced alumni are not yet employed' });
    expect(within(drawer).getByText('30 of 120 traced alumni (25.0%) reported in the tracer survey that they are not yet employed.')).toBeInTheDocument();
    expect(within(drawer).getByText('1 of 5')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Next insight' }));
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close insight' }));
    expect(screen.queryByRole('dialog', { name: /not yet employed/ })).toBeNull();
  });

  it('switches Employability by college to course-to-job alignment', async () => {
    const user = userEvent.setup();
    setup();

    const tab = await screen.findByRole('tab', { name: 'Course-to-Job Alignment' });
    expect(screen.queryByText('82.5%')).toBeNull();
    await user.click(tab);
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('82.5%')).toBeInTheDocument();
    expect(screen.getByText(/^Degree-related employment, /)).toBeInTheDocument();
  });
});
