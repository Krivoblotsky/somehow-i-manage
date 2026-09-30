import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties, ReactNode } from 'react';
import { db } from '../data/db';
import { createItem, deletePerson } from '../data/repository';
import { describeStats, groupItems, personStats, stripHtml } from '../model/derive';
import { formatDateTime } from '../model/format';
import { personColor } from '../model/palette';
import type { Item, ItemKind } from '../model/types';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { FlagIcon, NoteIcon } from './icons';
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
  const selectPerson = useUI((s) => s.selectPerson);
  const closePanel = useUI((s) => s.closePanel);
  const openDialog = useUI((s) => s.openDialog);

  if (!person || !items) return null;

  const stats = personStats(items);
  const { openTasks, notes, completed } = groupItems(items);

  async function add(kind: ItemKind) {
    const item = await createItem({ personId, kind });
    selectItem(item.id, personId);
  }

  async function remove() {
    if (!person) return;
    const what = items?.length
      ? ` and their ${items.length} item${items.length === 1 ? '' : 's'}`
      : '';
    if (window.confirm(`Delete ${person.name}${what}? This cannot be undone.`)) {
      await deletePerson(personId);
      selectPerson(null);
    }
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
      style={{ '--accent': personColor(person.colorIndex) } as CSSProperties}
    >
      <div className={styles.head}>
        <Avatar person={person} size={60} ring={4} gapColor="#fff" />
        <div className={styles.headText}>
          <h2 className={styles.name}>{person.name}</h2>
          <div className={styles.meta}>
            {person.role ? `${person.role} · ` : ''}
            {describeStats(stats)}
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={ui.chipPrimary} onClick={() => void add('task')}>
          + Task
        </button>
        <button type="button" className={ui.chip} onClick={() => void add('note')}>
          + Note
        </button>
        <button
          type="button"
          className={ui.chip}
          onClick={() => openDialog({ type: 'bulk', personId })}
        >
          Paste list…
        </button>
        <button
          type="button"
          className={ui.chip}
          onClick={() => openDialog({ type: 'person', personId })}
        >
          Edit
        </button>
      </div>

      <div className={styles.list}>
        <Section title="Tasks" count={openTasks.length} empty="No open tasks.">
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

      <div className={styles.footer}>
        <button type="button" className={ui.chipDanger} onClick={() => void remove()}>
          Delete person…
        </button>
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
  const shownDate = done && item.completedAt ? item.completedAt : item.updatedAt;
  return (
    <button
      type="button"
      className={selected ? `${styles.row} ${styles.rowSelected}` : styles.row}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>
          {item.isFlagged && !done && <FlagIcon className={styles.flag} />}
          {item.title || <span className={styles.untitled}>Untitled</span>}
        </div>
        <div className={styles.rowDate}>{formatDateTime(shownDate)}</div>
        {preview && <div className={styles.rowPreview}>{preview}</div>}
      </div>
      {done && (
        <span className={`${ui.pill} ${styles.rowSide}`}>
          completed <span className={`${ui.pillDot} ${ui.pillDotOn}`} />
        </span>
      )}
      {!isTask && <NoteIcon className={styles.rowSide} size={14} />}
    </button>
  );
}
