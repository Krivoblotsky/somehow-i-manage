import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

// Dev only: lets a developer poke at the stores from the console (e.g. fake a signed-in user
// to review screens without a Google account). Stripped from production builds.
if (import.meta.env.DEV) {
  void Promise.all([import('./state/ui'), import('./sync/store'), import('./state/actions')]).then(
    ([ui, sync, actions]) => {
      Object.assign(window, { __dev: { useUI: ui.useUI, useSync: sync.useSync, actions } });
    },
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
