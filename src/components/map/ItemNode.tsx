import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { setItemCompleted } from '../../data/repository';
import type { ItemNodeType } from '../../map/graph';
import { CARD } from '../../map/layout';
import { stripHtml } from '../../model/derive';
import { FlagIcon, NoteIcon } from '../icons';
import styles from './ItemNode.module.css';

/** A task or note card on the map. Same visual language as the cards in the list view. */
export function ItemNode({ data }: NodeProps<ItemNodeType>) {
  const { item, color, isSelected } = data;
  const isTask = item.kind === 'task';
  const done = isTask && item.isCompleted;
  const preview = stripHtml(item.body);
  const className = [styles.card, isSelected && styles.selected, done && styles.done]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={{ '--accent': color, width: CARD.width } as CSSProperties}>
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
    </div>
  );
}
