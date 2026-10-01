import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties, ReactNode } from 'react';
import { db } from '../data/db';
import { createItem } from '../data/repository';
import { describeStats, groupItems, personStats, stripHtml } from '../model/derive';
import { formatDateTime, formatDayLabel, formatRelativeDays } from '../model/format';
import { lastMeeting } from '../model/oneOnOne';
import { contrastText, personColor } from '../model/palette';
import type { Item, ItemKind } from '../model/types';
import { deleteItemWithUndo, startOneOnOne } from '../state/actions';
import { useNow } from '../state/now';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { ContactLinks } from './ContactLinks';
import { ItemContextMenu } from './ItemContextMenu';
import { PersonMoreMenu } from './PersonMoreMenu';
import { DueBadge } from './DueBadge';
import { QuickAdd } from './QuickAdd';
import { FlagIcon, NoteIcon, TrashIcon } from './icons';
import styles from './PersonPanel.module.css';
import ui from './ui.module.css';

/** Side panel with a person's details and their items (the "Person Details" frame). */
export function PersonPanel({ personId }: { personId: string }) {
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const items = useLiveQuery(
    () => db.items.where('personId').equals(personId).toArray(),
    [personId],
  );
  const selectedItemId = useUI((s) => s.selectedItemId);
  const selectItem = useUI((s) => s.selectItem);
  const closePanel = useUI((s) => s.closePanel);
  const now = useNow();

  if (!person || !items) return null;

  const stats = personStats(items);
  const previous = lastMeeting(person);
  const accent = personColor(person.colorIndex);
  const { openTasks, notes, completed } = groupItems(items);

  async function add(kind: ItemKind) {
    const item = await createItem({ personId, kind });
    selectItem(item.id, personId);
  }

  const row = (item: Item) => (
    <Row
      key={item.id}
      item={item}
      selected={item.id === selectedItemId}
      onSelect={() => selectItem(item.id, personId)}
    />
  );

  return (
    <section
      className={styles.panel}
      aria-label="Person details"
      style={{ '--accent': accent, '--accent-text': contrastText(accent) } as CSSProperties}
    >
      <div className={styles.head}>
        <Avatar person={person} size={60} ring={4} gapColor="#fff" />
        <div className={styles.headText}>
          <h2 className={styles.name}>{person.name}</h2>
          <div className={styles.meta}>
            {person.role ? `${person.role} · ` : ''}
            {describeStats(stats)}
            {previous ? ` · Last 1:1 ${formatRelativeDays(previous.endedAt, now)}` : ''}
          </div>
          <ContactLinks contacts={person.contacts} tone="light" />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={ui.chipAccent}
          onClick={() => void startOneOnOne(personId)}
        >
          Start 1:1
        </button>
        <button type="button" className={ui.chipPrimary} onClick={() => void add('task')}>
          + Task
        </button>
        <button type="button" className={ui.chip} onClick={() => void add('note')}>
          + Note
        </button>
        <PersonMoreMenu person={person} itemCount={items.length} className={ui.chip} />
      </div>

      <div className={styles.quickAdd}>
        <QuickAdd personId={personId} personName={person.name} tone="light" />
      </div>

      <div className={styles.list}>
        <Section title="Tasks" count={openTasks.length} empty="No open tasks. Type one above.">
          {openTasks.map(row)}
        </Section>
        <Section title="Notes" count={notes.length} empty="No notes yet.">
          {notes.map(row)}
        </Section>
        {completed.length > 0 && (
          <details>
            <summary className={styles.sectionTitle}>Completed · {completed.length}</summary>
            {completed.map(row)}
          </details>
        )}
      </div>

      <button
        type="button"
        className={styles.close}
        aria-label="Close"
        title="Close (Esc)"
        onClick={closePanel}
      >
        ×
      </button>
    </section>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className={styles.sectionTitle}>
        {title} · {count}
      </div>
      {count === 0 ? <div className={styles.empty}>{empty}</div> : children}
    </section>
  );
}

function Row({
  item,
  selected,
  onSelect,
}: {
  item: Item;
  selected: boolean;
  onSelect: () => void;
}) {
  const isTask = item.kind === 'task';
  const done = isTask && item.isCompleted;
  const preview = stripHtml(item.body);
  const now = useNow();
  const shownDate = done && item.completedAt ? item.completedAt : item.updatedAt;
  return (
    <ItemContextMenu item={item}>
      <div
        className={selected ? `${styles.row} ${styles.rowSelected}` : styles.row}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className={styles.rowMain}>
          <div className={styles.rowTitle}>
            {item.isFlagged && !done && <FlagIcon className={styles.flag} />}
            {item.title || <span className={styles.untitled}>Untitled</span>}
            {isTask && !item.isCompleted && item.dueDate !== undefined && (
              <DueBadge dueDate={item.dueDate} now={now} />
            )}
          </div>
          <div className={styles.rowDate} title={formatDateTime(shownDate)}>
            {formatDayLabel(shownDate, now)}
          </div>
          {preview && <div className={styles.rowPreview}>{preview}</div>}
        </div>
        {done && (
          <div className={styles.rowSide}>
            <span className={ui.pill}>
              completed <span className={`${ui.pillDot} ${ui.pillDotOn}`} />
            </span>
            <button
              type="button"
              className={styles.trash}
              aria-label="Delete completed task"
              title="Delete (undo available)"
              onClick={(e) => {
                e.stopPropagation();
                void deleteItemWithUndo(item);
              }}
            >
              <TrashIcon />
            </button>
          </div>
        )}
        {!isTask && <NoteIcon className={styles.rowSide} size={14} />}
      </div>
    </ItemContextMenu>
  );
}
