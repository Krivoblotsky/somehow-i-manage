import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties, ReactNode } from 'react';
import { db } from '../data/db';
import { createItem, deletePerson, setItemCompleted } from '../data/repository';
import { describeStats, groupItems, personStats, stripHtml } from '../model/derive';
import { formatDateTime } from '../model/format';
import { personColor } from '../model/palette';
import type { Item } from '../model/types';
import { deleteItemWithUndo } from '../state/actions';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { ContactLinks } from './ContactLinks';
import { ItemContextMenu } from './ItemContextMenu';
import { QuickAdd } from './QuickAdd';
import { FlagIcon, NoteIcon, TrashIcon } from './icons';
import styles from './PersonView.module.css';
import ui from './ui.module.css';

/** One person's dossier: header with stats, then open tasks, notes, completed. */
export function PersonView({ personId }: { personId: string }) {
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const items = useLiveQuery(
    () => db.items.where('personId').equals(personId).toArray(),
    [personId],
  );
  const selectedItemId = useUI((s) => s.selectedItemId);
  const selectItem = useUI((s) => s.selectItem);
  const selectPerson = useUI((s) => s.selectPerson);
  const openDialog = useUI((s) => s.openDialog);

  if (!person || !items) return null;

  const stats = personStats(items);
  const { openTasks, notes, completed } = groupItems(items);

  async function add(kind: 'task' | 'note') {
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
    <div
      className={styles.view}
      style={{ '--accent': personColor(person.colorIndex) } as CSSProperties}
    >
      <div className={styles.head}>
        <Avatar person={person} size={60} ring={4} />
        <div className={styles.headText}>
          <h1 className={styles.name}>{person.name}</h1>
          <div className={styles.meta}>
            {person.role ? `${person.role} · ` : ''}
            {describeStats(stats)}
          </div>
          <ContactLinks contacts={person.contacts} />
        </div>
        <div className={styles.actions}>
          <button type="button" className={ui.btnPrimary} onClick={() => void add('task')}>
            + Task
          </button>
          <button type="button" className={ui.btn} onClick={() => void add('note')}>
            + Note
          </button>
          <button
            type="button"
            className={ui.btn}
            onClick={() => openDialog({ type: 'bulk', personId })}
          >
            Paste list…
          </button>
          <button
            type="button"
            className={ui.btn}
            onClick={() => openDialog({ type: 'person', personId })}
          >
            Edit
          </button>
          <button type="button" className={ui.btnDanger} onClick={() => void remove()}>
            Delete…
          </button>
        </div>
      </div>

      <div className={styles.quickAdd}>
        <QuickAdd personId={personId} personName={person.name} />
      </div>

      <Section title="Tasks" count={openTasks.length} empty="No open tasks. Type one above.">
        {openTasks.map(row)}
      </Section>
      <Section title="Notes" count={notes.length} empty="No notes yet.">
        {notes.map(row)}
      </Section>
      {completed.length > 0 && (
        <Section title="Completed" count={completed.length} collapsible>
          {completed.map(row)}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  collapsible = false,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  collapsible?: boolean;
  children: ReactNode;
}) {
  const head = (
    <>
      <span className={styles.sectionTitle}>{title}</span>
      <span className={styles.count}>{count}</span>
    </>
  );
  if (collapsible) {
    return (
      <details className={styles.section}>
        <summary className={styles.sectionHead}>{head}</summary>
        <div className={styles.list}>{children}</div>
      </details>
    );
  }
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>{head}</div>
      {count === 0 ? (
        <div className={styles.empty}>{empty}</div>
      ) : (
        <div className={styles.list}>{children}</div>
      )}
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
  const preview = stripHtml(item.body);
  const isTask = item.kind === 'task';
  const shownDate =
    isTask && item.isCompleted && item.completedAt ? item.completedAt : item.updatedAt;
  const className = [
    styles.row,
    selected && styles.rowSelected,
    isTask && item.isCompleted && styles.rowDone,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ItemContextMenu item={item}>
      <div
        className={className}
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
        <div className={styles.rowBody}>
          <div className={styles.rowTitle}>
            {item.isFlagged && !item.isCompleted && (
              <span className={styles.flag} title="Urgent" aria-label="Urgent">
                <FlagIcon />
              </span>
            )}
            {item.title || <span className={styles.untitled}>Untitled</span>}
          </div>
          <div className={styles.rowDate}>{formatDateTime(shownDate)}</div>
          {preview && <div className={styles.rowPreview}>{preview}</div>}
        </div>
        {isTask && item.isCompleted && (
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
        )}
        {isTask ? (
          <button
            type="button"
            className={item.isCompleted ? `${styles.check} ${styles.checkDone}` : styles.check}
            aria-label={item.isCompleted ? 'Mark as not completed' : 'Mark as completed'}
            aria-pressed={item.isCompleted}
            onClick={(e) => {
              e.stopPropagation();
              void setItemCompleted(item.id, !item.isCompleted);
            }}
          />
        ) : (
          <NoteIcon className={styles.noteMark} />
        )}
      </div>
    </ItemContextMenu>
  );
}
