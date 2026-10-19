import { googleCalendarUrl } from './events';

const params = (url) => new URL(url).searchParams;
// Events as GET /events returns them (times in Manila, timeStart / timeEnd as HH:MM).
const EVENTS = {
  homecoming: { id: 1, title: 'UDM Grand Alumni Homecoming 2026', iso: '2026-10-12', time: '4:00 PM – 10:00 PM', timeStart: '16:00', timeEnd: '22:00', venue: 'UDM Gymnasium, Mehan Gardens, Manila' },
  run: { id: 3, title: 'Merlion Run 2026 — Scholarship Fun Run', iso: '2026-11-08', time: '5:00 AM assembly · 5:30 AM gun start', timeStart: '05:00', timeEnd: '05:30', venue: 'Rizal Park, Ermita, Manila' },
};
const byId = (id) => EVENTS[id];

describe('googleCalendarUrl', () => {
  it('prefills a Google Calendar event with the time range in Manila time', () => {
    const url = googleCalendarUrl(byId('homecoming'), 'https://alumni.udm.edu.ph/alumni/events?event=homecoming');
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);
    const q = params(url);
    expect(q.get('action')).toBe('TEMPLATE');
    expect(q.get('text')).toBe('UDM Grand Alumni Homecoming 2026');
    expect(q.get('dates')).toBe('20261012T160000/20261012T220000');
    expect(q.get('ctz')).toBe('Asia/Manila');
    expect(q.get('location')).toBe('UDM Gymnasium, Mehan Gardens, Manila');
    expect(q.get('details')).toContain('https://alumni.udm.edu.ph/alumni/events?event=homecoming');
  });

  it('uses a 2-hour slot when the second time is not an end time', () => {
    expect(params(googleCalendarUrl(byId('run'))).get('dates')).toBe('20261108T050000/20261108T070000');
  });

  it('makes an all-day event when there is no time', () => {
    expect(params(googleCalendarUrl({ title: 'X', iso: '2026-12-31', time: '' })).get('dates')).toBe('20261231/20270101');
  });
});
