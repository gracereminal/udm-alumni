import SearchPill from './topbar/SearchPill';
import NotificationBell from './topbar/NotificationBell';
import UserChip from './topbar/UserChip';

/**
 * Page header card used on every portal screen: title + caption on the left, and either custom `actions`
 * or the standard search / notifications / user cluster on the right.
 */
export default function Topbar({ title, caption, actions, tools = true }) {
  return (
    <div
      data-m="topbar"
      style={{
        background: '#fff', border: '1px solid #E7E9ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 12px 24px', margin: '12px 12px 0',
        borderRadius: 16, boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)', minHeight: 70, boxSizing: 'border-box', gap: 16, flexWrap: 'wrap', minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.6, color: '#0B1220' }}>{title}</div>
        {caption ? <div style={{ fontSize: 11, color: 'rgba(0,0,0,.45)', fontWeight: 600, letterSpacing: 0.3 }}>{caption}</div> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {actions}
        {tools ? (
          <>
            <SearchPill />
            <NotificationBell />
            <UserChip />
          </>
        ) : null}
      </div>
    </div>
  );
}
