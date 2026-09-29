import * as Dialog from '@radix-ui/react-dialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { db } from '../data/db';
import { parseBulkText } from '../data/import';
import { bulkAddItems } from '../data/repository';
import { useUI } from '../state/ui';
import dlg from './dialog.module.css';
import ui from './ui.module.css';

/** Paste a list (e.g. from Apple Notes) and turn every line into an item. */
export function BulkAddDialog() {
  const dialog = useUI((s) => s.dialog);
  const closeDialog = useUI((s) => s.closeDialog);
  const personId = dialog?.type === 'bulk' ? dialog.personId : null;

  return (
    <Dialog.Root
      open={personId !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={dlg.overlay} />
        <Dialog.Content className={dlg.content}>
          {personId && <BulkForm key={personId} personId={personId} onDone={closeDialog} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BulkForm({ personId, onDone }: { personId: string; onDone: () => void }) {
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = parseBulkText(text);
  const tasks = parsed.filter((l) => l.kind === 'task').length;
  const notes = parsed.length - tasks;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (parsed.length === 0 || busy) return;
    setBusy(true);
    await bulkAddItems(personId, text);
    onDone();
  }

  const summary =
    parsed.length === 0
      ? 'Nothing to add yet'
      : [
          `${tasks} task${tasks === 1 ? '' : 's'}`,
          notes > 0 ? `${notes} note${notes === 1 ? '' : 's'}` : null,
        ]
          .filter(Boolean)
          .join(', ');

  return (
    <form onSubmit={(e) => void submit(e)}>
      <Dialog.Title className={dlg.title}>
        Paste a list{person ? ` for ${person.name}` : ''}
      </Dialog.Title>
      <Dialog.Description className={dlg.description}>
        One item per line — paste straight from Apple Notes. “- [x]” or “✅” marks a task as
        completed, “# ” makes a note.
      </Dialog.Description>
      <textarea
        className={dlg.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        aria-label="List"
        placeholder={'Promotion next steps\n- [x] Buy tickets\n# Feedback from the retro'}
      />
      <div className={dlg.footer}>
        <span className={`${dlg.hint} ${dlg.grow}`}>{summary}</span>
        <Dialog.Close asChild>
          <button type="button" className={ui.btn}>
            Cancel
          </button>
        </Dialog.Close>
        <button type="submit" className={ui.btnPrimary} disabled={parsed.length === 0 || busy}>
          Add {parsed.length > 0 ? parsed.length : ''}
        </button>
      </div>
    </form>
  );
}
