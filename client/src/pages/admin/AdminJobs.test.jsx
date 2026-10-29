import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const job = (id, extra = {}) => ({
  id, title: `Job ${id}`, company: 'Acme', location: 'Manila', type: 'Full-time', source: 'admin', status: 'active', tags: [],
  createdAt: '2026-10-01T00:00:00Z', publishedAt: '2026-10-01T00:00:00Z', ...extra,
});

function setup(state, routes = []) {
  return mockApi([
    session('admin'), ['GET', /^\/(events|announcements|notifications)(\?|$)/, listOf([])],
    ['GET', '/jobs', (req) => listOf(req.query.view === 'queue' ? state.queue : state.all)],
    ...routes,
  ]);
}

describe('Admin Jobs page', () => {
  it('publishes a new job posting', async () => {
    const user = userEvent.setup();
    const state = { all: [job(1)], queue: [] };
    const api = setup(state, [['POST', '/jobs', (req) => { const j = job(2, req.body); state.all.push(j); return j; }]]);
    renderAt('/admin/jobs');
    await screen.findByText('Job 1');
    await user.click(screen.getByRole('button', { name: /Add Job/ }));
    await screen.findByRole('dialog', { name: 'Post a job opening' });
    await user.click(screen.getByRole('button', { name: 'Publish job' }));
    expect(await screen.findByText('Enter a job title.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('e.g. Junior Backend Developer'), 'Data Analyst');
    await user.type(screen.getByPlaceholderText('e.g. Brightline Tech'), 'Beta Corp');
    await user.type(screen.getByPlaceholderText(/careers@company.com/), 'not a link');
    await user.click(screen.getByRole('button', { name: 'Publish job' }));
    expect(await screen.findByText('Enter an email address or a website for applications.')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/careers@company.com/));
    await user.type(screen.getByPlaceholderText(/careers@company.com/), 'jobs@beta.com');
    await user.click(screen.getByRole('button', { name: 'Publish job' }));
    await waitFor(() => expect(api.find('POST', '/jobs')).toHaveLength(1));
    expect(api.last('POST', '/jobs').body).toMatchObject({ title: 'Data Analyst', company: 'Beta Corp', applyVia: 'jobs@beta.com' });
    expect(await screen.findByText('“Data Analyst” is live on the Job Board.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Post a job opening' })).toBeNull();
  });

  it('edits a listing from the Review menu, keeping its setup and salary', async () => {
    const user = userEvent.setup();
    const api = setup({ all: [job(1, { location: 'Pasig · Hybrid', salary: '₱35,000 - ₱48,000', deadline: '2026-12-01' })], queue: [] }, [
      ['PATCH', /^\/jobs\/1$/, (req) => job(1, req.body)],
    ]);
    renderAt('/admin/jobs');
    await user.click(await screen.findByRole('button', { name: 'Review Job 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit listing' }));
    const form = within(await screen.findByRole('dialog', { name: 'Edit job posting' }));
    expect(form.getByLabelText('Location')).toHaveValue('Pasig');
    expect(form.getByLabelText('Work setup')).toHaveValue('Hybrid');
    expect(form.getByLabelText('Minimum salary (monthly)')).toHaveValue(35000);
    await user.selectOptions(form.getByLabelText('Work setup'), 'Remote');
    await user.click(form.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.find('PATCH', '/jobs/1')).toHaveLength(1));
    const body = api.last('PATCH', '/jobs/1').body;
    expect(body).toMatchObject({ location: 'Pasig · Remote', salary: '₱35,000 - ₱48,000' });
    expect(body).not.toHaveProperty('deadline'); // untouched deadline is kept
  });

  it('closes a posting from the Review menu', async () => {
    const user = userEvent.setup();
    const api = setup({ all: [job(1)], queue: [] }, [['POST', /^\/jobs\/1\/deactivate$/, job(1, { status: 'inactive' })]]);
    renderAt('/admin/jobs');
    await user.click(await screen.findByRole('button', { name: 'Review Job 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Unpublish / Close listing' }));
    expect(await screen.findByText('“Job 1” was closed and hidden from alumni.')).toBeInTheDocument();
    expect(api.find('POST', '/jobs/1/deactivate')).toHaveLength(1);
    expect(screen.getByText('Closed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review Job 1' }));
    expect(screen.getByRole('menuitem', { name: 'Reopen listing' })).toBeInTheDocument();
  });

  it('deletes a posting after confirming', async () => {
    const user = userEvent.setup();
    const api = setup({ all: [job(1)], queue: [] }, [['DELETE', /^\/jobs\/1$/, { status: 204, body: undefined }]]);
    renderAt('/admin/jobs');
    await user.click(await screen.findByRole('button', { name: 'Review Job 1' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete listing' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete this job posting?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete posting' }));
    await waitFor(() => expect(api.find('DELETE', '/jobs/1')).toHaveLength(1));
    expect(await screen.findByText('Job posting deleted.')).toBeInTheDocument();
  });

  it('approves an alumni submission from the review queue', async () => {
    const user = userEvent.setup();
    const state = { all: [job(1)], queue: [job(5, { title: 'QA Intern', source: 'alumni', status: 'pending', by: 'Ana Cruz', batch: 'Batch 2022' })] };
    const api = setup(state, [['POST', /^\/jobs\/5\/approve$/, () => { const j = { ...state.queue.shift(), status: 'active' }; state.all.push(j); return j; }]]);
    renderAt('/admin/jobs');
    await user.click(await screen.findByRole('button', { name: 'Review' }));
    await user.click(await screen.findByRole('button', { name: 'Approve & publish' }));
    await waitFor(() => expect(api.find('POST', '/jobs/5/approve')).toHaveLength(1));
    expect(await screen.findByText('“QA Intern” approved and published to the Job Board.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
  });
});
