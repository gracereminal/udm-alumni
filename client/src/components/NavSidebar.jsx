import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { NAV, ROLE_LABEL } from '../data/navigation';
import { hv } from '../lib/stateStyle';
import Icon from './Icon';
import MessagesWidget from './MessagesWidget';

const initialsOf = (n) =>
  String(n || '')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !/^(dr|mr|mrs|ms|prof|engr|atty)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Phone bottom tab bar (NavSidebar.dc.html `nav-tabs`).
const TAB = { flex: 1, minWidth: 0, minHeight: 54, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: 0, cursor: 'pointer' };
const TAB_PILL = { width: 54, height: 30, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s' };
const TAB_LABEL = { fontSize: 11, lineHeight: 1.1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' };

/** Role-aware sidebar (per NavSidebar.dc.html): collapsible rail, gold active bar, user card with sign out; on phones, a bottom tab bar with a More sheet. */
export default function NavSidebar({ style }) {
  const { user, role, signOut } = useAuth();
  const { alumniName, avatar } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const items = NAV[role] || [];
  const isAlumni = role === 'alumni';
  const name = isAlumni ? alumniName : user?.name || '';
  const roleLabel = ROLE_LABEL[role];
  const initials = isAlumni ? initialsOf(name) : user?.initials || initialsOf(name);
  const hasAvatar = isAlumni && !!avatar;
  const expanded = !collapsed;

  const out = () => { signOut(); navigate('/signin', { replace: true }); };
  const isActive = (it) => location.pathname === it.to || location.pathname.startsWith(`${it.to}/`);
  const current = items.find(isActive);

  const logo = (size) => (
    <img src="/alumni-logo.png" alt="UDM Alumni" style={{ width: size, height: size, flex: 'none', objectFit: 'contain' }} />
  );

  const itemRow = (it) => {
    const on = isActive(it);
    return (
      <NavLink
        key={it.id}
        to={it.to}
        data-m="nav-item"
        title={it.label}
        aria-current={on ? 'page' : undefined}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center', gap: 12, padding: '11px 14px', borderRadius: 12,
          textDecoration: 'none', cursor: 'pointer', transition: 'background .15s', background: on ? 'rgba(234,243,241,.1)' : 'transparent',
          color: on ? '#fff' : '#EAF3F1', fontWeight: on ? 700 : 500,
        }}
        {...(on ? {} : hv({ background: 'rgba(234,243,241,.08)' }))}
      >
        <div style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: '0 3px 3px 0', background: on ? '#F0C428' : 'transparent' }} />
        <span style={{ display: 'flex', color: on ? '#F0C428' : 'currentColor' }}><Icon d={it.icon} /></span>
        {expanded ? <span data-m="nav-label" style={{ fontSize: 14, flex: 1, minWidth: 0, lineHeight: 1.3, textWrap: 'pretty' }}>{it.label}</span> : null}
      </NavLink>
    );
  };

  const mobileRow = (it) => {
    const on = isActive(it);
    return (
      <NavLink
        key={it.id}
        to={it.to}
        onClick={() => setMenuOpen(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, padding: '0 12px', borderRadius: 12, textDecoration: 'none', cursor: 'pointer',
          background: on ? 'rgba(234,243,241,.1)' : 'transparent', color: on ? '#fff' : '#EAF3F1', fontWeight: on ? 700 : 500,
        }}
      >
        <span style={{ display: 'flex', color: on ? '#F0C428' : 'currentColor' }}><Icon d={it.icon} /></span>
        <span style={{ fontSize: 15 }}>{it.label}</span>
      </NavLink>
    );
  };

  const tabItem = (it) => {
    const on = isActive(it);
    const short = it.label.length > 10 ? it.label.split(' ')[0] : it.label;
    return (
      <NavLink key={it.id} to={it.to} title={it.label} aria-label={it.label} aria-current={on ? 'page' : undefined} onClick={() => setMenuOpen(false)} style={{ ...TAB, textDecoration: 'none', color: on ? '#004D40' : '#64748B' }}>
        <span style={{ ...TAB_PILL, background: on ? '#DDEFE7' : 'transparent' }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={it.icon} /></svg>
        </span>
        <span style={{ ...TAB_LABEL, fontWeight: on ? 700 : 600 }}>{short}</span>
      </NavLink>
    );
  };

  return (
    <>
    <aside
      data-m="nav"
      aria-label="Main navigation"
      style={{
        width: expanded ? 240 : 84, minWidth: expanded ? 240 : 84, boxSizing: 'border-box', margin: '12px 0 12px 12px', padding: '18px 12px 14px', borderRadius: 16,
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 12, height: 'calc(100dvh - 24px)', alignSelf: 'flex-start', overflowY: 'auto', overflowX: 'hidden',
        scrollbarWidth: 'none', color: '#EAF3F1', background: '#00332B', boxShadow: '0 12px 32px -12px rgba(0,51,43,.45)', fontFamily: 'Inter,system-ui,sans-serif',
        transition: 'width .2s,min-width .2s', ...style,
      }}
    >
      {/* phone layout: compact bar with a menu toggle */}
      <div data-m="nav-bar" style={{ display: 'none', alignItems: 'center', gap: 10, width: '100%' }}>
        {logo(44)}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>UDM Alumni</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#F0C428', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current ? current.label : roleLabel}</div>
        </div>
        <button
          type="button" aria-expanded={menuOpen} aria-label="Open menu" onClick={() => setMenuOpen((o) => !o)}
          style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, border: 0, background: 'rgba(234,243,241,.08)', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} size={20} />
        </button>
      </div>
      {/* phone layout: bottom tab bar (first four items + More) */}
      <nav data-m="nav-tabs" aria-label="Main navigation" style={{ display: 'none', pointerEvents: 'auto', background: '#fff', borderTop: '1px solid #E3E8E5', padding: '6px 6px 8px', boxSizing: 'border-box', width: '100%', alignItems: 'stretch', justifyContent: 'space-around', boxShadow: '0 -8px 24px -12px rgba(0,30,20,.2)', fontFamily: 'Inter,system-ui,sans-serif' }}>
        {items.slice(0, 4).map(tabItem)}
        <button
          type="button" aria-expanded={menuOpen} aria-label="More" onClick={() => setMenuOpen((o) => !o)}
          style={{ ...TAB, border: 0, background: 'transparent', fontFamily: 'inherit', color: menuOpen ? '#004D40' : '#64748B' }}
        >
          <span style={{ ...TAB_PILL, background: menuOpen ? '#DDEFE7' : 'transparent' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
          </span>
          <span style={{ ...TAB_LABEL, fontWeight: 600 }}>More</span>
        </button>
      </nav>
      {menuOpen ? <div data-m="nav-scrim" role="presentation" onClick={() => setMenuOpen(false)} style={{ display: 'none' }} /> : null}
      {menuOpen ? (
        <div data-m="nav-menu" style={{ display: 'none', flexDirection: 'column', gap: 2, width: '100%', padding: '12px 0 4px', marginTop: 10, borderTop: '1px solid rgba(234,243,241,.12)' }}>
          <div data-m="sheet-head" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2px 0 10px' }}>
            <div style={{ width: 40, height: 5, borderRadius: 3, background: 'rgba(234,243,241,.3)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0 4px', boxSizing: 'border-box' }}>
              {logo(36)}
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>UDM Alumni</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#F0C428' }}>{roleLabel}</div>
              </div>
            </div>
          </div>
          {items.map(mobileRow)}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px 4px', marginTop: 6, borderTop: '1px solid rgba(234,243,241,.12)' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <button type="button" onClick={out} style={{ flex: 'none', minHeight: 44, padding: '0 14px', borderRadius: 12, border: '1px solid rgba(234,243,241,.2)', background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      ) : null}

      {/* desktop / tablet layout */}
      <div data-m="nav-full" style={{ display: 'flex', flexDirection: expanded ? 'row' : 'column', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 26, padding: '0 4px 0 6px' }}>
        <div data-m="nav-head" style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {logo(40)}
          {expanded ? <div data-m="nav-label" style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.3, whiteSpace: 'nowrap' }}>UDM Alumni</div> : null}
        </div>
        <button
          type="button" data-m="nav-collapse" onClick={() => setCollapsed((c) => !c)} title={expanded ? 'Collapse sidebar' : 'Expand sidebar'} aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{ width: 32, height: 32, flex: 'none', borderRadius: 10, border: '1px solid rgba(234,243,241,.16)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(234,243,241,.75)', cursor: 'pointer', padding: 0, transition: 'background .15s' }}
          {...hv({ background: 'rgba(234,243,241,.08)' })}
        >
          <Icon size={16}><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></Icon>
        </button>
      </div>

      {expanded ? (
        <div data-m="nav-full" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase', color: 'rgba(234,243,241,.42)', margin: '0 12px 10px' }}>
          <span data-m="nav-label">Menu</span>
        </div>
      ) : null}
      <nav data-m="nav-full" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>{items.map(itemRow)}</nav>

      <div data-m="nav-full" style={{ flex: 1, minHeight: 24 }} />

      <div data-m="nav-full" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 8, margin: '0 -4px', borderRadius: 14, background: 'rgba(234,243,241,.05)', border: '1px solid rgba(234,243,241,.08)' }}>
        <div data-m="nav-item" title={name} style={{ display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center', gap: 10, padding: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', flex: 'none', background: hasAvatar ? `url("${avatar}") center/cover no-repeat` : 'rgba(240,196,40,.18)', border: '1px solid rgba(240,196,40,.45)', color: '#E2C68A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3, overflow: 'hidden' }}>
            {hasAvatar ? null : initials}
          </div>
          {expanded ? (
            <div data-m="nav-label" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#F0C428', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleLabel}</div>
            </div>
          ) : null}
        </div>
        <button
          type="button" data-m="nav-item" onClick={out} title="Sign Out"
          style={{ display: 'flex', alignItems: 'center', justifyContent: expanded ? 'flex-start' : 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, color: '#F0C428', cursor: 'pointer', width: '100%', transition: 'background .15s,color .15s' }}
          {...hv({ background: 'rgba(234,243,241,.08)', color: '#EAF3F1' })}
        >
          <Icon><path d="M15 17l5-5-5-5" /><path d="M20 12H9" /><path d="M13 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8" /></Icon>
          {expanded ? <span data-m="nav-label">Sign Out</span> : null}
        </button>
      </div>
    </aside>
    <MessagesWidget />
    </>
  );
}
