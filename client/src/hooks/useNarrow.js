import { useEffect, useState } from 'react';

/** True on phone-width screens (<= 760px); drives the `data-mobile` attribute the responsive CSS keys off. */
export default function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 760);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return narrow;
}
