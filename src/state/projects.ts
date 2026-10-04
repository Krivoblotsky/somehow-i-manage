import { useLiveQuery } from 'dexie-react-hooks';
import { useDatabase } from '../data/DatabaseContext';
import type { Project } from '../model/types';

const NONE: Project[] = [];

/** Every project, live, from the database in scope (the landing demo has its own). */
export function useProjects(): Project[] {
  const database = useDatabase();
  return useLiveQuery(() => database.projects.toArray(), [database], NONE);
}

/** The project an item carries, if it still exists. */
export function useProjectOf(projectId: string | undefined): Project | undefined {
  const projects = useProjects();
  return projectId ? projects.find((p) => p.id === projectId) : undefined;
}
