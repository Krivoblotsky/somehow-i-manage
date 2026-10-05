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
import { createPerson, setItemCompleted, setItemKind, updateItem } from '../data/repository';
import type { MentionSources } from '../editor/mentions';
import {
  dateToMs,
  describeDue,
  formatDateTime,
  formatDayLabel,
  msToDateInput,
} from '../model/format';
import { personColor } from '../model/palette';
import type { Item, ItemKind, Person } from '../model/types';
import { deleteItemWithUndo } from '../state/actions';
import { useLinksTo } from '../state/mentions';
import { useNow } from '../state/now';
import { useProjectOf } from '../state/projects';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { CalendarIcon, ChevronLeftIcon, FlagIcon } from './icons';
import styles from './ItemPanel.module.css';
import { PanelItemRow } from './PersonPanel';
import { ProjectPicker } from './ProjectPicker';
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

const NO_PEOPLE: Person[] = [];
const NO_ITEMS: Item[] = [];

type TextPatch = Partial<Pick<Item, 'title' | 'body'>>;
const SAVE_DELAY_MS = 400;

function ItemEditor({ item, person }: { item: Item; person: Person }) {
  const selectItem = useUI((s) => s.selectItem);
  const selectPerson = useUI((s) => s.selectPerson);
  // Opened from a project's page: Back returns there (closing this panel shows it again).
  const from = useUI((s) => s.paneFrom.item);
  const projectFocusId = useUI((s) => s.projectFocusId);
  const backProject = useProjectOf(from === 'project' ? (projectFocusId ?? undefined) : undefined);
  // Opened from a link in another item's text: Back reopens that item.
  const returnItem = useUI((s) => (s.paneFrom.item === 'item' ? s.returnItem : null));
  const backItem = useLiveQuery(
    () => (returnItem ? db.items.get(returnItem.id) : undefined),
    [returnItem?.id],
  );
  // Opened from someone else's page (they are mentioned here): Back returns to them, not the owner.
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const people = useLiveQuery(() => db.people.toArray(), [], NO_PEOPLE);
  const allItems = useLiveQuery(() => db.items.toArray(), [], NO_ITEMS);
  const backPerson =
    (selectedPersonId !== person.id && people.find((p) => p.id === selectedPersonId)) || person;
  // Tasks and notes whose text links here with "#".
  const linkedFrom = useLinksTo(item.id);
  const focusPerson = useUI((s) => s.focusPerson);
  const mentions: MentionSources = {
    people,
    items: allItems.map((i) => ({ item: i, owner: people.find((p) => p.id === i.personId) })),
    currentItemId: item.id,
    createPerson: (name) => createPerson({ name }),
    openPerson: (id) => {
      if (!people.some((p) => p.id === id)) return; // gone since the text was written
      selectPerson(id);
      focusPerson(id);
    },
    // the person showing stays where we came from; Back returns to this item
    openItem: (id) => {
      if (allItems.some((i) => i.id === id)) selectItem(id, undefined, 'item');
    },
  };
  const backLabel = backProject
    ? backProject.name
    : backItem
      ? backItem.title || 'Untitled'
      : backPerson.name;
  function goBack() {
    if (backProject) selectItem(null);
    else if (backItem && returnItem)
      selectItem(backItem.id, returnItem.personId ?? undefined, returnItem.from);
    else selectPerson(backPerson.id);
  }
  const now = useNow();
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
      <button type="button" className={styles.back} onClick={goBack} title={`Back to ${backLabel}`}>
        <ChevronLeftIcon size={12} />
        {backLabel}
      </button>
      <div className={styles.date} title={formatDateTime(item.createdAt)}>
        Created {formatDayLabel(item.createdAt, now)}
      </div>

      <div className={styles.topRow}>
        <Avatar person={person} size={24} ring={2} gapColor="#fff" />
        <div className={styles.spacer} />
        <ProjectPicker item={item} />
        {isTask && (
          <>
            <DueField item={item} now={now} />
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
            placeholder={
              isTask
                ? 'Details, context, next steps… @ people, # tasks and notes'
                : 'Write your note…'
            }
            mentions={mentions}
          />
        </Suspense>
        {linkedFrom.length > 0 && (
          <section className={styles.mentions} aria-label="Also mentioned in">
            <div className={styles.mentionsTitle}>Also mentioned in · {linkedFrom.length}</div>
            {linkedFrom.map(({ item: other, owner }) => (
              <PanelItemRow
                key={other.id}
                item={other}
                owner={owner}
                selected={false}
                onSelect={() => selectItem(other.id, undefined, 'item')}
              />
            ))}
          </section>
        )}
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

/**
 * Due date as a pill. Unset: a quiet "due date" button that opens the browser's own date picker.
 * Set: the date, editable in place, with a × to clear. Red once the day has passed.
 */
function DueField({ item, now }: { item: Item; now: number }) {
  const due = item.dueDate;
  const [picking, setPicking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overdue = due !== undefined && !item.isCompleted && describeDue(due, now).overdue;

  useEffect(() => {
    if (!picking) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker();
    } catch {
      // not every browser lets a script open the picker; the focused field still works
    }
  }, [picking]);

  if (due === undefined && !picking) {
    return (
      <button
        type="button"
        className={`${ui.pill} ${ui.pillButton} ${styles.dueField}`}
        onClick={() => setPicking(true)}
        aria-label="Set a due date"
      >
        <CalendarIcon />
        due date
      </button>
    );
  }

  const cls = [ui.pill, styles.dueField, overdue && ui.pillActiveWarn].filter(Boolean).join(' ');
  return (
    <span className={cls} title={due !== undefined ? describeDue(due, now).label : undefined}>
      <CalendarIcon />
      <input
        ref={inputRef}
        type="date"
        className={styles.dateInput}
        aria-label="Due date"
        value={due !== undefined ? msToDateInput(due) : ''}
        onChange={(e) => void updateItem(item.id, { dueDate: dateToMs(e.target.value) })}
        onBlur={() => setPicking(false)}
      />
      {due !== undefined && (
        <button
          type="button"
          className={styles.clearDue}
          aria-label="Clear due date"
          onClick={() => {
            setPicking(false);
            void updateItem(item.id, { dueDate: undefined });
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
