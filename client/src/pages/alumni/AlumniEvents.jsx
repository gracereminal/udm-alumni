import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import EventsView from '../../views/EventsView';
import { useEvents } from '../../context/EventsContext';
import { useToast } from '../../context/ToastContext';
import { EV_STATUS_META, evCat, evCount, evStatusKey, evTs, photoCss } from '../../data/events';

const FILTERS = ['All', 'Events', 'Career', 'Community'];

/** Alumni Events: browsable list, event details, registration dialog (with questions), calendar and status. */
export default function AlumniEvents() {
  const { events, rsvps, calendar, register, cancelRegistration, toggleCalendar } = useEvents();
  const { toast } = useToast();
  const location = useLocation();
  const [selId, setSelId] = useState(location.state?.eventId || null);
  const [filter, setFilter] = useState('All');
  const [dlg, setDlg] = useState(null);

  useEffect(() => { if (location.state?.eventId) { setSelId(location.state.eventId); setFilter('All'); } }, [location.state]);

  const rows = events.map((e) => ({ e, sk: evStatusKey(e, rsvps), ts: evTs(e) }));
  const up = rows.filter((r) => r.sk !== 'past').sort((a, b) => a.ts - b.ts);
  const past = rows.filter((r) => r.sk === 'past').sort((a, b) => b.ts - a.ts);
  const vis = up.concat(past).filter((r) => filter === 'All' || evCat(r.e) === filter);
  const firstPast = vis.findIndex((r) => r.sk === 'past');
  const ev = events.find((e) => e.id === selId) || (vis[0] && vis[0].e) || events[0];

  if (!ev) {
    return <EventsView {...{ evListEmpty: true, evListCount: '0 events', eventsList: [], evFilters: [], evTitle: 'No events', evBody: [], evAgenda: [], evHighlights: [], regDlgFields: [] }} />;
  }

  const sk = evStatusKey(ev, rsvps);
  const sm = EV_STATUS_META[sk];
  const reg = rsvps[ev.id];
  const n = (ev.regCount || 0) + (reg ? 1 : 0);
  const cap = ev.capacity;
  const open = sk === 'open';
  const dEv = dlg && events.find((x) => x.id === dlg.id);
  const ans = (dlg && dlg.answers) || {};
  const dReady = !!dEv && (dEv.regFields || []).every((f) => ans[f.key]);
  const regAns = reg ? Object.values(reg).filter(Boolean).join(' · ') : '';

  const doRegister = (e, answers) => { register(e, answers); setDlg(null); toast(`You’re registered for ${e.title}.`); };
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
    cancelReg: () => { cancelRegistration(ev.id); toast(`Your registration for ${ev.title} was cancelled.`); },
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
    toggleCalendar: () => {
      if (!calendar[ev.id]) downloadIcs(ev);
      toggleCalendar(ev.id);
    },
  };
  void evCount;
  return <EventsView {...v} />;
}

/** Download a basic .ics so "Add to Calendar" really adds the event. */
function downloadIcs(ev) {
  try {
    const d = String(ev.iso || '').replace(/-/g, '');
    if (!d) return;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UDM Alumni//EN', 'BEGIN:VEVENT', `UID:${ev.id}@udm-alumni`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${ev.title}`, `LOCATION:${ev.venue || ''}`, `DESCRIPTION:${(ev.teaser || '').replace(/\n/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `${ev.id}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch { /* calendar download is best-effort */ }
}
