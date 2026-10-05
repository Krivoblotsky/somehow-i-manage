import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties, ReactNode } from 'react';
import { db } from '../data/db';
import { createItem } from '../data/repository';
import { describeStats, groupItems, personStats } from '../model/derive';
import { formatDateTime, formatDayLabel, formatRelativeDays } from '../model/format';
import { lastMeeting } from '../model/oneOnOne';
import { contrastText, personColor } from '../model/palette';
import type { Item, ItemKind, Person } from '../model/types';
import { deleteItemWithUndo, startOneOnOne } from '../state/actions';
import { useNow } from '../state/now';
import { useMentionsOf } from '../state/mentions';
import { useProjectOf } from '../state/projects';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { BodyPreview } from './BodyPreview';
import { ContactLinks } from './ContactLinks';
import { ItemContextMenu } from './ItemContextMenu';
import { PersonMoreMenu } from './PersonMoreMenu';
import { DueBadge } from './DueBadge';
import { QuickAdd } from './QuickAdd';
import { ChevronLeftIcon, FlagIcon, NoteIcon, TrashIcon } from './icons';
import styles from './PersonPanel.module.css';
import { ProjectBadge } from './ProjectBadge';
import ui from './ui.module.css';

/** Side panel with a person's details and their items (the "Person Details" frame). */
export function PersonPanel({ personId }: { personId: string }) {
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const items = useLiveQuery(
    () => db.items.where('personId').equals(personId).toArray(),
    [personId],
  );
  const mentions = useMentionsOf(personId);
  const selectedItemId = useUI((s) => s.selectedItemId);
  const selectItem = useUI((s) => s.selectItem);
  const closePanel = useUI((s) => s.closePanel);
  // Opened from a project's page: Back returns there (closing this panel shows it again).
  const from = useUI((s) => s.paneFrom.person);
  const projectFocusId = useUI((s) => s.projectFocusId);
  const backProject = useProjectOf(from === 'project' ? (projectFocusId ?? undefined) : undefined);
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
    <PanelItemRow
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
      {backProject && (
        <button
          type="button"
          className={styles.back}
          onClick={closePanel}
          title={`Back to ${backProject.name}`}
        >
          <ChevronLeftIcon size={12} />
          {backProject.name}
        </button>
      )}
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
        {mentions.length > 0 && (
          <Section title="Also mentioned in" count={mentions.length} empty="">
            {mentions.map(({ item, owner }) => (
              <PanelItemRow
                key={item.id}
                item={item}
                owner={owner}
                selected={item.id === selectedItemId}
                onSelect={() => selectItem(item.id, personId)}
              />
            ))}
          </Section>
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

/** One task or note as a row in a white side panel; the project panel borrows it too. */
export function PanelItemRow({
  item,
  selected,
  onSelect,
  showProject = true,
  owner,
}: {
  item: Item;
  selected: boolean;
  onSelect: () => void;
  /** Off where every row is the same project. */
  showProject?: boolean;
  /** Shown when the row sits on someone else's page: whose task or note this is. */
  owner?: Person;
}) {
  const isTask = item.kind === 'task';
  const done = isTask && item.isCompleted;
  const now = useNow();
  const project = useProjectOf(item.projectId);
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
          {owner && (
            <div className={styles.rowOwner}>
              <Avatar person={owner} size={14} ring={0} />
              {owner.name}
            </div>
          )}
          <div className={styles.rowTitle}>
            {item.isFlagged && !done && <FlagIcon className={styles.flag} />}
            {item.title || <span className={styles.untitled}>Untitled</span>}
            {isTask && !item.isCompleted && item.dueDate !== undefined && (
              <DueBadge dueDate={item.dueDate} now={now} />
            )}
            {project && showProject && <ProjectBadge project={project} />}
          </div>
          <div className={styles.rowDate} title={formatDateTime(shownDate)}>
            {formatDayLabel(shownDate, now)}
          </div>
          <BodyPreview html={item.body} className={styles.rowPreview} />
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
