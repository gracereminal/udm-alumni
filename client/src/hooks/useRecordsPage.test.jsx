import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import useRecordsPage from './useRecordsPage';
import { loadTestCatalog, mockApi, session } from '../test/mockApi';

const ROW = {
  id: 7, membershipId: '2022-00007', name: 'Ana Cruz', program: 'BSIT', course: 'BS Information Technology', college: 'College of Computer Studies', collegeId: 1,
  batch: '2022', employmentStatus: 'employed', company: 'Acme', email: 'ana@example.com', source: 'self_registration', updatedAt: '2026-10-01T00:00:00Z', status: 'pending', hasAccount: true,
};
const COUNTERS = { pending: 1, flagged: 0, verified: 3, archived: 0, all: 4, batches: [2024, 2022] };

function setup(role) {
  loadTestCatalog();
  const api = mockApi([
    session(role),
    ['GET', '/alumni', { rows: [ROW], total: 1 }],
    ['GET', '/stats/counters', COUNTERS],
    ['GET', '/alumni/activity', []],
  ]);
  const wrapper = ({ children }) => <MemoryRouter><AuthProvider>{children}</AuthProvider></MemoryRouter>;
  const hook = renderHook(() => useRecordsPage(role), { wrapper });
  return { api, ...hook, vals: () => hook.result.current.vals };
}
const lastList = (api) => api.last('GET', '/alumni').query;
const ev = (value) => ({ target: { value } });

describe('Alumni Records filters', () => {
  it('loads the pending tab, newest first, 10 per page', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    expect(lastList(api)).toEqual({ status: 'pending', page: '1', pageSize: '10', sort: 'updated_at' });
    expect(vals().recRowsView[0]).toMatchObject({ name: 'Ana Cruz', employment: 'Employed', source: 'Self-registration', statusLabel: 'Pending', progBatch: 'BSIT · Batch 2022' });
    expect(vals().recTabs.map((t) => `${t.label} ${t.count}`)).toEqual(['Pending review 1', 'Flagged 0', 'Verified 3', 'Archived 0', 'All records 4']);
    expect(vals().recBatchOpts.map((o) => o.value)).toEqual(['all', '2024', '2022']);
  });

  it('sends program, batch, employment and sort filters to the API', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    act(() => vals().recSetProgSel(ev('10')));
    act(() => vals().recSetBatchSel(ev('2022')));
    act(() => vals().recSetEmpSel(ev('self_employed')));
    act(() => vals().recSetSort(ev('name')));
    await waitFor(() => expect(lastList(api)).toEqual({
      status: 'pending', programId: '10', batch: '2022', employment: 'self_employed', page: '1', pageSize: '10', sort: 'name', dir: 'asc',
    }));
    expect(vals().recResultLabel).toBe('1 record match your filters');
  });

  it('can filter on records whose survey is not answered yet', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    expect(vals().recEmpOpts.at(-1)).toEqual({ value: 'unanswered', label: 'Survey not yet answered' });
    act(() => vals().recSetEmpSel(ev('unanswered')));
    await waitFor(() => expect(lastList(api).employment).toBe('unanswered'));
  });

  it('debounces the search box and trims the query', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    act(() => vals().recSetQuery(ev('  cru')));
    act(() => vals().recSetQuery(ev('  cruz ')));
    await waitFor(() => expect(lastList(api).q).toBe('cruz'));
    expect(api.find('GET', '/alumni').filter((c) => c.query.q)).toHaveLength(1);
  });

  it('switching tab or filter goes back to page 1', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    act(() => vals().recTabs[2].onClick());
    await waitFor(() => expect(lastList(api)).toMatchObject({ status: 'verified', page: '1' }));
    act(() => vals().recSetPageSize(ev('25')));
    await waitFor(() => expect(lastList(api)).toMatchObject({ status: 'verified', pageSize: '25', page: '1' }));
  });

  it('Reset filters clears every filter and shows all records', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    act(() => { vals().recSetProgSel(ev('10')); vals().recSetBatchSel(ev('2022')); vals().recSetEmpSel(ev('employed')); });
    await waitFor(() => expect(lastList(api).programId).toBe('10'));
    act(() => vals().recResetFilters());
    // 'all' is left out of the query string; the API treats a missing status as every record.
    await waitFor(() => expect(lastList(api)).toEqual({ page: '1', pageSize: '10', sort: 'updated_at' }));
    expect(vals().recResultLabel).toBe('1 record in this view');
  });

  it('admins choose from every program, labelled by college when a name repeats', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    expect(vals().recProgOpts.map((o) => o.label)).toEqual([
      'All programs',
      'BSIT — BS Information Technology (CCS)', 'BSCS — BS Computer Science',
      'BSIT — BS Information Technology (CET)', 'BSCE — BS Civil Engineering',
    ]);
  });

  it('college users only see their own college’s programs', async () => {
    const { api, vals } = setup('dept');
    await waitFor(() => expect(vals().recIsDept).toBe(true));
    await waitFor(() => expect(vals().recProgOpts).toHaveLength(3));
    expect(vals().recProgOpts.map((o) => o.label)).toEqual(['All CCS programs', 'BSIT — BS Information Technology', 'BSCS — BS Computer Science']);
    // Scoping is enforced by the API; the client never asks for another college.
    expect(api.calls.some((c) => c.query.collegeId)).toBe(false);
  });
});
