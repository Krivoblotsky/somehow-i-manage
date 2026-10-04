/**
 * The app's records, as the MCP server sees them. Mirrors src/model/types.ts: the server reads
 * and writes the same JSON the devices sync, so the two must stay in step.
 */

export type ItemKind = 'task' | 'note';

export interface Contact {
  kind: string;
  value: string;
}

export interface Meeting {
  startedAt: number;
  endedAt: number;
}

export interface Person {
  id: string;
  name: string;
  role?: string;
  colorIndex: number;
  avatarDataUrl?: string;
  avatarSource?: string;
  contacts?: Contact[];
  mapPosition?: { x: number; y: number };
  meetings?: Meeting[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Item {
  id: string;
  personId: string;
  kind: ItemKind;
  projectId?: string;
  title: string;
  /** HTML, as the editor stores it. */
  body: string;
  isCompleted: boolean;
  completedAt?: number;
  isFlagged: boolean;
  dueDate?: number;
  discussedAt?: number;
  mapPosition?: { x: number; y: number };
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  colorIndex: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export type RecordKind = 'person' | 'item' | 'project';

/** One change for sync_push(): the whole record, or a tombstone. */
export interface Change {
  id: string;
  kind: RecordKind;
  data: Person | Item | Project | null;
  updated_at: number;
  deleted_at: number | null;
}

export interface Snapshot {
  people: Person[];
  items: Item[];
  projects: Project[];
}

/** Where the records live: Supabase for the signed-in user, memory in tests. */
export interface Store {
  load(): Promise<Snapshot>;
  push(changes: Change[]): Promise<void>;
}

export const DAY = 86_400_000;
export const PERSON_PALETTE_SIZE = 6;
export const PROJECT_PALETTE_SIZE = 8;

export const newId = (): string => crypto.randomUUID();

/** Plain text from the editor's HTML: block boundaries become spaces. */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Editor HTML from plain text or light Markdown: blank lines separate paragraphs, lines starting
 * with "-" or "*" make a list. Enough for what an assistant writes; the app's editor opens it.
 */
export function textToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim());
      if (lines.every((l) => /^[-*]\s+/.test(l))) {
        const items = lines.map((l) => `<li><p>${escapeHtml(l.replace(/^[-*]\s+/, ''))}</p></li>`);
        return `<ul>${items.join('')}</ul>`;
      }
      return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
    })
    .join('');
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * The person an assistant means: by id, then by name (exact, then a word of the name starting
 * with it, then anywhere in it). Several hits are returned for the assistant to ask about.
 */
export function findPerson(
  people: Person[],
  query: string,
): { person?: Person; candidates: Person[] } {
  const q = norm(query);
  if (!q) return { candidates: [] };
  const byId = people.find((p) => p.id === query.trim());
  if (byId) return { person: byId, candidates: [byId] };
  const exact = people.filter((p) => norm(p.name) === q);
  if (exact.length === 1) return { person: exact[0], candidates: exact };
  if (exact.length > 1) return { candidates: exact };
  const starts = people.filter((p) =>
    norm(p.name)
      .split(/\s+/)
      .some((part) => part.startsWith(q))
  );
  if (starts.length === 1) return { person: starts[0], candidates: starts };
  if (starts.length > 1) return { candidates: starts };
  const within = people.filter((p) => norm(p.name).includes(q));
  if (within.length === 1) return { person: within[0], candidates: within };
  return { candidates: within };
}

export function findProject(projects: Project[], query: string): Project | undefined {
  const q = norm(query);
  return projects.find((p) => p.id === query.trim()) ?? projects.find((p) => norm(p.name) === q);
}

export function findItem(items: Item[], id: string): Item | undefined {
  return items.find((i) => i.id === id.trim());
}

/** The least-used palette index, ties resolved in palette order (as the app picks colours). */
export function pickColor(used: number[], size: number): number {
  const counts = Array.from({ length: size }, (_, i) => used.filter((u) => u === i).length);
  let best = 0;
  for (let i = 1; i < size; i++) if (counts[i] < counts[best]) best = i;
  return best;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local midnight for "2026-10-14"; undefined when the text is not a date. */
export function parseDate(text: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? undefined : d.getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "due today", "due tomorrow", "due Fri 10 Oct", "3 days overdue". */
export function describeDue(dueMs: number, now: number): string {
  const days = Math.round((startOfDay(dueMs) - startOfDay(now)) / DAY);
  if (days < 0) return days === -1 ? 'due yesterday' : `${-days} days overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  const d = new Date(dueMs);
  return `due ${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "today", "yesterday", "12 days ago", "3 weeks ago", "2 months ago". */
export function describeAgo(ms: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

export function lastMeeting(person: Person): Meeting | undefined {
  let last: Meeting | undefined;
  for (const m of person.meetings ?? []) if (!last || m.endedAt > last.endedAt) last = m;
  return last;
}

/** Open tasks the way the app lists them: urgent first, then soonest due, then by hand. */
export function openTasks(items: Item[]): Item[] {
  return items
    .filter((i) => i.kind === 'task' && !i.isCompleted)
    .sort(
      (a, b) =>
        Number(b.isFlagged) - Number(a.isFlagged) ||
        (a.dueDate ?? Infinity) - (b.dueDate ?? Infinity) ||
        a.sortOrder - b.sortOrder,
    );
}

export function notes(items: Item[]): Item[] {
  return items.filter((i) => i.kind === 'note').sort((a, b) => b.updatedAt - a.updatedAt);
}

export function completedTasks(items: Item[]): Item[] {
  return items
    .filter((i) => i.kind === 'task' && i.isCompleted)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function nextSortOrder(records: { sortOrder: number }[]): number {
  return records.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;
}
