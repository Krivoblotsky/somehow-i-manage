import * as ContextMenu from '@radix-ui/react-context-menu';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ReactNode } from 'react';
import { db } from '../data/db';
import { moveItem, setItemCompleted, setItemKind, updateItem } from '../data/repository';
import type { Item } from '../model/types';
import { deleteItemWithUndo } from '../state/actions';
import { useToast } from '../state/toast';
import { useUI } from '../state/ui';
import menu from './menu.module.css';

/** Right-click menu for a task or note. Wraps any element; the same actions everywhere. */
export function ItemContextMenu({ item, children }: { item: Item; children: ReactNode }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={menu.menu}>
          <ItemMenuItems item={item} />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/** The menu entries themselves; render inside a ContextMenu.Content. */
export function ItemMenuItems({ item }: { item: Item }) {
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []) ?? [];
  const selectItem = useUI((s) => s.selectItem);
  const show = useToast((s) => s.show);
  const isTask = item.kind === 'task';
  const others = people.filter((p) => p.id !== item.personId);

  async function move(personId: string, name: string) {
    await moveItem(item.id, personId);
    show(`Moved “${item.title || 'Untitled'}” to ${name}`);
  }

  return (
    <>
      <ContextMenu.Label className={menu.label}>{item.title || 'Untitled'}</ContextMenu.Label>
      <ContextMenu.Item className={menu.item} onSelect={() => selectItem(item.id, item.personId)}>
        Open
      </ContextMenu.Item>
      {isTask && (
        <ContextMenu.Item
          className={menu.item}
          onSelect={() => void setItemCompleted(item.id, !item.isCompleted)}
        >
          {item.isCompleted ? 'Mark as not completed' : 'Mark as completed'}
        </ContextMenu.Item>
      )}
      {isTask && !item.isCompleted && (
        <ContextMenu.Item
          className={menu.item}
          onSelect={() => void updateItem(item.id, { isFlagged: !item.isFlagged })}
        >
          {item.isFlagged ? 'Remove urgent flag' : 'Mark as urgent'}
        </ContextMenu.Item>
      )}
      <ContextMenu.Item
        className={menu.item}
        onSelect={() => void setItemKind(item.id, isTask ? 'note' : 'task')}
      >
        {isTask ? 'Turn into a note' : 'Turn into a task'}
      </ContextMenu.Item>
      {others.length > 0 && (
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger className={`${menu.item} ${menu.subTrigger}`}>
            Move to…
          </ContextMenu.SubTrigger>
          <ContextMenu.Portal>
            <ContextMenu.SubContent className={menu.menu} sideOffset={4}>
              {others.map((p) => (
                <ContextMenu.Item
                  key={p.id}
                  className={menu.item}
                  onSelect={() => void move(p.id, p.name)}
                >
                  {p.name}
                </ContextMenu.Item>
              ))}
            </ContextMenu.SubContent>
          </ContextMenu.Portal>
        </ContextMenu.Sub>
      )}
      <ContextMenu.Separator className={menu.separator} />
      <ContextMenu.Item
        className={`${menu.item} ${menu.danger}`}
        onSelect={() => void deleteItemWithUndo(item)}
      >
        Delete
      </ContextMenu.Item>
    </>
  );
}
