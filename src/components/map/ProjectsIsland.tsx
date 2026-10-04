import * as ContextMenu from '@radix-ui/react-context-menu';
import { Fragment, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { useDatabase } from '../../data/DatabaseContext';
import { deleteProject, renameProject } from '../../data/repository';
import {
  describeProjectCount,
  projectColor,
  projectCounts,
  sortProjectsByUse,
} from '../../model/projects';
import type { Item, Project } from '../../model/types';
import { useProjects } from '../../state/projects';
import { useUI } from '../../state/ui';
import menu from '../menu.module.css';
import styles from './ProjectsIsland.module.css';

/** Keyboard focus, not a mouse click: only that should hold the island open. */
function focusIsVisible(target: EventTarget | null): boolean {
  try {
    return target instanceof Element && target.matches(':focus-visible');
  } catch {
    return false;
  }
}

/**
 * Top-left island on the map, folded to its "Projects" title (the brand island's width) until
 * the pointer comes in; then it opens to every project with how much hangs on it. Click one and
 * the map spotlights its cards, wherever they sit, and the island stays open while it does;
 * click again (or Esc, or the canvas) to see everything, and it folds. Right-click renames or
 * deletes. Shows nothing until the first project exists.
 */
export function ProjectsIsland({ items, demo = false }: { items: Item[]; demo?: boolean }) {
  const database = useDatabase();
  const projects = useProjects();
  const focus = useUI((s) => s.projectFocusId);
  const focusProject = useUI((s) => s.focusProject);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [hover, setHover] = useState(false);
  // Hover opens it, except right after a project was deselected under the pointer: then it
  // folds, and stays folded until the pointer has left once.
  const [armed, setArmed] = useState(true);
  // Touch and keyboard have no hover: the title (or a focused row) holds it open instead.
  const [pinned, setPinned] = useState(false);
  const [seenFocus, setSeenFocus] = useState(focus);
  if (seenFocus !== focus) {
    setSeenFocus(focus);
    if (focus === null) setArmed(false);
  }
  const counts = useMemo(() => projectCounts(items), [items]);
  const sorted = useMemo(() => sortProjectsByUse(projects, counts), [projects, counts]);
  if (sorted.length === 0) return null;

  const open = focus !== null || renaming !== null || pinned || (hover && armed);
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPinned(false);
  };

  async function remove(project: Project) {
    const n = counts.get(project.id)?.total ?? 0;
    const tail = n ? ` Its ${n} item${n === 1 ? ' stays' : 's stay'}, without the tag.` : '';
    if (!window.confirm(`Delete the project “${project.name}”?${tail}`)) return;
    if (focus === project.id) focusProject(null);
    await deleteProject(project.id, database);
  }

  return (
    <aside
      className={open ? `${styles.island} ${styles.open}` : styles.island}
      data-open={open}
      aria-label="Projects"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setArmed(true);
        setPinned(false);
      }}
      onFocus={(e) => {
        if (focusIsVisible(e.target)) setPinned(true);
      }}
      onBlur={onBlur}
    >
      <div className={styles.head}>
        <button
          type="button"
          className={styles.label}
          aria-expanded={open}
          aria-controls="projects-island-list"
          onClick={() => setPinned((p) => !p)}
        >
          Projects
        </button>
        {focus !== null && (
          <button type="button" className={styles.showAll} onClick={() => focusProject(null)}>
            Show all
          </button>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.listWrap}>
          <ul id="projects-island-list" className={styles.list}>
            {sorted.map((project) => {
              const count = counts.get(project.id);
              const active = focus === project.id;
              const row = (
                <li
                  className={[
                    styles.row,
                    active && styles.active,
                    focus !== null && !active && styles.faded,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {renaming === project.id ? (
                    <RenameField project={project} onDone={() => setRenaming(null)} />
                  ) : (
                    <button
                      type="button"
                      className={styles.pick}
                      aria-pressed={active}
                      title={describeProjectCount(count)}
                      onClick={() => focusProject(active ? null : project.id)}
                    >
                      <span
                        className={styles.dot}
                        style={{ background: projectColor(project.colorIndex) }}
                        aria-hidden="true"
                      />
                      <span className={styles.name}>{project.name}</span>
                      <span className={styles.count}>{count?.total ?? 0}</span>
                    </button>
                  )}
                </li>
              );
              if (demo) return <Fragment key={project.id}>{row}</Fragment>;
              return (
                <ContextMenu.Root key={project.id}>
                  <ContextMenu.Trigger asChild>{row}</ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content className={menu.menu}>
                      <ContextMenu.Label className={menu.label}>{project.name}</ContextMenu.Label>
                      <ContextMenu.Item
                        className={menu.item}
                        onSelect={() => focusProject(active ? null : project.id)}
                      >
                        {active ? 'Show everything' : 'Show only this project'}
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className={menu.item}
                        onSelect={() => setRenaming(project.id)}
                      >
                        Rename…
                      </ContextMenu.Item>
                      <ContextMenu.Separator className={menu.separator} />
                      <ContextMenu.Item
                        className={`${menu.item} ${menu.danger}`}
                        onSelect={() => void remove(project)}
                      >
                        Delete project
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}

/** The project's name as an input, in its row. Enter or clicking away saves; Escape cancels. */
function RenameField({ project, onDone }: { project: Project; onDone: () => void }) {
  const database = useDatabase();
  const [value, setValue] = useState(project.name);

  async function save() {
    if (value.trim() && value.trim() !== project.name)
      await renameProject(project.id, value, database);
    onDone();
  }
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onDone();
    }
  }
  return (
    <input
      className={styles.rename}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => void save()}
      aria-label={`Rename project ${project.name}`}
      autoFocus
    />
  );
}
