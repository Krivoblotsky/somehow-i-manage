import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { deleteItem, setItemCompleted, updateItem } from '../../data/repository';
import { markEnterPlayed, shouldPlayEnter } from '../../map/enterFx';
import type { ItemNodeType } from '../../map/graph';
import { CARD } from '../../map/layout';
import { stripHtml } from '../../model/derive';
import { deleteItemWithUndo } from '../../state/actions';
import { useNow } from '../../state/now';
import { selectFocusPersonId, useUI } from '../../state/ui';
import { DueBadge } from '../DueBadge';
import { FlagIcon, NoteIcon, TrashIcon } from '../icons';
import styles from './ItemNode.module.css';

/** A task or note card on the map. Same visual language as the cards in the list view. */
export function ItemNode({ data }: NodeProps<ItemNodeType>) {
  const { item, color, isSelected, hubOffset } = data;
  const isTask = item.kind === 'task';
  const done = isTask && item.isCompleted;
  const preview = stripHtml(item.body);
  const now = useNow();
  const focus = useUI(selectFocusPersonId);
  const dimmed = focus !== null && focus !== item.personId;
  const editing = useUI((s) => (s.editingItem?.id === item.id ? s.editingItem : null));
  const startEditing = useUI((s) => s.startEditing);

  // A card created in this session grows out of its owner's avatar, once.
  const enterKey = `card:${item.id}`;
  const [entering, setEntering] = useState(() => shouldPlayEnter(enterKey, item.createdAt));
  useEffect(() => {
    if (entering) markEnterPlayed(enterKey);
  }, [entering, enterKey]);
  function onAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setEntering(false);
  }

  const className = [
    styles.card,
    isSelected && styles.selected,
    done && styles.done,
    entering && styles.enter,
    editing && styles.editing,
    dimmed && styles.dimmed,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      data-dimmed={dimmed}
      style={
        {
          '--accent': color,
          '--hub-dx': `${hubOffset.x}px`,
          '--hub-dy': `${hubOffset.y}px`,
          width: CARD.width,
        } as CSSProperties
      }
      onAnimationEnd={onAnimationEnd}
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEditing(item.id, false);
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.handle}
        isConnectable={false}
      />
      <div className={styles.head}>
        <div className={styles.title}>
          {item.isFlagged && !done && <FlagIcon className={styles.flag} />}
          {editing ? (
            <InlineTitle key={item.id} itemId={item.id} title={item.title} isNew={editing.isNew} />
          ) : (
            <span className={styles.titleText}>
              {item.title || <span className={styles.untitled}>Untitled</span>}
            </span>
          )}
        </div>
        {isTask ? (
          <button
            type="button"
            className={
              done
                ? `nodrag nopan ${styles.check} ${styles.checkDone}`
                : `nodrag nopan ${styles.check}`
            }
            aria-label={done ? 'Mark as not completed' : 'Mark as completed'}
            aria-pressed={done}
            onClick={(e) => {
              e.stopPropagation();
              void setItemCompleted(item.id, !item.isCompleted);
            }}
          />
        ) : (
          <NoteIcon className={styles.noteMark} size={14} />
        )}
      </div>
      {item.dueDate !== undefined && !done && (
        <div className={styles.dueRow}>
          <DueBadge dueDate={item.dueDate} now={now} />
        </div>
      )}
      {preview && <div className={styles.preview}>{preview}</div>}
      {done && (
        <button
          type="button"
          className={`nodrag nopan ${styles.trash}`}
          aria-label="Delete completed task"
          title="Delete (undo available)"
          onClick={(e) => {
            e.stopPropagation();
            void deleteItemWithUndo(item);
          }}
        >
          <TrashIcon size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * The card's title as an input, right on the canvas. Enter or clicking away saves; Escape
 * cancels. A brand-new card left empty is removed again, so a stray "+" leaves no trace.
 */
function InlineTitle({ itemId, title, isNew }: { itemId: string; title: string; isNew: boolean }) {
  const [value, setValue] = useState(title);
  const stopEditing = useUI((s) => s.stopEditing);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ value: title, finished: false });
  const unmountTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function finish(save: boolean) {
    if (latest.current.finished) return;
    latest.current.finished = true;
    const next = latest.current.value.trim();
    if (isNew && (!save || next === '')) {
      await deleteItem(itemId);
    } else if (save && next !== title) {
      await updateItem(itemId, { title: next });
    }
    stopEditing(itemId);
  }
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    // React Flow keeps a fresh node invisible until it has measured it, and an invisible input
    // cannot take focus — so keep trying for a few frames instead of relying on autoFocus.
    let frame = 0;
    let tries = 0;
    const attempt = () => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (document.activeElement === el) {
        el.select();
        return;
      }
      if (tries++ < 60) frame = requestAnimationFrame(attempt);
    };
    attempt();
    return () => cancelAnimationFrame(frame);
  }, []);

  // Unmounting mid-edit (switching view, ⌘K, another card taking over) must not lose the title.
  // Deferred a tick so StrictMode's mount → unmount → mount rehearsal does not count as leaving.
  useEffect(() => {
    clearTimeout(unmountTimer.current);
    return () => {
      unmountTimer.current = setTimeout(() => void finishRef.current(true), 0);
    };
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      void finish(false);
    }
  }

  return (
    <input
      ref={inputRef}
      className={`nodrag nopan ${styles.titleInput}`}
      value={value}
      placeholder="Task title…"
      aria-label="Task title"
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => {
        latest.current.value = e.target.value;
        setValue(e.target.value);
      }}
      onKeyDown={onKeyDown}
      onBlur={() => void finish(true)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}
