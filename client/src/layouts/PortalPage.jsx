import NavSidebar from '../components/NavSidebar';
import Topbar from '../components/Topbar';

const BACKGROUNDS = {
  green: 'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),radial-gradient(800px 500px at 100% 100%,#EAF2EE 0%,rgba(234,242,238,0) 70%),#F3F6F4',
  gold: 'radial-gradient(900px 520px at 0% 0%,#FBF1D3 0%,rgba(251,241,211,0) 70%),radial-gradient(800px 500px at 100% 100%,#F8F1DE 0%,rgba(248,241,222,0) 70%),#F6F4EE',
};

/** Standard portal screen: role sidebar + topbar + content area (alumni = green wash, staff = gold wash). */
export default function PortalPage({ label, title, caption, actions, tools = true, tone = 'green', contentStyle, children }) {
  return (
    <div data-screen-label={label || title} style={{ display: 'flex', minHeight: '100vh', background: BACKGROUNDS[tone] }}>
      <NavSidebar style={{ flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} caption={caption} actions={actions} tools={tools} />
        <div style={{ padding: '14px 12px 28px', width: '100%', boxSizing: 'border-box', fontFamily: 'var(--udm-sans)', ...contentStyle }}>{children}</div>
      </div>
    </div>
  );
}

export const card = {
  background: '#fff', border: '1px solid #E7E9ED', borderRadius: 16, boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
};
