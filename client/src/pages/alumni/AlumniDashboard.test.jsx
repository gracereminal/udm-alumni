import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const job = (id, extra = {}) => ({
  id, title: `Job ${id}`, company: 'Universidad de Manila', location: 'Manila · On-site', type: 'Contract', source: 'admin', status: 'active', tags: [],
  createdAt: '2026-10-01T00:00:00Z', publishedAt: '2026-10-01T00:00:00Z', saved: false, applied: null, ...extra,
});
const ME = { a: { first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com' }, survey: { submitted: true }, record: { photoUrl: null, updatedAt: '2026-10-01T00:00:00Z' } };

function setup(board) {
  return mockApi([
    session('alumni'), ['GET', '/me', ME], ['GET', /^\/(events|announcements|notifications)(\?|$)/, listOf([])],
    ['GET', '/jobs', (req) => listOf(req.query.view === 'mine' ? [] : board.current)],
  ]);
}

describe('Alumni Dashboard job board card', () => {
  it('shows the live posting count and the latest postings from the job board', async () => {
    setup({ current: [job(1), job(2), job(3), job(4), job(5, { status: 'inactive' })] });
    renderAt('/alumni/dashboard');
    expect(await screen.findByText('Browse all 4 postings →')).toBeInTheDocument();
    expect(screen.getByText('Job 1')).toBeInTheDocument();
    expect(screen.queryByText('Job 4')).toBeNull(); // the card previews three
  });

  it('says so when nothing is open, and picks up new postings when the tab regains focus', async () => {
    const board = { current: [] };
    setup(board);
    renderAt('/alumni/dashboard');
    expect(await screen.findByText('No open job postings right now.')).toBeInTheDocument();

    board.current = [job(7, { title: 'Faculty, BS Criminology Program' })];
    await act(async () => { fireEvent.focus(window); });
    expect(await screen.findByText('Faculty, BS Criminology Program')).toBeInTheDocument();
    expect(screen.getByText('Browse 1 posting →')).toBeInTheDocument();
  });
});
