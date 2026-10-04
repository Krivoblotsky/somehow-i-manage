import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { captureReferral } from './marketing/attribution';
import { registerUpdates } from './pwa';
import { captureConsentRequest } from './sync/consent';
import { readSignedInHint } from './sync/hint';
import './styles/tokens.css';
import './styles/global.css';

// Dev only: lets a developer poke at the stores from the console (e.g. fake a signed-in user
// to review screens without a Google account). Stripped from production builds.
if (import.meta.env.DEV) {
  void Promise.all([import('./state/ui'), import('./sync/store'), import('./state/actions')]).then(
    ([ui, sync, actions]) => {
      Object.assign(window, {
        __dev: {
          useUI: ui.useUI,
          useSync: sync.useSync,
          actions,
          // __dev.fakeSignIn(): review the signed-in screens without an account. Offline on
          // purpose: a pretend user has no session, and the sync engine would otherwise retry a
          // failing upload every minute and litter the project's Postgres log.
          fakeSignIn: (name = 'Dev User') =>
            sync.useSync.setState({
              ready: true,
              user: { id: 'dev-user', email: 'dev@example.com', name },
              online: false,
            }),
        },
      });
    },
  );
}

registerUpdates();
// An AI assistant asking to connect arrives with ?authorization_id=…; keep it for the consent screen.
captureConsentRequest();
// A campaign link (?utm_source=…) is remembered on this device and attached to the first answer.
captureReferral();

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
