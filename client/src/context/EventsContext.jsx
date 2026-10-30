import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { dataUrlToBlob, del, get, list, patch, post, upload } from '../lib/api';
import useLiveRefresh from '../hooks/useLiveRefresh';
import { EVENT_KIND_STYLE, EV_MONTHS_SHORT, EV_STATUS_META, NOTICE_KINDS, evCount, evFmtTime, evPad, evStatusKey, photoCss } from '../data/events';

const EventsContext = createContext(null);

const longDate = (iso) => (iso ? new Date(`${iso}T12:00:00+08:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }) : '');
const manilaParts = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  const [y, m, day] = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }).split('-').map(Number);
  return { month: EV_MONTHS_SHORT[m - 1], day: evPad(day), year: y };
};

/** API event -> the shape the events pages, the admin list and the dashboard feed render. */
function toEvent(e) {
  const [y, m, d] = String(e.iso || '').split('-').map(Number);
  const time = evFmtTime(e);
  const [kindColor, kindBg] = EVENT_KIND_STYLE[e.kind] || EVENT_KIND_STYLE.EVENT;
  return {
    ...e, kindColor, kindBg, month: m ? EV_MONTHS_SHORT[m - 1] : '', day: d ? evPad(d) : '', year: y,
    date: longDate(e.iso), time, meta: [time.split(' – ')[0], String(e.venue || '').split(',')[0]].filter(Boolean).join(' · '),
    pub: e.pub ? Date.parse(e.pub) : 0,
  };
}
const toNotice = (n) => ({ ...n, ...manilaParts(n.pub), pub: n.pub ? Date.parse(n.pub) : 0 });

/** Events + announcements shared by the Alumni dashboard/events pages and the Admin events management, all through /events. */
export function EventsProvider({ children }) {
  const { user, role } = useAuth();
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  // "Add to Calendar" opens a Google Calendar link (data/events.js googleCalendarUrl); this only remembers it for the session.
  const [calendar, setCalendar] = useState({});

  const reload = useCallback(async () => {
    if (!user || (role !== 'admin' && role !== 'alumni')) { setEvents([]); setNotices([]); return; }
    const [evs, ns] = await Promise.all([list('/events'), list('/announcements')]);
    setEvents(evs.map(toEvent)); setNotices(ns.map(toNotice));
  }, [user, role]);
  useEffect(() => { reload().catch(() => {}); }, [reload]);
  // Keep events, RSVP counts and announcements in step with changes made elsewhere (an admin publishing or cancelling,
  // other alumni registering): refetch when the tab comes back into view and every minute while it is.
  useLiveRefresh(() => reload().catch(() => {}), { enabled: !!user && (role === 'admin' || role === 'alumni') });

  const put1 = (e) => setEvents((list) => (list.some((x) => x.id === e.id) ? list.map((x) => (x.id === e.id ? toEvent(e) : x)) : [toEvent(e), ...list]));
  const attachPhoto = async (id, photo) => (photo && String(photo).startsWith('data:') ? upload(`/events/${id}/photo`, 'photo', dataUrlToBlob(photo), 'cover.jpg') : null);

  /** Composer form -> POST /events (published at once, alumni notified). A duplicate keeps its source's cover
   *  (`coverFrom`) unless the admin picked a new image or removed it. */
  const createEvent = useCallback(async (f) => {
    const keepCover = f.coverFrom && f.photo && !String(f.photo).startsWith('data:');
    const e = await post('/events', { title: f.title, organizer: f.organizer, dateISO: f.dateISO, timeStart: f.timeStart, timeEnd: f.timeEnd || '', venue: f.venue, body: f.body, ...(keepCover ? { coverFrom: f.coverFrom } : {}) });
    put1((await attachPhoto(e.id, f.photo)) || e);
  }, []);
  /** Partial update: composer fields, `status` (open | closed | past) or `annHidden`. `photo: null` removes the cover. */
  const patchEvent = useCallback(async (id, p) => {
    const { photo, ...rest } = p;
    const e = await patch(`/events/${id}`, rest);
    if (photo === null && e.photo) { put1(await del(`/events/${id}/photo`)); return; }
    put1((await attachPhoto(id, photo)) || e);
  }, []);
  const cancelEvent = useCallback(async (id) => put1(await post(`/events/${id}/cancel-event`)), []);
  const deleteEvent = useCallback(async (id) => { await del(`/events/${id}`); setEvents((l) => l.filter((x) => x.id !== id)); }, []);
  const registrations = useCallback((id) => get(`/events/${id}/registrations`), []);

  const register = useCallback(async (ev, answers) => put1(await post(`/events/${ev.id}/rsvp`, { answers: answers || {} })), []);
  const cancelRegistration = useCallback(async (id) => put1(await post(`/events/${id}/cancel`)), []);
  const toggleCalendar = useCallback((id) => setCalendar((c) => ({ ...c, [id]: !c[id] })), []);

  const saveNotice = useCallback(async (n) => {
    const body = { kind: n.kind, title: n.title, body: n.body, ...(n.source ? { source: n.source } : {}) };
    const row = toNotice(n.id ? await patch(`/announcements/${n.id}`, body) : await post('/announcements', body));
    setNotices((l) => (n.id ? l.map((x) => (x.id === row.id ? row : x)) : [row, ...l]));
  }, []);
  const removeNotice = useCallback(async (id) => { await del(`/announcements/${id}`); setNotices((l) => l.filter((x) => x.id !== id)); }, []);

  /** The alumnus' own registrations: event id -> registration answers, and when each was made (dates the confirmation email). */
  const rsvps = useMemo(() => Object.fromEntries(events.filter((e) => e.registered).map((e) => [e.id, e.myAnswers || {}])), [events]);
  const rsvpAt = useMemo(() => Object.fromEntries(events.filter((e) => e.registered).map((e) => [e.id, Date.parse(e.myRegisteredAt) || null])), [events]);

  /** Feed shown on the Alumni Dashboard: upcoming events + standalone notices, newest first. */
  const announcementItems = useCallback(() => {
    const toItem = (e) => {
      const sk = evStatusKey(e);
      const m = EV_STATUS_META[sk];
      const n = evCount(e);
      const mine = !!e.registered;
      const cx = sk === 'cancelled';
      const countLine = cx ? 'Registered alumni will be notified.'
        : mine ? `✓ You’re registered · ${n.toLocaleString()} going`
          : `${n.toLocaleString()} registered${e.capacity && sk === 'open' ? ` · ${Math.max(0, e.capacity - n)} spots left` : ''}`;
      return {
        id: e.id, month: e.month, day: e.day, kind: e.kind, kindColor: e.kindColor, kindBg: e.kindBg, typeLabel: 'Event', subLabel: '', typeColor: '#0F3D2E', isNotice: false,
        when: String(e.date || '').replace(/^(\w{3})\w*,\s*(\w{3})\w*\s+(\d+).*$/, '$1, $2 $3') + (e.time ? ` · ${e.time}` : ''), venue: e.venue || '',
        cta: cx ? 'View details' : (mine || sk !== 'open') ? 'View details' : 'View details & register',
        meta: cx ? e.date : e.meta, title: e.title, body: cx ? 'This event has been cancelled.' : e.teaser, thumbCss: photoCss(e), hasThumb: true, isEvent: true,
        cursor: 'pointer', hover: { borderColor: '#9FC3B2' }, titleDecor: cx ? 'line-through' : 'none',
        statusLabel: mine && !cx ? 'You’re registered' : m.label, statusFg: m.fg, statusBg: m.bg, statusDot: m.dot, countLine, pub: e.pub,
      };
    };
    const evs = events.filter((e) => e.published && evStatusKey(e) !== 'past' && !e.annHidden).map(toItem);
    const ns = notices.filter((n) => !n.hidden).map((n) => ({
      id: n.id, month: n.month, day: n.day, kind: n.kind.toUpperCase(), kindColor: NOTICE_KINDS[n.kind][0], kindBg: NOTICE_KINDS[n.kind][1], meta: n.source, title: n.title, body: n.body,
      typeLabel: 'Announcement', subLabel: `· ${n.kind}`, typeColor: '#8A6D1F', isNotice: true, hasThumb: false, isEvent: false, cursor: 'default', onOpen: null, hover: {}, titleDecor: 'none', pub: n.pub,
    }));
    return evs.concat(ns).sort((a, b) => b.pub - a.pub);
  }, [events, notices]);

  const value = useMemo(() => ({
    events, rsvps, rsvpAt, calendar, notices, reload, registrations,
    createEvent, patchEvent, cancelEvent, deleteEvent, register, cancelRegistration, toggleCalendar, saveNotice, removeNotice, announcementItems,
  }), [events, rsvps, rsvpAt, calendar, notices, reload, registrations, createEvent, patchEvent, cancelEvent, deleteEvent, register, cancelRegistration, toggleCalendar, saveNotice, removeNotice, announcementItems]);
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export const useEvents = () => useContext(EventsContext);
