import { Suspense } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { JobsProvider } from '../context/JobsContext';
import { EventsProvider } from '../context/EventsContext';
import { SearchProvider } from '../context/SearchContext';
import { ToastProvider } from '../context/ToastContext';
import { ResetFlowProvider } from '../context/ResetFlowContext';
import AppRoutes from '../routes/AppRoutes';
import { listOf, loadTestCatalog, mockApi, session } from '../test/mockApi';
import { applyUrl, mailtoUrl, messengerUrl } from './contact';

function renderAt(path) {
  loadTestCatalog();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <ProfileProvider>
            <JobsProvider>
              <EventsProvider>
                <SearchProvider>
                  <ResetFlowProvider>
                    <Suspense fallback={null}>
                      <AppRoutes />
                    </Suspense>
                  </ResetFlowProvider>
                </SearchProvider>
              </EventsProvider>
            </JobsProvider>
          </ProfileProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('contact link helpers', () => {
  it.each([
    ['juan.reyes', 'https://m.me/juan.reyes'],
    ['@juan.reyes', 'https://m.me/juan.reyes'],
    ['facebook.com/juan.reyes', 'https://m.me/juan.reyes'],
    ['https://www.facebook.com/juan.reyes/?ref=bookmarks', 'https://m.me/juan.reyes'],
    ['https://m.facebook.com/profile.php?id=100012345', 'https://m.me/100012345'],
    ['m.me/juan.reyes', 'https://m.me/juan.reyes'],
    ['', ''],
    ['not a handle!', ''],
  ])('messengerUrl(%j) → %j', (v, out) => expect(messengerUrl(v)).toBe(out));

  it('builds mailto and apply links', () => {
    expect(mailtoUrl('a@b.co', 'Hi there', 'Line 1\nLine 2')).toBe('mailto:a@b.co?subject=Hi%20there&body=Line%201%0ALine%202');
    expect(applyUrl('careers@brightline.tech')).toBe('mailto:careers@brightline.tech');
    expect(applyUrl('brightline.tech/careers')).toBe('https://brightline.tech/careers');
    expect(applyUrl('Walk in at the HR office')).toBe('');
  });
});

describe('College Outreach contact', () => {
  const zero = { total: 0, traced: 0, employed: 0, notEmployed: 0, aligned: 0, timeToJob: {} };
  /** The college dashboard's stat endpoints, with `unresponsive` as the outreach list. */
  const outreachApi = (unresponsive) => mockApi([
    session('dept'),
    ['GET', '/stats/summary', zero], ['GET', '/stats/by-program', listOf([])], ['GET', '/stats/by-batch', listOf([])],
    ['GET', '/stats/sectors', { topJobTitles: [] }], ['GET', '/stats/benchmark', {}],
    ['GET', '/stats/unresponsive', () => listOf(unresponsive.rows, { byReason: {}, outreachIntervalDays: 7 })],
    ['POST', '/outreach', (req) => {
      Object.assign(unresponsive.rows[0], { lastContactedAt: new Date().toISOString(), lastContactedVia: req.body.method, lastContactId: 41 });
      return { status: 201, body: { id: 41 } };
    }],
    ['DELETE', '/outreach/41', () => { Object.assign(unresponsive.rows[0], { lastContactedAt: null, lastContactedVia: null, lastContactId: null }); return {}; }],
  ]);
  const ANDREA = { id: 5, name: 'Andrea Villanueva', program: 'BSIT', batch: 2024, reason: 'no_response', email: 'andrea.villanueva@gmail.com', facebook: 'andrea.villanueva.ph', registeredAt: '2026-09-01T00:00:00Z', lastContactedAt: null, lastContactedVia: null, lastContactId: null };
  const rowOf = async (name) => (await screen.findByText(name)).parentElement;

  it('opens Messenger / email for the alumnus and records the contact (the portal sends nothing)', async () => {
    const state = { rows: [{ ...ANDREA }] };
    const api = outreachApi(state);
    renderAt('/college/outreach');
    fireEvent.click(within(await rowOf('Andrea Villanueva')).getByText('Contact'));

    const dialog = screen.getByRole('dialog', { name: 'Contact Andrea Villanueva' });
    const fb = within(dialog).getByText('Open Messenger');
    expect(fb).toHaveAttribute('href', 'https://m.me/andrea.villanueva.ph');
    expect(fb).toHaveAttribute('target', '_blank');
    const mail = within(dialog).getByText('Open email');
    expect(mail.getAttribute('href')).toMatch(/^mailto:andrea\.villanueva@gmail\.com\?subject=.+&body=Hi%20Andrea/);
    // The message names the dean's own college.
    expect(decodeURIComponent(mail.getAttribute('href'))).toContain('This is the College of Computer Studies');

    // The message is editable and goes into the email body.
    fireEvent.change(within(dialog).getByLabelText('Message'), { target: { value: 'Custom note' } });
    expect(within(dialog).getByText('Open email').getAttribute('href')).toMatch(/body=Custom%20note$/);

    // Opening a channel doesn't mark the alumnus; confirming does, with the channel last used.
    fireEvent.click(fb);
    expect(api.find('POST', '/outreach')).toHaveLength(0);
    fireEvent.click(within(dialog).getByText('Mark as contacted'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.last('POST', '/outreach').body).toEqual({ alumni_id: 5, method: 'messenger', message: 'Custom note' });
    const row = await rowOf('Andrea Villanueva');
    await waitFor(() => expect(within(row).getByText('Today · Messenger')).toBeInTheDocument());
    expect(within(row).getByText('Contacted ✓')).toBeInTheDocument();

    // Undo from the dialog removes the mark (DELETE /outreach/:id).
    fireEvent.click(within(row).getByText('Contacted ✓'));
    fireEvent.click(screen.getByText('Remove contacted mark'));
    await waitFor(() => expect(api.find('DELETE', '/outreach/41')).toHaveLength(1));
    await waitFor(() => expect(within(row).getByText('Contact')).toBeInTheDocument());
  });

  it('offers only the platforms on file', async () => {
    outreachApi({ rows: [{ ...ANDREA, id: 6, name: 'Kevin Soriano', email: 'kevin.soriano@gmail.com', facebook: null }] });
    renderAt('/college/outreach');
    fireEvent.click(within(await rowOf('Kevin Soriano')).getByText('Contact'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Facebook Messenger')).toBeNull();
    expect(within(dialog).getByText('kevin.soriano@gmail.com')).toBeInTheDocument();
  });
});

describe('Forgot Password', () => {
  it('sends the code from the API and only moves on once the server accepts it', async () => {
    const api = mockApi([
      session(null),
      ['POST', '/auth/forgot-password', { ok: true }],
      ['POST', '/auth/reset-password/verify-code', (req) => (req.body.code === '482913'
        ? { resetSession: 'rs_1', email: 'maria.delacruz@udmalumni.edu' }
        : { status: 422, body: { error: 'That code doesn’t match the one we sent.', code: 'invalid_code' } })],
    ]);
    renderAt('/forgot-password');
    fireEvent.change(await screen.findByPlaceholderText('e.g. maria.delacruz@udmalumni.edu'), { target: { value: '24-05-567' } });
    fireEvent.click(screen.getByText('Send Reset Code'));
    await waitFor(() => expect(api.last('POST', '/auth/forgot-password').body).toEqual({ identifier: '24-05-567' }));

    const input = await screen.findByPlaceholderText('••••••');
    fireEvent.change(input, { target: { value: '000000' } });
    fireEvent.click(screen.getByText('Verify Code'));
    expect(await screen.findByText('That code doesn’t match the one we sent.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '482913' } });
    fireEvent.click(screen.getByText('Verify Code'));
    expect(await screen.findByText('Update Password')).toBeInTheDocument();
  });
});

describe('Job application via Messenger / Email', () => {
  const JOBS = [
    { id: 1, title: 'Junior Backend Developer', company: 'Brightline Tech', location: 'Manila · Hybrid', type: 'Full-time', applyVia: 'careers@brightline.tech', messenger: 'brightlinetech', status: 'active', source: 'admin', tags: [], createdAt: '2026-10-01T00:00:00Z', saved: false, applied: null },
    { id: 4, title: 'UX/UI Designer', company: 'Formwell Studio', location: 'Pasig · Hybrid', type: 'Full-time', applyVia: 'hello@formwell.studio', messenger: '', status: 'active', source: 'admin', tags: [], createdAt: '2026-10-01T00:00:00Z', saved: false, applied: null },
  ];
  const jobsApi = () => mockApi([
    session('alumni'),
    ['GET', '/me', { a: { first_name: 'Maria', last_name: 'Dela Cruz', email: 'maria.delacruz@udmalumni.edu', course: 'Bachelor of Science in Information Technology', year_graduated: '2024' }, survey: { submitted: true }, record: {} }],
    ['GET', '/jobs', (req) => listOf(req.query.view === 'mine' ? [] : JOBS)],
    ['POST', '/jobs/1/apply', (req) => ({ ...JOBS[0], applied: { via: req.body.via, at: '2026-10-19T00:00:00Z' } })],
  ]);
  const card = async (title) => {
    let el = await screen.findByText(title);
    while (el && !within(el).queryByText('Apply')) el = el.parentElement;
    return el;
  };

  it('offers Messenger and Email, and records the platform used', async () => {
    const api = jobsApi();
    renderAt('/alumni/jobs');
    const job = await card('Junior Backend Developer');
    await waitFor(() => expect(screen.getAllByText(/Maria/).length).toBeGreaterThan(0));
    fireEvent.click(within(job).getByText('Apply'));

    const dialog = screen.getByRole('dialog', { name: 'Apply for Junior Backend Developer' });
    expect(within(dialog).getByText('Open Messenger')).toHaveAttribute('href', 'https://m.me/brightlinetech');
    const mail = within(dialog).getByText('Open email');
    expect(mail.getAttribute('href')).toMatch(/^mailto:careers@brightline\.tech\?subject=Application%20%E2%80%94%20Junior%20Backend%20Developer/);
    expect(decodeURIComponent(mail.getAttribute('href'))).toContain('Hi! I’m Maria Dela Cruz');

    fireEvent.click(mail);
    fireEvent.click(within(dialog).getByText('Mark as applied'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.last('POST', '/jobs/1/apply').body).toEqual({ via: 'email' });
    expect(within(job).getByText('✓ Applied')).toBeInTheDocument();
  });

  it('shows only the platforms the posting lists', async () => {
    jobsApi();
    renderAt('/alumni/jobs');
    fireEvent.click(within(await card('UX/UI Designer')).getByText('Apply'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Facebook Messenger')).toBeNull();
    expect(within(dialog).getByText('hello@formwell.studio')).toBeInTheDocument();
  });
});
