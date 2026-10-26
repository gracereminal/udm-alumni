import { Component } from 'react';

/** Full-page message when start-up data or a page's code can't be loaded (e.g. the API is down). */
export function StartupError({ error, onRetry }) {
  return (
    <div role="alert" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', background: '#F4F6F5', fontFamily: 'Inter,system-ui,sans-serif', color: '#0B1220', textAlign: 'center' }}>
      <div style={{ maxWidth: 380 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>The alumni portal is unavailable</div>
        <div style={{ fontSize: 13.5, color: '#64748B', marginBottom: 18 }}>{error}</div>
        <button type="button" onClick={onRetry} style={{ background: '#0F3D2E', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
      </div>
    </div>
  );
}

/** Catches a failed lazy page (its code or the start-up data); "Try again" reloads, since React.lazy keeps the failure. */
export class StartupBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const msg = error.status !== undefined ? error.message : 'Part of the portal didn’t load. Check your connection and try again.';
    return <StartupError error={msg} onRetry={() => window.location.reload()} />;
  }
}
