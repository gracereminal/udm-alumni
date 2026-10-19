import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { JobsProvider } from '../context/JobsContext';
import { EventsProvider } from '../context/EventsContext';
import { SearchProvider } from '../context/SearchContext';
import { ToastProvider } from '../context/ToastContext';
import { ResetFlowProvider } from '../context/ResetFlowContext';
import { NAV } from '../data/navigation';
import { listOf, loadTestCatalog, mockApi, session } from '../test/mockApi';
import AppRoutes from './AppRoutes';

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

const ME = { a: { first_name: 'Maria', last_name: 'Dela Cruz', email: 'maria.delacruz@udmalumni.edu' }, survey: { submitted: false }, record: { photoUrl: null, updatedAt: '2026-10-01T00:00:00Z' } };

describe('every signed-in page renders for its role', () => {
  const cases = Object.entries(NAV).flatMap(([role, items]) => items.map((it) => [role, it.to]));
  it.each(cases)('%s → %s', async (role, to) => {
    // Lists answer empty; anything else the page asks for answers 404, which every page has to survive.
    mockApi([session(role), ['GET', '/me', ME], ['GET', /^\/(jobs|events|announcements|alumni|notifications|reports\/exports)(\?|$)/, listOf([])]]);
    const { container } = renderAt(to);
    await waitFor(() => expect(container.querySelector('aside[aria-label="Main navigation"]')).not.toBeNull());
  });

  it('renders Edit Profile for alumni', async () => {
    mockApi([session('alumni'), ['GET', '/me', ME]]);
    renderAt('/alumni/profile/edit');
    expect(await screen.findByText('Save Changes')).toBeInTheDocument();
  });
});

describe('event registration email', () => {
  const RUN = {
    id: 3, title: 'Merlion Run 2026 — Scholarship Fun Run', kind: 'COMMUNITY', iso: '2026-11-08', timeStart: '05:00', timeEnd: '05:30', venue: 'Rizal Park, Ermita, Manila',
    fee: '₱500 (3K) · ₱650 (5K)', organizer: 'UDM Alumni Association', published: true, statusKey: 'open', regStatus: 'open', regCount: 134, capacity: 600, body: ['Proceeds go to the scholarship fund.'],
    highlights: [], agenda: [], regFields: [
      { key: 'dist', label: 'Race category', options: ['3K · ₱500', '5K · ₱650'] },
      { key: 'size', label: 'Singlet size', options: ['S', 'M', 'L'] },
    ], registered: false, myAnswers: null, myRegisteredAt: null, myEntryPass: null,
  };

  // An earlier event the alumnus already registered for: the ?event= link (a string id) must still open event 3.
  const FAIR = { ...RUN, id: 2, title: 'Alumni Job Fair', iso: '2026-10-25', regFields: [], registered: true, myAnswers: {} };

  it('registers with the dialog answers and previews the confirmation with the server’s entry pass', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const api = mockApi([
      session('alumni'), ['GET', '/me', ME], ['GET', '/events', listOf([FAIR, RUN])], ['GET', '/announcements', listOf([])],
      ['POST', '/events/3/rsvp', (req) => ({ ...RUN, registered: true, regCount: 135, myAnswers: req.body.answers, myRegisteredAt: '2026-10-19T02:00:00Z', myEntryPass: 'UDM-3XXX-04127', emailSent: true })],
    ]);
    renderAt('/alumni/events?event=3');
    await user.click(await screen.findByRole('button', { name: 'Register for Event' }));
    const confirm = screen.getByRole('button', { name: 'Confirm Registration' });
    await user.click(screen.getByRole('button', { name: '5K · ₱650' }));
    await user.click(screen.getByRole('button', { name: 'M' }));
    await user.click(confirm);
    await waitFor(() => expect(api.last('POST', '/events/3/rsvp').body).toEqual({ answers: { dist: '5K · ₱650', size: 'M' } }));
    // Demo only (dev / VITE_DEMO): the Sample Email inbox shows the confirmation the API emailed.
    await user.click(await screen.findByRole('button', { name: 'View email' }));
    expect((await screen.findAllByText('You’re registered: Merlion Run 2026 — Scholarship Fun Run')).length).toBeGreaterThan(0);
    const mail = document.querySelector('[data-email-template]');
    expect(mail.textContent).toContain('5K · ₱650 · M');
    expect(mail.textContent).toContain('UDM-3XXX-04127');
  });
});
