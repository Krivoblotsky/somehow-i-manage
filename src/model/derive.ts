import type { Item } from './types';

/** Up to two initials, Unicode-safe ("Sergii Kryvoblotskyi" → "SK", "Анна" → "А"). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => [...p][0] ?? '')
    .join('')
    .toUpperCase();
}

export interface PersonStats {
  openTasks: number;
  completedTasks: number;
  flagged: number;
  notes: number;
}

export function personStats(items: Item[]): PersonStats {
  const stats: PersonStats = { openTasks: 0, completedTasks: 0, flagged: 0, notes: 0 };
  for (const item of items) {
    if (item.kind === 'note') {
      stats.notes++;
      continue;
    }
    if (item.isCompleted) stats.completedTasks++;
    else {
      stats.openTasks++;
      if (item.isFlagged) stats.flagged++;
    }
  }
  return stats;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** "10 tasks, 1 urgent, 2 done, 3 notes" — the line under a person's name. */
export function describeStats(stats: PersonStats): string {
  const parts: string[] = [];
  if (stats.openTasks > 0) parts.push(plural(stats.openTasks, 'task'));
  if (stats.flagged > 0) parts.push(`${stats.flagged} urgent`);
  if (stats.completedTasks > 0) parts.push(`${stats.completedTasks} done`);
  if (stats.notes > 0) parts.push(plural(stats.notes, 'note'));
  return parts.length > 0 ? parts.join(', ') : 'Nothing yet';
}

/** Plain-text preview of an HTML body. Block boundaries become spaces. */
export function stripHtml(html: string): string {
  if (!html) return '';
  const spaced = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/gi, ' ');
  let text: string;
  if (typeof DOMParser !== 'undefined') {
    text = new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? '';
  } else {
    text = spaced.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  }
  return text.replace(/\s+/g, ' ').trim();
}
