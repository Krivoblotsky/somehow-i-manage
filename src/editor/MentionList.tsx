import type { MouseEvent } from 'react';
import { Avatar } from '../components/Avatar';
import { NoteIcon } from '../components/icons';
import styles from './MentionMenu.module.css';
import type { MentionItem } from './mentions';

/** The rows of the suggestion menu: people or tasks and notes, and a last row to add someone new. */
export function MentionList({
  items,
  selected,
  empty,
  onPick,
  onHover,
}: {
  items: MentionItem[];
  selected: number;
  /** Shown when nothing matches. */
  empty: string;
  onPick: (item: MentionItem) => void;
  onHover: (index: number) => void;
}) {
  if (items.length === 0) return <div className={styles.empty}>{empty}</div>;
  return (
    <ul className={styles.list} role="listbox" aria-label="Suggestions">
      {items.map((row, index) => {
        const active = index === selected;
        const cls = active ? `${styles.row} ${styles.active}` : styles.row;
        const props = {
          role: 'option' as const,
          'aria-selected': active,
          className: cls,
          onMouseDown: (e: MouseEvent) => e.preventDefault(), // keep the editor focused
          onMouseEnter: () => onHover(index),
          onClick: () => onPick(row),
        };
        if (row.kind === 'person')
          return (
            <li key={row.person.id} {...props}>
              <Avatar person={row.person} size={20} ring={0} />
              <span className={styles.name}>{row.person.name}</span>
              {row.person.role && <span className={styles.meta}>{row.person.role}</span>}
            </li>
          );
        if (row.kind === 'item') {
          const done = row.item.kind === 'task' && row.item.isCompleted;
          return (
            <li key={row.item.id} {...props}>
              {row.item.kind === 'note' ? (
                <NoteIcon className={styles.glyph} size={14} />
              ) : (
                <span
                  className={done ? `${styles.task} ${styles.taskDone}` : styles.task}
                  aria-hidden="true"
                />
              )}
              <span className={done ? `${styles.name} ${styles.nameDone}` : styles.name}>
                {row.item.title}
              </span>
              {row.owner && <span className={styles.meta}>{row.owner.name}</span>}
            </li>
          );
        }
        return (
          <li key="create-person" {...props}>
            <span className={styles.plus} aria-hidden="true">
              +
            </span>
            <span className={styles.name}>Add person “{row.name}”</span>
          </li>
        );
      })}
    </ul>
  );
}
