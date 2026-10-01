import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { formatRelativeTime } from '../model/format';
import { useNow } from '../state/now';
import { useUI } from '../state/ui';
import { syncActions, type SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
import dlg from './dialog.module.css';
import styles from './SyncDialog.module.css';
import { CloudIcon } from './icons';
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
      <p className={styles.note}>
        Signing out keeps everything on this device; it only stops syncing. “Delete all data” in the
        ⋯ menu removes it from this device and from sync.
      </p>
      <div className={dlg.footer}>
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

type BadgeState = 'off' | 'offline' | 'error' | 'busy' | 'ok';

/** Header cloud: colour says how sync is doing; click opens the dialog. Hidden without a backend. */
export function SyncButton({
  className,
  dotClassName,
}: {
  className: string;
  dotClassName: string;
}) {
  const configured = useSync((s) => s.configured);
  const user = useSync((s) => s.user);
  const phase = useSync((s) => s.phase);
  const online = useSync((s) => s.online);
  const pending = useSync((s) => s.pending);
  const error = useSync((s) => s.error);
  const openDialog = useUI((s) => s.openDialog);
  if (!configured) return null;

  const state: BadgeState = !user
    ? 'off'
    : !online
      ? 'offline'
      : phase === 'error'
        ? 'error'
        : phase === 'syncing' || pending > 0
          ? 'busy'
          : 'ok';
  const title: Record<BadgeState, string> = {
    off: 'Sync is off — sign in to sync across devices',
    offline: 'Offline — changes wait here until you’re back online',
    error: `Sync failed: ${error ?? 'unknown error'}`,
    busy: 'Syncing…',
    ok: 'Synced',
  };
  return (
    <button
      type="button"
      className={className}
      data-state={state}
      onClick={() => openDialog({ type: 'sync' })}
      title={title[state]}
      aria-label={title[state]}
    >
      <CloudIcon />
      <span className={dotClassName} aria-hidden="true" />
    </button>
  );
}
