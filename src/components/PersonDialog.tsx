import * as Dialog from '@radix-ui/react-dialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { db } from '../data/db';
import { createPerson, updatePerson } from '../data/repository';
import { fileToAvatarDataUrl } from '../model/image';
import { PERSON_COLOR_NAMES, PERSON_PALETTE, pickColor } from '../model/palette';
import type { Person } from '../model/types';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import dlg from './dialog.module.css';
import styles from './PersonDialog.module.css';
import ui from './ui.module.css';

/** Create / edit a person. Opened through useUI().openDialog({ type: 'person' }). */
export function PersonDialog() {
  const dialog = useUI((s) => s.dialog);
  const closeDialog = useUI((s) => s.closeDialog);
  const open = dialog?.type === 'person';
  const personId = dialog?.type === 'person' ? dialog.personId : undefined;

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
          {open &&
            (personId ? (
              <EditLoader key={personId} personId={personId} onDone={closeDialog} />
            ) : (
              <PersonForm key="new" onDone={closeDialog} />
            ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditLoader({ personId, onDone }: { personId: string; onDone: () => void }) {
  const existing = useLiveQuery(() => db.people.get(personId), [personId]);
  if (!existing) return null;
  return <PersonForm initial={existing} onDone={onDone} />;
}

function PersonForm({ initial, onDone }: { initial?: Person; onDone: () => void }) {
  const people = useLiveQuery(() => db.people.toArray(), []) ?? [];
  const selectPerson = useUI((s) => s.selectPerson);
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [colorIndex, setColorIndex] = useState<number | null>(initial?.colorIndex ?? null);
  const [avatar, setAvatar] = useState<string | undefined>(initial?.avatarDataUrl);
  const [busy, setBusy] = useState(false);

  const suggested = pickColor(people.filter((p) => p.id !== initial?.id).map((p) => p.colorIndex));
  const effectiveColor = colorIndex ?? suggested;
  const canSave = name.trim().length > 0 && !busy;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch {
      window.alert('That file could not be read as an image.');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    const data = {
      name: name.trim(),
      role: role.trim() || undefined,
      colorIndex: effectiveColor,
      avatarDataUrl: avatar,
    };
    if (initial) {
      await updatePerson(initial.id, data);
    } else {
      const created = await createPerson(data);
      selectPerson(created.id);
    }
    onDone();
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <Dialog.Title className={dlg.title}>{initial ? 'Edit person' : 'New person'}</Dialog.Title>
      <Dialog.Description className={dlg.description}>
        {initial
          ? 'Name, photo and colour. Their tasks and notes stay as they are.'
          : 'Someone you work with. Tasks and notes will hang off their name.'}
      </Dialog.Description>

      <div className={styles.preview}>
        <Avatar
          person={{ name: name || '?', colorIndex: effectiveColor, avatarDataUrl: avatar }}
          size={56}
          ring={4}
          gapColor="var(--chrome)"
        />
        <div>
          <div className={styles.previewName}>{name.trim() || 'New person'}</div>
          {role.trim() && <div className={styles.previewRole}>{role.trim()}</div>}
        </div>
      </div>

      <label className={dlg.field}>
        Name
        <input
          className={dlg.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
          placeholder="Vira"
        />
      </label>
      <label className={dlg.field}>
        Role <span className={dlg.hint}>(optional)</span>
        <input
          className={dlg.input}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Product Manager"
        />
      </label>

      <div className={dlg.field}>
        Colour
        <div className={styles.swatches} role="radiogroup" aria-label="Colour">
          {PERSON_PALETTE.map((hex, i) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={i === effectiveColor}
              aria-label={PERSON_COLOR_NAMES[i]}
              className={
                i === effectiveColor ? `${styles.swatch} ${styles.swatchOn}` : styles.swatch
              }
              style={{ background: hex }}
              onClick={() => setColorIndex(i)}
            />
          ))}
        </div>
      </div>

      <div className={dlg.field}>
        Photo <span className={dlg.hint}>(optional, stays on this device)</span>
        <div className={styles.file}>
          <input type="file" accept="image/*" onChange={(e) => void onFile(e)} />
          {avatar && (
            <button type="button" className={styles.link} onClick={() => setAvatar(undefined)}>
              Remove photo
            </button>
          )}
        </div>
      </div>

      <div className={dlg.footer}>
        <Dialog.Close asChild>
          <button type="button" className={ui.btn}>
            Cancel
          </button>
        </Dialog.Close>
        <button type="submit" className={ui.btnPrimary} disabled={!canSave}>
          {initial ? 'Save' : 'Add person'}
        </button>
      </div>
    </form>
  );
}
