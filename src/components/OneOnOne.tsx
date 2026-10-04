import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties, KeyboardEvent } from 'react';
import { db } from '../data/db';
import { setItemCompleted, setItemDiscussed } from '../data/repository';
import { stripHtml } from '../model/derive';
import { formatDuration, formatRelativeDays, formatTime } from '../model/format';
import { buildMeetingView, isCoveredIn, lastMeeting } from '../model/oneOnOne';
import { contrastText, personColor } from '../model/palette';
import type { Item } from '../model/types';
import { finishOneOnOne } from '../state/actions';
import { useNow } from '../state/now';
import { useProjectOf } from '../state/projects';
import { useUI, type ActiveMeeting } from '../state/ui';
import { Avatar } from './Avatar';
import { DueBadge } from './DueBadge';
import { ItemContextMenu } from './ItemContextMenu';
import { QuickAdd } from './QuickAdd';
import { FlagIcon, NoteIcon } from './icons';
import styles from './OneOnOne.module.css';
import { ProjectBadge } from './ProjectBadge';
import ui from './ui.module.css';

const MAX_DONE_SHOWN = 8;

/** The 1:1 screen: the agenda to go through on the left, capture box and recap on the right. */
export function OneOnOne({ meeting }: { meeting: ActiveMeeting }) {
  const person = useLiveQuery(() => db.people.get(meeting.personId), [meeting.personId]);
  const items = useLiveQuery(
    () => db.items.where('personId').equals(meeting.personId).toArray(),
    [meeting.personId],
  );
  const now = useNow();
  const selectedItemId = useUI((s) => s.selectedItemId);
  const selectItem = useUI((s) => s.selectItem);

  if (!person || !items) return null;

  const previous = lastMeeting(person);
  const view = buildMeetingView(items, meeting.startedAt, previous);
  const accent = personColor(person.colorIndex);
  const open = (item: Item) => selectItem(item.id, person.id);
  const elapsed = formatDuration(Math.max(now, meeting.startedAt) - meeting.startedAt);

  return (
    <div
      className={styles.screen}
      data-testid="one-on-one"
      style={{ '--accent': accent, '--accent-text': contrastText(accent) } as CSSProperties}
    >
      <header className={styles.top}>
        <Avatar person={person} size={56} ring={4} />
        <div className={styles.topText}>
          <div className={styles.kicker}>
            <span className={styles.live} aria-hidden="true" />
            1:1
          </div>
          <h1 className={styles.name}>{person.name}</h1>
          <div className={styles.meta}>
            Started {formatTime(meeting.startedAt)} · {elapsed}
            {previous
              ? ` · Last 1:1 ${formatRelativeDays(previous.endedAt, now)}`
              : ' · First 1:1 here'}
          </div>
        </div>
        <button
          type="button"
          className={`${ui.btnPrimary} ${styles.end}`}
          onClick={() => void finishOneOnOne()}
        >
          End 1:1
        </button>
      </header>

      <div className={styles.columns}>
        <section className={styles.block} aria-label="Agenda">
          <SectionHead
            title="Agenda"
            count={view.agenda.length}
            hint="Tick what got done, mark what you covered"
          />
          {view.agenda.length === 0 ? (
            <div className={styles.empty}>
              Nothing open with {person.name}. Whatever comes up goes in the box on the right.
            </div>
          ) : (
            <div className={styles.list}>
              {view.agenda.map((item) => (
                <AgendaCard
                  key={item.id}
                  item={item}
                  now={now}
                  startedAt={meeting.startedAt}
                  isNew={view.newSinceIds.has(item.id)}
                  selected={item.id === selectedItemId}
                  onOpen={() => open(item)}
                />
              ))}
            </div>
          )}
        </section>

        <div>
          <section className={styles.block} aria-label="Capture">
            <SectionHead title="Capture" count={view.addedNow.length} />
            <div className={styles.quick}>
              <QuickAdd personId={person.id} personName={person.name} />
            </div>
            {view.addedNow.length > 0 && (
              <div className={styles.list}>
                {view.addedNow.map((item) => (
                  <CompactRow
                    key={item.id}
                    item={item}
                    selected={item.id === selectedItemId}
                    onOpen={() => open(item)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className={styles.block} aria-label="Since last 1:1">
            <SectionHead
              title={previous ? 'Since last 1:1' : 'Done so far'}
              count={view.doneSince.length}
              hint={previous ? formatRelativeDays(previous.endedAt, now) : undefined}
            />
            {view.doneSince.length === 0 ? (
              <div className={styles.empty}>
                {previous
                  ? 'Nothing completed since then.'
                  : `This is your first 1:1 with ${person.name} here.`}
              </div>
            ) : (
              <div className={styles.list}>
                {view.doneSince.slice(0, MAX_DONE_SHOWN).map((item) => (
                  <CompactRow
                    key={item.id}
                    item={item}
                    selected={item.id === selectedItemId}
                    dateLabel={formatRelativeDays(item.completedAt ?? now, now)}
                    onOpen={() => open(item)}
                  />
                ))}
                {view.doneSince.length > MAX_DONE_SHOWN && (
                  <div className={styles.more}>+{view.doneSince.length - MAX_DONE_SHOWN} more</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, count, hint }: { title: string; count: number; hint?: string }) {
  return (
    <div className={styles.sectionHead}>
      <span className={styles.sectionTitle}>{title}</span>
      <span className={styles.count}>{count}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

function activate(e: KeyboardEvent<HTMLDivElement>, fn: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn();
  }
}

function CheckButton({ item, className }: { item: Item; className: string }) {
  return (
    <button
      type="button"
      className={className}
      aria-label={item.isCompleted ? 'Mark as not completed' : 'Mark as completed'}
      aria-pressed={item.isCompleted}
      onClick={(e) => {
        e.stopPropagation();
        void setItemCompleted(item.id, !item.isCompleted);
      }}
    />
  );
}

function AgendaCard({
  item,
  now,
  startedAt,
  isNew,
  selected,
  onOpen,
}: {
  item: Item;
  now: number;
  startedAt: number;
  isNew: boolean;
  selected: boolean;
  onOpen: () => void;
}) {
  const project = useProjectOf(item.projectId);
  const isTask = item.kind === 'task';
  const discussed = item.discussedAt !== undefined && item.discussedAt >= startedAt;
  const preview = stripHtml(item.body);
  const className = [
    styles.card,
    selected && styles.cardSelected,
    isCoveredIn(item, startedAt) && styles.cardCovered,
    isTask && item.isCompleted && styles.cardDone,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <ItemContextMenu item={item}>
      <div
        className={className}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onOpen}
        onKeyDown={(e) => activate(e, onOpen)}
      >
        <div className={styles.body}>
          <div className={styles.title}>
            {item.isFlagged && !item.isCompleted && (
              <span className={styles.flag} title="Urgent" aria-label="Urgent">
                <FlagIcon />
              </span>
            )}
            {item.title || <span className={styles.untitled}>Untitled</span>}
            {isNew && <span className={styles.tag}>new</span>}
            {isTask && !item.isCompleted && item.dueDate !== undefined && (
              <DueBadge dueDate={item.dueDate} now={now} />
            )}
            {project && <ProjectBadge project={project} tone="dark" />}
          </div>
          {preview && <div className={styles.preview}>{preview}</div>}
        </div>
        <div className={styles.controls}>
          {isTask ? (
            <CheckButton
              item={item}
              className={item.isCompleted ? `${styles.check} ${styles.checkDone}` : styles.check}
            />
          ) : (
            <NoteIcon className={styles.noteMark} />
          )}
          <button
            type="button"
            className={discussed ? `${styles.discuss} ${styles.discussOn}` : styles.discuss}
            aria-pressed={discussed}
            aria-label={`${discussed ? 'Discussed' : 'Mark as discussed'}: ${item.title || 'Untitled'}`}
            onClick={(e) => {
              e.stopPropagation();
              void setItemDiscussed(item.id, !discussed);
            }}
          >
            {discussed ? '✓ Discussed' : 'Discussed'}
          </button>
        </div>
      </div>
    </ItemContextMenu>
  );
}

function CompactRow({
  item,
  selected,
  dateLabel,
  onOpen,
}: {
  item: Item;
  selected: boolean;
  dateLabel?: string;
  onOpen: () => void;
}) {
  const isTask = item.kind === 'task';
  const className = [
    styles.compact,
    selected && styles.compactSelected,
    isTask && item.isCompleted && styles.compactDone,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <ItemContextMenu item={item}>
      <div
        className={className}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onOpen}
        onKeyDown={(e) => activate(e, onOpen)}
      >
        {isTask ? (
          <CheckButton
            item={item}
            className={
              item.isCompleted ? `${styles.miniCheck} ${styles.miniCheckDone}` : styles.miniCheck
            }
          />
        ) : (
          <NoteIcon className={styles.miniNote} />
        )}
        <span className={styles.compactTitle}>{item.title || 'Untitled'}</span>
        {dateLabel && <span className={styles.compactDate}>{dateLabel}</span>}
      </div>
    </ItemContextMenu>
  );
}
