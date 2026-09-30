import * as Dialog from '@radix-ui/react-dialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { db } from '../data/db';
import { createPerson, updatePerson } from '../data/repository';
import {
  CONTACT_KINDS,
  CONTACT_LABEL,
  CONTACT_PLACEHOLDER,
  isEmail,
  normalizeContacts,
} from '../model/contacts';
import { resolveGravatar } from '../model/gravatar';
import { fileToAvatarDataUrl } from '../model/image';
import { PERSON_COLOR_NAMES, PERSON_PALETTE, pickColor } from '../model/palette';
import type { AvatarSource, Contact, ContactKind, Person } from '../model/types';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import dlg from './dialog.module.css';
import { ContactIcon } from './icons';
import styles from './PersonDialog.module.css';
import ui from './ui.module.css';

/** Contact rows that are always offered, even when empty. */
const DEFAULT_ROWS: ContactKind[] = ['email', 'phone', 'slack'];
const GRAVATAR_DEBOUNCE_MS = 500;
type GravatarStatus = 'idle' | 'checking' | 'found' | 'none';

function sortRows(rows: Contact[]): Contact[] {
  const order = new Map(CONTACT_KINDS.map((k, i) => [k, i]));
  return [...rows].sort((a, b) => (order.get(a.kind) ?? 0) - (order.get(b.kind) ?? 0));
}

function initialRows(existing: Contact[] | undefined): Contact[] {
  const rows = normalizeContacts(existing ?? []);
  for (const kind of DEFAULT_ROWS) {
    if (!rows.some((r) => r.kind === kind)) rows.push({ kind, value: '' });
  }
  return sortRows(rows);
}

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
  const [avatarSource, setAvatarSource] = useState<AvatarSource | undefined>(
    initial?.avatarSource ?? (initial?.avatarDataUrl ? 'upload' : undefined),
  );
  const [contacts, setContacts] = useState<Contact[]>(() => initialRows(initial?.contacts));
  const [declinedEmail, setDeclinedEmail] = useState<string | null>(null);
  const [gravatarStatus, setGravatarStatus] = useState<GravatarStatus>('idle');
  const [busy, setBusy] = useState(false);

  const email =
    contacts
      .find((c) => c.kind === 'email')
      ?.value.trim()
      .toLowerCase() ?? '';
  // Email whose Gravatar is already the current photo — no need to look it up again.
  const gravatarEmail = useRef<string | null>(
    initial?.avatarSource === 'gravatar'
      ? (initial.contacts
          ?.find((c) => c.kind === 'email')
          ?.value.trim()
          .toLowerCase() ?? null)
      : null,
  );

  // Fill the photo from Gravatar unless the user uploaded one or removed the Gravatar for this email.
  useEffect(() => {
    if (avatarSource === 'upload' || declinedEmail === email) return;
    if (avatarSource === 'gravatar' && gravatarEmail.current === email) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!isEmail(email)) {
        if (avatarSource === 'gravatar') {
          setAvatar(undefined);
          setAvatarSource(undefined);
        }
        setGravatarStatus('idle');
        return;
      }
      setGravatarStatus('checking');
      const found = await resolveGravatar(email);
      if (cancelled) return;
      if (found) {
        gravatarEmail.current = email;
        setAvatar(found);
        setAvatarSource('gravatar');
        setGravatarStatus('found');
      } else {
        if (avatarSource === 'gravatar') {
          setAvatar(undefined);
          setAvatarSource(undefined);
        }
        setGravatarStatus('none');
      }
    }, GRAVATAR_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email, avatarSource, declinedEmail]);

  const suggested = pickColor(people.filter((p) => p.id !== initial?.id).map((p) => p.colorIndex));
  const effectiveColor = colorIndex ?? suggested;
  const canSave = name.trim().length > 0 && !busy;
  const remainingKinds = CONTACT_KINDS.filter((k) => !contacts.some((r) => r.kind === k));

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
      setAvatarSource('upload');
    } catch {
      window.alert('That file could not be read as an image.');
    }
  }

  function removePhoto() {
    if (avatarSource === 'gravatar') setDeclinedEmail(email);
    setAvatar(undefined);
    setAvatarSource(undefined);
    setGravatarStatus('idle');
  }

  function setContactValue(kind: ContactKind, value: string) {
    setContacts((rows) => rows.map((r) => (r.kind === kind ? { ...r, value } : r)));
  }

  function addRow(kind: ContactKind) {
    setContacts((rows) => sortRows([...rows, { kind, value: '' }]));
  }

  function removeRow(kind: ContactKind) {
    setContacts((rows) => rows.filter((r) => r.kind !== kind));
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
      avatarSource: avatar ? avatarSource : undefined,
      contacts: normalizeContacts(contacts),
    };
    if (initial) {
      await updatePerson(initial.id, data);
    } else {
      const created = await createPerson(data);
      selectPerson(created.id);
    }
    onDone();
  }

  const photoHint =
    gravatarStatus === 'checking'
      ? 'Looking up Gravatar…'
      : avatarSource === 'gravatar'
        ? 'Photo from Gravatar'
        : null;

  return (
    <form onSubmit={(e) => void submit(e)}>
      <Dialog.Title className={dlg.title}>{initial ? 'Edit person' : 'New person'}</Dialog.Title>
      <Dialog.Description className={dlg.description}>
        {initial
          ? 'Name, photo, colour and ways to reach them. Their tasks and notes stay as they are.'
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
          {photoHint && <div className={styles.previewRole}>{photoHint}</div>}
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
        Contacts <span className={dlg.hint}>(an email with a Gravatar becomes the photo)</span>
        <div className={styles.contacts}>
          {contacts.map((c) => (
            <div key={c.kind} className={styles.contactRow}>
              <span className={styles.contactIcon} title={CONTACT_LABEL[c.kind]}>
                <ContactIcon kind={c.kind} />
              </span>
              <input
                className={dlg.input}
                value={c.value}
                placeholder={CONTACT_PLACEHOLDER[c.kind]}
                aria-label={CONTACT_LABEL[c.kind]}
                inputMode={c.kind === 'email' ? 'email' : c.kind === 'phone' ? 'tel' : 'text'}
                autoCapitalize="off"
                spellCheck={false}
                onChange={(e) => setContactValue(c.kind, e.target.value)}
              />
              {!DEFAULT_ROWS.includes(c.kind) && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${CONTACT_LABEL[c.kind]}`}
                  onClick={() => removeRow(c.kind)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {remainingKinds.length > 0 && (
            <select
              className={styles.addSelect}
              value=""
              aria-label="Add contact"
              onChange={(e) => {
                if (e.target.value) addRow(e.target.value as ContactKind);
              }}
            >
              <option value="">+ Add another…</option>
              {remainingKinds.map((k) => (
                <option key={k} value={k}>
                  {CONTACT_LABEL[k]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

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
            <button type="button" className={styles.link} onClick={removePhoto}>
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
