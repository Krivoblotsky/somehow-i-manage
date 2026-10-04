import { backupFilename, createBackup, serializeBackup } from '../data/backup';
import { db, type PersonalDB } from '../data/db';
import { allToMarkdown } from '../data/export';
import { deleteItem, recordMeeting, restoreItem } from '../data/repository';
import { buildMeetingView, lastMeeting, summarizeMeeting } from '../model/oneOnOne';
import type { Item } from '../model/types';
import { useToast } from './toast';
import { useUI } from './ui';

/**
 * Delete an item without a confirmation dialog; offer Undo in a toast instead.
 * Reads the latest copy first so an undo brings back edits made moments before.
 */
export async function deleteItemWithUndo(item: Item, database: PersonalDB = db): Promise<void> {
  const latest = (await database.items.get(item.id)) ?? item;
  const ui = useUI.getState();
  if (ui.selectedItemId === latest.id) ui.selectItem(null);
  await deleteItem(latest.id, database);
  useToast.getState().show(`Deleted “${latest.title.trim() || 'Untitled'}”`, {
    actionLabel: 'Undo',
    onAction: () => void restoreItem(latest, database),
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
  const [people, items, projects] = await Promise.all([
    db.people.orderBy('sortOrder').toArray(),
    db.items.toArray(),
    db.projects.toArray(),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`somehow-i-manage-${stamp}.md`, allToMarkdown(people, items, projects));
}

/** Lights a project on the map and opens its panel. From the list or a 1:1, goes to the map first. */
export function openProject(projectId: string): void {
  const ui = useUI.getState();
  if (ui.view !== 'map') ui.setView('map');
  ui.selectItem(null);
  ui.closePanel();
  ui.focusProject(projectId);
}

/** Opens the 1:1 screen for a person. A 1:1 still running with someone else ends (and is recorded) first. */
export async function startOneOnOne(personId: string): Promise<void> {
  const ui = useUI.getState();
  if (ui.meeting?.personId === personId) {
    ui.setView('meeting');
    return;
  }
  if (ui.meeting) await finishOneOnOne();
  useUI.getState().startMeeting(personId, Date.now());
}

/** Ends the running 1:1: records it on the person and sums up what happened in a toast. */
export async function finishOneOnOne(): Promise<void> {
  const meeting = useUI.getState().meeting;
  if (!meeting) return;
  const endedAt = Date.now();
  const [person, items] = await Promise.all([
    db.people.get(meeting.personId),
    db.items.where('personId').equals(meeting.personId).toArray(),
  ]);
  await recordMeeting(meeting.personId, { startedAt: meeting.startedAt, endedAt });
  useUI.getState().endMeeting();
  if (person) {
    const { counts } = buildMeetingView(items, meeting.startedAt, lastMeeting(person));
    useToast.getState().show(`1:1 with ${person.name} ended · ${summarizeMeeting(counts)}`);
  }
}
