import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadCatalog } from './data/colleges';
import { purgeLegacyStorage } from './lib/api';
import { loadQuestionConfig } from './lib/questionStore';
import './styles/global.css';

const root = createRoot(document.getElementById('root'));

function Startup({ error, onRetry }) {
  return (
    <div role={error ? 'alert' : 'status'} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box', background: '#F4F6F5', fontFamily: 'Inter,system-ui,sans-serif', color: '#0B1220', textAlign: 'center' }}>
      {error ? (
        <div style={{ maxWidth: 380 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>The alumni portal is unavailable</div>
          <div style={{ fontSize: 13.5, color: '#64748B', marginBottom: 18 }}>{error}</div>
          <button type="button" onClick={onRetry} style={{ background: '#0F3D2E', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
        </div>
      ) : (
        <div style={{ fontSize: 13.5, color: '#64748B' }}>Loading the UDM Alumni portal…</div>
      )}
    </div>
  );
}

async function start() {
  root.render(<Startup />);
  try {
    // The college / program catalog and the Admin's tracer question edits are read synchronously by the forms,
    // so they load before the app renders.
    await Promise.all([loadCatalog(), loadQuestionConfig()]);
  } catch (err) {
    root.render(<Startup error={err.message} onRetry={start} />);
    return;
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

purgeLegacyStorage();
start();
