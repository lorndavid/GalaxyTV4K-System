import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './i18n';
import './index.css';

// Guard against third-party / Cloudflare Speed Brain / Web Vitals unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.message &&
      (event.message.includes('startTime') ||
        event.message.includes('reportAllChanges') ||
        event.filename?.includes('cdn-cgi'))
    ) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
