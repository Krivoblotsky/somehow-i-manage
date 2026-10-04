import type { Item, ItemKind, Person, Project, ViewModeLike } from './types';

export type PaletteAction =
  | { type: 'person'; personId: string }
  | { type: 'item'; itemId: string; personId: string }
  | { type: 'add'; personId: string; kind: ItemKind; title: string }
  | { type: 'meeting'; personId: string }
  | { type: 'project'; projectId: string }
  | { type: 'command'; command: PaletteCommand };

export type PaletteCommand =
  'new-person' | 'view-map' | 'view-list' | 'tidy-map' | 'shortcuts' | 'backup' | 'restore';

export type PaletteGroup = 'add' | 'people' | 'items' | 'projects' | 'commands';

export interface PaletteResult {
  id: string;
  group: PaletteGroup;
  label: string;
  hint?: string;
  personId?: string;
  action: PaletteAction;
}

const COMMANDS: {
  command: PaletteCommand;
  label: string;
  keywords: string;
  view?: ViewModeLike;
}[] = [
  { command: 'new-person', label: 'New person', keywords: 'add create person people' },
  { command: 'view-map', label: 'Switch to Map view', keywords: 'map canvas', view: 'list' },
  { command: 'view-list', label: 'Switch to List view', keywords: 'list dossier', view: 'map' },
  {
    command: 'tidy-map',
    label: 'Tidy up the map',
    keywords: 'tidy layout arrange reset map',
    view: 'map',
  },
  { command: 'shortcuts', label: 'Keyboard shortcuts', keywords: 'keyboard shortcuts help keys' },
  { command: 'backup', label: 'Back up to file', keywords: 'backup export json save' },
  { command: 'restore', label: 'Restore from file', keywords: 'restore import json' },
];

const MAX_PEOPLE = 8;
const MAX_ITEMS = 8;
const MAX_PROJECTS = 5;

function rank(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return -1;
}

function personText(p: Person): string[] {
  return [p.name, p.role ?? '', ...(p.contacts ?? []).map((c) => c.value)];
}

/** Title matches beat body matches; within each, exact > prefix > substring. */
function rankItem(item: Item, q: string): number {
  const byTitle = rank(item.title, q);
  if (byTitle !== -1) return byTitle;
  const byBody = rank(item.body.replace(/<[^>]+>/g, ' '), q);
  return byBody === -1 ? -1 : 3 + byBody;
}

function bestRank(texts: string[], q: string): number {
  let best = -1;
  for (const t of texts) {
    const r = rank(t, q);
    if (r !== -1 && (best === -1 || r < best)) best = r;
  }
  return best;
}

/**
 * What the palette shows for a query. Pure, so it is easy to test.
 * "Name: some title" offers to add a task with, or a note about, the matching person.
 */
export function buildResults(
  query: string,
  people: Person[],
  items: Item[],
  view: ViewModeLike,
  projects: Project[] = [],
): PaletteResult[] {
  const q = query.trim().toLowerCase();
  const results: PaletteResult[] = [];
  const byId = new Map(people.map((p) => [p.id, p]));

  const add = /^([^:]+):\s*(.+)$/.exec(query.trim());
  if (add) {
    const prefix = add[1].trim().toLowerCase();
    const title = add[2].trim();
    const targets = people.filter((p) => p.name.toLowerCase().startsWith(prefix)).slice(0, 3);
    for (const p of targets) {
      results.push({
        id: `add-task-${p.id}`,
        group: 'add',
        label: `Add task “${title}” with ${p.name}`,
        personId: p.id,
        action: { type: 'add', personId: p.id, kind: 'task', title },
      });
      results.push({
        id: `add-note-${p.id}`,
        group: 'add',
        label: `Add note “${title}” about ${p.name}`,
        personId: p.id,
        action: { type: 'add', personId: p.id, kind: 'note', title },
      });
    }
  }

  const peopleHits = (
    q === ''
      ? people.map((p) => ({ p, r: 0 }))
      : people.map((p) => ({ p, r: bestRank(personText(p), q) })).filter((x) => x.r !== -1)
  )
    .sort((a, b) => a.r - b.r || a.p.sortOrder - b.p.sortOrder)
    .slice(0, MAX_PEOPLE);
  for (const { p } of peopleHits) {
    const open = items.filter(
      (i) => i.personId === p.id && i.kind === 'task' && !i.isCompleted,
    ).length;
    results.push({
      id: `person-${p.id}`,
      group: 'people',
      label: p.name,
      hint: p.role ?? (open > 0 ? `${open} open task${open === 1 ? '' : 's'}` : undefined),
      personId: p.id,
      action: { type: 'person', personId: p.id },
    });
  }

  if (q !== '') {
    const itemHits = items
      .map((i) => ({ i, r: rankItem(i, q) }))
      .filter((x) => x.r !== -1)
      .sort((a, b) => a.r - b.r || b.i.updatedAt - a.i.updatedAt)
      .slice(0, MAX_ITEMS);
    for (const { i } of itemHits) {
      const owner = byId.get(i.personId);
      results.push({
        id: `item-${i.id}`,
        group: 'items',
        label: i.title || 'Untitled',
        hint: [owner?.name, i.kind, i.isCompleted ? 'completed' : null].filter(Boolean).join(' · '),
        personId: i.personId,
        action: { type: 'item', itemId: i.id, personId: i.personId },
      });
    }
  }

  // Projects whose name matches; all of them when the query is just "project(s)".
  if (q !== '') {
    const aboutProjects = /^projects?$/.test(q);
    const projectHits = projects
      .map((p) => ({ p, r: aboutProjects ? 0 : rank(p.name, q) }))
      .filter((x) => x.r !== -1)
      .sort((a, b) => a.r - b.r || a.p.name.localeCompare(b.p.name))
      .slice(0, MAX_PROJECTS);
    for (const { p } of projectHits) {
      const n = items.filter((i) => i.projectId === p.id).length;
      results.push({
        id: `project-${p.id}`,
        group: 'projects',
        label: p.name,
        hint: n === 0 ? 'nothing yet' : `${n} item${n === 1 ? '' : 's'}`,
        action: { type: 'project', projectId: p.id },
      });
    }
  }

  // "Start 1:1 with …" for whoever matched; for everyone when the query is about 1:1s.
  if (q !== '') {
    const aboutMeetings = /^(1:1|1-1|one[ -]on[ -]one|meet)/.test(q);
    const targets = aboutMeetings
      ? people.slice(0, MAX_PEOPLE)
      : peopleHits.slice(0, 3).map((x) => x.p);
    for (const p of targets) {
      results.push({
        id: `meeting-${p.id}`,
        group: 'commands',
        label: `Start 1:1 with ${p.name}`,
        personId: p.id,
        action: { type: 'meeting', personId: p.id },
      });
    }
  }

  for (const c of COMMANDS) {
    // On the 1:1 screen both view switches make sense.
    if (c.view && view !== 'meeting' && c.view !== view) continue;
    if (q !== '' && rank(c.label, q) === -1 && !c.keywords.includes(q)) continue;
    results.push({
      id: `command-${c.command}`,
      group: 'commands',
      label: c.label,
      action: { type: 'command', command: c.command },
    });
  }

  return results;
}
