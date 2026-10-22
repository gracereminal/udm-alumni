import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const COLUMNS = ['Student no.', 'Full name', 'College', 'Program', 'Year graduated', 'Personal email / mobile'].map((label, i) => ({ key: `c${i}`, label, found: true }));
const base = { id: 1, code: 'BATCH-2026-0001', fileName: 'CCS_Masterlist_2024.csv', status: 'review', columns: COLUMNS, rowCount: 3, createdAt: '2026-10-22T06:00:00Z', confirmedAt: null, confirmedBy: null, result: null };
const row = (o) => ({ rowNo: 2, raw: '', name: '', studentNo: null, program: 'BSIT', college: 'CCS', year: 2024, email: null, mobile: null, kind: 'new', target: null, changes: [], notes: [], confidence: 98, flag: null, values: {}, status: 'ready', decision: null, ...o });
const juan = row({ id: 11, raw: 'DELA CRUZ, JUAN M.', name: 'Juan M. Dela Cruz', email: 'juan@gmail.com', notes: ['Name casing fixed'] });
const ana = row({ id: 12, rowNo: 3, raw: 'Reyes, Ana P.', name: 'Ana P. Reyes', year: 2021, kind: 'update', confidence: 95, target: { id: 7, membershipId: 'AM-2021-00412', name: 'Ana P. Reyes' }, changes: [{ label: 'MOBILE', from: '0917 555 0142', to: '0928 555 0187' }] });
const paolo = row({
  id: 13, rowNo: 4, raw: 'Bautista, Paolo R.', name: 'Paolo R. Bautista', year: 2031, email: 'paolo@gmail.com', confidence: 42, status: 'pending',
  flag: { message: 'Year graduated 2031 is outside 1999 – 2026', field: 'year', fieldLabel: 'YEAR GRADUATED', suggestion: 'Change to 2021 (matches the 21- student number prefix)', keep: null },
  values: { year: '2031' },
});
const stats = (o) => ({ rows: 3, ready: 2, flagged: 1, open: 1, new: 1, update: 1, unchanged: 0, rejected: 0, ...o });
const reviewed = { ...base, validated: true, stats: stats(), rows: [juan, ana, paolo] };
const accepted = { ...reviewed, stats: stats({ open: 0, new: 2 }), rows: [juan, ana, { ...paolo, year: 2021, status: 'resolved', decision: 'accept' }] };
const synced = { ...base, status: 'synced', validated: true, confirmedBy: 'Alumni Office', result: { created: 2, updated: 1, rejected: 0, unchanged: 0, emailed: 2, emailFailed: 0 }, stats: null, rows: [] };

function setup(extra = []) {
  return mockApi([
    session('admin'),
    ['GET', '/imports', { data: null }],
    ['POST', '/imports', { status: 201, body: { ...base, validated: false, stats: null, rows: [] } }],
    ['POST', '/imports/1/validate', reviewed],
    ['POST', '/imports/1/rows/13', (req) => (req.body.action === 'accept' ? accepted : { status: 422, body: { error: 'Enter a 4-digit year.', fields: { value: 'Enter a 4-digit year.' } } })],
    ['POST', '/imports/1/confirm', synced],
    ...extra,
  ]);
}

async function uploadAndValidate(user) {
  renderAt('/admin/ai-data');
  await user.upload(await screen.findByLabelText('Masterlist file'), new File(['Student no.,Full name\n'], 'CCS_Masterlist_2024.csv', { type: 'text/csv' }));
  expect(await screen.findByText('CCS_Masterlist_2024.csv')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Run AI validation' }));
  await screen.findByText('AI review · proposed changes');
}

describe('AI Data Management', () => {
  it('reviews, resolves and syncs a masterlist', async () => {
    const user = userEvent.setup();
    const api = setup();
    await uploadAndValidate(user);

    expect(screen.getByText('AI: Name casing fixed')).toBeInTheDocument();
    expect(screen.getByText('⚑ Year graduated 2031 is outside 1999 – 2026')).toBeInTheDocument();
    expect(screen.getByText('1 flagged row needs a decision')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview changes' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Accept suggestion' }));
    expect(await screen.findByText('AI suggestion accepted')).toBeInTheDocument();
    expect(api.last('POST', '/imports/1/rows/13').body).toEqual({ action: 'accept' });
    expect(screen.getByText('All flagged rows resolved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preview changes' }));
    expect(await screen.findByText('Before → after · nothing is saved until you confirm')).toBeInTheDocument();
    expect(screen.getByText('AM-2021-00412 (kept)')).toBeInTheDocument();
    expect(screen.getByText('0917 555 0142 → 0928 555 0187')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm & sync 3 records' }));
    expect(await screen.findByText('Synced 3 records to the portal')).toBeInTheDocument();
    expect(screen.getByText('Temporary passwords emailed to 2 personal addresses (expire in 7 days)')).toBeInTheDocument();
    expect(api.find('POST', '/imports/1/confirm')).toHaveLength(1);
  });

  it('checks a manual edit before saving it', async () => {
    const user = userEvent.setup();
    setup();
    await uploadAndValidate(user);

    await user.click(screen.getByRole('button', { name: 'Edit manually' }));
    const input = screen.getByLabelText('YEAR GRADUATED (1999 – ' + new Date().getFullYear() + ')');
    expect(input).toHaveValue('2031');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.clear(input);
    await user.type(input, '2021');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('previews an export and shows the audit log', async () => {
    const user = userEvent.setup();
    const api = setup([
      ['GET', /^\/imports\/export/, { total: 612, rows: [{ membershipId: 'AM-2024-00118', name: 'Rafael Dizon', program: 'BSIT', year: 2024 }], colleges: [{ id: 3, code: 'CCS', name: 'College of Computing Studies', count: 612 }], batches: [2024, 2023] }],
      ['GET', '/imports/log', { data: [{ id: 1, at: '2026-10-22T06:02:00Z', tag: 'Import', text: 'Masterlist CCS_Masterlist_2024.xlsx imported · 8 rows', who: 'Alumni Office' }] }],
    ]);
    renderAt('/admin/ai-data');

    await user.click(await screen.findByRole('tab', { name: 'Export records' }));
    expect(await screen.findByText('612 validated records match · showing first 1')).toBeInTheDocument();
    expect(screen.getByText('Rafael Dizon')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'CCS' }));
    await waitFor(() => expect(api.calls.some((c) => c.path === '/imports/export' && c.query.college_id === '3')).toBe(true));

    await user.click(screen.getByRole('tab', { name: 'Audit log' }));
    expect(await screen.findByText('Masterlist CCS_Masterlist_2024.xlsx imported · 8 rows')).toBeInTheDocument();
    expect(screen.getByText('Oct 22 · 14:02')).toBeInTheDocument();
  });
});
