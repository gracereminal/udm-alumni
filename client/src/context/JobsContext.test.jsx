import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { JobsProvider, empType, useJobs } from './JobsContext';
import { listOf, mockApi, session } from '../test/mockApi';

const job = (id, extra = {}) => ({
  id, title: `Job ${id}`, company: 'Acme', location: 'Manila', type: 'Full-time', source: 'admin', status: 'active', tags: [],
  createdAt: '2026-10-01T00:00:00Z', publishedAt: '2026-10-01T00:00:00Z', saved: false, applied: null, ...extra,
});

function setup(role, routes = []) {
  const api = mockApi([session(role), ...routes]);
  const wrapper = ({ children }) => <AuthProvider><JobsProvider>{children}</JobsProvider></AuthProvider>;
  const hook = renderHook(() => useJobs(), { wrapper });
  return { api, ...hook, jobs: () => hook.result.current };
}

describe('empType', () => {
  it.each([
    ['Internship (3 months)', 'Internship'], ['part time', 'Part-time'], ['Contractual', 'Contract'], ['Freelance', 'Freelance'], ['', 'Full-time'], ['Regular', 'Full-time'],
  ])('maps "%s" to %s', (input, out) => expect(empType(input)).toBe(out));
});

describe('Jobs — alumni', () => {
  const alumniRoutes = (state) => [
    ['GET', '/jobs', (req) => listOf(req.query.view === 'mine' ? state.mine : state.board)],
    ['POST', /^\/jobs\/1\/save$/, () => { state.board[0].saved = true; return state.board[0]; }],
    ['DELETE', /^\/jobs\/1\/save$/, () => { state.board[0].saved = false; return state.board[0]; }],
    ['POST', /^\/jobs\/1\/apply$/, (req) => { state.board[0].applied = { via: req.body.via, at: '2026-10-15T00:00:00Z' }; return state.board[0]; }],
    ['DELETE', /^\/jobs\/1\/apply$/, () => { state.board[0].applied = null; return state.board[0]; }],
    ['POST', '/jobs', (req) => { const j = job(99, { ...req.body, source: 'alumni', status: 'pending', approvalStatus: 'pending' }); state.mine.push(j); return j; }],
  ];

  it('loads the approved board and the alumnus’ own submissions', async () => {
    const state = { board: [job(1), job(2, { status: 'inactive' })], mine: [] };
    const { api, jobs } = setup('alumni', alumniRoutes(state));
    await waitFor(() => expect(jobs().jobs).toHaveLength(2));
    expect(jobs().activeJobs.map((j) => j.id)).toEqual([1]);
    expect(api.find('GET', '/jobs').map((c) => c.query.view || '').sort()).toEqual(['', 'mine']);
    expect(jobs().jobs[0]).toMatchObject({ badge: 'Posted by Admin', salary: 'Salary undisclosed' });
  });

  it('saves and un-saves a job', async () => {
    const state = { board: [job(1)], mine: [] };
    const { api, jobs } = setup('alumni', alumniRoutes(state));
    await waitFor(() => expect(jobs().jobs).toHaveLength(1));
    await act(() => jobs().toggleSave(1));
    expect(jobs().savedJobs).toEqual({ 1: true });
    await act(() => jobs().toggleSave(1));
    expect(jobs().savedJobs).toEqual({});
    expect(api.calls.filter((c) => c.path === '/jobs/1/save').map((c) => c.method)).toEqual(['POST', 'DELETE']);
  });

  it('applies to a job and withdraws the application', async () => {
    const state = { board: [job(1)], mine: [] };
    const { api, jobs } = setup('alumni', alumniRoutes(state));
    await waitFor(() => expect(jobs().jobs).toHaveLength(1));
    // The apply dialog's channel label is recorded as the API's applied_via code.
    await act(() => jobs().toggleApply(1, 'Messenger'));
    expect(api.last('POST', '/jobs/1/apply').body).toEqual({ via: 'messenger' });
    expect(jobs().applied).toEqual({ 1: { status: 'Application sent via Messenger', at: '2026-10-15T00:00:00Z', via: 'Messenger' } });
    await act(() => jobs().toggleApply(1));
    expect(jobs().applied).toEqual({});
  });

  it('submits a posting for review with a normalised employment type', async () => {
    const state = { board: [job(1)], mine: [] };
    const { api, jobs } = setup('alumni', alumniRoutes(state));
    await waitFor(() => expect(jobs().jobs).toHaveLength(1));
    await act(() => jobs().submitForReview({ title: 'QA Intern', company: 'Beta', type: 'internship', tags: ['QA'], desc: 'Test things', deadline: '2026-11-30' }));
    expect(api.last('POST', '/jobs').body).toMatchObject({ title: 'QA Intern', company: 'Beta', type: 'Internship', tags: ['QA'], deadline: '2026-11-30' });
    // Not uploaded: no photo was picked.
    expect(api.calls.some((c) => c.path.endsWith('/photo'))).toBe(false);
    await waitFor(() => expect(jobs().mine.map((j) => j.id)).toEqual([99]));
    expect(jobs().activeJobs.map((j) => j.id)).toEqual([1]);
  });
});

describe('Jobs — admin', () => {
  it('approves and rejects alumni submissions from the queue', async () => {
    const state = { all: [job(1)], queue: [job(5, { source: 'alumni', by: 'Ana Cruz', batch: 'Batch 2022' }), job(6, { source: 'alumni' })] };
    const { api, jobs } = setup('admin', [
      ['GET', '/jobs', (req) => listOf(req.query.view === 'queue' ? state.queue : state.all)],
      ['POST', /^\/jobs\/5\/approve$/, () => { state.all.push(state.queue.shift()); return {}; }],
      ['POST', /^\/jobs\/6\/reject$/, {}],
    ]);
    await waitFor(() => expect(jobs().queue).toHaveLength(2));
    expect(jobs().queue[0]).toMatchObject({ badge: 'Alumni Referral', note: 'Referred by Ana Cruz · Batch 2022' });

    await act(() => jobs().approveQueued(jobs().queue[0]));
    expect(jobs().jobs.map((j) => j.id)).toEqual([1, 5]);
    expect(jobs().queue.map((j) => j.id)).toEqual([6]);

    await act(() => jobs().rejectQueued(jobs().queue[0], 'Duplicate posting'));
    expect(api.last('POST', '/jobs/6/reject').body).toEqual({ reason: 'Duplicate posting' });
    expect(jobs().queue).toEqual([]);
  });

  it('deactivates and deletes a posting', async () => {
    const { api, jobs } = setup('admin', [
      ['GET', '/jobs', (req) => listOf(req.query.view === 'queue' ? [] : [job(1), job(2)])],
      ['POST', /^\/jobs\/1\/deactivate$/, job(1, { status: 'inactive' })],
      ['DELETE', /^\/jobs\/2$/, { status: 204, body: undefined }],
    ]);
    await waitFor(() => expect(jobs().jobs).toHaveLength(2));
    await act(() => jobs().setJobStatus(1, 'inactive'));
    expect(jobs().activeJobs.map((j) => j.id)).toEqual([2]);
    await act(() => jobs().deleteJob(2));
    expect(jobs().jobs.map((j) => j.id)).toEqual([1]);
    expect(api.find('DELETE', '/jobs/2')).toHaveLength(1);
  });
});

describe('Jobs — college users', () => {
  it('do not load the job board', async () => {
    const { api, jobs } = setup('dept');
    await waitFor(() => expect(api.find('GET', '/auth/session')).toHaveLength(1));
    await new Promise((r) => { setTimeout(r, 20); });
    expect(api.calls.some((c) => c.path.startsWith('/jobs'))).toBe(false);
    expect(jobs().jobs).toEqual([]);
  });
});
