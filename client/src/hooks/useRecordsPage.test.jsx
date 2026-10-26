import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import useRecordsPage from './useRecordsPage';
import { listOf, loadTestCatalog, mockApi, session } from '../test/mockApi';

const ROW = {
  id: 7, membershipId: '2022-00007', name: 'Ana Cruz', program: 'BSIT', course: 'BS Information Technology', college: 'College of Computer Studies', collegeId: 1,
  batch: '2022', employmentStatus: 'employed', company: 'Acme', email: 'ana@example.com', source: 'self_registration', updatedAt: '2026-10-01T00:00:00Z', status: 'verified', hasAccount: true,
};
const COUNTERS = { flagged: 1, verified: 3, archived: 0, all: 4, batches: [2024, 2022] };

function setup(role, routes = [], rows = [ROW]) {
  loadTestCatalog();
  const api = mockApi([
    session(role),
    ...routes,
    ['GET', '/alumni', listOf(rows)],
    ['GET', '/stats/counters', COUNTERS],
    ['GET', '/alumni/activity', listOf([])],
  ]);
  const wrapper = ({ children }) => <MemoryRouter><AuthProvider>{children}</AuthProvider></MemoryRouter>;
  const hook = renderHook(() => useRecordsPage(role), { wrapper });
  return { api, ...hook, vals: () => hook.result.current.vals };
}
const lastList = (api) => api.last('GET', '/alumni').query;
const ev = (value) => ({ target: { value } });

describe('Alumni Records filters', () => {
  it('loads all records, newest first, 10 per page', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    expect(lastList(api)).toEqual({ page: '1', per_page: '10', sort: 'updated_at' });
    expect(vals().recRowsView[0]).toMatchObject({ name: 'Ana Cruz', employment: 'Employed', source: 'Self-registration', statusLabel: 'Verified', progBatch: 'BSIT · Batch 2022' });
    expect(vals().recTabs.map((t) => `${t.label} ${t.count}`)).toEqual(['All records 4', 'Verified 3', 'Flagged 1', 'Archived 0']);
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
      program_id: '10', batch: '2022', employment: 'self_employed', page: '1', per_page: '10', sort: 'name', dir: 'asc',
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
    act(() => vals().recTabs[1].onClick());
    await waitFor(() => expect(lastList(api)).toMatchObject({ status: 'verified', page: '1' }));
    act(() => vals().recSetPageSize(ev('25')));
    await waitFor(() => expect(lastList(api)).toMatchObject({ status: 'verified', per_page: '25', page: '1' }));
  });

  it('Reset filters clears every filter and shows all records', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(api.find('GET', '/alumni')).toHaveLength(1));
    act(() => { vals().recSetProgSel(ev('10')); vals().recSetBatchSel(ev('2022')); vals().recSetEmpSel(ev('employed')); });
    await waitFor(() => expect(lastList(api).program_id).toBe('10'));
    act(() => vals().recResetFilters());
    // 'all' is left out of the query string; the API treats a missing status as every record.
    await waitFor(() => expect(lastList(api)).toEqual({ page: '1', per_page: '10', sort: 'updated_at' }));
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
    expect(api.calls.some((c) => c.query.college_id)).toBe(false);
  });
});

describe('Alumni Records actions', () => {
  // A record the Alumni Office flagged for follow-up.
  const FLAGGED = { ...ROW, id: 8, membershipId: 'AM-2026-00001', name: 'Paolo Mendoza', status: 'flagged', note: 'Check the batch year.' };
  const detail = (r) => ['GET', new RegExp(`^/alumni/${r.id}$`), { ...r, history: [] }];

  it('clears a flag and marks the record verified', async () => {
    const { api, vals } = setup('admin', [detail(FLAGGED), ['POST', '/alumni/8/status', { ...FLAGGED, status: 'verified' }]], [FLAGGED]);
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    act(() => vals().recRowsView[0].onView());
    await waitFor(() => expect(vals().recDrawerApproveLabel).toBe('Clear flag & mark verified'));
    expect(vals().recDrawerCanApprove).toBe(true);
    await act(() => vals().recDrawerApprove());
    expect(api.last('POST', '/alumni/8/status').body).toEqual({ action: 'verify', reason: null });
    await waitFor(() => expect(vals().repToast).toBe('Paolo Mendoza verified'));
  });

  it('a verified record has nothing to approve', async () => {
    const { vals } = setup('dept', [detail(ROW)]);
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    act(() => vals().recRowsView[0].onView());
    await waitFor(() => expect(vals().recDrawerStatusNote).toMatch(/^Verified/));
    expect(vals().recDrawerCanApprove).toBe(false);
  });

  it('email opens the staff member’s mail app and is recorded as composed (nothing is sent)', async () => {
    const opened = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record() { opened.push(this.href); });
    const { api, vals } = setup('admin', [['POST', '/alumni/7/emails', { ok: true }]]);
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    act(() => vals().recRowsView[0].menuItems.find((m) => m.k === 'email').onClick());
    await waitFor(() => expect(vals().recActIsEmail).toBe(true));
    expect(vals().recActBody).toContain('/signin');
    await act(() => vals().recActSubmit());
    expect(opened[0]).toMatch(/^mailto:ana@example\.com\?subject=/);
    expect(api.last('POST', '/alumni/7/emails').body).toEqual({ subject: 'UDM Alumni Tracer — annual employment update' });
    expect(api.find('POST', '/outreach')).toHaveLength(0);
    click.mockRestore();
  });

  it('Save changes sends once, says Saving…, and shows the saved row without waiting for the list', async () => {
    let reply;
    let lists = 0;
    const { api, vals } = setup('admin', [
      ['PATCH', '/alumni/7', () => new Promise((r) => { reply = r; })],
      // Only the first list load answers, so the saved row can only come from the PATCH reply.
      ['GET', '/alumni', () => (lists++ ? new Promise(() => {}) : listOf([ROW]))],
    ]);
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    act(() => vals().recRowsView[0].onEdit());
    act(() => vals().recFSetCompany(ev('Globe Telecom')));
    act(() => { vals().recFormSubmit(); });
    await waitFor(() => expect(vals().recFormSave).toBe('Saving…'));
    expect(vals().recFormBusy).toBe(true);
    act(() => { vals().recFormSubmit(); });
    expect(api.find('PATCH', '/alumni/7')).toHaveLength(1);
    await act(async () => reply({ ...ROW, company: 'Globe Telecom' }));
    await waitFor(() => expect(vals().recFormOn).toBe(false));
    expect(JSON.stringify(vals().recRowsView[0])).toContain('Globe Telecom');
    expect(vals().repToast).toBe('Saved changes to Ana Cruz');
  });

  it('flagging or archiving from the edit form needs a note', async () => {
    const { vals } = setup('admin');
    await waitFor(() => expect(vals().recRowsView).toHaveLength(1));
    act(() => vals().recRowsView[0].onEdit());
    act(() => vals().recFStatusChips.find((c) => c.label === 'Flagged').onClick());
    await act(() => vals().recFormSubmit());
    expect(vals().recFHasErrNote).toBe(true);
    expect(vals().recFNoteLabel).toBe('Admin note · required');
  });
});
