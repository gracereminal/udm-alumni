import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

/** App-wide confirmation toast ("Profile saved", "Application submitted", …). */
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef(null);
  const toast = useCallback((text, ok = true) => {
    clearTimeout(timer.current);
    setT({ text, ok });
    timer.current = setTimeout(() => setT(null), 4500);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {t ? (
        <div role="status" aria-live="polite" style={{ position: 'fixed', left: 0, right: 0, bottom: 24, zIndex: 400, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 12, background: t.ok ? '#0F3D2E' : '#B42318', color: '#fff', borderRadius: 12, padding: '12px 14px 12px 16px', boxShadow: '0 12px 32px rgba(16,24,40,.28)', fontSize: 13.5, fontWeight: 600, maxWidth: 520 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flex: 'none' }}>{t.ok ? '✓' : '!'}</span>
            <span>{t.text}</span>
            <button type="button" onClick={() => setT(null)} aria-label="Dismiss" style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,.75)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
