import { createContext, useContext, useMemo, useState } from 'react';

const ResetFlowContext = createContext(null);

// step: 1 identifier · 2 code · 3 new password · 4 done · 5 link expired.
// token: the emailed reset token (link path) or the reset session returned by verify-code (code path).
const INITIAL = { step: 1, email: '', viaLink: false, token: '', linkEmail: '' };

/** Password-reset flow state shared by the Forgot Password page and the /reset-password link route. */
export function ResetFlowProvider({ children }) {
  const [flow, setFlow] = useState(INITIAL);
  const value = useMemo(
    () => ({
      flow,
      patch: (x) => setFlow((f) => ({ ...f, ...x })),
      reset: (x) => setFlow({ ...INITIAL, ...x }),
    }),
    [flow],
  );
  return <ResetFlowContext.Provider value={value}>{children}</ResetFlowContext.Provider>;
}

export const useResetFlow = () => useContext(ResetFlowContext);
