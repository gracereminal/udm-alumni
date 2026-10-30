import { useEffect, useRef } from 'react';

const REFRESH_MS = 60_000;

/**
 * Keeps a screen in step with changes made elsewhere (other users, other tabs): calls `refresh` when the tab comes
 * back into view and every `ms` while it is visible. Nothing runs while `enabled` is false.
 */
export default function useLiveRefresh(refresh, { enabled = true, ms = REFRESH_MS } = {}) {
  const fn = useRef(refresh);
  fn.current = refresh;
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') fn.current(); };
    const timer = setInterval(tick, ms);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [enabled, ms]);
}
