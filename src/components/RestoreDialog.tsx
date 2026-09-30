import * as Dialog from '@radix-ui/react-dialog';
import { useState, type ChangeEvent } from 'react';
import { parseBackup, restoreBackup, type Backup, type RestoreMode } from '../data/backup';
import { ensureMapPositions } from '../data/repository';
import { formatDateTime } from '../model/format';
import { useToast } from '../state/toast';
import { useUI } from '../state/ui';
import dlg from './dialog.module.css';
import styles from './RestoreDialog.module.css';
import ui from './ui.module.css';

type FileState =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; backup: Backup; skippedItems: number; fileName: string };

/** Restore people and items from a JSON backup made with “Back up to file”. */
export function RestoreDialog() {
  const dialog = useUI((s) => s.dialog);
  const closeDialog = useUI((s) => s.closeDialog);
  const open = dialog?.type === 'restore';
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
          {open && <RestoreForm onDone={closeDialog} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RestoreForm({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<FileState>({ kind: 'empty' });
  const [busy, setBusy] = useState(false);
  const show = useToast((s) => s.show);
  const selectPerson = useUI((s) => s.selectPerson);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    const result = parseBackup(await chosen.text());
    setFile(
      result.ok
        ? {
            kind: 'ready',
            backup: result.backup,
            skippedItems: result.skippedItems,
            fileName: chosen.name,
          }
        : { kind: 'error', message: result.error },
    );
  }

  async function restore(mode: RestoreMode) {
    if (file.kind !== 'ready' || busy) return;
    if (
      mode === 'replace' &&
      !window.confirm('Replace everything? All current people and items will be deleted first.')
    ) {
      return;
    }
    setBusy(true);
    const counts = await restoreBackup(file.backup, mode);
    await ensureMapPositions();
    selectPerson(null);
    show(`Restored ${counts.people} people and ${counts.items} items`);
    onDone();
  }

  const exported =
    file.kind === 'ready' && file.backup.exportedAt
      ? formatDateTime(new Date(file.backup.exportedAt).getTime())
      : null;

  return (
    <div>
      <Dialog.Title className={dlg.title}>Restore from a backup</Dialog.Title>
      <Dialog.Description className={dlg.description}>
        Pick a file made with “Back up to file”. <b>Merge</b> keeps what you have and adds or
        updates from the file. <b>Replace</b> deletes everything first.
      </Dialog.Description>

      <input
        className={styles.file}
        type="file"
        accept="application/json,.json"
        aria-label="Backup file"
        onChange={(e) => void onFile(e)}
      />

      {file.kind === 'error' && (
        <p className={styles.error} role="alert">
          {file.message}
        </p>
      )}
      {file.kind === 'ready' && (
        <div className={styles.summary}>
          <div>
            <b>{file.backup.people.length}</b> people · <b>{file.backup.items.length}</b> items
          </div>
          <div className={styles.muted}>
            {file.fileName}
            {exported ? ` · exported ${exported}` : ''}
            {file.skippedItems > 0
              ? ` · ${file.skippedItems} item${file.skippedItems === 1 ? '' : 's'} without a person skipped`
              : ''}
          </div>
        </div>
      )}

      <div className={dlg.footer}>
        <Dialog.Close asChild>
          <button type="button" className={ui.btn}>
            Cancel
          </button>
        </Dialog.Close>
        <button
          type="button"
          className={ui.btnDanger}
          disabled={file.kind !== 'ready' || busy}
          onClick={() => void restore('replace')}
        >
          Replace everything…
        </button>
        <button
          type="button"
          className={ui.btnPrimary}
          disabled={file.kind !== 'ready' || busy}
          onClick={() => void restore('merge')}
        >
          Merge into my data
        </button>
      </div>
    </div>
  );
}
