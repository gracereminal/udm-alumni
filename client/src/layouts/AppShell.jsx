import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import useNarrow from '../hooks/useNarrow';

/** Root wrapper: sets the responsive hooks (`data-mobile`) the prototype's CSS relies on. */
export default function AppShell() {
  const narrow = useNarrow();
  return (
    <div data-mobile={narrow ? '1' : '0'} data-frame="0" style={{ fontFamily: 'Inter,system-ui,sans-serif', background: '#F3F6F4', minHeight: '100vh' }}>
      {/* Most route pages are lazy (routes/AppRoutes.jsx); the frame's background shows while one loads. */}
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
}
