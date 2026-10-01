import { lazy, Suspense, useEffect } from 'react';
import { LandingPage, SetupScreen, Splash } from './components/LandingPage';
import { Toast } from './components/Toast';
import { startSync } from './sync/controller';
import { useSync } from './sync/store';

// Everything behind the sign-in — the map, the editor, the database — loads only once someone is in.
const Workspace = lazy(() => import('./Workspace'));

/** Signed in: the workspace. Otherwise the landing page — or, without a backend, the setup notice. */
export default function App() {
  const configured = useSync((s) => s.configured);
  const ready = useSync((s) => s.ready);
  const user = useSync((s) => s.user);

  useEffect(() => {
    void startSync();
  }, []);

  let screen;
  if (!configured) screen = <SetupScreen />;
  else if (!ready) screen = <Splash />;
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
