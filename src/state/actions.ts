import { backupFilename, createBackup, serializeBackup } from '../data/backup';
import { db } from '../data/db';
import { allToMarkdown } from '../data/export';
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

/** Hand the browser a text file to save. */
export function downloadText(filename: string, text: string, type = 'text/markdown'): void {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function backupToFile(): Promise<void> {
  downloadText(backupFilename(), serializeBackup(await createBackup()), 'application/json');
}

export async function exportMarkdownToFile(): Promise<void> {
  const [people, items] = await Promise.all([
    db.people.orderBy('sortOrder').toArray(),
    db.items.toArray(),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`somehow-i-manage-${stamp}.md`, allToMarkdown(people, items));
}
