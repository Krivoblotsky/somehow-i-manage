import type { Item, Project } from './types';

/**
 * Project colours: a set of their own, so a chip never reads as a person's ring. Chosen to
 * work as a dot on white cards and on the dark glass islands alike.
 */
export const PROJECT_PALETTE = [
  '#7C5CFF',
  '#1FA97A',
  '#E0A100',
  '#E8506B',
  '#2B9BD6',
  '#8BC34A',
  '#F97316',
  '#8E8E93',
] as const;

export function projectColor(index: number): string {
  const n = PROJECT_PALETTE.length;
  return PROJECT_PALETTE[((Math.trunc(index) % n) + n) % n];
}

/** The least-used palette index, ties resolved in palette order. */
export function pickProjectColor(usedIndexes: number[]): number {
  const counts = PROJECT_PALETTE.map((_, i) => usedIndexes.filter((u) => u === i).length);
  let best = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] < counts[best]) best = i;
  return best;
}

/** Trimmed, inner whitespace collapsed: how a project name is stored and compared. */
export function normalizeProjectName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/** The project with this name, ignoring case and stray spaces. */
export function findProjectByName(projects: Project[], name: string): Project | undefined {
  const wanted = normalizeProjectName(name).toLowerCase();
  if (!wanted) return undefined;
  return projects.find((p) => p.name.toLowerCase() === wanted);
}

export interface ProjectCount {
  /** Tasks and notes carrying the project. */
  total: number;
  /** Of those, open tasks. */
  open: number;
}

/** How much hangs on each project, by project id. Projects without items are absent. */
export function projectCounts(items: Item[]): Map<string, ProjectCount> {
  const out = new Map<string, ProjectCount>();
  for (const item of items) {
    if (!item.projectId) continue;
    const count = out.get(item.projectId) ?? { total: 0, open: 0 };
    count.total += 1;
    if (item.kind === 'task' && !item.isCompleted) count.open += 1;
    out.set(item.projectId, count);
  }
  return out;
}

/** Busiest first, then by name: the order of the island and the picker. */
export function sortProjectsByUse(
  projects: Project[],
  counts: Map<string, ProjectCount>,
): Project[] {
  return [...projects].sort(
    (a, b) =>
      (counts.get(b.id)?.total ?? 0) - (counts.get(a.id)?.total ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

/** "5 items, 3 open" / "1 item" — the count next to a project. */
export function describeProjectCount(count: ProjectCount | undefined): string {
  if (!count || count.total === 0) return 'nothing yet';
  const items = `${count.total} item${count.total === 1 ? '' : 's'}`;
  return count.open > 0 ? `${items}, ${count.open} open` : items;
}

/** Projects whose name contains the query (case-insensitive); all of them for an empty query. */
export function filterProjects(projects: Project[], query: string): Project[] {
  const q = normalizeProjectName(query).toLowerCase();
  if (!q) return projects;
  return projects.filter((p) => p.name.toLowerCase().includes(q));
}
