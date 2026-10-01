import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { useUI, type ViewMode } from '../state/ui';
import { Avatar } from './Avatar';
import styles from './Header.module.css';
import { SearchIcon } from './icons';
import { UserMenu } from './UserMenu';

export function Header() {
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []) ?? [];
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const meeting = useUI((s) => s.meeting);
  const search = useUI((s) => s.search);
  const setSearch = useUI((s) => s.setSearch);
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const selectPerson = useUI((s) => s.selectPerson);
  const focusPerson = useUI((s) => s.focusPerson);
  const openDialog = useUI((s) => s.openDialog);

  function pickPerson(id: string) {
    setSearch('');
    selectPerson(id);
    if (view === 'map') focusPerson(id);
    // During a 1:1, someone else's avatar opens their dossier; the 1:1 keeps running.
    if (view === 'meeting') setView(meeting?.personId === id ? 'meeting' : 'list');
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.title}>Somehow I Manage</div>
        <div className={styles.subtitle}>Work with people, not tasks</div>
      </div>

      <div className={styles.tools}>
        <ViewToggle view={view} onChange={setView} />
        {meeting && view !== 'meeting' && (
          <button
            type="button"
            className={styles.meetingPill}
            onClick={() => setView('meeting')}
            title="Back to the running 1:1"
          >
            <span className={styles.liveDot} aria-hidden="true" />
            1:1 with {people.find((p) => p.id === meeting.personId)?.name ?? '…'}
          </button>
        )}

        <label className={styles.search}>
          <SearchIcon />
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search people, tasks and notes"
          />
          <button
            type="button"
            className={styles.kbd}
            onClick={(e) => {
              e.preventDefault();
              openDialog({ type: 'palette' });
            }}
            title="Command palette (⌘K)"
            aria-label="Open command palette"
          >
            ⌘K
          </button>
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

        <UserMenu />
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
