import { act, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { EventsProvider, useEvents } from './EventsContext';
import { evValidate, manilaToday } from '../data/events';
import { listOf, mockApi, session } from '../test/mockApi';

const event = (id, extra = {}) => ({
  id, title: `Event ${id}`, kind: 'EVENT', iso: '2026-11-20', timeStart: '09:00', timeEnd: '12:00', venue: 'UDM Gym, Manila',
  published: true, statusKey: 'open', regCount: 10, capacity: 50, registered: false, pub: '2026-10-01T00:00:00Z', teaser: 'Hello', ...extra,
});

function setup(role, routes = []) {
  const api = mockApi([session(role), ...routes]);
  const wrapper = ({ children }) => <AuthProvider><EventsProvider>{children}</EventsProvider></AuthProvider>;
  const hook = renderHook(() => useEvents(), { wrapper });
  return { api, ...hook, evs: () => hook.result.current };
}

describe('event form validation', () => {
  const ok = { title: 'Homecoming', dateISO: '2099-01-10', timeStart: '09:00', timeEnd: '12:00', venue: 'UDM Gym', body: 'Come home.' };

  it('accepts a complete form', () => expect(evValidate(ok, true)).toEqual({}));

  it('requires title, date, start time, venue and description', () => {
    expect(Object.keys(evValidate({}, false)).sort()).toEqual(['body', 'date', 'time', 'title', 'venue']);
  });

  it('rejects an end time that is not after the start', () => {
    expect(evValidate({ ...ok, timeEnd: '09:00' }, false).time).toBe('End time must be after the start time.');
  });

  it('rejects a past date only when asked to (new events, not edits)', () => {
    expect(evValidate({ ...ok, dateISO: '2020-01-01' }, true).date).toBe('Choose a date that hasn’t passed.');
    expect(evValidate({ ...ok, dateISO: '2020-01-01' }, false)).toEqual({});
    expect(evValidate({ ...ok, dateISO: manilaToday() }, true)).toEqual({});
  });
});

describe('Events — alumni', () => {
  const routes = (state) => [
    ['GET', '/events', () => listOf(state.events)],
    ['GET', '/announcements', () => listOf(state.notices)],
    ['POST', /^\/events\/1\/rsvp$/, (req) => ({ ...state.events[0], registered: true, myAnswers: req.body.answers, regCount: 11 })],
    ['POST', /^\/events\/1\/cancel$/, () => ({ ...state.events[0], registered: false, regCount: 10 })],
  ];

  it('loads events with display fields', async () => {
    const { evs } = setup('alumni', routes({ events: [event(1)], notices: [] }));
    await waitFor(() => expect(evs().events).toHaveLength(1));
    expect(evs().events[0]).toMatchObject({ month: 'Nov', day: '20', year: 2026, time: '9:00 AM – 12:00 PM', meta: '9:00 AM · UDM Gym' });
  });

  it('registers with answers, then cancels the registration', async () => {
    const { api, evs } = setup('alumni', routes({ events: [event(1)], notices: [] }));
    await waitFor(() => expect(evs().events).toHaveLength(1));

    await act(() => evs().register(evs().events[0], { diet: 'Vegetarian' }));
    expect(api.last('POST', '/events/1/rsvp').body).toEqual({ answers: { diet: 'Vegetarian' } });
    expect(evs().rsvps).toEqual({ 1: { diet: 'Vegetarian' } });
    expect(evs().announcementItems()[0]).toMatchObject({ statusLabel: 'You’re registered', countLine: '✓ You’re registered · 11 going' });

    await act(() => evs().cancelRegistration(1));
    expect(evs().rsvps).toEqual({});
    expect(evs().announcementItems()[0].countLine).toBe('10 registered · 40 spots left');
  });

  it('remembers Add to Calendar for the session', async () => {
    const { evs } = setup('alumni', routes({ events: [event(1)], notices: [] }));
    await waitFor(() => expect(evs().events).toHaveLength(1));
    act(() => evs().toggleCalendar(1));
    expect(evs().calendar).toEqual({ 1: true });
    act(() => evs().toggleCalendar(1));
    expect(evs().calendar).toEqual({ 1: false });
  });

  it('builds the dashboard feed: newest first, without past, hidden or unpublished events', async () => {
    const state = {
      events: [
        event(1, { pub: '2026-10-01T00:00:00Z' }),
        event(2, { pub: '2026-10-05T00:00:00Z', statusKey: 'past' }),
        event(3, { pub: '2026-10-06T00:00:00Z', annHidden: true }),
        event(4, { pub: '2026-10-07T00:00:00Z', published: false }),
        event(5, { pub: '2026-10-03T00:00:00Z', statusKey: 'cancelled' }),
      ],
      notices: [{ id: 'n1', kind: 'Reminder', title: 'Update your record', body: '…', source: 'Alumni Office', pub: '2026-10-04T00:00:00Z' }, { id: 'n2', kind: 'Notice', title: 'Hidden', body: '', hidden: true, pub: '2026-10-09T00:00:00Z' }],
    };
    const { evs } = setup('alumni', routes(state));
    await waitFor(() => expect(evs().events).toHaveLength(5));
    await waitFor(() => expect(evs().notices).toHaveLength(2));
    const feed = evs().announcementItems();
    expect(feed.map((i) => i.id)).toEqual(['n1', 5, 1]);
    expect(feed[0]).toMatchObject({ isNotice: true, typeLabel: 'Announcement', kind: 'REMINDER' });
    expect(feed[1]).toMatchObject({ body: 'This event has been cancelled.', titleDecor: 'line-through', statusLabel: 'Cancelled' });
  });
});

describe('Events — admin', () => {
  it('creates an event, keeping a duplicated event’s cover', async () => {
    const { api, evs } = setup('admin', [
      ['GET', '/events', listOf([])], ['GET', '/announcements', listOf([])],
      ['POST', '/events', (req) => event(9, { title: req.body.title, photo: '/files/cover.jpg' })],
    ]);
    await waitFor(() => expect(api.find('GET', '/events')).toHaveLength(1));
    await act(() => evs().createEvent({ title: 'Homecoming (copy)', organizer: 'Alumni Office', dateISO: '2026-12-01', timeStart: '09:00', venue: 'Gym', body: 'x', coverFrom: 3, photo: '/files/cover.jpg' }));
    expect(api.last('POST', '/events').body).toMatchObject({ title: 'Homecoming (copy)', coverFrom: 3, timeEnd: '' });
    expect(api.calls.some((c) => c.path.endsWith('/photo'))).toBe(false);
    expect(evs().events.map((e) => e.id)).toEqual([9]);
  });

  it('does not copy the cover when the duplicate has no photo', async () => {
    const { api, evs } = setup('admin', [['GET', '/events', listOf([])], ['GET', '/announcements', listOf([])], ['POST', '/events', event(9)]]);
    await waitFor(() => expect(api.find('GET', '/events')).toHaveLength(1));
    await act(() => evs().createEvent({ title: 'Copy', dateISO: '2026-12-01', timeStart: '09:00', venue: 'Gym', body: 'x', coverFrom: 3, photo: null }));
    expect(api.last('POST', '/events').body.coverFrom).toBeUndefined();
  });

  it('removes a cover photo when the edit clears it', async () => {
    const { api, evs } = setup('admin', [
      ['GET', '/events', listOf([event(1, { photo: '/files/a.jpg' })])], ['GET', '/announcements', listOf([])],
      ['PATCH', /^\/events\/1$/, event(1, { title: 'Renamed', photo: '/files/a.jpg' })],
      ['DELETE', /^\/events\/1\/photo$/, event(1, { title: 'Renamed', photo: null })],
    ]);
    await waitFor(() => expect(evs().events).toHaveLength(1));
    await act(() => evs().patchEvent(1, { title: 'Renamed', photo: null }));
    expect(api.last('PATCH', '/events/1').body).toEqual({ title: 'Renamed' });
    expect(api.find('DELETE', '/events/1/photo')).toHaveLength(1);
    expect(evs().events[0]).toMatchObject({ title: 'Renamed', photo: null });
  });

  it('changes status, cancels and deletes events', async () => {
    const { api, evs } = setup('admin', [
      ['GET', '/events', listOf([event(1), event(2)])], ['GET', '/announcements', listOf([])],
      ['PATCH', /^\/events\/1$/, event(1, { statusKey: 'closed' })],
      ['POST', /^\/events\/1\/cancel-event$/, event(1, { statusKey: 'cancelled' })],
      ['DELETE', /^\/events\/2$/, { status: 204, body: undefined }],
    ]);
    await waitFor(() => expect(evs().events).toHaveLength(2));
    await act(() => evs().patchEvent(1, { status: 'closed' }));
    expect(api.last('PATCH', '/events/1').body).toEqual({ status: 'closed' });
    expect(evs().events[0].statusKey).toBe('closed');
    await act(() => evs().cancelEvent(1));
    expect(evs().events[0].statusKey).toBe('cancelled');
    await act(() => evs().deleteEvent(2));
    expect(evs().events.map((e) => e.id)).toEqual([1]);
  });

  it('posts, edits and removes announcements', async () => {
    const { api, evs } = setup('admin', [
      ['GET', '/events', listOf([])], ['GET', '/announcements', listOf([])],
      ['POST', '/announcements', (req) => ({ id: 'a1', ...req.body, pub: '2026-10-15T02:00:00Z' })],
      ['PATCH', /^\/announcements\/a1$/, (req) => ({ id: 'a1', ...req.body, pub: '2026-10-15T02:00:00Z' })],
      ['DELETE', /^\/announcements\/a1$/, { status: 204, body: undefined }],
    ]);
    await waitFor(() => expect(api.find('GET', '/announcements')).toHaveLength(1));
    await act(() => evs().saveNotice({ kind: 'Update', title: 'New portal', body: 'Live now' }));
    expect(evs().notices[0]).toMatchObject({ id: 'a1', title: 'New portal', month: 'Oct', day: '15', year: 2026 });
    await act(() => evs().saveNotice({ id: 'a1', kind: 'Update', title: 'New portal v2', body: 'Live now' }));
    expect(evs().notices.map((n) => n.title)).toEqual(['New portal v2']);
    await act(() => evs().removeNotice('a1'));
    expect(evs().notices).toEqual([]);
  });
});
