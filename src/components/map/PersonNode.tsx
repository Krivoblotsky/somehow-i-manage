import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { createItem } from '../../data/repository';
import type { PersonNodeType } from '../../map/graph';
import { useUI } from '../../state/ui';
import { Avatar } from '../Avatar';
import styles from './PersonNode.module.css';

/** A person on the map: ringed avatar, name, and a "+" that adds a task. */
export function PersonNode({ data }: NodeProps<PersonNodeType>) {
  const { person, color, isSelected, isDropTarget } = data;
  const selectItem = useUI((s) => s.selectItem);
  const [pulsing, setPulsing] = useState(false);

  async function addTask(e: ReactMouseEvent) {
    e.stopPropagation();
    setPulsing(true);
    const item = await createItem({ personId: person.id, kind: 'task' });
    selectItem(item.id, person.id);
  }

  return (
    <div
      className={[styles.person, isSelected && styles.selected, isDropTarget && styles.dropTarget]
        .filter(Boolean)
        .join(' ')}
      style={{ '--accent': color } as CSSProperties}
    >
      <Handle
        type="source"
        position={Position.Right}
        className={styles.handle}
        isConnectable={false}
      />
      <div
        className={pulsing ? `${styles.avatarWrap} ${styles.pulse}` : styles.avatarWrap}
        onAnimationEnd={() => setPulsing(false)}
      >
        <Avatar person={person} size={56} ring={4} />
        <button
          type="button"
          className={`nodrag nopan ${styles.add}`}
          title={`New task for ${person.name}`}
          aria-label={`New task for ${person.name}`}
          onClick={(e) => void addTask(e)}
        >
          +
        </button>
      </div>
      <div className={styles.name} title={person.name}>
        {person.name}
      </div>
    </div>
  );
}
