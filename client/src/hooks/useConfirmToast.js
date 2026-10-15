import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Confirm dialog + toast state used by the admin management screens.
 * cfg: { title, body, detail, cancelLabel, okLabel, busyLabel, danger, async, onOk }
 */
export default function useConfirmToast() {
  const [confirm, setConfirm] = useState(null);
  const [cfBusy, setCfBusy] = useState(false);
  const [cfErr, setCfErr] = useState('');
  const [tm, setTm] = useState(null);
  const cancelRef = useRef(null);
  const toastT = useRef(null);
  const busyRef = useRef(false);

  const askConfirm = useCallback((cfg) => {
    setConfirm(cfg); setCfBusy(false); setCfErr('');
    setTimeout(() => { const b = cancelRef.current; if (b) b.focus(); }, 30);
  }, []);
  const toast = useCallback((text, ok = true) => {
    setTm({ ok, text });
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setTm(null), 5000);
  }, []);
  const closeConfirm = useCallback(() => { setConfirm(null); setCfBusy(false); setCfErr(''); }, []);
  /** Runs an async confirm handler (an API call); the dialog stays open with the error if it fails. */
  const runAsync = useCallback(async (work, failMsg) => {
    if (busyRef.current) return;
    busyRef.current = true; setCfBusy(true); setCfErr('');
    try { await work(); closeConfirm(); } catch (err) { setCfBusy(false); setCfErr((err && err.status && err.message) || failMsg || 'Something went wrong. Please try again.'); } finally { busyRef.current = false; }
  }, [closeConfirm]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && confirm && !cfBusy) closeConfirm(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirm, cfBusy, closeConfirm]);

  const cf = confirm;
  const vals = {
    cfOn: !!cf, cfTitle: cf ? cf.title : '', cfBody: cf ? cf.body : '', cfDetail: (cf && cf.detail) || '', cfHasDetail: !!(cf && cf.detail),
    cfCancelLabel: cf ? cf.cancelLabel : 'Cancel', cfOkLabel: cf ? (cfBusy ? cf.busyLabel || cf.okLabel : cf.okLabel) : '',
    cfOkBg: cf && cf.danger ? '#B42318' : '#0F3D2E', cfBusy, cfOpacity: cfBusy ? 0.7 : 1, cfErr, cfHasErr: !!cfErr, cfCancelRef: cancelRef,
    cfCancel: () => { if (!cfBusy) closeConfirm(); },
    cfOk: () => { if (!cf) return; if (cf.async) cf.onOk(); else { setConfirm(null); cf.onOk(); } },
    stopProp: (e) => e.stopPropagation(),
    toastOn: !!tm, toastText: tm ? tm.text : '', toastBg: tm && !tm.ok ? '#B42318' : '#0F3D2E', toastIcon: tm && !tm.ok ? '!' : '✓', toastClose: () => setTm(null),
  };
  return { vals, askConfirm, toast, runAsync, closeConfirm };
}
