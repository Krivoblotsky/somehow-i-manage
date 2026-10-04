import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { db } from '../data/db';
import { deleteProject, renameProject } from '../data/repository';
import { groupItems } from '../model/derive';
import { contrastText } from '../model/palette';
import { describeProjectCount, projectColor, projectCounts } from '../model/projects';
import type { Item, Person } from '../model/types';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import { TagIcon } from './icons';
import menu from './menu.module.css';
import { PanelItemRow } from './PersonPanel';
import panel from './PersonPanel.module.css';
import styles from './ProjectPanel.module.css';
import ui from './ui.module.css';

/**
 * Side panel for the lit project: everything tagged with it, grouped by the person it is with.
 * Rows open the item; a person's name opens them. Closing it turns the spotlight off.
 */
export function ProjectPanel({ projectId }: { projectId: string }) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []);
  const items = useLiveQuery(
    () => db.items.filter((i) => i.projectId === projectId).toArray(),
    [projectId],
  );
  const selectedItemId = useUI((s) => s.selectedItemId);
  const selectItem = useUI((s) => s.selectItem);
  const selectPerson = useUI((s) => s.selectPerson);
  const focusProject = useUI((s) => s.focusProject);
  const [renaming, setRenaming] = useState(false);

  if (!project || !people || !items) return null;

  const accent = projectColor(project.colorIndex);
  const count = projectCounts(items).get(project.id);
  const groups = people
    .map((person) => ({ person, items: items.filter((i) => i.personId === person.id) }))
    .filter((g) => g.items.length > 0);
  const who =
    groups.length === 0 ? '' : ` · ${groups.length} ${groups.length === 1 ? 'person' : 'people'}`;

  async function remove() {
    const n = items?.length ?? 0;
    const tail = n ? ` Its ${n} item${n === 1 ? ' stays' : 's stay'}, without the tag.` : '';
    if (!window.confirm(`Delete the project “${project?.name}”?${tail}`)) return;
    focusProject(null);
    await deleteProject(projectId);
  }

  return (
    <section
      className={panel.panel}
      aria-label="Project details"
      style={{ '--accent': accent, '--accent-text': contrastText(accent) } as CSSProperties}
    >
      <div className={panel.head}>
        <span className={styles.swatch} aria-hidden="true">
          <TagIcon size={24} />
        </span>
        <div className={panel.headText}>
          {renaming ? (
            <RenameField
              name={project.name}
              onDone={async (name) => {
                setRenaming(false);
                if (name && name !== project.name) await renameProject(projectId, name);
              }}
            />
          ) : (
            <h2 className={panel.name}>{project.name}</h2>
          )}
          <div className={panel.meta}>
            {describeProjectCount(count)}
            {who}
          </div>
        </div>
      </div>

      <div className={panel.actions}>
        <button type="button" className={ui.chip} onClick={() => setRenaming(true)}>
          Rename
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={ui.chip}
              aria-label={`More for ${project.name}`}
              title="More"
            >
              ⋯
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={menu.menu} align="end" sideOffset={6}>
              <DropdownMenu.Item
                className={`${menu.item} ${menu.danger}`}
                onSelect={() => void remove()}
              >
                Delete project
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className={panel.list}>
        {groups.length === 0 && (
          <div className={panel.empty}>
            Nothing carries this project yet. Tag a task or note from its panel, or right-click one.
          </div>
        )}
        {groups.map((group) => (
          <PersonGroup
            key={group.person.id}
            person={group.person}
            items={group.items}
            selectedItemId={selectedItemId}
            onOpenPerson={() => selectPerson(group.person.id, 'project')}
            onOpenItem={(item) => selectItem(item.id, item.personId, 'project')}
          />
        ))}
      </div>

      <button
        type="button"
        className={panel.close}
        aria-label="Close"
        title="Close (Esc)"
        onClick={() => focusProject(null)}
      >
        ×
      </button>
    </section>
  );
}

function PersonGroup({
  person,
  items,
  selectedItemId,
  onOpenPerson,
  onOpenItem,
}: {
  person: Person;
  items: Item[];
  selectedItemId: string | null;
  onOpenPerson: () => void;
  onOpenItem: (item: Item) => void;
}) {
  const { openTasks, notes, completed } = groupItems(items);
  return (
    <section aria-label={`With ${person.name}`}>
      <button
        type="button"
        className={styles.group}
        onClick={onOpenPerson}
        aria-label={`Open ${person.name}`}
        title={`Open ${person.name}`}
      >
        <Avatar person={person} size={24} ring={2} gapColor="#fff" />
        <span className={styles.groupName}>{person.name}</span>
        <span className={styles.groupCount}>{items.length}</span>
      </button>
      {[...openTasks, ...notes, ...completed].map((item) => (
        <PanelItemRow
          key={item.id}
          item={item}
          selected={item.id === selectedItemId}
          showProject={false}
          onSelect={() => onOpenItem(item)}
        />
      ))}
    </section>
  );
}

/** The name as an input, in place. Enter or clicking away saves; Escape cancels. */
function RenameField({
  name,
  onDone,
}: {
  name: string;
  onDone: (name: string | null) => void | Promise<void>;
}) {
  const [value, setValue] = useState(name);
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void onDone(value.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      void onDone(null);
    }
  }
  return (
    <input
      className={styles.rename}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => void onDone(value.trim())}
      aria-label="Project name"
      autoFocus
    />
  );
}
