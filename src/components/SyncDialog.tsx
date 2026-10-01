import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { clearAllData } from '../data/repository';
import { formatRelativeTime } from '../model/format';
import { useNow } from '../state/now';
import { useUI } from '../state/ui';
import { syncActions, type SyncActions } from '../sync/controller';
import { useSync } from '../sync/store';
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
        Signing out leaves this device’s copy in place for when you sign back in. Another account
        signing in here starts from its own data. “Delete all data” removes everything from this
        device and from sync.
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
