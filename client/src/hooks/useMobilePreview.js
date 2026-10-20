import { useSyncExternalStore } from 'react';

/**
 * The design file's `mobilePreview` setting (UDM Alumni.dc.html → Responsive):
 * - auto: phone layout when the window is phone-width (<= 760px)
 * - phone: phone layout inside a 390px device frame (full-bleed on an actual phone)
 * - desktop: desktop layout on any window wider than a phone
 * Set with `?preview=auto|phone|desktop` or the preview switcher; remembered in localStorage.
 * A phone-width window always gets the phone layout: the switcher is hidden there, so a saved "desktop" would stick.
 * The switcher shows in dev, and in production once any `?preview=` mode has been used (until `?preview=off`).
 */
export const PREVIEW_MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'phone', label: 'Phone frame' },
  { id: 'desktop', label: 'Desktop' },
];

const KEY = 'udm.mobilePreview';
const isMode = (v) => PREVIEW_MODES.some((m) => m.id === v);
const isNarrow = () => typeof window !== 'undefined' && window.innerWidth <= 760;

/** { mode, enabled }: `enabled` (switcher available in production) stays on while a mode is saved, Auto included. */
function initialState() {
  if (typeof window === 'undefined') return { mode: 'auto', enabled: false };
  const q = new URLSearchParams(window.location.search).get('preview');
  try {
    if (q === 'off') {
      localStorage.removeItem(KEY);
      return { mode: 'auto', enabled: false };
    }
    if (isMode(q)) {
      localStorage.setItem(KEY, q);
      return { mode: q, enabled: true };
    }
    const saved = localStorage.getItem(KEY);
    return isMode(saved) ? { mode: saved, enabled: true } : { mode: 'auto', enabled: false };
  } catch {
    return isMode(q) ? { mode: q, enabled: true } : { mode: 'auto', enabled: false };
  }
}

const initial = initialState();
let mode = initial.mode;
/** True once a preview mode was picked with `?preview=`, so the switcher stays reachable after choosing Auto. */
export const previewEnabled = initial.enabled;
let narrow = isNarrow();
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const onResize = () => {
  const n = isNarrow();
  if (n !== narrow) {
    narrow = n;
    emit();
  }
};

function subscribe(listener) {
  if (!listeners.size) window.addEventListener('resize', onResize);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('resize', onResize);
  };
}

export function setPreviewMode(next) {
  if (!isMode(next) || next === mode) return;
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* preview choice just isn't remembered */
  }
  emit();
}

export default function useMobilePreview() {
  const m = useSyncExternalStore(subscribe, () => mode, () => 'auto');
  const n = useSyncExternalStore(subscribe, () => narrow, () => false);
  return {
    mode: m,
    /** The window itself is phone-width. */
    narrow: n,
    setMode: setPreviewMode,
    /** Phone layout on (`data-mobile="1"`); always on a phone-width window, where the switcher is hidden. */
    mobile: m === 'phone' || n,
    /** Device frame drawn (`data-frame="1"`); an actual phone gets the layout without the frame. */
    frame: m === 'phone' && !n,
  };
}
