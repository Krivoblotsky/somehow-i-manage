import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useEffect, useState, type AnimationEvent, type CSSProperties } from 'react';
import { setItemCompleted } from '../../data/repository';
import { markEnterPlayed, shouldPlayEnter } from '../../map/enterFx';
import type { ItemNodeType } from '../../map/graph';
import { CARD } from '../../map/layout';
import { stripHtml } from '../../model/derive';
import { deleteItemWithUndo } from '../../state/actions';
import { FlagIcon, NoteIcon, TrashIcon } from '../icons';
import styles from './ItemNode.module.css';

/** A task or note card on the map. Same visual language as the cards in the list view. */
export function ItemNode({ data }: NodeProps<ItemNodeType>) {
  const { item, color, isSelected, hubOffset } = data;
  const isTask = item.kind === 'task';
  const done = isTask && item.isCompleted;
  const preview = stripHtml(item.body);

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
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={
        {
          '--accent': color,
          '--hub-dx': `${hubOffset.x}px`,
          '--hub-dy': `${hubOffset.y}px`,
          width: CARD.width,
        } as CSSProperties
      }
      onAnimationEnd={onAnimationEnd}
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
          <span className={styles.titleText}>
            {item.title || <span className={styles.untitled}>Untitled</span>}
          </span>
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
