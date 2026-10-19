import { useEffect } from 'react';

/** While `open`, focuses `focusRef` and closes on Escape (used by the contact / apply dialogs). */
export default function useDialogDismiss(open, onClose, focusRef) {
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => focusRef.current && focusRef.current.focus(), 0);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
