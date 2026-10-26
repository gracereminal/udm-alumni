import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { prefetchSession } from './context/AuthContext';
import { purgeLegacyStorage } from './lib/api';
import { startupData } from './lib/startup';
import './styles/global.css';

purgeLegacyStorage();
// Everything the first screen may need starts at once, in parallel; the app renders without waiting for any of it.
prefetchSession();
startupData().catch(() => { /* the pages that need it retry and show the error */ });

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
