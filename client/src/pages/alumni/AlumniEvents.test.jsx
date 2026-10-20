import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const event = (id, extra = {}) => ({
  id, title: `Event ${id}`, kind: 'EVENT', iso: '2099-11-20', timeStart: '09:00', timeEnd: '12:00', venue: 'UDM Gym, Manila', organizer: 'Alumni Office',
  published: true, statusKey: 'open', regCount: 10, capacity: 50, registered: false, regFields: [], body: ['Come home.'], pub: '2026-10-01T00:00:00Z', ...extra,
});
const ME = { a: { first_name: 'Ana', last_name: 'Cruz', email: 'ana@example.com' }, survey: { submitted: true }, record: { photoUrl: null, updatedAt: '2026-10-01T00:00:00Z' } };

function setup(events, routes = []) {
  return mockApi([
    session('alumni'), ['GET', '/me', ME], ['GET', /^\/(jobs|notifications)(\?|$)/, listOf([])],
    ['GET', '/events', listOf(events)], ['GET', '/announcements', listOf([])],
    ...routes,
  ]);
}

describe('Alumni Events page', () => {
  it('lists events soonest first and filters by category', async () => {
    const user = userEvent.setup();
    setup([event(1, { title: 'Homecoming', iso: '2099-12-01' }), event(2, { title: 'Job Fair', kind: 'CAREER', iso: '2099-11-05' })]);
    renderAt('/alumni/events');
    expect(await screen.findByText('2 events · soonest first')).toBeInTheDocument();
    // The soonest event opens first.
    expect(screen.getByRole('heading', { name: 'Job Fair' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Career' }));
    expect(await screen.findByText('1 event · soonest first')).toBeInTheDocument();
    expect(screen.queryByText('Homecoming')).toBeNull();
  });

  it('shows the selected event’s details', async () => {
    const user = userEvent.setup();
    setup([event(1, { title: 'Homecoming', iso: '2099-12-01', venue: 'UDM Quadrangle' }), event(2, { title: 'Job Fair', iso: '2099-11-05' })]);
    renderAt('/alumni/events');
    await screen.findByRole('heading', { name: 'Job Fair' });
    await user.click(screen.getByRole('button', { name: /Homecoming/ }));
    expect(await screen.findByRole('heading', { name: 'Homecoming' })).toBeInTheDocument();
    expect(screen.getAllByText(/UDM Quadrangle/).length).toBeGreaterThan(0);
    expect(screen.getByText('40 spots left')).toBeInTheDocument();
  });

  it('registers for an event without questions, then cancels', async () => {
    const user = userEvent.setup();
    const api = setup([event(1)], [
      ['POST', /^\/events\/1\/rsvp$/, (req) => event(1, { registered: true, myAnswers: req.body.answers, regCount: 11 })],
      ['POST', /^\/events\/1\/cancel$/, event(1)],
    ]);
    renderAt('/alumni/events');
    await user.click(await screen.findByRole('button', { name: 'Register for Event' }));
    await waitFor(() => expect(api.last('POST', '/events/1/rsvp')).toBeTruthy());
    expect(api.last('POST', '/events/1/rsvp').body).toEqual({ answers: {} });
    expect(await screen.findByRole('button', { name: '✓ Registered' })).toBeInTheDocument();
    expect(screen.getAllByText('You’re registered for Event 1.').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByText('Your registration for Event 1 was cancelled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register for Event' })).toBeInTheDocument();
  });

  it('does not let alumni register for a full event', async () => {
    const user = userEvent.setup();
    const api = setup([event(1, { statusKey: 'full', regCount: 50 })]);
    renderAt('/alumni/events');
    const btn = await screen.findByRole('button', { name: 'Event Full' });
    expect(screen.getByText('All 50 spots taken')).toBeInTheDocument();
    await user.click(btn);
    expect(api.find('POST', '/events/1/rsvp')).toHaveLength(0);
  });

  it('adds an event to Google Calendar', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    setup([event(1)]);
    renderAt('/alumni/events');
    await user.click(await screen.findByRole('button', { name: '+ Add to Calendar' }));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/calendar\.google\.com\//), '_blank', 'noopener,noreferrer');
    expect(screen.getByRole('button', { name: '✓ Added to Calendar' })).toBeInTheDocument();
    open.mockRestore();
  });
});
