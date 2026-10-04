import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { clearAllData } from '../data/repository';
import { formatRelativeTime } from '../model/format';
import { useNow } from '../state/now';
import { useUI } from '../state/ui';
import { syncActions, type SyncActions } from '../sync/controller';
import { claudeCodeCommand, MCP_URL } from '../sync/mcp';
import { passkeysSupported } from '../sync/passkeys';
import { useSync } from '../sync/store';
import type { Grant, Passkey } from '../sync/types';
import dlg from './dialog.module.css';
import styles from './SyncDialog.module.css';
import ui from './ui.module.css';

/** How sync is doing for the signed-in account, and the way out. */
export function SyncDialog({ actions = syncActions }: { actions?: SyncActions }) {
  const dialog = useUI((s) => s.dialog);
  const closeDialog = useUI((s) => s.closeDialog);
  const open = dialog?.type === 'sync';
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={dlg.overlay} />
        <Dialog.Content className={dlg.content}>
          {open && <SyncForm actions={actions} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SyncForm({ actions }: { actions: SyncActions }) {
  const user = useSync((s) => s.user);
  if (!user) return null; // the front door handles signing in
  return <SignedIn actions={actions} email={user.email} />;
}

function SignedIn({ actions, email }: { actions: SyncActions; email?: string }) {
  const phase = useSync((s) => s.phase);
  const online = useSync((s) => s.online);
  const pending = useSync((s) => s.pending);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const error = useSync((s) => s.error);
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const selectPerson = useUI((s) => s.selectPerson);

  async function deleteAll() {
    if (!window.confirm('Delete ALL people and items, here and in sync? This cannot be undone.'))
      return;
    await clearAllData();
    selectPerson(null);
  }

  let line: string;
  let isError = false;
  if (!online) line = 'Offline — changes wait here until you’re back online.';
  else if (phase === 'syncing') line = 'Syncing…';
  else if (phase === 'error') {
    line = `Couldn’t sync: ${error ?? 'unknown error'}. Will retry.`;
    isError = true;
  } else if (pending > 0) line = `${pending} change${pending === 1 ? '' : 's'} waiting to upload.`;
  else if (lastSyncedAt) line = `Up to date · synced ${formatRelativeTime(lastSyncedAt, now)}.`;
  else line = 'Connected. First sync is on its way.';

  async function signOut() {
    setBusy(true);
    try {
      await actions.signOut();
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (
      !window.confirm(
        'Delete your account and everything in it, on every device? This cannot be undone.',
      )
    )
      return;
    setBusy(true);
    try {
      await actions.deleteAccount();
      selectPerson(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Dialog.Title className={dlg.title}>Account &amp; sync</Dialog.Title>
      <Dialog.Description className={dlg.description}>
        Your people, tasks and notes follow you to every device signed in with this account.
      </Dialog.Description>
      <div className={styles.status} aria-live="polite">
        <div className={styles.who}>Signed in as {email ?? 'you'}</div>
        <div className={isError ? styles.lineError : styles.line}>{line}</div>
      </div>
      <Passkeys actions={actions} />
      <Assistants actions={actions} />
      <p className={styles.note}>
        Signing out leaves this device’s copy in place for when you sign back in. Another account
        signing in here starts from its own data. “Delete all data” removes everything from this
        device and from sync. Done with the app?{' '}
        <button
          type="button"
          className={styles.deleteAccount}
          disabled={busy}
          onClick={() => void deleteAccount()}
        >
          Delete your account…
        </button>
      </p>
      <div className={dlg.footer}>
        <button type="button" className={ui.btnDanger} onClick={() => void deleteAll()}>
          Delete all data…
        </button>
        <button type="button" className={ui.btn} disabled={busy} onClick={() => void signOut()}>
          Sign out
        </button>
        <span className={dlg.grow} />
        <button
          type="button"
          className={ui.btn}
          disabled={phase === 'syncing' || !online}
          onClick={() => void actions.syncNow()}
        >
          Sync now
        </button>
        <Dialog.Close asChild>
          <button type="button" className={ui.btnPrimary}>
            Done
          </button>
        </Dialog.Close>
      </div>
    </div>
  );
}

/** A faster way back in: Face ID, Touch ID or a security key instead of the trip to Google. */
function Passkeys({ actions }: { actions: SyncActions }) {
  const [list, setList] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const now = useNow();
  const supported = passkeysSupported();

  useEffect(() => {
    let cancelled = false;
    actions
      .listPasskeys()
      .then((items) => {
        if (!cancelled) setList(items);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setList([]);
          setProblem(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [actions]);

  async function add() {
    setBusy(true);
    setProblem(null);
    try {
      const created = await actions.registerPasskey();
      setList((current) => [...(current ?? []), created]);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setProblem(null);
    try {
      await actions.deletePasskey(id);
      setList((current) => (current ?? []).filter((p) => p.id !== id));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className={styles.passkeys} aria-labelledby="passkeys-title">
      <h3 id="passkeys-title" className={styles.sectionTitle}>
        Passkeys
      </h3>
      <p className={styles.note}>
        Next time, sign in with Face ID, Touch ID or a security key instead of going through Google.
        A passkey made on a Mac or iPhone follows you through iCloud Keychain.
      </p>
      {list && list.length > 0 && (
        <ul className={styles.passkeyList}>
          {list.map((p) => (
            <li key={p.id} className={styles.passkeyRow}>
              <span className={styles.passkeyName}>{p.name ?? 'Passkey'}</span>
              <span className={styles.passkeyMeta}>
                added {formatRelativeTime(p.createdAt, now)}
                {p.lastUsedAt ? ` · used ${formatRelativeTime(p.lastUsedAt, now)}` : ''}
              </span>
              <button
                type="button"
                className={styles.passkeyRemove}
                onClick={() => void remove(p.id)}
                aria-label={`Remove passkey ${p.name ?? ''}`.trim()}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.passkeyActions}>
        <button
          type="button"
          className={ui.btn}
          disabled={busy || !supported || list === null}
          onClick={() => void add()}
        >
          {busy ? 'Waiting for your passkey…' : 'Add a passkey'}
        </button>
        {!supported && <span className={styles.passkeyMeta}>Not available in this browser.</span>}
      </div>
      {problem && <p className={styles.lineError}>{problem}</p>}
    </section>
  );
}

/** A value with a Copy button: the MCP address and the one-liner for Claude Code. */
function Copyable({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // no clipboard access: the text is selectable anyway
    }
  }
  return (
    <div className={styles.copyRow}>
      <code className={styles.mono} aria-label={label}>
        {value}
      </code>
      <button type="button" className={styles.copyBtn} onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/** The project has not turned the OAuth server on yet: say so instead of showing a raw error. */
function describeGrantsError(message: string): string {
  if (/disabled|not enabled/i.test(message))
    return 'Connecting assistants isn’t switched on for this project yet (docs/MCP.md has the steps).';
  return `Connected assistants can’t be listed right now: ${message}`;
}

/**
 * AI assistants (MCP clients): the address to give them, and who is connected already. Each
 * one signs in and gets approved once on the consent screen, then works as the user.
 */
function Assistants({ actions }: { actions: SyncActions }) {
  const [grants, setGrants] = useState<Grant[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const now = useNow();

  useEffect(() => {
    let cancelled = false;
    actions
      .listGrants()
      .then((list) => {
        if (!cancelled) setGrants(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setGrants([]);
          setProblem(describeGrantsError(e instanceof Error ? e.message : String(e)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [actions]);

  async function disconnect(grant: Grant) {
    if (!window.confirm(`Disconnect ${grant.name}? It will have to ask again to continue.`)) return;
    setProblem(null);
    try {
      await actions.revokeGrant(grant.clientId);
      setGrants((current) => (current ?? []).filter((g) => g.clientId !== grant.clientId));
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    }
  }

  if (!MCP_URL) return null;
  return (
    <section className={styles.assistants} aria-labelledby="assistants-title">
      <h3 id="assistants-title" className={styles.sectionTitle}>
        AI assistants
      </h3>
      <p className={styles.note}>
        Claude, ChatGPT, Cursor and other MCP clients can work with your people, tasks and notes as
        you. Give the client this address; it asks you to sign in and approve it once.
      </p>
      <Copyable value={MCP_URL} label="MCP server address" />
      <p className={styles.note}>In Claude Code, one line does it:</p>
      <Copyable value={claudeCodeCommand(MCP_URL)} label="Claude Code command" />
      {grants && grants.length > 0 && (
        <ul className={styles.passkeyList} aria-label="Connected assistants">
          {grants.map((g) => (
            <li key={g.clientId} className={styles.passkeyRow}>
              <span className={styles.passkeyName}>{g.name}</span>
              <span className={styles.passkeyMeta}>
                connected {formatRelativeTime(g.grantedAt, now)}
              </span>
              <button
                type="button"
                className={styles.passkeyRemove}
                onClick={() => void disconnect(g)}
                aria-label={`Disconnect ${g.name}`}
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
      {grants && grants.length === 0 && !problem && (
        <p className={styles.note}>Nothing is connected yet.</p>
      )}
      {problem && <p className={styles.lineError}>{problem}</p>}
    </section>
  );
}
