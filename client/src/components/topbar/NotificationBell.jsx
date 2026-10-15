import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notifLook, timeAgo, TONES } from '../../data/notifications';
import { screenPath } from '../../data/navigation';
import { hv } from '../../lib/stateStyle';
import { get, post } from '../../lib/api';

const POLL_MS = 45000;

/**
 * Bell with the unread badge and the notifications dropdown. Rows are NOTIFICATION records written by the
 * server when another role acts; read state is stored on the server, so it follows the user across devices.
 */
export default function NotificationBell() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [defs, setDefs] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(() => get('/notifications?limit=30').then((r) => { setDefs(r.rows); setUnread(r.unread); }).catch(() => {}), []);
  useEffect(() => {
    if (!user) return undefined;
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [user, load]);
  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const markAll = () => {
    setDefs((d) => d.map((n) => ({ ...n, read: true })));
    setUnread(0);
    post('/notifications/read-all').catch(load);
  };
  const pick = (n) => {
    if (!n.read) {
      setDefs((d) => d.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      post(`/notifications/${n.id}/read`).catch(load);
    }
    setOpen(false);
    navigate(screenPath(role, n.to));
  };

  return (
    <div style={{ position: 'relative', flex: 'none' }}>
      <div
        role="button" tabIndex={0} aria-label="Notifications" aria-expanded={open} title="Notifications"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
        style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #E7E9ED', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}
        {...hv({ background: '#E7E9ED' })}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 ? (
          <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, background: '#C0392B', border: '2px solid #fff', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unread}</div>
        ) : null}
      </div>
      {open ? (
        <>
          <div role="presentation" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'absolute', right: 0, top: 50, width: 370, maxWidth: 'calc(100vw - 32px)', zIndex: 61, background: '#fff', border: '1px solid #E7E9ED', borderRadius: 14, boxShadow: '0 12px 32px rgba(16,24,40,.14)', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #EEF0F3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 14, color: '#0B1220' }}>Notifications</div>
                {unread > 0 ? <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0F3D2E', background: '#E6F0EB', padding: '2px 8px', borderRadius: 999 }}>{unread} new</div> : null}
              </div>
              {unread > 0 ? (
                <div role="button" tabIndex={0} onClick={markAll} onKeyDown={(e) => { if (e.key === 'Enter') markAll(); }} style={{ fontSize: 12, fontWeight: 600, color: '#004D40', cursor: 'pointer' }} {...hv({ color: '#B8860B' })}>Mark all as read</div>
              ) : null}
            </div>
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {defs.length === 0 ? <div style={{ padding: '22px 16px', fontSize: 12.5, color: '#64748B', textAlign: 'center' }}>You’re all caught up.</div> : null}
              {defs.map((n) => {
                const isRead = n.read;
                const look = notifLook(n.type);
                const [ib, ic] = TONES[look.tone];
                return (
                  <div
                    key={n.id} role="button" tabIndex={0} onClick={() => pick(n)} onKeyDown={(e) => { if (e.key === 'Enter') pick(n); }}
                    style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: '1px solid #F1F2F4', cursor: 'pointer', background: isRead ? '#fff' : '#F6FAF8' }}
                    {...hv({ background: '#F1F4F3' })}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 10, flex: 'none', background: ib, color: ic, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}><path d={look.icon} /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: isRead ? 500 : 700, color: '#0B1220', lineHeight: 1.35 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.45, textWrap: 'pretty' }}>{n.body}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', marginTop: 5, background: isRead ? 'transparent' : '#0F8A5F' }} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
