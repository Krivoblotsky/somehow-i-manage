import * as Dialog from '@radix-ui/react-dialog';
import { useUI } from '../state/ui';
import dlg from './dialog.module.css';
import styles from './ShortcutsDialog.module.css';
import ui from './ui.module.css';

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Anywhere',
    rows: [
      ['⌘ K', 'Find a person or item, run a command'],
      ['⌘ N', 'New person'],
      ['⌘ ⇧ N', 'New task with the current person'],
      ['Esc', 'Close the panel or dialog'],
      ['?', 'This sheet'],
    ],
  },
  {
    title: 'In the “Something to do with…” field',
    rows: [
      ['↵', 'Add a task'],
      ['⇧ ↵', 'Add a note'],
      ['⌘ ↵', 'Add and open it'],
    ],
  },
  {
    title: 'On the map',
    rows: [
      ['Double-click a card', 'Rename it in place'],
      ['Drag a card onto a person', 'Hand it over to them'],
      ['Right-click', 'Everything else: complete, urgent, move, delete'],
      ['Scroll · pinch', 'Pan · zoom'],
    ],
  },
];

/** The keyboard and mouse tricks, on one sheet. Opens from the user menu or with “?”. */
export function ShortcutsDialog() {
  const dialog = useUI((s) => s.dialog);
  const closeDialog = useUI((s) => s.closeDialog);
  const open = dialog?.type === 'shortcuts';
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
          <Dialog.Title className={dlg.title}>Shortcuts</Dialog.Title>
          <Dialog.Description className={dlg.description}>
            Everything here also has a button somewhere; these are just quicker.
          </Dialog.Description>
          {GROUPS.map((g) => (
            <section key={g.title} className={styles.group}>
              <h3 className={styles.groupTitle}>{g.title}</h3>
              <dl className={styles.rows}>
                {g.rows.map(([keys, what]) => (
                  <div key={keys} className={styles.row}>
                    <dt className={styles.keys}>
                      {keys.split(' ').map((k, i) => (
                        <kbd key={i}>{k}</kbd>
                      ))}
                    </dt>
                    <dd className={styles.what}>{what}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <div className={dlg.footer}>
            <Dialog.Close asChild>
              <button type="button" className={ui.btnPrimary}>
                Done
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
