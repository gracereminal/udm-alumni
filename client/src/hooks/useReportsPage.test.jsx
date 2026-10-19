import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import useReportsPage from './useReportsPage';
import { REPORT_TYPES } from '../lib/analytics';
import { listOf, loadTestCatalog, mockApi, session } from '../test/mockApi';

const report = (id) => ({
  file: `UDM_${id}`, batchRange: '2021-2025', kpis: [{ label: 'Employment rate', value: '82.0%', sub: 'of the labour force' }],
  bars: [['BSIT', 84.5], ['BSCS', 71.25]], cols: ['Program', 'Rate', 'Status'], rows: [['BSIT', '84.5%', 'Above target'], ['BSCS', '71.3%', 'Below target']],
  findings: ['BSCS is below target.'], records: '120', scope: 'All colleges', batchLabel: 'Batches 2021–2025', unit: '%', target: 80,
  grid: '2fr 1fr 1fr', chartTitle: 'Employment rate by program', chartNote: '', tableTitle: 'By program',
});
const Y = new Date().getFullYear();
// Default window: the last five graduating batches, sent low / high.
const WINDOW = { batch_from: String(Y - 4), batch_to: String(Y) };

function setup(role, { exportReply = { id: 1 }, state } = {}) {
  loadTestCatalog();
  const api = mockApi([
    session(role),
    ['GET', /^\/reports\/(ched|employability|coverage|employer|inclusion)(\?|$)/, (req) => report(req.path.split('/').pop())],
    ['GET', '/reports/types', listOf(REPORT_TYPES.map((t) => ({ id: t.id, lastRun: null })))],
    ['GET', '/reports/exports', listOf([])],
    ['POST', '/reports/exports', exportReply],
  ]);
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[{ pathname: '/admin/reports', state }]}><AuthProvider>{children}</AuthProvider></MemoryRouter>;
  const hook = renderHook(() => useReportsPage(role), { wrapper });
  return { api, ...hook, vals: () => hook.result.current.vals };
}
const reportCalls = (api) => api.calls.filter((c) => c.method === 'GET' && /^\/reports\/(ched|employability|coverage|employer|inclusion)$/.test(c.path));
const withScope = (api, scope) => reportCalls(api).filter((c) => JSON.stringify(c.query) === JSON.stringify({ ...scope, ...WINDOW }) || JSON.stringify(c.query) === JSON.stringify(scope));

describe('Reports', () => {
  it('loads every report type for all colleges and previews Form A', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    expect(reportCalls(api).map((c) => c.path).sort()).toEqual(REPORT_TYPES.map((t) => `/reports/${t.id}`).sort());
    expect(reportCalls(api).every((c) => JSON.stringify(c.query) === JSON.stringify(WINDOW))).toBe(true);
    expect(vals().repTitle).toBe('UDM Alumni Survey — Form A');
    expect(vals().repScopeLabel).toBe('All colleges');
    expect(vals().repYearsLabel).toBe(`Batches ${Y - 4}–${Y}`);
    expect(vals().repBars.map((b) => [b.label, b.display, b.color])).toEqual([['BSIT', '84.5%', '#0F3D2E'], ['BSCS', '71.3%', '#A9C3B8']]);
    expect(vals().repTargetLabel).toBe('Target 80%');
  });

  it('scopes to a college, then to one of its programs', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    expect(vals().repCourseDisabled).toBe(true);

    act(() => vals().repOnCollege({ target: { value: '1' } }));
    await waitFor(() => expect(withScope(api, { college_id: '1' })).toHaveLength(REPORT_TYPES.length));
    expect(vals().repScopeLabel).toBe('College of Computer Studies');
    expect(vals().repCourseDisabled).toBe(false);
    expect(vals().repCourseOpts.map((o) => o.label)).toEqual(['All courses (2)', 'BS Information Technology', 'BS Computer Science']);

    act(() => vals().repOnCourse({ target: { value: '11' } }));
    await waitFor(() => expect(withScope(api, { college_id: '1', program_id: '11' })).toHaveLength(REPORT_TYPES.length));
    expect(vals().repScopeLabel).toBe('BS Computer Science');

    // Changing college resets the program.
    act(() => vals().repOnCollege({ target: { value: '2' } }));
    await waitFor(() => expect(withScope(api, { college_id: '2' })).toHaveLength(REPORT_TYPES.length));
    expect(vals().repCourseVal).toBe('all');
  });

  it('sends the chosen batch range, in either order, as low / high years', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    act(() => vals().repOnFrom({ target: { value: String(Y - 1) } }));
    act(() => vals().repOnTo({ target: { value: String(Y - 3) } }));
    await waitFor(() => expect(reportCalls(api).filter((c) => c.query.batch_from === String(Y - 3) && c.query.batch_to === String(Y - 1))).toHaveLength(REPORT_TYPES.length));
    expect(vals().repYearsLabel).toBe(`Batches ${Y - 3}–${Y - 1}`);
  });

  it('opens with the scope a dashboard handed over', async () => {
    const { api, vals } = setup('admin', { state: { college: 1, course: 10, from: Y - 2, to: Y - 2, repType: 'inclusion' } });
    await waitFor(() => expect(reportCalls(api).filter((c) => c.query.college_id === '1' && c.query.program_id === '10' && c.query.batch_from === String(Y - 2) && c.query.batch_to === String(Y - 2))).toHaveLength(REPORT_TYPES.length));
    expect(vals().repTitle).toBe('Inclusion Profile — IP & PWD');
    expect(vals().repYearsLabel).toBe(`Batch ${Y - 2}`);
  });

  it('ignores a program that does not belong to the chosen college', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    act(() => vals().repOnCollege({ target: { value: '1' } }));
    act(() => vals().repOnCourse({ target: { value: '21' } }));
    await waitFor(() => expect(withScope(api, { college_id: '1' })).toHaveLength(REPORT_TYPES.length));
    expect(api.calls.some((c) => c.query.program_id === '21')).toBe(false);
    expect(vals().repCourseVal).toBe('all');
  });

  it('locks college users to their own college and never sends a college_id', async () => {
    const { api, vals } = setup('dept');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    expect(vals().repCollegeOpts).toEqual([{ value: '1', label: 'College of Computer Studies' }]);
    act(() => vals().repOnCourse({ target: { value: '10' } }));
    await waitFor(() => expect(withScope(api, { program_id: '10' })).toHaveLength(REPORT_TYPES.length));
    expect(api.calls.some((c) => c.query.college_id)).toBe(false);
  });

  it('switches report type and toggles sections', async () => {
    const { vals } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    act(() => vals().repTemplates.find((t) => t.id === 'coverage').onClick());
    expect(vals().repTitle).toBe('Batch Coverage Audit');
    expect(vals().repOutputMeta).toBe('PDF · ~5 pages');

    act(() => vals().repSectionRows.find((s) => s.label === 'Table').onClick());
    expect(vals().repShowTable).toBe(false);
    expect(vals().repOutputMeta).toBe('PDF · ~3 pages');

    act(() => vals().repFormats.find((f) => f.label === 'Excel').onClick());
    expect(vals().repOutputMeta).toBe('Excel · 3 sheets');
  });

  it('cannot export with every section turned off', async () => {
    const { api, vals } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    ['KPIs', 'Chart', 'Table', 'Findings'].forEach((label) => act(() => vals().repSectionRows.find((s) => s.label === label).onClick()));
    expect(vals().repNoSections).toBe(true);
    await act(async () => { vals().repExportNow(); });
    expect(api.find('POST', '/reports/exports')).toHaveLength(0);
  });

  it('exports a CSV with the chosen scope and sections, and logs the export', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { api, vals, result } = setup('admin');
    await waitFor(() => expect(vals().repRecords).toBe('120'));
    act(() => vals().repOnCollege({ target: { value: '1' } }));
    await waitFor(() => expect(withScope(api, { college_id: '1' })).toHaveLength(REPORT_TYPES.length));
    act(() => vals().repFormats.find((f) => f.label === 'CSV').onClick());
    act(() => vals().repSectionRows.find((s) => s.label === 'Findings').onClick());

    await act(async () => { vals().repExportNow(); });
    await waitFor(() => expect(api.find('POST', '/reports/exports')).toHaveLength(1));
    expect(click).toHaveBeenCalledTimes(1);
    expect(api.last('POST', '/reports/exports').body).toEqual({ type: 'ched', format: 'CSV', college_id: 1, batch_from: Y - 4, batch_to: Y });
    await waitFor(() => expect(result.current.toastOn).toBe(true));
    expect(vals().repToast).toBe('Exported UDM_ched_2021-2025.csv');
    // The export history is reloaded after logging.
    await waitFor(() => expect(api.find('GET', '/reports/exports')).toHaveLength(2));
    click.mockRestore();
  });
});
