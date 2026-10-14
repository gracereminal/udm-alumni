/**
 * Keyboard-activation helper for non-button elements that act as buttons:
 * runs `fn` on Enter/Space, but only when the element itself has focus
 * (so typing inside a nested input never triggers it).
 */
/** Backdrop click handler that ignores clicks bubbling up from the dialog inside. */
export const onBackdrop = (fn) => (e) => {
  if (fn && e.target === e.currentTarget) fn(e);
};

export const onActivate = (fn) => (e) => {
  if (!fn || e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn(e);
  }
};
