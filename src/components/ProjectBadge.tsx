import type { CSSProperties } from 'react';
import { projectColor } from '../model/projects';
import type { Project } from '../model/types';
import styles from './ProjectBadge.module.css';

/** The project an item belongs to, as a small chip: a dot in the project's colour and the name. */
export function ProjectBadge({
  project,
  tone = 'light',
  className,
}: {
  project: Pick<Project, 'name' | 'colorIndex'>;
  /** `light` sits on white cards and panels; `dark` on the canvas-coloured views. */
  tone?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <span
      className={[styles.badge, tone === 'dark' && styles.dark, className]
        .filter(Boolean)
        .join(' ')}
      style={{ '--project': projectColor(project.colorIndex) } as CSSProperties}
      title={`Project: ${project.name}`}
    >
      <span className={styles.dot} aria-hidden="true" />
      {project.name}
    </span>
  );
}
