import { useEffect, useState } from 'react';
import { clearConsent } from '../sync/consent';
import { syncActions, type SyncActions } from '../sync/controller';
import { passkeysSupported } from '../sync/passkeys';
import type { ConsentRequest } from '../sync/types';
import { GoogleIcon, MicrosoftIcon } from './icons';
import styles from './OAuthConsent.module.css';
import ui from './ui.module.css';

type Details = { request: ConsentRequest } | { redirectUrl: string };

/**
 * The OAuth consent screen for AI assistants (MCP clients). Supabase sends the user here; signed
 * out, the screen asks them to sign in first; signed in, it names the client and asks to allow
 * it to act as them. Either answer sends the browser back to the client.
 */
export function OAuthConsent({
  id,
  signedIn,
  actions = syncActions,
  navigate = (url) => window.location.assign(url),
}: {
  id: string;
  signedIn: boolean;
  actions?: SyncActions;
  navigate?: (url: string) => void;
}) {
  return (
    <div className={styles.centre}>
      <div className={styles.card} data-testid="oauth-consent">
        <div className={styles.brand}>Somehow I Manage</div>
        {signedIn ? (
          <Decision id={id} actions={actions} navigate={navigate} />
        ) : (
          <SignInFirst actions={actions} />
        )}
      </div>
    </div>
  );
}

function SignInFirst({ actions }: { actions: SyncActions }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setProblem(null);
    try {
      await fn();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }
  return (
    <>
      <h1 className={styles.title}>An AI assistant wants to connect</h1>
      <p className={styles.text}>
        Sign in to see which one it is and decide. It will only ever see what you can see.
      </p>
      <div className={styles.providers}>
        <button
          type="button"
          className={styles.provider}
          disabled={busy !== null}
          onClick={() => void run('google', actions.signInWithGoogle)}
        >
          <GoogleIcon size={16} />
          {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          className={styles.provider}
          disabled={busy !== null}
          onClick={() => void run('microsoft', actions.signInWithMicrosoft)}
        >
          <MicrosoftIcon size={16} />
          {busy === 'microsoft' ? 'Opening Microsoft…' : 'Continue with Microsoft'}
        </button>
        {passkeysSupported() && (
          <button
            type="button"
            className={styles.passkey}
            disabled={busy !== null}
            onClick={() => void run('passkey', actions.signInWithPasskey)}
          >
            {busy === 'passkey' ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
          </button>
        )}
      </div>
      {problem && (
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      )}
    </>
  );
}

function Decision({
  id,
  actions,
  navigate,
}: {
  id: string;
  actions: SyncActions;
  navigate: (url: string) => void;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<'allow' | 'deny' | null>(null);

  useEffect(() => {
    let cancelled = false;
    actions
      .authorizationDetails(id)
      .then((found) => {
        if (cancelled) return;
        if ('redirectUrl' in found) {
          // approved before: nothing to ask
          clearConsent();
          navigate(found.redirectUrl);
        } else setDetails(found);
      })
      .catch((e: unknown) => {
        if (!cancelled) setProblem(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [id, actions, navigate]);

  async function decide(allow: boolean) {
    setBusy(allow ? 'allow' : 'deny');
    setProblem(null);
    try {
      const url = allow
        ? await actions.approveAuthorization(id)
        : await actions.denyAuthorization(id);
      clearConsent();
      navigate(url);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  if (problem && !details) {
    return (
      <>
        <h1 className={styles.title}>This request can’t be shown</h1>
        <p className={styles.problem} role="alert">
          {problem}
        </p>
        <p className={styles.text}>
          Go back to the assistant and start the connection again. If it keeps failing, the link may
          have expired: they last ten minutes.
        </p>
        <button
          type="button"
          className={ui.btn}
          onClick={() => {
            clearConsent();
            window.location.assign(import.meta.env.BASE_URL);
          }}
        >
          Back to the app
        </button>
      </>
    );
  }
  if (!details || !('request' in details)) {
    return (
      <p className={styles.text} aria-busy="true">
        One moment…
      </p>
    );
  }

  const { request } = details;
  let returnHost = request.redirectUri;
  try {
    returnHost = new URL(request.redirectUri).host;
  } catch {
    // not a URL we can shorten; show as is
  }
  return (
    <>
      <div className={styles.client}>
        {request.client.logoUri && (
          <img className={styles.logo} src={request.client.logoUri} alt="" width={40} height={40} />
        )}
        <div>
          <div className={styles.clientName}>{request.client.name}</div>
          {request.client.uri && <div className={styles.clientUri}>{request.client.uri}</div>}
        </div>
      </div>
      <h1 className={styles.title}>Allow {request.client.name} to work as you?</h1>
      <p className={styles.text}>
        It will be able to see and change your people, tasks, notes and projects, exactly as you can
        in the app, until you disconnect it in <b>Account &amp; sync</b>.
      </p>
      <p className={styles.fine}>Afterwards you return to {returnHost}.</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.btn}
          disabled={busy !== null}
          onClick={() => void decide(false)}
        >
          {busy === 'deny' ? 'One moment…' : 'Don’t allow'}
        </button>
        <button
          type="button"
          className={ui.btnPrimary}
          disabled={busy !== null}
          onClick={() => void decide(true)}
        >
          {busy === 'allow' ? 'One moment…' : 'Allow'}
        </button>
      </div>
      {problem && (
        <p className={styles.problem} role="alert">
          {problem}
        </p>
      )}
    </>
  );
}
