import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EventsView from '../../views/EventsView';
import { useEvents } from '../../context/EventsContext';
import { useToast } from '../../context/ToastContext';
import { SHOW_DEMO } from '../../data/demoAccounts';
import { EV_STATUS_META, evCat, evCount, evStatusKey, evTs, googleCalendarUrl, photoCss } from '../../data/events';

const FILTERS = ['All', 'Events', 'Career', 'Community'];

/** Alumni Events: browsable list, event details, registration dialog (with questions), calendar and status. */
export default function AlumniEvents() {
  const { events, rsvps, calendar, register, cancelRegistration, toggleCalendar } = useEvents();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  // ?event= is the link in the registration email; state.eventId comes from in-app links.
  const linkedId = location.state?.eventId || new URLSearchParams(location.search).get('event');
  const [selId, setSelId] = useState(linkedId || null);
  const [filter, setFilter] = useState('All');
  const [dlg, setDlg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (linkedId) { setSelId(linkedId); setFilter('All'); } }, [linkedId]);

  const rows = events.map((e) => ({ e, sk: evStatusKey(e), ts: evTs(e) }));
  const up = rows.filter((r) => r.sk !== 'past').sort((a, b) => a.ts - b.ts);
  const past = rows.filter((r) => r.sk === 'past').sort((a, b) => b.ts - a.ts);
  const vis = up.concat(past).filter((r) => filter === 'All' || evCat(r.e) === filter);
  const firstPast = vis.findIndex((r) => r.sk === 'past');
  // The ?event= link gives the id as a string; API ids are numbers.
  const ev = events.find((e) => selId != null && String(e.id) === String(selId)) || (vis[0] && vis[0].e) || events[0];

  if (!ev) {
    return <EventsView {...{ evListEmpty: true, evListCount: '0 events', eventsList: [], evFilters: [], evTitle: 'No events', evBody: [], evAgenda: [], evHighlights: [], regDlgFields: [] }} />;
  }

  const sk = evStatusKey(ev);
  const sm = EV_STATUS_META[sk];
  const reg = rsvps[ev.id];
  const n = evCount(ev);
  const cap = ev.capacity;
  const open = sk === 'open';
  const dEv = dlg && events.find((x) => x.id === dlg.id);
  const ans = (dlg && dlg.answers) || {};
  const dReady = !!dEv && (dEv.regFields || []).every((f) => ans[f.key]);
  const regAns = reg ? Object.values(reg).filter(Boolean).join(' · ') : '';

  const doRegister = (e, answers) => {
    if (busy) return;
    setBusy(true);
    register(e, answers).then(() => { setDlg(null); toast(`You’re registered for ${e.title}.`); }, (err) => toast(err.message || 'Couldn’t register. Please try again.', false)).finally(() => setBusy(false));
  };
  const v = {
    evFilters: FILTERS.map((f) => ({
      label: f, bg: f === filter ? '#fff' : 'transparent', color: f === filter ? '#0F3D2E' : '#64748B', shadow: f === filter ? '0 1px 2px rgba(16,24,40,.08)' : 'none', onClick: () => setFilter(f),
    })),
    evListEmpty: vis.length === 0,
    evListCount: vis.length + (vis.length === 1 ? ' event' : ' events'),
    eventsList: vis.map((r, k) => {
      const e = r.e;
      const on = e.id === ev.id;
      const m = EV_STATUS_META[r.sk];
      return {
        month: String(e.month).toUpperCase(), day: e.day, kind: e.kind, kindColor: e.kindColor, kindBg: e.kindBg, title: e.title, meta: e.meta, pastHeader: k === firstPast, notOpen: r.sk !== 'open',
        statusLabel: m.label, statusColor: m.fg,
        cardBg: on ? '#EEF4F1' : r.sk === 'past' ? '#F6F8F7' : '#fff', cardBorder: on ? '#0F3D2E' : r.sk === 'past' ? '#EAEEEC' : '#E7E9ED', cardShadow: on ? 'inset 3px 0 0 #0F3D2E' : 'none',
        dateBg: on ? '#0F3D2E' : r.sk === 'past' ? '#ECEFEE' : '#EEF4F1', dateColor: on ? '#fff' : r.sk === 'past' ? '#64748B' : '#0F3D2E', dateSub: on ? '#CFE3DA' : '#64748B',
        titleColor: r.sk === 'past' && !on ? '#475569' : '#0B1220', hover: on ? {} : { borderColor: '#9FC3B2' }, onClick: () => setSelId(e.id),
      };
    }),
    evTitle: ev.title, evKind: ev.kind, evOrganizer: ev.organizer,
    evStatus: sm.label, evStatusFg: sm.fg, evStatusBg: sm.bg, evStatusDot: sm.dot,
    evHasPhoto: !!ev.photo, evPhotoCss: photoCss(ev), evNoPhoto: !ev.photo,
    evDate: ev.date, evTime: ev.time, evVenue: ev.venue, evFee: ev.fee,
    evBody: (ev.body || []).map((t) => ({ text: t })),
    evHasHighlights: !!(ev.highlights && ev.highlights.length),
    evHighlights: (ev.highlights || []).map((t) => ({ text: t })),
    evHasAgenda: !!(ev.agenda && ev.agenda.length),
    evAgenda: (ev.agenda || []).map((a, i, arr) => ({ time: a.time, label: a.label, line: i === arr.length - 1 ? 'transparent' : '#D5E3DC' })),
    evCount: sk === 'past' ? `${n} alumni attended` : n === 0 ? 'Be the first to register' : `${n.toLocaleString()} alumni registered`,
    evCapNote: cap && sk !== 'past' ? (n >= cap ? `All ${cap} spots taken` : `${cap - n} spots left`) : '',
    evHasCapNote: !!(cap && sk !== 'past'),
    evCapPct: cap ? `${Math.min(100, Math.round((n / cap) * 100))}%` : '0%',
    evCanCal: sk !== 'past',
    regLabel: reg ? '✓ Registered' : open ? 'Register for Event' : sk === 'full' ? 'Event Full' : sk === 'closed' ? 'Registration Closed' : sk === 'cancelled' ? 'Event Cancelled' : 'Event Ended',
    regBg: reg ? '#E6F0EB' : open ? '#0F3D2E' : '#F1F5F9',
    regColor: reg ? '#0F3D2E' : open ? '#fff' : '#94A3B8',
    regBorder: reg ? '#B9D4C7' : open ? '#0F3D2E' : '#E2E5EA',
    regCursor: open && !reg ? 'pointer' : 'default',
    regHover: open && !reg ? 'background:#0B3125' : '',
    isRegistered: !!reg,
    regConfirmText: `You’re registered for ${ev.title}.`,
    regConfirmSub: `${regAns ? `${regAns} · ` : ''}A confirmation and your entry pass were sent to your email.`,
    // Demo only: the Sample Email inbox previews the confirmation the API emailed.
    viewRegEmail: SHOW_DEMO ? () => navigate('/alumni/inbox', { state: { select: `rsvp-${ev.id}`, from: '/alumni/events' } }) : null,
    cancelReg: () => cancelRegistration(ev.id).then(() => toast(`Your registration for ${ev.title} was cancelled.`), (err) => toast(err.message || 'Couldn’t cancel. Please try again.', false)),
    toggleRsvp: () => {
      if (!open || reg) return;
      if (ev.regFields && ev.regFields.length) setDlg({ id: ev.id, answers: {} });
      else doRegister(ev, {});
    },
    regDlgOpen: !!dEv,
    regDlgTitle: dEv ? dEv.title : '', regDlgWhen: dEv ? `${dEv.date} · ${dEv.time}` : '', regDlgVenue: dEv ? dEv.venue : '',
    regDlgFields: dEv ? dEv.regFields.map((f) => ({
      label: f.label, hint: f.hint || '', hasHint: !!f.hint,
      options: f.options.map((o) => {
        const on = ans[f.key] === o;
        return { label: o, bg: on ? '#0F3D2E' : '#fff', color: on ? '#fff' : '#0B1220', border: on ? '#0F3D2E' : '#E2E5EA', onClick: () => setDlg((d) => ({ ...d, answers: { ...d.answers, [f.key]: o } })) };
      }),
    })) : [],
    regDlgBtnBg: dReady ? '#0F3D2E' : '#CBD5E1',
    regDlgBtnCursor: dReady ? 'pointer' : 'not-allowed',
    regDlgConfirm: () => { if (dReady) doRegister(dEv, ans); },
    regDlgClose: () => setDlg(null),
    calLabel: calendar[ev.id] ? '✓ Added to Calendar' : '+ Add to Calendar',
    calBg: calendar[ev.id] ? '#F1F5F9' : '#fff',
    calColor: '#0B1220',
    calBorder: calendar[ev.id] ? '#94A3B8' : '#E2E5EA',
    // Opens Google Calendar's prefilled event page in a new tab; the button then stays "✓ Added to Calendar".
    toggleCalendar: () => {
      const url = googleCalendarUrl(ev, `${window.location.origin}/alumni/events?event=${encodeURIComponent(ev.id)}`);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      if (!calendar[ev.id]) toggleCalendar(ev.id);
    },
  };
  return <EventsView {...v} />;
}
