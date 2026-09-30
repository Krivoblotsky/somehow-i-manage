import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { allToMarkdown } from '../data/export';
import { clearAllData } from '../data/repository';
import { loadSampleData } from '../data/seed';
import { useUI, type ViewMode } from '../state/ui';
import { Avatar } from './Avatar';
import styles from './Header.module.css';
import { SearchIcon } from './icons';
import menu from './menu.module.css';

export function Header() {
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []) ?? [];
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const search = useUI((s) => s.search);
  const setSearch = useUI((s) => s.setSearch);
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const selectPerson = useUI((s) => s.selectPerson);
  const focusPerson = useUI((s) => s.focusPerson);
  const openDialog = useUI((s) => s.openDialog);

  async function exportAll() {
    const [allPeople, items] = await Promise.all([
      db.people.orderBy('sortOrder').toArray(),
      db.items.toArray(),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`personal-${stamp}.md`, allToMarkdown(allPeople, items));
  }

  async function deleteAll() {
    if (window.confirm('Delete ALL people and items? This cannot be undone.')) {
      await clearAllData();
      selectPerson(null);
    }
  }

  function pickPerson(id: string) {
    setSearch('');
    selectPerson(id);
    if (view === 'map') focusPerson(id);
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.title}>Personal.app</div>
        <div className={styles.subtitle}>Work with people, not tasks</div>
      </div>

      <div className={styles.tools}>
        <ViewToggle view={view} onChange={setView} />

        <label className={styles.search}>
          <SearchIcon />
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search people, tasks and notes"
          />
        </label>

        <button
          type="button"
          className={styles.round}
          onClick={() => openDialog({ type: 'person' })}
          title="Add person (⌘N)"
          aria-label="Add person"
        >
          +
        </button>

        <div className={styles.people} aria-label="People">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              className={
                p.id === selectedPersonId
                  ? `${styles.personBtn} ${styles.personBtnActive}`
                  : styles.personBtn
              }
              onClick={() => pickPerson(p.id)}
              title={p.name}
              aria-label={p.name}
              aria-pressed={p.id === selectedPersonId}
            >
              <Avatar person={p} size={40} />
            </button>
          ))}
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className={styles.round} aria-label="More actions">
              ⋯
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={menu.menu} align="end" sideOffset={8}>
              <DropdownMenu.Item className={menu.item} onSelect={() => void loadSampleData()}>
                Load sample data
              </DropdownMenu.Item>
              <DropdownMenu.Item className={menu.item} onSelect={() => void exportAll()}>
                Export everything as Markdown
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={menu.separator} />
              <DropdownMenu.Item
                className={`${menu.item} ${menu.danger}`}
                onSelect={() => void deleteAll()}
              >
                Delete all data…
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className={styles.view} role="group" aria-label="View">
      {(['map', 'list'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          className={view === mode ? styles.viewBtnOn : styles.viewBtn}
          aria-pressed={view === mode}
          onClick={() => onChange(mode)}
        >
          {mode === 'map' ? 'Map' : 'List'}
        </button>
      ))}
    </div>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
