import { db } from '../data/db';
import { deleteItem, restoreItem } from '../data/repository';
import type { Item } from '../model/types';
import { useToast } from './toast';
import { useUI } from './ui';

/**
 * Delete an item without a confirmation dialog; offer Undo in a toast instead.
 * Reads the latest copy first so an undo brings back edits made moments before.
 */
export async function deleteItemWithUndo(item: Item): Promise<void> {
  const latest = (await db.items.get(item.id)) ?? item;
  const ui = useUI.getState();
  if (ui.selectedItemId === latest.id) ui.selectItem(null);
  await deleteItem(latest.id);
  useToast.getState().show(`Deleted “${latest.title.trim() || 'Untitled'}”`, {
    actionLabel: 'Undo',
    onAction: () => void restoreItem(latest),
  });
}
