import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_NOTICES, EVENT_DEFS, NOTICE_KINDS, EV_STATUS_META, evCount, evStatusKey, photoCss } from '../data/events';

const STORE = 'udm.events.v1';
const EventsContext = createContext(null);

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
};

/** Events + announcements shared by the Alumni dashboard/events pages and the Admin events management. */
export function EventsProvider({ children }) {
  const saved = useMemo(load, []);
  const [posted, setPosted] = useState(saved.posted || []);
  const [edits, setEdits] = useState(saved.edits || {});
  const [deleted, setDeleted] = useState(saved.deleted || {});
  const [rsvps, setRsvps] = useState(saved.rsvps || {});
  const [calendar, setCalendar] = useState(saved.calendar || {});
  const [notices, setNotices] = useState(saved.notices || null);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify({ posted, edits, deleted, rsvps, calendar, notices })); } catch { /* photos may exceed quota */ }
  }, [posted, edits, deleted, rsvps, calendar, notices]);

  const events = useMemo(
    () => posted.concat(EVENT_DEFS).filter((e) => !deleted[e.id]).map((e) => (edits[e.id] ? { ...e, ...edits[e.id] } : e)),
    [posted, edits, deleted],
  );
  const noticesAll = notices || DEFAULT_NOTICES;

  const patchEvent = useCallback((id, p) => setEdits((s) => ({ ...s, [id]: { ...(s[id] || {}), ...p } })), []);
  const createEvent = useCallback((ev) => setPosted((p) => [ev, ...p]), []);
  const deleteEvent = useCallback((id) => setDeleted((d) => ({ ...d, [id]: true })), []);
  const register = useCallback((ev, answers) => setRsvps((r) => ({ ...r, [ev.id]: answers || {} })), []);
  const cancelRegistration = useCallback((id) => setRsvps((r) => { const n = { ...r }; delete n[id]; return n; }), []);
  const toggleCalendar = useCallback((id) => setCalendar((c) => ({ ...c, [id]: !c[id] })), []);

  /** Feed shown on the Alumni Dashboard: upcoming events + standalone notices, newest first. */
  const announcementItems = useCallback(() => {
    const D = 864e5;
    const base = Date.parse('2026-09-25T09:00:00');
    const toItem = (e) => {
      const sk = evStatusKey(e, rsvps);
      const m = EV_STATUS_META[sk];
      const n = evCount(e, rsvps);
      const mine = !!rsvps[e.id];
      const cx = sk === 'cancelled';
      const countLine = cx ? 'Registered alumni will be notified.'
        : mine ? `✓ You’re registered · ${n.toLocaleString()} going`
          : `${n.toLocaleString()} registered${e.capacity && sk === 'open' ? ` · ${Math.max(0, e.capacity - n)} spots left` : ''}`;
      return {
        id: e.id, month: e.month, day: e.day, kind: e.kind, kindColor: e.kindColor, kindBg: e.kindBg, typeLabel: 'Event', subLabel: '', typeColor: '#0F3D2E', isNotice: false,
        when: String(e.date || '').replace(/^(\w{3})\w*,\s*(\w{3})\w*\s+(\d+).*$/, '$1, $2 $3') + (e.time ? ` · ${e.time}` : ''), venue: e.venue || '',
        cta: cx ? 'View details' : (mine || sk !== 'open') ? 'View details' : 'View details & register',
        meta: cx ? e.date : e.meta, title: e.title, body: cx ? 'This event has been cancelled.' : e.teaser, thumbCss: photoCss(e), hasThumb: true, isEvent: true,
        cursor: 'pointer', hover: { borderColor: '#9FC3B2' }, titleDecor: sk === 'cancelled' ? 'line-through' : 'none',
        statusLabel: mine && !cx ? 'You’re registered' : m.label, statusFg: m.fg, statusBg: m.bg, statusDot: m.dot, countLine,
      };
    };
    const evs = events.map((e, i) => [e, e.pub || base - i * 3 * D]).filter(([e]) => evStatusKey(e, rsvps) !== 'past' && !e.annHidden)
      .map(([e, pub]) => ({ ...toItem(e), pub }));
    const ns = noticesAll.map((n) => ({
      id: n.id, month: n.month, day: n.day, kind: n.kind.toUpperCase(), kindColor: NOTICE_KINDS[n.kind][0], kindBg: NOTICE_KINDS[n.kind][1], meta: n.source, title: n.title, body: n.body,
      typeLabel: 'Announcement', subLabel: `· ${n.kind}`, typeColor: '#8A6D1F', isNotice: true, hasThumb: false, isEvent: false, cursor: 'default', onOpen: null, hover: {}, titleDecor: 'none',
      pub: n.pub || Date.parse(`${n.month} ${n.day}, 2026 09:00`) || 0,
    }));
    return evs.concat(ns).sort((a, b) => b.pub - a.pub);
  }, [events, rsvps, noticesAll]);

  const value = useMemo(() => ({
    events, rsvps, calendar, notices: noticesAll, setNotices, posted,
    patchEvent, createEvent, deleteEvent, register, cancelRegistration, toggleCalendar, announcementItems,
  }), [events, rsvps, calendar, noticesAll, posted, patchEvent, createEvent, deleteEvent, register, cancelRegistration, toggleCalendar, announcementItems]);
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export const useEvents = () => useContext(EventsContext);

