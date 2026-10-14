import { createContext, useContext, useMemo, useState } from 'react';

const ResetFlowContext = createContext(null);

const INITIAL = { step: 1, email: '', sentAt: 0, linkUsed: false, viaLink: false };

/** Password-reset flow state shared by the Forgot Password page and the demo mail inbox. */
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
