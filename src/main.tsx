import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/index.css';
import { initPWA } from '@/lib/pwa';

// Register service worker, install prompt, and connectivity listeners.
initPWA();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found — check index.html');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
