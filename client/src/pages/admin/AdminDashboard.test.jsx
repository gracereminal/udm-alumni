import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const Y = new Date().getFullYear();
const batch = (key, employmentRate) => ({ key, total: 100, traced: 60, coverage: 60, laborForce: 50, employed: 40, alignedRate: 70, employmentRate });
const unit = (key, label, alignedRate, employmentRate) => ({ key, label, full: `College ${label}`, total: 100, traced: 60, employed: 40, laborForce: 50, alignedRate, employmentRate });
const rec = (id, name, batchYear, traced, employment, relevance, job, industry) => ({
  id, name, collegeId: 1, programId: 10, batch: batchYear, traced, updatedAt: '2026-05-24T09:00:00+08:00', employment, relevance, job, industry,
});

const recent = [{ id: 7, name: 'Rafael Dizon', course: 'BS Computer Science', program: 'BSCS', batch: 2024, createdAt: '2026-05-24T09:00:00+08:00' }];
const records = [
  rec(1, 'Ana Cruz', Y - 1, true, 'employed', 'related', 'Web Developer', 'Information and communication'),
  rec(2, 'Ben Reyes', Y - 1, true, 'employed', 'not_related', 'Cashier', 'Wholesale and retail trade'),
  rec(3, 'Carl Lim', Y - 1, false, null, null, null, null),
  rec(4, 'Dina Sy', Y - 2, true, 'self_employed', 'related', 'Web Developer', 'Information and communication'),
];

function setup() {
  mockApi([
    session('admin'), ['GET', /^\/alumni\?/, listOf(recent)], ['GET', /^\/(jobs|notifications|events|announcements|alumni)(\?|$)/, listOf([])],
    ['GET', '/stats/by-batch', { data: [0, 1, 2, 3, 4].map((i) => batch(Y - 5 + i, 60 + i * 4)) }],
    ['GET', '/stats/by-program', { data: [unit(1, 'CCS', 82.5, 77), unit(2, 'CBA', 61, 55)] }],
    ['GET', '/stats/records', { data: records }],
    ['GET', '/stats/summary', {
      total: 200, traced: 120, coverage: 60, wageEmployed: 70, selfEmployed: 10, furtherStudies: 5, notEmployed: 30, employed: 80, aligned: 50, alignedRate: 62.5, laborForce: 110, employmentRate: 72.7,
    }],
    ['GET', '/jobs/stats', { open: 4, employers: 3 }],
    ['GET', /^\/stats\//, {}],
  ]);
  renderAt('/admin/dashboard');
}

describe('Admin Dashboard', () => {
  it('keeps Total Alumni a plain card, as in the reference', async () => {
    setup();

    expect(await screen.findByRole('button', { name: /Alumni Traced/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Total Alumni/ })).toBeNull();
  });

  it('opens the Employment Overview from the Alumni Employed card', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Alumni Employed/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Employment Overview' });
    const actual = within(dialog).getByRole('region', { name: 'Actual Employment Analytics' });
    expect(within(actual).getByText('72.7%')).toBeInTheDocument();
    expect(within(actual).getByText('of 120 traced alumni')).toBeInTheDocument();
    expect(within(actual).getByText('115')).toBeInTheDocument(); // employed + self-employed + further studies + not employed
    expect(within(actual).getAllByText('College CCS')).toHaveLength(2); // highest college and its rate row
    // Section B projects the next batches from the by-batch rates (60, 64 … 76 → 80, 84, 88).
    const forecast = within(dialog).getByRole('region', { name: 'Employment Forecast' });
    expect(within(forecast).getByText(`Batch ${Y}`)).toBeInTheDocument();
    expect(within(forecast).getAllByText('80.0%').length).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Employment Overview' })).toBeNull();
  });

  it('opens the Employment Status Breakdown of a college from the Employment Overview', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Alumni Employed/ }));
    const overview = await screen.findByRole('dialog', { name: 'Employment Overview' });
    const rows = within(overview).getAllByRole('button', { name: /College CCS/ });
    await user.click(rows[rows.length - 1]); // the "Employment rate by college" row
    expect(screen.queryByRole('dialog', { name: 'Employment Overview' })).toBeNull();

    const dialog = await screen.findByRole('dialog', { name: 'Employment Status Breakdown' });
    expect(within(dialog).getByRole('button', { name: 'College' })).not.toHaveTextContent('All colleges');
    expect(await within(dialog).findByText('Total traced alumni')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Employed/ }));
    expect(within(dialog).getByText('Ana Cruz')).toBeInTheDocument();
    expect(within(dialog).getByText('Ben Reyes')).toBeInTheDocument();
    expect(within(dialog).queryByText('Dina Sy')).toBeNull(); // self-employed

    await user.click(within(dialog).getByRole('button', { name: 'Back to Dashboard' }));
    expect(screen.queryByRole('dialog', { name: 'Employment Status Breakdown' })).toBeNull();
  });

  it('opens Graduates Traced by Batch and lists a batch by survey status', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Alumni Traced/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Graduates Traced by Batch' });
    expect(await within(dialog).findByText('Total alumni records')).toBeInTheDocument();
    expect(within(dialog).getByText('75.0%')).toBeInTheDocument(); // 3 of 4 records traced

    await user.click(within(dialog).getByText(`Batch ${Y - 1}`));
    expect(within(dialog).getByText('Ana Cruz')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('tab', { name: /Survey not completed/ }));
    expect(within(dialog).getByText('Carl Lim')).toBeInTheDocument();
    expect(within(dialog).queryByText('Ana Cruz')).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: 'Back to Dashboard' }));
    expect(screen.queryByRole('dialog', { name: 'Graduates Traced by Batch' })).toBeNull();
  });

  it('searches the colleges in Graduates Traced by Batch', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Alumni Traced/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Graduates Traced by Batch' });
    await user.click(within(dialog).getByRole('button', { name: 'College' }));
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search college' }), 'zzz');
    expect(within(dialog).getByText('No colleges match the search')).toBeInTheDocument();

    await user.clear(within(dialog).getByRole('searchbox', { name: 'Search college' }));
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search college' }), 'CCS');
    const options = within(within(dialog).getByRole('listbox', { name: 'College' })).getAllByRole('option');
    expect(options).toHaveLength(1);
    const name = options[0].textContent;
    await user.keyboard('{Enter}');
    expect(within(dialog).queryByRole('listbox')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'College' })).toHaveTextContent(name);
    expect(screen.getByRole('dialog', { name: 'Graduates Traced by Batch' })).toBeInTheDocument();
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

  it('opens Degree-to-Career Alignment from the Degree-aligned Jobs card', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Degree-aligned Jobs/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Degree-to-Career Alignment' });
    expect(await within(dialog).findByText('2 of 3 employed respondents')).toBeInTheDocument();
    expect(within(dialog).getAllByText('66.7%').length).toBeGreaterThan(0);

    const table = within(dialog).getByRole('region', { name: 'Detailed Breakdown' });
    await user.selectOptions(within(table).getByRole('combobox', { name: 'Alignment classification' }), 'No');
    expect(within(table).getByText('Ben Reyes')).toBeInTheDocument();
    expect(within(table).queryByText('Ana Cruz')).toBeNull();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Degree-to-Career Alignment' })).toBeNull();
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
