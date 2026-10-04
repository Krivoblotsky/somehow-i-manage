import { lazy, Suspense, useEffect } from 'react';
import { LandingPage, SetupScreen, Splash } from './components/LandingPage';
import { OAuthConsent } from './components/OAuthConsent';
import { Toast } from './components/Toast';
import { pendingConsentId } from './sync/consent';
import { startSync } from './sync/controller';
import { readSignedInHint } from './sync/hint';
import { useSync } from './sync/store';

// Everything behind the sign-in — the map, the editor, the database — loads only once someone is in.
const Workspace = lazy(() => import('./Workspace'));

/** Signed in: the workspace. Otherwise the landing page — or, without a backend, the setup notice. */
export default function App() {
  const configured = useSync((s) => s.configured);
  const ready = useSync((s) => s.ready);
  const user = useSync((s) => s.user);
  // While the saved session is checked: someone who signed in here before waits behind a splash;
  // everyone else (a newcomer, a crawler, the pre-render) gets the landing page straight away.
  const likelySignedIn = readSignedInHint();

  useEffect(() => {
    void startSync();
  }, []);

  // An AI assistant waiting for the user's decision takes over the screen: sign in first if
  // needed, then approve or deny.
  const consentId = ready ? pendingConsentId() : null;

  let screen;
  if (!configured) screen = <SetupScreen />;
  else if (!ready) screen = likelySignedIn ? <Splash /> : <LandingPage />;
  else if (consentId) screen = <OAuthConsent id={consentId} signedIn={user !== null} />;
  else if (!user) screen = <LandingPage />;
  else
    screen = (
      <Suspense fallback={<Splash />}>
        <Workspace />
      </Suspense>
    );
  return (
    <>
      {screen}
      <Toast />
    </>
  );
}
