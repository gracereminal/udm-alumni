import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { listOf, mockApi, session } from '../../test/mockApi';
import { renderAt } from '../../test/renderApp';

const event = (id, extra = {}) => ({
  id, title: `Event ${id}`, kind: 'EVENT', iso: '2099-11-20', timeStart: '09:00', timeEnd: '12:00', venue: 'UDM Gym, Manila', organizer: 'Alumni Office',
  published: true, statusKey: 'open', regCount: 10, capacity: 50, registered: false, regFields: [], body: ['Come home.'], pub: '2026-10-01T00:00:00Z', ...extra,
});

function setup(events, routes = [], notices = []) {
  return mockApi([
    session('admin'), ['GET', /^\/(jobs|notifications)(\?|$)/, listOf([])],
    ['GET', '/events', listOf(events)], ['GET', '/announcements', listOf(notices)],
    ['GET', /^\/events\/\d+\/registrations/, { data: [], active: 0 }],
    ...routes,
  ]);
}
const tab = (name) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });

describe('Admin Events page', () => {
  it('sorts events into Upcoming, Past and Cancelled and searches them', async () => {
    const user = userEvent.setup();
    setup([event(1, { title: 'Homecoming' }), event(2, { title: 'Job Fair' }), event(3, { title: 'Reunion 2020', statusKey: 'past' }), event(4, { title: 'Fun Run', statusKey: 'cancelled' })]);
    renderAt('/admin/events');
    expect(await screen.findByText('Homecoming')).toBeInTheDocument();
    expect(tab('Upcoming')).toHaveTextContent('2');
    expect(tab('Past')).toHaveTextContent('1');
    expect(tab('Cancelled')).toHaveTextContent('1');
    expect(screen.queryByText('Reunion 2020')).toBeNull();

    await user.type(screen.getByRole('searchbox', { name: 'Search events' }), 'fair');
    expect(screen.queryByText('Homecoming')).toBeNull();
    expect(screen.getByText('Job Fair')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Search events' }));
    await user.click(tab('Past'));
    expect(await screen.findByText('Reunion 2020')).toBeInTheDocument();
    expect(screen.queryByText('Homecoming')).toBeNull();
  });

  it('checks the event form, then publishes the event', async () => {
    const user = userEvent.setup();
    const api = setup([], [['POST', '/events', (req) => event(9, { title: req.body.title, iso: req.body.dateISO, venue: req.body.venue })]]);
    renderAt('/admin/events');
    // The header button (the empty list offers a second one).
    await user.click((await screen.findAllByRole('button', { name: /Create event/ }))[0]);
    const form = await screen.findByRole('dialog', { name: 'Create event' });
    await user.click(within(form).getByRole('button', { name: 'Publish event' }));
    expect(within(form).getByLabelText(/^Event title/)).toHaveAttribute('aria-invalid', 'true');
    expect(api.find('POST', '/events')).toHaveLength(0);

    await user.type(within(form).getByLabelText(/^Event title/), 'Homecoming 2099');
    await user.type(within(form).getByLabelText(/^Date/), '2099-12-01');
    await user.type(within(form).getByLabelText(/^Venue/), 'UDM Gym');
    await user.type(within(form).getByLabelText(/^Description/), 'Come home.');
    await user.click(within(form).getByRole('button', { name: 'Publish event' }));
    await waitFor(() => expect(api.find('POST', '/events')).toHaveLength(1));
    expect(api.last('POST', '/events').body).toMatchObject({ title: 'Homecoming 2099', dateISO: '2099-12-01', timeStart: '09:00', timeEnd: '12:00', venue: 'UDM Gym', body: 'Come home.' });
    expect(await screen.findByText('Event published. Its announcement is now on the Dashboard.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Create event' })).toBeNull();
    expect(screen.getByText('Homecoming 2099')).toBeInTheDocument();
  });

  it('cancels an event after confirming', async () => {
    const user = userEvent.setup();
    const api = setup([event(1)], [['POST', /^\/events\/1\/cancel-event$/, event(1, { statusKey: 'cancelled' })]]);
    renderAt('/admin/events');
    await user.click(await screen.findByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Cancel event' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Cancel this event?' });
    await user.click(within(confirm).getByRole('button', { name: 'Cancel event' }));
    await waitFor(() => expect(api.find('POST', '/events/1/cancel-event')).toHaveLength(1));
    expect(await screen.findByText('Event cancelled. Its announcement now shows it as cancelled.')).toBeInTheDocument();
    expect(tab('Cancelled')).toHaveTextContent('1');
  });

  it('deletes an event after confirming', async () => {
    const user = userEvent.setup();
    const api = setup([event(1)], [['DELETE', /^\/events\/1$/, { status: 204, body: undefined }]]);
    renderAt('/admin/events');
    await user.click(await screen.findByRole('button', { name: 'More actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete this event?' });
    expect(confirm).toHaveTextContent('and its 10 responses');
    await user.click(within(confirm).getByRole('button', { name: 'Delete event' }));
    await waitFor(() => expect(api.find('DELETE', '/events/1')).toHaveLength(1));
    expect(await screen.findByText('Event deleted. Its announcement was removed.')).toBeInTheDocument();
    expect(screen.queryByText('Event 1')).toBeNull();
  });

  it('posts an announcement to the Dashboard', async () => {
    const user = userEvent.setup();
    const api = setup([], [['POST', '/announcements', (req) => ({ id: 'a1', ...req.body, pub: '2026-10-15T02:00:00Z' })]]);
    renderAt('/admin/events');
    await user.click(await screen.findByRole('button', { name: /New announcement/ }));
    await user.click(screen.getByRole('button', { name: 'Post to Dashboard' }));
    expect(await screen.findByText('Enter a title.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Title/), 'Tracer survey is open');
    await user.type(screen.getByRole('textbox', { name: /^Message/ }), 'Please update your record.');
    await user.click(screen.getByRole('button', { name: 'Post to Dashboard' }));
    await waitFor(() => expect(api.find('POST', '/announcements')).toHaveLength(1));
    expect(api.last('POST', '/announcements').body).toEqual({ kind: 'Notice', title: 'Tracer survey is open', body: 'Please update your record.', source: 'UDM Alumni Relations Office' });
    expect(await screen.findByText('Announcement posted to the Dashboard.')).toBeInTheDocument();
  });
});
