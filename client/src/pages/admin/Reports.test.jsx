import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { REPORT_TYPES } from '../../lib/analytics';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const report = (id) => ({
  file: `UDM_${id}`, batchRange: '2021-2025', kpis: [{ label: 'Employment rate', value: '82.0%', sub: 'of the labour force' }],
  bars: [['BSIT', 84.5], ['BSCS', 71.25]], cols: ['Program', 'Rate', 'Status'], rows: [['BSIT', '84.5%', 'Above target'], ['BSCS', '71.3%', 'Below target']],
  findings: ['BSCS is below target.'], records: '120', scope: 'All colleges', batchLabel: 'Batches 2021–2025', unit: '%', target: 80,
  grid: '2fr 1fr 1fr', chartTitle: 'Employment rate by program', chartNote: '', tableTitle: 'By program',
});
const Y = new Date().getFullYear();

function setup(role) {
  return mockApi([
    session(role),
    ['GET', /^\/reports\/(ched|employability|coverage|employer|inclusion)(\?|$)/, (req) => report(req.path.split('/').pop())],
    ['GET', '/reports/types', listOf(REPORT_TYPES.map((t) => ({ id: t.id, lastRun: null })))],
    ['GET', '/reports/exports', listOf([])],
    ['POST', '/reports/exports', { id: 1 }],
  ]);
}

describe('Reports page', () => {
  it('previews Form A for all colleges', async () => {
    setup('admin');
    renderAt('/admin/reports');
    expect((await screen.findAllByText('UDM Alumni Survey — Form A')).length).toBeGreaterThan(0);
    expect(await screen.findByText('BSCS is below target.')).toBeInTheDocument();
    expect(screen.getAllByText('Employment rate by program').length).toBeGreaterThan(0);
  });

  it('scopes every report to the chosen college', async () => {
    const user = userEvent.setup();
    const api = setup('admin');
    renderAt('/admin/reports');
    const college = await screen.findByRole('combobox', { name: 'Filter by college' });
    expect(screen.getByRole('combobox', { name: 'Filter by program' })).toBeDisabled();
    await user.selectOptions(college, '1');
    const reportPaths = REPORT_TYPES.map((t) => `/reports/${t.id}`);
    await waitFor(() => expect(api.calls.filter((c) => reportPaths.includes(c.path) && c.query.college_id === '1')).toHaveLength(REPORT_TYPES.length));
    expect(screen.getByRole('combobox', { name: 'Filter by program' })).toBeEnabled();
  });

  it('switches to another report template', async () => {
    const user = userEvent.setup();
    setup('admin');
    renderAt('/admin/reports');
    await screen.findByText('BSCS is below target.');
    // Only the template card names it until it is opened in the preview.
    expect(screen.getAllByText('Batch Coverage Audit')).toHaveLength(1);
    await user.click(screen.getByRole('radio', { name: /Batch Coverage Audit/ }));
    await waitFor(() => expect(screen.getAllByText('Batch Coverage Audit').length).toBeGreaterThan(1));
    expect(screen.getAllByText(/PDF · ~5 pages/).length).toBeGreaterThan(0);
  });

  it('exports a CSV and logs the export', async () => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    const api = setup('admin');
    renderAt('/admin/reports');
    await screen.findByText('BSCS is below target.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'CSV');
    await user.click(screen.getByRole('button', { name: /Export CSV/ }));
    await waitFor(() => expect(api.find('POST', '/reports/exports')).toHaveLength(1));
    expect(api.last('POST', '/reports/exports').body).toEqual({ type: 'ched', format: 'CSV', batch_from: Y - 4, batch_to: Y });
    expect(click).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Exported UDM_ched_2021-2025.csv')).toBeInTheDocument();
    click.mockRestore();
  });

  it('college users only get their own college to choose', async () => {
    const api = setup('dept');
    renderAt('/college/reports');
    await screen.findByText('BSCS is below target.');
    // The college is shown read-only instead of a select.
    expect(screen.queryByRole('combobox', { name: 'Filter by college' })).toBeNull();
    expect(screen.getByText('Scoped to College of Computer Studies')).toBeInTheDocument();
    expect(api.calls.some((c) => c.query.college_id)).toBe(false);
  });
});
