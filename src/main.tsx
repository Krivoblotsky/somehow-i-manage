import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { readSignedInHint } from './sync/hint';
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

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
// The build pre-renders the landing page into #root. A newcomer's first render is that same
// page, so hydrate it; someone who signed in before is about to see the splash, so start clean.
if (root.firstElementChild && !readSignedInHint()) {
  hydrateRoot(root, app);
} else {
  root.replaceChildren();
  createRoot(root).render(app);
}
