import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const ROW = {
  id: 7, membershipId: '2022-00007', name: 'Ana Cruz', program: 'BSIT', course: 'BS Information Technology', college: 'College of Computer Studies', collegeId: 1,
  batch: '2022', employmentStatus: 'employed', company: 'Acme', email: 'ana@example.com', source: 'self_registration', updatedAt: '2026-10-01T00:00:00Z', status: 'verified', hasAccount: true,
};
// A record the Alumni Office flagged for follow-up.
const FLAGGED = { ...ROW, id: 8, membershipId: 'AM-2026-00001', name: 'Paolo Mendoza', status: 'flagged', note: 'Check the batch year.' };
const COUNTERS = { flagged: 2, verified: 3, archived: 0, all: 5, batches: [2024, 2022] };

function setup(role, routes = [], rows = [ROW, FLAGGED]) {
  return mockApi([
    session(role),
    ...routes,
    ['GET', '/alumni', listOf(rows)],
    ['GET', '/stats/counters', COUNTERS],
    ['GET', '/alumni/activity', listOf([])],
  ]);
}

describe('Alumni Records page', () => {
  it('lists all records with the tab counts', async () => {
    setup('admin');
    renderAt('/admin/records');
    expect(await screen.findByText('Ana Cruz')).toBeInTheDocument();
    expect(screen.getByText('Paolo Mendoza')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flagged\s*2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pending/ })).toBeNull();
    expect(screen.getByRole('button', { name: /All records\s*5/ })).toBeInTheDocument();
  });

  it('searches by what is typed in the search box', async () => {
    const user = userEvent.setup();
    const api = setup('admin');
    renderAt('/admin/records');
    await user.type(await screen.findByPlaceholderText('Search by name, Membership ID or employer'), 'cruz');
    await waitFor(() => expect(api.last('GET', '/alumni').query.q).toBe('cruz'));
  });

  it('clears a flag from the review drawer', async () => {
    const user = userEvent.setup();
    const api = setup('admin', [
      ['GET', /^\/alumni\/8$/, { ...FLAGGED, history: [] }],
      ['GET', /^\/alumni\/8\/proofs$/, listOf([])],
      ['POST', '/alumni/8/status', { ...FLAGGED, status: 'verified' }],
    ]);
    renderAt('/admin/records');
    await user.click((await screen.findAllByRole('button', { name: 'View record' }))[1]);
    const drawer = await screen.findByRole('dialog', { name: 'Review alumni submission' });
    await user.click(await within(drawer).findByRole('button', { name: 'Clear flag & mark verified' }));
    await waitFor(() => expect(api.last('POST', '/alumni/8/status')).toBeTruthy());
    expect(api.last('POST', '/alumni/8/status').body).toEqual({ action: 'verify', reason: null });
    expect(await screen.findByText('Paolo Mendoza verified')).toBeInTheDocument();
  });

  it('archives a record after confirming', async () => {
    const user = userEvent.setup();
    const api = setup('admin', [['POST', '/alumni/bulk-status', { ok: true }]]);
    renderAt('/admin/records');
    await user.click((await screen.findAllByRole('button', { name: 'Delete record' }))[0]);
    const confirm = await screen.findByRole('alertdialog', { name: 'Archive this record?' });
    await user.click(within(confirm).getByRole('button', { name: 'Archive record' }));
    await waitFor(() => expect(api.last('POST', '/alumni/bulk-status')).toBeTruthy());
    expect(api.last('POST', '/alumni/bulk-status').body).toEqual({ ids: [7], action: 'archive', reason: 'Archived from Alumni Records' });
    expect(await screen.findByText('Ana Cruz archived')).toBeInTheDocument();
  });

  it('shows no approve button for a verified record', async () => {
    setup('dept', [['GET', /^\/alumni\/7$/, { ...ROW, history: [] }], ['GET', /^\/alumni\/7\/proofs$/, listOf([])]]);
    const user = userEvent.setup();
    renderAt('/college/records');
    await user.click((await screen.findAllByRole('button', { name: 'View record' }))[0]);
    const drawer = await screen.findByRole('dialog', { name: 'Review alumni submission' });
    expect(await within(drawer).findByText(/^Verified by the Alumni Office/)).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: /mark verified/ })).toBeNull();
  });
});
