import { useEffect, useRef, useState } from 'react';
import AdminPostsView from '../../views/AdminPostsView';
import Modal, { modalBtn } from '../../components/Modal';
import useConfirmToast from '../../hooks/useConfirmToast';
import { useEvents } from '../../context/EventsContext';
import {
  DEFAULT_HOST, EV_STATUS_META, NOTICE_KINDS, evCount, evStatusKey, evToForm, evTs, evValidate, eventHosts, photoCss,
} from '../../data/events';
import { readImage } from '../../lib/files';

const RED = '#D92D20';
const OK = '#E2E5EA';
const fe = (msg) => ({ has: !!msg, msg: msg || '', invalid: msg ? 'true' : 'false', border: msg ? RED : OK });
const REPLY = { Going: ['#0F3D2E', '#E6F0EB'], Cancelled: ['#9F1239', '#FCE9EE'] };
const regMeta = (r) => [r.program, r.batch].filter(Boolean).join(' ') + (r.answers && Object.keys(r.answers).length ? ` · ${Object.values(r.answers).join(' · ')}` : '');
const shortDate = (e) => {
  const s = String(e.iso || '').slice(0, 10);
  let d = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const p = s.split('-').map(Number); d = new Date(p[0], p[1] - 1, p[2]); } else { const t = Date.parse(e.date); d = Number.isNaN(t) ? null : new Date(t); }
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : e.date || '';
};

/** Admin · Events management: create / edit / duplicate / delete, status control, registrations and announcements. */
export default function AdminEvents() {
  const ev = useEvents();
  const ct = useConfirmToast();
  const { events, rsvps, notices } = ev;
  const [tab, setTab] = useState('upcoming');
  const [q, setQ] = useState('');
  const [sf, setSf] = useState('all');
  const [menu, setMenu] = useState(null);
  const [manage, setManage] = useState(null);
  const [form, setForm] = useState(null);
  const [formOrig, setFormOrig] = useState('');
  const [formTried, setFormTried] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [busyEv, setBusyEv] = useState(false);
  const [nd, setNd] = useState({});
  const [ntOpenFlag, setNtOpenFlag] = useState(false);
  const [ntTried, setNtTried] = useState(false);
  const [ntErr, setNtErr] = useState('');
  const [busyNt, setBusyNt] = useState(false);
  const [annAll, setAnnAll] = useState(false);
  const [preview, setPreview] = useState(false);
  const eventFormRef = useRef(null);
  const ntFormRef = useRef(null);
  const fdPhotoRef = useRef(null);
  const [regs, setRegs] = useState(null);

  // Registrations of the event open in the manage panel, from EVENT_REGISTRATION.
  const { registrations } = ev;
  const manageCount = manage ? evCount(events.find((x) => x.id === manage) || {}) : 0;
  useEffect(() => {
    setRegs(null);
    if (!manage) return undefined;
    let live = true;
    registrations(manage).then((r) => { if (live) setRegs(r); }, () => { if (live) setRegs({ data: [], active: 0, failed: true }); });
    return () => { live = false; };
  }, [manage, manageCount, registrations]);

  const all = events;
  const bucket = (e) => { const k = evStatusKey(e); return k === 'past' ? 'past' : k === 'cancelled' ? 'cancelled' : 'upcoming'; };
  const counts = { upcoming: 0, past: 0, cancelled: 0 };
  all.forEach((e) => { counts[bucket(e)]++; });
  const qq = q.trim().toLowerCase();
  const list = all.filter((e) => bucket(e) === tab)
    .filter((e) => !qq || `${e.title || ''} ${e.venue || ''} ${e.organizer || ''}`.toLowerCase().indexOf(qq) >= 0)
    .filter((e) => tab !== 'upcoming' || sf === 'all' || evStatusKey(e) === sf)
    .sort((x, y) => (tab === 'upcoming' ? evTs(x) - evTs(y) : evTs(y) - evTs(x)));

  // ---- dirty guard ----
  const createDirty = !!form && JSON.stringify(form) !== formOrig;
  const ntDirty = (() => {
    if (nd.editId) { const n = notices.find((x) => x.id === nd.editId); return !!n && (n.title !== (nd.title || '') || (n.body || '') !== (nd.body || '') || n.kind !== (nd.kind || 'Notice')); }
    return !!(String(nd.title || '').trim() || String(nd.body || '').trim());
  })();
  useEffect(() => {
    const onUnload = (e) => { if (createDirty || ntDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [createDirty, ntDirty]);
  useEffect(() => {
    const onKey = (e) => { if (e.key !== 'Escape') return; if (ct.vals.cfOn) return; if (menu) setMenu(null); else if (manage) setManage(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu, manage, ct.vals.cfOn]);

  // ---- event actions ----
  const openForm = (f) => {
    setForm(f); setFormOrig(JSON.stringify(f)); setFormTried(false); setFormErr(''); setMenu(null); setManage(null);
    setTimeout(() => { const el = document.getElementById('fd-title-in'); if (el) el.focus({ preventScroll: true }); }, 60);
  };
  const evCreate = () => openForm({ mode: 'create', title: '', dateISO: '', timeStart: '09:00', timeEnd: '12:00', venue: '', organizer: DEFAULT_HOST, body: '', photo: null, photoName: '' });
  const evEdit = (e) => openForm({ ...evToForm(e), mode: 'edit', photo: e.photo || null, photoName: '' });
  const evDup = (e) => openForm({ ...evToForm(e), mode: 'create', id: null, title: `${e.title} (copy)`, dateISO: '', photo: e.photo || null, photoName: '', coverFrom: e.photo ? e.id : null });
  const setStatus = (e, k) => {
    setMenu(null);
    const run = (msg) => (k === 'cancelled' ? ev.cancelEvent(e.id) : ev.patchEvent(e.id, { status: k })).then(
      () => ct.toast(msg), (err) => ct.toast(err.message || 'Couldn’t update the event. Please try again.', false),
    );
    if (k === 'closed') run('Registration closed.');
    else if (k === 'open') run('Registration reopened.');
    else if (k === 'cancelled') ct.askConfirm({ title: 'Cancel this event?', body: 'Registration closes and registered alumni are notified. Its Dashboard announcement will show the event as cancelled.', detail: e.title, cancelLabel: 'Keep event', okLabel: 'Cancel event', danger: true, onOk: () => run('Event cancelled. Its announcement now shows it as cancelled.') });
    else if (k === 'past') ct.askConfirm({ title: 'Move to past events?', body: 'Registration closes and its announcement is removed from the Dashboard.', detail: e.title, cancelLabel: 'Not now', okLabel: 'Move to past', onOk: () => run('Moved to past events. Its announcement was removed.') });
  };
  const evDelete = (e) => {
    setMenu(null);
    const n = evCount(e);
    ct.askConfirm({
      title: 'Delete this event?', body: `This permanently removes the event${n ? ` and its ${n.toLocaleString()} responses` : ''}. Its Dashboard announcement is removed too. This can’t be undone.`, detail: e.title,
      cancelLabel: 'Keep event', okLabel: 'Delete event', busyLabel: 'Deleting…', danger: true, async: true,
      onOk: () => ct.runAsync(async () => { await ev.deleteEvent(e.id); if (manage === e.id) setManage(null); ct.toast('Event deleted. Its announcement was removed.'); }, 'Couldn’t delete the event. Please try again.'),
    });
  };
  const annHide = (e) => ct.askConfirm({
    title: 'Remove from the Dashboard?', body: 'The event stays published — alumni can still find it on the Events page.', detail: e.title, cancelLabel: 'Cancel', okLabel: 'Remove announcement', danger: true,
    onOk: () => ev.patchEvent(e.id, { annHidden: true }).then(() => ct.toast('Announcement removed. The event is still published.'), (err) => ct.toast(err.message, false)),
  });
  const annShow = (e) => ev.patchEvent(e.id, { annHidden: false }).then(() => ct.toast('Announcement is back on the Dashboard.'), (err) => ct.toast(err.message, false));

  const menuFor = (e) => {
    const k = evStatusKey(e);
    const up = bucket(e) === 'upcoming';
    const it = [];
    if (up) it.push({ label: 'Edit', onClick: () => evEdit(e) });
    it.push({ label: 'Duplicate', onClick: () => evDup(e) });
    if (up) {
      it.push(k === 'closed' ? { label: 'Reopen registration', onClick: () => setStatus(e, 'open') } : { label: 'Close registration', onClick: () => setStatus(e, 'closed') });
      it.push({ label: 'Move to past', onClick: () => setStatus(e, 'past') });
      it.push({ label: 'Cancel event', onClick: () => setStatus(e, 'cancelled'), danger: true, sep: true });
    }
    it.push({ label: 'Delete', onClick: () => evDelete(e), danger: true, sep: !up });
    return it.map((x) => ({ label: x.label, onClick: x.onClick, sep: !!x.sep, color: x.danger ? '#B42318' : '#0B1220' }));
  };
  const evRows = list.map((e, i) => {
    const m = EV_STATUS_META[evStatusKey(e)];
    const n = evCount(e);
    const open = menu === e.id;
    return {
      title: e.title, date: shortDate(e), time: e.time || '—', venue: e.venue || '—', photoCss: photoCss(e), dim: bucket(e) === 'upcoming' ? 1 : 0.75,
      status: m.label, statusFg: m.fg, statusBg: m.bg, statusDot: m.dot, count: n.toLocaleString(), countLabel: n === 1 ? 'response' : 'responses',
      divider: i ? '#F0F2F4' : 'transparent', onManage: () => { setManage(e.id); setMenu(null); },
      menuOpen: open, menuExp: open ? 'true' : 'false', menuBg: open ? '#F3F6F4' : '#fff', menu: open ? menuFor(e) : [], onMenu: () => setMenu((s) => (s === e.id ? null : e.id)),
    };
  });
  const searching = !!qq || (tab === 'upcoming' && sf !== 'all');
  const noRes = list.length === 0;
  const emptyCopy = { upcoming: ['No upcoming events', 'Create an event to start taking registrations. It will be announced on the Alumni Dashboard.'], past: ['No past events', 'Events move here after their date passes.'], cancelled: ['No cancelled events', 'Events you cancel will appear here.'] }[tab];

  // ---- composer ----
  const fErr = form && formTried ? evValidate(form, form.mode === 'create') : {};
  const setF = (k) => (e) => { const val = e.target.value; setForm((s) => ({ ...s, [k]: val })); };
  const fdSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (busyEv) return;
    const c = form;
    if (Object.keys(evValidate(c, c.mode === 'create')).length) {
      setFormTried(true);
      setTimeout(() => { const el = eventFormRef.current && eventFormRef.current.querySelector('[aria-invalid="true"]'); if (el) el.focus(); }, 0);
      return;
    }
    setBusyEv(true); setFormErr('');
    const fields = { title: c.title.trim(), organizer: c.organizer, dateISO: c.dateISO, timeStart: c.timeStart, timeEnd: c.timeEnd || '', venue: c.venue.trim(), body: String(c.body).trim(), photo: c.photo, coverFrom: c.coverFrom };
    const done = c.mode === 'create'
      ? ev.createEvent(fields).then(() => { setForm(null); setTab('upcoming'); setQ(''); ct.toast('Event published. Its announcement is now on the Dashboard.'); })
      : ev.patchEvent(c.id, fields).then(() => { setForm(null); ct.toast('Changes saved. The linked announcement was updated.'); });
    done.catch((err) => setFormErr(err.message || 'Couldn’t save the event. Please try again.')).finally(() => setBusyEv(false));
  };
  const fdClose = () => {
    if (busyEv) return;
    if (createDirty) ct.askConfirm({ title: 'Discard changes?', body: 'What you entered will be lost.', cancelLabel: 'Keep editing', okLabel: 'Discard', danger: true, onOk: () => setForm(null) });
    else setForm(null);
  };
  const hosts = eventHosts();
  const fdHosts = form && form.organizer && hosts.indexOf(form.organizer) < 0 ? [form.organizer, ...hosts] : hosts;
  const fd = form ? {
    busy: busyEv, title: form.title || '', dateISO: form.dateISO || '', timeStart: form.timeStart || '', timeEnd: form.timeEnd || '', venue: form.venue || '', organizer: form.organizer || DEFAULT_HOST, body: form.body || '', hosts: fdHosts,
    on_title: setF('title'), on_dateISO: setF('dateISO'), on_timeStart: setF('timeStart'), on_timeEnd: setF('timeEnd'), on_venue: setF('venue'), on_organizer: setF('organizer'), on_body: setF('body'),
    cursor: busyEv ? 'progress' : 'pointer', opacity: busyEv ? 0.7 : 1,
  } : { hosts: [] };
  const fdE = {
    title: fe(fErr.title), dateISO: fe(fErr.date), venue: fe(fErr.venue), body: fe(fErr.body), time: fe(fErr.time),
    start: fe(fErr.time && form && !form.timeStart ? fErr.time : ''), end: fe(fErr.time && form && form.timeStart ? fErr.time : ''),
  };

  // ---- manage panel ----
  const me = manage ? all.find((x) => x.id === manage) : null;
  let md = { mdOn: false, mdStats: [], mdPeople: [], mdSt: {}, mdAnn: {} };
  if (me) {
    const k = evStatusKey(me);
    const b = bucket(me);
    const n = evCount(me, rsvps);
    const regRows = (regs && regs.data) || [];
    const cancelledN = regRows.filter((r) => r.cancelledAt).length;
    const shown = b !== 'past' && !me.annHidden;
    const cx = k === 'cancelled';
    const mine = !!rsvps[me.id];
    const ann = {
      month: me.month, day: me.day, kind: me.kind, kindColor: me.kindColor, kindBg: me.kindBg, title: me.title, meta: cx ? me.date : me.meta, body: cx ? 'This event has been cancelled.' : me.teaser,
      thumbCss: photoCss(me), titleDecor: cx ? 'line-through' : 'none', statusLabel: mine && !cx ? 'You’re registered' : EV_STATUS_META[k].label, statusFg: EV_STATUS_META[k].fg, statusBg: EV_STATUS_META[k].bg, statusDot: EV_STATUS_META[k].dot,
      countLine: `${n.toLocaleString()} registered${me.capacity && k === 'open' ? ` · ${Math.max(0, me.capacity - n)} spots left` : ''}`,
      when: String(me.date || '').replace(/^(\w{3})\w*,\s*(\w{3})\w*\s+(\d+).*$/, '$1, $2 $3') + (me.time ? ` · ${me.time}` : ''), venue: me.venue || '', cta: 'View details', hasThumb: true, isEvent: true, typeLabel: 'Event', subLabel: '', typeColor: '#0F3D2E',
    };
    md = {
      mdOn: true, mdClose: () => setManage(null), mdTitle: me.title, mdWhen: shortDate(me) + (me.time ? ` · ${me.time}` : ''), mdVenue: me.venue || '—', mdHost: me.organizer || DEFAULT_HOST,
      mdPhotoCss: photoCss(me), mdSt: EV_STATUS_META[k],
      mdCanEdit: b === 'upcoming', mdEdit: () => evEdit(me), mdToggleLabel: k === 'closed' ? 'Reopen registration' : 'Close registration', mdToggle: () => setStatus(me, k === 'closed' ? 'open' : 'closed'),
      mdCount: n.toLocaleString() + (n === 1 ? ' response' : ' responses'), mdHasPeople: regRows.length > 0, mdNoPeople: regRows.length === 0, mdExport: () => exportRegistrations(me, regRows),
      mdHasCap: !!me.capacity, mdCap: me.capacity ? `${n.toLocaleString()} of ${me.capacity.toLocaleString()} spots filled` : '', mdCapPct: me.capacity ? `${Math.min(100, Math.round((n / me.capacity) * 100))}%` : '0%',
      mdStats: [
        { label: 'Going', value: n.toLocaleString(), color: '#0F3D2E' },
        { label: 'Cancelled', value: regs ? cancelledN.toLocaleString() : '…', color: '#9F1239' },
        { label: 'Spots left', value: me.capacity ? Math.max(0, me.capacity - n).toLocaleString() : '—', color: '#8A6A16' },
      ],
      mdPeople: regRows.slice(0, 6).map((r) => {
        const reply = r.cancelledAt ? 'Cancelled' : 'Going';
        return { name: r.name, meta: regMeta(r), reply, fg: REPLY[reply][0], bg: REPLY[reply][1], initials: r.name.split(' ').map((w) => w[0]).slice(0, 2).join('') };
      }),
      mdHasMore: regRows.length > 6, mdMore: `Showing 6 of ${regRows.length.toLocaleString()} · active first, newest first`,
      mdAnnShown: shown, mdAnnOff: !shown, mdAnn: ann, mdAnnRemove: () => annHide(me),
      mdAnnSub: b === 'cancelled' ? 'Alumni see this event as cancelled.' : 'Updates automatically when you edit the event.',
      mdAnnNote: b === 'past' ? 'Past events are no longer announced on the Dashboard.' : 'Not shown on the Dashboard.', mdCanRestore: b !== 'past' && !!me.annHidden, mdAnnRestore: () => annShow(me),
    };
  }
  const exportRegistrations = (e, list) => {
    const keys = [...new Set(list.flatMap((r) => Object.keys(r.answers || {})))];
    const labels = keys.map((k) => ((e.regFields || []).find((f) => f.key === k) || {}).label || k);
    const rows = [['Name', 'Program', 'Batch', 'Status', 'Registered at', ...labels],
      ...list.map((r) => [r.name, r.program, r.batch || '', r.cancelledAt ? 'Cancelled' : 'Going', new Date(r.registeredAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), ...keys.map((k) => (r.answers || {})[k] || '')])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    a.download = `${e.id}_registrations.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    ct.toast('Registration list downloaded.');
  };

  // ---- announcements ----
  const kind = nd.kind || 'Notice';
  const editing = !!nd.editId;
  const ntOpen = ntOpenFlag || editing;
  const setNdP = (p) => setNd((s) => ({ ...s, ...p }));
  const focusNt = () => setTimeout(() => { const el = document.getElementById('nt-title'); if (el) el.focus({ preventScroll: true }); }, 40);
  const ntSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (busyNt) return;
    const title = String(nd.title || '').trim();
    if (!title) { setNtTried(true); setNtErr(''); focusNt(); return; }
    if (editing && !ntDirty) { setNd({}); setNtTried(false); setNtOpenFlag(false); return; }
    const body = String(nd.body || '').trim();
    if (!body) { setNtErr('Enter the announcement text.'); return; }
    setBusyNt(true); setNtErr('');
    ev.saveNotice({ id: nd.editId, kind: nd.kind || 'Notice', title, body, ...(editing ? {} : { source: 'UDM Alumni Relations Office' }) })
      .then(() => {
        setNd({}); setNtTried(false); setNtOpenFlag(false);
        ct.toast(editing ? 'Announcement updated.' : 'Announcement posted to the Dashboard.');
      }, (err) => setNtErr(err.message || 'Couldn’t save the announcement. Please try again.'))
      .finally(() => setBusyNt(false));
  };
  const ntEdit = (n) => {
    if (nd.editId === n.id) return;
    const go = () => { setNd({ editId: n.id, kind: n.kind, title: n.title, body: n.body || '' }); setNtTried(false); setNtErr(''); setNtOpenFlag(true); focusNt(); };
    if (ntDirty) ct.askConfirm({ title: 'Discard unsaved changes?', body: 'Your changes to this announcement will be lost.', cancelLabel: 'Keep editing', okLabel: 'Discard changes', danger: true, onOk: go });
    else go();
  };
  const ntRemove = (n) => ct.askConfirm({
    title: 'Remove this announcement?', body: 'Alumni will no longer see it on the Dashboard.', detail: n.title, cancelLabel: 'Cancel', okLabel: 'Remove announcement', busyLabel: 'Removing…', danger: true, async: true,
    onOk: () => ct.runAsync(async () => { await ev.removeNotice(n.id); if (nd.editId === n.id) setNd({}); ct.toast('Announcement removed.'); }, 'Couldn’t remove the announcement. Please try again.'),
  });
  const annList = notices.map((n) => ({
    linked: false, standalone: true, kind: n.kind.toUpperCase(), kindColor: NOTICE_KINDS[n.kind][0], kindBg: NOTICE_KINDS[n.kind][1], title: n.title, meta: `${n.month} ${n.day} · ${n.source}`, decor: 'none',
    bg: nd.editId === n.id ? '#F3F7F5' : 'transparent', onEdit: () => ntEdit(n), onRemove: () => ntRemove(n),
  }));
  const LIM = 4;

  const upcomingLive = all.filter((e) => bucket(e) === 'upcoming');
  const v = {
    ...ct.vals, ...md,
    tabJobs: false, tabEvents: true, adminPostsLabel: 'Admin Events',
    postsSubtitle: 'Create and manage alumni events',
    postsPreviewGo: () => setPreview(true),
    evPostedCount: all.length, evCreate, evLoading: false,
    evTabs: [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']].map(([k, l]) => {
      const on = k === tab;
      return { label: l, count: counts[k], sel: on ? 'true' : 'false', bg: on ? '#0F3D2E' : 'transparent', color: on ? '#fff' : '#334155', countBg: on ? 'rgba(255,255,255,.18)' : '#EEF1F4', countColor: on ? '#fff' : '#475569', onClick: () => { setTab(k); setMenu(null); } };
    }),
    evQ: q, onEvQ: (e) => setQ(e.target.value), evClearSearch: () => { setQ(''); setSf('all'); },
    evShowFilter: tab === 'upcoming', evStatusF: sf, onEvStatusF: (e) => setSf(e.target.value),
    evFilterOpts: [{ value: 'all', label: 'All registrations' }, { value: 'open', label: 'Registration open' }, { value: 'full', label: 'Full' }, { value: 'closed', label: 'Registration closed' }],
    evRows, evMenuClose: () => setMenu(null),
    evListEmpty: noRes, evEmptyTitle: searching ? 'No matching events' : emptyCopy[0], evEmptyBody: searching ? 'Try a different search or filter.' : emptyCopy[1],
    evEmptyCreate: noRes && !searching && tab === 'upcoming', evEmptyClear: noRes && searching,
    fdOn: !!form, fd, fdE, fdSubmit, fdClose, eventFormRef, fdPhotoRef,
    fdHead: form && form.mode === 'edit' ? 'Edit event' : 'Create event',
    fdSubmitLabel: busyEv ? (form && form.mode === 'edit' ? 'Saving…' : 'Publishing…') : form && form.mode === 'edit' ? 'Save changes' : 'Publish event',
    fdNote: form && form.mode === 'edit' ? 'Also updates its Dashboard announcement' : 'Also posts an announcement to the Dashboard',
    fdErr: formErr, fdHasErr: !!formErr,
    fdPhotoCss: form && form.photo ? `url("${form.photo}") center/cover no-repeat` : photoCss(null), fdNoPhoto: !(form && form.photo), fdHasPhoto: !!(form && form.photo), fdPhotoName: (form && form.photoName) || '',
    fdPick: () => { const el = fdPhotoRef.current; if (el) el.click(); },
    fdPhotoFile: async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try { const url = await readImage(file, 1600); setForm((s) => ({ ...s, photo: url, photoName: file.name })); } catch (err) { setFormErr(err.message); }
      e.target.value = '';
    },
    fdPhotoRemove: () => setForm((s) => ({ ...s, photo: null, photoName: '' })),
    annCount: annList.length, annRows: annAll ? annList : annList.slice(0, LIM), annEmpty: annList.length === 0,
    annHasMore: annList.length > 0, annToggleLabel: annAll && annList.length > LIM ? 'Show fewer' : `View all announcements (${annList.length})`,
    annToggle: () => { if (annList.length > LIM) setAnnAll((s) => !s); },
    ntOpen, ntClosed: !ntOpen, ntNew: () => { setNtOpenFlag(true); setNd({}); setNtTried(false); setNtErr(''); focusNt(); },
    ntHead: editing ? 'Edit announcement' : 'New announcement', ntFormRef, ntSubmit, ntBusy: busyNt, ntTitle: nd.title || '', ntBody: nd.body || '',
    onNtTitle: (e) => setNdP({ title: e.target.value }), onNtBody: (e) => setNdP({ body: e.target.value }),
    ntE: fe(ntTried && !String(nd.title || '').trim() ? 'Enter a title.' : ''), ntErr, ntHasErr: !!ntErr,
    ntKinds: Object.keys(NOTICE_KINDS).map((k) => ({ label: k, pressed: k === kind ? 'true' : 'false', bg: k === kind ? '#0F3D2E' : '#fff', color: k === kind ? '#fff' : '#334155', border: k === kind ? '#0F3D2E' : '#E2E5EA', onClick: () => setNdP({ kind: k }) })),
    ntPrimaryLabel: busyNt ? (editing ? 'Saving…' : 'Posting…') : editing ? 'Save changes' : 'Post to Dashboard',
    ntCursor: busyNt ? 'progress' : 'pointer', ntOpacity: busyNt ? 0.7 : 1,
    ntCancelEdit: () => { setNd({}); setNtTried(false); setNtErr(''); setNtOpenFlag(false); },
    inputFocus: { borderColor: '#0F3D2E' }, rowHover: { background: '#FBFCFC' }, exportHover: { background: '#0B3123' },
  };

  return (
    <>
      <AdminPostsView {...v} />
      <Modal open={preview} onClose={() => setPreview(false)} title="Alumni events preview" eyebrow="What alumni see" width={640} footer={<button type="button" style={modalBtn(true)} onClick={() => setPreview(false)}>Close</button>}>
        {upcomingLive.length === 0 ? 'No upcoming events.' : upcomingLive.map((e) => (
          <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid #EEF0F3' }}>
            <div style={{ fontWeight: 700, color: '#0B1220' }}>{e.title}</div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>{e.date} · {e.venue} · {EV_STATUS_META[evStatusKey(e)].label}</div>
          </div>
        ))}
      </Modal>
    </>
  );
}
