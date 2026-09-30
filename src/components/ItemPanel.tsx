import { useLiveQuery } from 'dexie-react-hooks';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { db } from '../data/db';
import { setItemCompleted, setItemKind, updateItem } from '../data/repository';
import { formatDateTime } from '../model/format';
import { personColor } from '../model/palette';
import type { Item, ItemKind, Person } from '../model/types';
import { deleteItemWithUndo } from '../state/actions';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { ChevronLeftIcon, FlagIcon } from './icons';
import styles from './ItemPanel.module.css';
import ui from './ui.module.css';

// TipTap is the heaviest dependency; load it only when a panel is actually opened.
const BodyEditor = lazy(() => import('./BodyEditor').then((m) => ({ default: m.BodyEditor })));

/** The right-hand detail panel for a task or a note. */
export function ItemPanel({ itemId }: { itemId: string }) {
  const item = useLiveQuery(() => db.items.get(itemId), [itemId]);
  const person = useLiveQuery<Person | undefined>(
    async () => (item ? db.people.get(item.personId) : undefined),
    [item?.personId],
  );
  if (!item || !person) return null;
  // Keyed by id so title/body state and the editor reset when another item is opened.
  return <ItemEditor key={item.id} item={item} person={person} />;
}

type TextPatch = Partial<Pick<Item, 'title' | 'body'>>;
const SAVE_DELAY_MS = 400;

function ItemEditor({ item, person }: { item: Item; person: Person }) {
  const selectItem = useUI((s) => s.selectItem);
  const selectPerson = useUI((s) => s.selectPerson);
  const [title, setTitle] = useState(item.title);
  const [synced, setSynced] = useState(item.title);
  if (item.title !== synced) {
    // The saved title changed underneath us: our own save landing, or an edit made elsewhere
    // (renaming the card on the map). Follow it unless there is an unsaved draft here.
    setSynced(item.title);
    if (title === synced) setTitle(item.title);
  }
  const pending = useRef<TextPatch>({});
  const timer = useRef<number | undefined>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length > 0) await updateItem(item.id, patch);
  }, [item.id]);

  const queueSave = useCallback(
    (patch: TextPatch) => {
      pending.current = { ...pending.current, ...patch };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  // Save whatever is still pending when the panel closes or another item opens.
  useEffect(() => () => void flush(), [flush]);

  const isTask = item.kind === 'task';

  async function changeKind(kind: ItemKind) {
    if (kind !== item.kind) await setItemKind(item.id, kind);
  }

  async function remove() {
    await flush(); // so Undo brings back the latest text
    await deleteItemWithUndo(item);
  }

  return (
    <section
      className={styles.panel}
      aria-label={isTask ? 'Task details' : 'Note details'}
      style={{ '--accent': personColor(person.colorIndex) } as CSSProperties}
    >
      <button
        type="button"
        className={styles.back}
        onClick={() => selectPerson(person.id)}
        title={`Back to ${person.name}`}
      >
        <ChevronLeftIcon size={12} />
        {person.name}
      </button>
      <div className={styles.date}>{formatDateTime(item.createdAt)}</div>

      <div className={styles.topRow}>
        <Avatar person={person} size={24} ring={2} gapColor="#fff" />
        <div className={styles.spacer} />
        {isTask && (
          <>
            <button
              type="button"
              className={[ui.pill, ui.pillButton, item.isFlagged && ui.pillActiveWarn]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={item.isFlagged}
              onClick={() => void updateItem(item.id, { isFlagged: !item.isFlagged })}
            >
              <FlagIcon /> urgent
            </button>
            <button
              type="button"
              className={[ui.pill, ui.pillButton, item.isCompleted && ui.pillActive]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={item.isCompleted}
              onClick={() => void setItemCompleted(item.id, !item.isCompleted)}
            >
              completed
              <span className={item.isCompleted ? `${ui.pillDot} ${ui.pillDotOn}` : ui.pillDot} />
            </button>
          </>
        )}
      </div>

      <input
        className={styles.title}
        value={title}
        placeholder="Untitled"
        aria-label="Title"
        autoFocus={item.title === ''}
        onChange={(e) => {
          setTitle(e.target.value);
          queueSave({ title: e.target.value });
        }}
        onBlur={() => void flush()}
      />
      <div className={styles.with}>
        with{' '}
        <button
          type="button"
          className={styles.withLink}
          onClick={() => selectPerson(person.id)}
          title={`Open ${person.name}`}
        >
          {person.name}
        </button>
      </div>

      <div className={styles.body}>
        <Suspense fallback={<div className={styles.editorLoading} aria-hidden="true" />}>
          <BodyEditor
            initialValue={item.body}
            onChange={(html) => queueSave({ body: html })}
            placeholder={isTask ? 'Details, context, next steps…' : 'Write your note…'}
          />
        </Suspense>
      </div>

      <div className={styles.footer}>
        <div className={styles.segment} role="group" aria-label="Kind">
          <button
            type="button"
            className={isTask ? styles.segOn : styles.seg}
            aria-pressed={isTask}
            onClick={() => void changeKind('task')}
          >
            Task
          </button>
          <button
            type="button"
            className={isTask ? styles.seg : styles.segOn}
            aria-pressed={!isTask}
            onClick={() => void changeKind('note')}
          >
            Note
          </button>
        </div>
        <button type="button" className={ui.btnDanger} onClick={() => void remove()}>
          Delete
        </button>
      </div>

      <button
        type="button"
        className={styles.close}
        aria-label="Close"
        title="Close (Esc)"
        onClick={() => selectItem(null)}
      >
        ×
      </button>
    </section>
  );
}
