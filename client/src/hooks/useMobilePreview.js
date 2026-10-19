import { useSyncExternalStore } from 'react';

/**
 * The design file's `mobilePreview` setting (UDM Alumni.dc.html → Responsive):
 * - auto: phone layout when the window is phone-width (<= 760px)
 * - phone: phone layout inside a 390px device frame (full-bleed on an actual phone)
 * - desktop: desktop layout at any width
 * Set with `?preview=auto|phone|desktop` or the preview switcher; remembered in localStorage.
 */
export const PREVIEW_MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'phone', label: 'Phone frame' },
  { id: 'desktop', label: 'Desktop' },
];

const KEY = 'udm.mobilePreview';
const isMode = (v) => PREVIEW_MODES.some((m) => m.id === v);
const isNarrow = () => typeof window !== 'undefined' && window.innerWidth <= 760;

function initialMode() {
  if (typeof window === 'undefined') return 'auto';
  const q = new URLSearchParams(window.location.search).get('preview');
  try {
    if (isMode(q)) {
      localStorage.setItem(KEY, q);
      return q;
    }
    const saved = localStorage.getItem(KEY);
    return isMode(saved) ? saved : 'auto';
  } catch {
    return isMode(q) ? q : 'auto';
  }
}

let mode = initialMode();
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
    /** Phone layout on (`data-mobile="1"`). */
    mobile: m === 'phone' || (m !== 'desktop' && n),
    /** Device frame drawn (`data-frame="1"`); an actual phone gets the layout without the frame. */
    frame: m === 'phone' && !n,
  };
}
