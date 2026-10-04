import * as Popover from '@radix-ui/react-popover';
import { useLiveQuery } from 'dexie-react-hooks';
import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useDatabase } from '../data/DatabaseContext';
import { createProject, setItemProject } from '../data/repository';
import {
  filterProjects,
  findProjectByName,
  normalizeProjectName,
  projectColor,
  projectCounts,
  sortProjectsByUse,
} from '../model/projects';
import type { Item, Project } from '../model/types';
import { useProjects } from '../state/projects';
import { TagIcon } from './icons';
import styles from './ProjectPicker.module.css';
import ui from './ui.module.css';

type Option =
  { kind: 'pick'; project: Project } | { kind: 'create'; name: string } | { kind: 'clear' };

const optionKey = (o: Option) =>
  o.kind === 'pick' ? o.project.id : o.kind === 'create' ? 'create' : 'clear';

/**
 * The item's project as a pill. Opens a small list to pick another, type a name to find or
 * create one (Enter takes the highlighted row), or take the tag off.
 */
export function ProjectPicker({ item }: { item: Item }) {
  const database = useDatabase();
  const projects = useProjects();
  const items = useLiveQuery(() => database.items.toArray(), [database]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const listId = useId();

  const current = projects.find((p) => p.id === item.projectId);
  const ordered = useMemo(
    () => sortProjectsByUse(projects, projectCounts(items ?? [])),
    [projects, items],
  );
  const name = normalizeProjectName(query);
  const options: Option[] = [
    ...filterProjects(ordered, query).map((project): Option => ({ kind: 'pick', project })),
    ...(name && !findProjectByName(projects, name) ? [{ kind: 'create', name } as Option] : []),
    ...(current && !name ? [{ kind: 'clear' } as Option] : []),
  ];
  const active = Math.min(highlight, Math.max(0, options.length - 1));

  async function choose(option: Option) {
    if (option.kind === 'pick') await setItemProject(item.id, option.project.id, database);
    else if (option.kind === 'create') {
      const created = await createProject(option.name, database);
      await setItemProject(item.id, created.id, database);
    } else await setItemProject(item.id, undefined, database);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(options.length === 0 ? 0 : (active + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(options.length === 0 ? 0 : (active - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = options[active];
      if (option) void choose(option);
    }
  }

  const pillStyle = current
    ? ({ '--project': projectColor(current.colorIndex) } as CSSProperties)
    : undefined;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery('');
          setHighlight(0);
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={[ui.pill, ui.pillButton, styles.pill, current && styles.pillSet]
            .filter(Boolean)
            .join(' ')}
          style={pillStyle}
          aria-label={current ? `Project: ${current.name}. Change project` : 'Set a project'}
        >
          {current ? (
            <>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.pillName}>{current.name}</span>
            </>
          ) : (
            <>
              <TagIcon />
              project
            </>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={styles.content}
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          <input
            className={styles.search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={projects.length ? 'Find or create a project…' : 'Name a project…'}
            aria-label="Find or create a project"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              options[active] ? `${listId}-${optionKey(options[active])}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <ul id={listId} role="listbox" className={styles.list} aria-label="Projects">
            {options.map((option, index) => {
              const key = optionKey(option);
              const isActive = index === active;
              const cls = [styles.option, isActive && styles.optionActive]
                .filter(Boolean)
                .join(' ');
              return (
                <li
                  key={key}
                  id={`${listId}-${key}`}
                  role="option"
                  aria-selected={option.kind === 'pick' && option.project.id === current?.id}
                  className={cls}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => e.preventDefault()} // keep the input focused
                  onClick={() => void choose(option)}
                >
                  {option.kind === 'pick' && (
                    <>
                      <span
                        className={styles.optionDot}
                        style={{ background: projectColor(option.project.colorIndex) }}
                        aria-hidden="true"
                      />
                      <span className={styles.optionName}>{option.project.name}</span>
                      {option.project.id === current?.id && (
                        <span className={styles.tick} aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </>
                  )}
                  {option.kind === 'create' && (
                    <>
                      <span className={styles.plus} aria-hidden="true">
                        +
                      </span>
                      <span className={styles.optionName}>Create “{option.name}”</span>
                    </>
                  )}
                  {option.kind === 'clear' && (
                    <span className={`${styles.optionName} ${styles.clear}`}>No project</span>
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className={styles.empty}>Type a name to create a project</li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
