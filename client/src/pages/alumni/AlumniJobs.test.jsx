import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const job = (id, extra = {}) => ({
  id, title: `Job ${id}`, company: 'Acme', location: 'Manila', type: 'Full-time', source: 'admin', status: 'active', tags: [],
  createdAt: '2026-10-01T00:00:00Z', publishedAt: '2026-10-01T00:00:00Z', saved: false, applied: null, ...extra,
});
const ME = { a: { first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com' }, survey: { submitted: true }, record: { photoUrl: null, updatedAt: '2026-10-01T00:00:00Z' } };

function setup(board, routes = []) {
  return mockApi([
    session('alumni'), ['GET', '/me', ME], ['GET', /^\/(events|announcements|notifications)(\?|$)/, listOf([])],
    ['GET', '/jobs', (req) => listOf(req.query.view === 'mine' ? [] : board)],
    ...routes,
  ]);
}

describe('Alumni Job Board page', () => {
  it('lists the active postings and filters them by search', async () => {
    const user = userEvent.setup();
    setup([job(1, { title: 'Backend Developer' }), job(2, { title: 'QA Intern', type: 'Internship' }), job(3, { status: 'inactive' })]);
    renderAt('/alumni/jobs');
    expect(await screen.findByText('Showing 2 of 2 verified alumni job postings')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Job 3')).toBeNull();

    await user.type(screen.getByPlaceholderText(/Search job titles/), 'backend');
    expect(await screen.findByText('Showing 1 of 2 verified alumni job postings')).toBeInTheDocument();
    expect(screen.queryByText('QA Intern')).toBeNull();
  });

  it('saves a job', async () => {
    const user = userEvent.setup();
    const api = setup([job(1)], [['POST', /^\/jobs\/1\/save$/, job(1, { saved: true })]]);
    renderAt('/alumni/jobs');
    await user.click(await screen.findByRole('button', { name: 'Save Job 1 to saved jobs' }));
    expect(await screen.findByRole('button', { name: 'Remove Job 1 from saved jobs' })).toBeInTheDocument();
    expect(api.find('POST', '/jobs/1/save')).toHaveLength(1);
  });

  it('applies by email and records the channel', async () => {
    const user = userEvent.setup();
    const api = setup([job(1, { applyVia: 'hr@acme.com' })], [
      ['POST', /^\/jobs\/1\/apply$/, (req) => job(1, { applyVia: 'hr@acme.com', applied: { via: req.body.via, at: '2026-10-15T00:00:00Z' } })],
    ]);
    renderAt('/alumni/jobs');
    await user.click(await screen.findByRole('button', { name: 'Apply' }));
    const dialog = await screen.findByRole('dialog', { name: 'Apply for Job 1' });
    expect(within(dialog).getByText('hr@acme.com')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Mark as applied' }));
    await waitFor(() => expect(api.last('POST', '/jobs/1/apply')).toBeTruthy());
    expect(api.last('POST', '/jobs/1/apply').body).toEqual({ via: 'email' });
    expect(await screen.findByText('Application for Job 1 marked as sent via Email.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '✓ Applied' })).toBeInTheDocument();
  });

  it('sends a job posting for review, after checking the required fields', async () => {
    const user = userEvent.setup();
    const api = setup([job(1)], [['POST', '/jobs', (req) => job(99, { ...req.body, source: 'alumni', status: 'pending', approvalStatus: 'pending' })]]);
    renderAt('/alumni/jobs');
    await user.click(await screen.findByRole('button', { name: /Post a Job/ }));
    const submit = await screen.findByRole('button', { name: /Submit for review/ });
    await user.click(submit);
    expect(await screen.findByText('Enter a job title.')).toBeInTheDocument();
    expect(api.find('POST', '/jobs')).toHaveLength(0);

    await user.type(screen.getByPlaceholderText('e.g. Junior Backend Developer'), 'QA Intern');
    await user.type(screen.getByPlaceholderText('e.g. Brightline Tech'), 'Beta');
    await user.type(screen.getByPlaceholderText('e.g. Full-time'), 'internship');
    await user.click(submit);
    await waitFor(() => expect(api.find('POST', '/jobs')).toHaveLength(1));
    expect(api.last('POST', '/jobs').body).toMatchObject({ title: 'QA Intern', company: 'Beta', type: 'Internship' });
    expect(await screen.findByText('Thanks! Your job posting was sent to Alumni Affairs for review.')).toBeInTheDocument();
  });
});
