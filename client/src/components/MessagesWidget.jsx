import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { previewEnabled } from '../hooks/useMobilePreview';
import useNarrow from '../hooks/useNarrow';
import { get, post } from '../lib/api';
import { initials } from '../lib/format';

const POLL_MS = 20000; // conversation list (and the unread dot) while the panel is closed
const OPEN_POLL_MS = 5000; // list and the open conversation while the panel is open
const OFFICE = { name: 'UDM Alumni Relations Office', meta: 'Administrator · usually replies within 1 working day', initials: 'AO', bg: '#00332B' };
const HUES = ['#00332B', '#7A5C12', '#3E5C76', '#8A3B3B', '#4B5D2E'];
const hueOf = (s) => HUES[[...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % HUES.length];
const clock = (at) => {
  const d = new Date(at);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString('en-US', today ? { hour: 'numeric', minute: '2-digit' } : { weekday: 'short', hour: 'numeric', minute: '2-digit' });
};
const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

/**
 * Messages widget per "UDM Alumni.dc.html" (`msgw`): a floating chat button on every portal page, backed by
 * /messages (MessageService decides who sees what). Alumni: one-to-one with the Alumni Office or their College
 * (tabs). College staff: their college's alumni (list), or the Alumni Office (tabs). Admin: every alumni conversation
 * with the office, plus the college staff who wrote to it. Alumni cannot message each other.
 */
export default function MessagesWidget() {
  const { user, role } = useAuth();
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);
  const [chan, setChan] = useState(role === 'dept' ? 'college' : 'office');
  const [threads, setThreads] = useState([]);
  const [unread, setUnread] = useState(0);
  const [selId, setSelId] = useState(null);
  const [msgs, setMsgs] = useState({}); // thread id -> messages, oldest first
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const fabRef = useRef(null);

  const uid = user?.id;
  const staff = role !== 'alumni';
  const dept = role === 'dept';
  const dadm = dept && chan === 'admin';
  const code = user?.collegeCode || '';

  const loadThreads = useCallback(
    () => get('/messages/threads').then((r) => { setThreads(r.data || []); setUnread((r.meta && r.meta.unread) || 0); }).catch(() => {}),
    [],
  );
  const loadThread = useCallback(
    (id) => get(`/messages/threads/${id}`).then((r) => setMsgs((m) => ({ ...m, [id]: r.messages || [] }))).catch(() => {}),
    [],
  );

  // A different account starts from a clean slate.
  useEffect(() => {
    setThreads([]); setUnread(0); setMsgs({}); setSelId(null); setDraft(''); setOpen(false); setError('');
    setChan(role === 'dept' ? 'college' : 'office');
  }, [uid, role]);

  useEffect(() => {
    if (!uid) return undefined;
    loadThreads();
    const t = setInterval(() => { if (visible()) loadThreads(); }, open ? OPEN_POLL_MS : POLL_MS);
    return () => clearInterval(t);
  }, [uid, open, loadThreads]);

  // The conversation shown on the current tab.
  let list = [];
  let current = null;
  if (!staff) current = threads.find((t) => t.channel === chan) || null;
  else if (dadm) current = threads.find((t) => t.channel === 'admin') || null;
  else {
    list = dept ? threads.filter((t) => t.channel === 'college') : threads;
    current = list.find((t) => t.id === selId) || list[0] || null;
  }
  const threadId = current ? current.id : null;
  // Alumni and the College–Admin tab always have someone to write to; a staff list needs a selected conversation.
  const canWrite = !staff || dadm || !!current;
  const shown = threadId ? msgs[threadId] || [] : [];

  useEffect(() => {
    if (!open || !threadId) return undefined;
    loadThread(threadId).then(loadThreads); // opening marks it read
    const t = setInterval(() => { if (visible()) loadThread(threadId); }, OPEN_POLL_MS);
    return () => clearInterval(t);
  }, [open, threadId, loadThread, loadThreads]);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, threadId, shown.length]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); fabRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!user) return null;

  const toggle = () => setOpen((o) => !o);
  const can = !!draft.trim() && canWrite && !sending;
  const send = async () => {
    const body = draft.trim();
    if (!body || !canWrite || sending) return;
    setSending(true);
    setError('');
    try {
      let id = threadId;
      if (!id) {
        const started = await post('/messages/threads', { channel: staff ? 'admin' : chan });
        id = started.id;
        setThreads((ts) => (ts.some((x) => x.id === id) ? ts : [started, ...ts])); // show it before the next poll
      }
      const m = await post(`/messages/threads/${id}/messages`, { body });
      setMsgs((x) => ({ ...x, [id]: [...(x[id] || []), m] }));
      setDraft('');
      loadThreads();
    } catch (e) {
      setError(e.message || 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const tabs = (dept ? ['college', 'admin'] : ['office', 'college']).map((k) => ({
    k,
    label: dept ? (k === 'college' ? 'College–Alumni' : 'College–Admin') : k === 'office' ? 'Alumni Office' : `My College${code ? ` (${code})` : ''}`,
  }));
  const showList = staff && !dadm;
  const tabsOn = !staff || dept;
  const notice = dadm
    ? 'Private chat with the Alumni Relations Office (Admin).'
    : dept
      ? `${code || 'College'} alumni only. Alumni cannot message each other.`
      : staff
        ? 'One-to-one with alumni. Alumni cannot message each other.'
        : 'Private chat with the Alumni Office or your College only.';

  const nameOf = (t) => (t.alumnus ? t.alumnus.name : t.staff ? t.staff.name : '');
  let peer = null;
  if (!staff) peer = chan === 'office' ? OFFICE : { name: `${code || 'College'} College Coordinator`, meta: `${user.college || 'Your college'} · Coordinator`, initials: 'CC', bg: '#7A5C12' };
  else if (dadm) peer = OFFICE;
  else if (current) {
    const n = nameOf(current);
    peer = current.alumnus
      ? { name: n, meta: current.alumnus.meta, initials: initials(n), bg: hueOf(n) }
      : { name: n, meta: `College Coordinator${current.staff.collegeCode ? ` · ${current.staff.collegeCode}` : ''}`, initials: initials(n), bg: hueOf(n) };
  }
  const first = current ? nameOf(current).split(' ')[0] : '';
  const placeholder = showList ? (current ? `Reply to ${first}…` : 'No conversation selected') : `Write a message to ${!staff && chan === 'college' ? 'your College Coordinator' : 'the Alumni Office'}…`;

  // Keep clear of the dev "Preview" switcher in the bottom-right corner.
  const lift = !narrow && (import.meta.env.DEV || previewEnabled) ? 64 : 0;

  return (
    <div data-m="msgw" style={{ position: 'fixed', right: 20, bottom: 20 + lift, zIndex: 60, fontFamily: 'Inter,system-ui,sans-serif' }}>
      {open ? (
        <div
          data-m="msgw-panel"
          role="dialog"
          aria-labelledby="msgw-title"
          style={{
            position: 'absolute', right: 0, bottom: 68, width: showList ? 640 : 380, maxWidth: 'calc(100vw - 40px)', height: 'min(540px,calc(100vh - 120px))', display: 'flex', flexDirection: 'column',
            background: '#fff', border: '1px solid #E7E9ED', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px -16px rgba(16,24,40,.35),0 2px 6px rgba(16,24,40,.08)',
          }}
        >
          <div data-m="msgw-head" style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: '#00332B', color: '#fff' }}>
            <div style={{ minWidth: 0 }}>
              <h2 id="msgw-title" style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>Messages</h2>
              <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>{notice}</div>
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label="Close messages"
              style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,.16)', border: 0, color: '#fff', padding: 0 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 14, height: 14 }} aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {tabsOn ? (
            <div role="tablist" aria-label="Conversation" style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid #EEF0F3' }}>
              {tabs.map((t) => {
                const on = chan === t.k;
                const n = threads.filter((x) => (t.k === 'admin' ? x.channel === 'admin' : x.channel === t.k)).reduce((s, x) => s + x.unread, 0);
                return (
                  <button
                    key={t.k}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => { setChan(t.k); setDraft(''); setError(''); }}
                    style={{ flex: 1, textAlign: 'center', padding: '8px 10px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: 0, background: on ? '#00332B' : '#F1F4F2', color: on ? '#fff' : '#00332B' }}
                  >
                    {t.label}
                    {n && !on ? <span aria-label={`${n} unread`} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#F0C428', marginLeft: 6, verticalAlign: 'middle' }} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {showList ? (
              <div data-m="msgw-list" style={{ flex: 'none', width: 220, borderRight: '1px solid #EEF0F3', overflowY: 'auto' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #EEF0F3', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#64748B' }}>
                  {dept ? `${code || 'College'} alumni` : 'Alumni conversations'}
                </div>
                {list.length === 0 ? <div style={{ padding: '14px 12px', fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>No conversations yet. Messages from alumni appear here.</div> : null}
                {list.map((c) => {
                  const on = c.id === threadId;
                  const n = nameOf(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelId(c.id); setDraft(''); setError(''); }}
                      aria-current={on ? 'true' : undefined}
                      style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '11px 12px', border: 0, borderBottom: '1px solid #F1F2F4', cursor: 'pointer', fontFamily: 'inherit', background: on ? '#EAF3EF' : '#fff', boxShadow: on ? 'inset 3px 0 0 #00332B' : 'none' }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', background: '#E6F0EB', color: '#00332B', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials(n)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: c.unread ? 700 : 600, color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n}
                          {c.staff ? <span style={{ fontWeight: 500, color: '#64748B' }}> · {c.staff.collegeCode || 'College'}</span> : null}
                        </span>
                        <span style={{ display: 'block', fontSize: 11.5, color: c.unread ? '#0B1220' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                          {c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages yet'}
                        </span>
                      </span>
                      {c.unread ? <span aria-label={`${c.unread} unread`} style={{ flex: 'none', alignSelf: 'center', minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', borderRadius: 999, background: '#F0C428', color: '#00332B', fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.unread}</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {peer ? (
                <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #EEF0F3' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', flex: 'none', background: peer.bg, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{peer.initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0B1220' }}>{peer.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{peer.meta}</div>
                  </div>
                </div>
              ) : null}
              <div ref={scrollRef} data-m="msg-scroll" role="log" aria-live="polite" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#FAFBFA' }}>
                {shown.length ? (
                  shown.map((m) => (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.mine ? 'flex-end' : 'flex-start', gap: 3 }}>
                      <div style={{ maxWidth: '82%', padding: '9px 12px', borderRadius: m.mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.mine ? '#00332B' : '#fff', color: m.mine ? '#fff' : '#0B1220', fontSize: 13, lineHeight: 1.45, textWrap: 'pretty', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: m.mine ? 0 : '1px solid #EEF0F3' }}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>{clock(m.at)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ alignSelf: 'center', fontSize: 13, color: '#64748B', padding: '9px 12px' }}>{canWrite ? 'No messages yet. Say hello!' : 'No conversation selected.'}</div>
                )}
              </div>
              {error ? <div role="alert" style={{ flex: 'none', padding: '8px 14px 0', fontSize: 12, fontWeight: 600, color: '#B42318', background: '#fff' }}>{error}</div> : null}
              <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px', borderTop: error ? 0 : '1px solid #EEF0F3', background: '#fff' }}>
                <textarea
                  rows={1}
                  value={draft}
                  disabled={!canWrite}
                  maxLength={2000}
                  aria-label="Message"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={placeholder}
                  style={{ flex: 1, minWidth: 0, resize: 'none', boxSizing: 'border-box', border: '1px solid #E2E5EA', borderRadius: 12, padding: '10px 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none', minHeight: 40, maxHeight: 100 }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!can}
                  style={{ flex: 'none', height: 40, padding: '0 16px', border: 'none', borderRadius: 12, background: can ? '#F0C428' : '#EEF0F3', color: can ? '#00332B' : '#94A3B8', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: can ? 'pointer' : 'default' }}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <button
        ref={fabRef}
        data-m="msgw-fab"
        type="button"
        onClick={toggle}
        aria-label={unread ? `Messages, ${unread} unread` : 'Messages'}
        aria-expanded={open}
        title="Messages"
        style={{
          position: 'relative', width: 60, height: 60, borderRadius: '50%', background: '#00332B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 0, padding: 0,
          boxShadow: '0 0 0 2px #F0C428,0 0 0 5px rgba(240,196,40,.22),0 12px 28px -6px rgba(0,51,43,.6)',
        }}
      >
        <svg viewBox="0 0 28 28" fill="none" style={{ width: 30, height: 30 }} aria-hidden="true">
          <path d="M14 3.5c-6 0-10.5 4.1-10.5 9.2 0 2.7 1.3 5.1 3.4 6.8L5.8 24.2l4.9-2.3c1 .3 2.2.4 3.3.4 6 0 10.5-4.1 10.5-9.2S20 3.5 14 3.5z" fill="#fff" />
          <circle cx="9.5" cy="12.8" r="1.6" fill="#00332B" />
          <circle cx="14" cy="12.8" r="1.6" fill="#00332B" />
          <circle cx="18.5" cy="12.8" r="1.6" fill="#F0C428" />
        </svg>
        {unread ? <span aria-hidden="true" style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: '#F0C428', border: '2px solid #fff', boxSizing: 'border-box' }} /> : null}
      </button>
    </div>
  );
}
