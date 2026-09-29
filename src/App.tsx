import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import styles from './App.module.css';
import { BulkAddDialog } from './components/BulkAddDialog';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { ItemPanel } from './components/ItemPanel';
import { PersonDialog } from './components/PersonDialog';
import { PersonView } from './components/PersonView';
import { SearchResults } from './components/SearchResults';
import { db } from './data/db';
import { useUI } from './state/ui';

export default function App() {
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []);
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const selectedItemId = useUI((s) => s.selectedItemId);
  const search = useUI((s) => s.search);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Radix dialogs/menus call preventDefault() when they consume Escape; leave those alone.
      if (e.defaultPrevented) return;
      const inDialog = e.target instanceof Element && e.target.closest('[role="dialog"]') !== null;
      const ui = useUI.getState();
      if (e.key === 'Escape' && !inDialog && ui.dialog === null && ui.selectedItemId) {
        ui.selectItem(null);
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        ui.openDialog({ type: 'person' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!people) return null;

  const activePersonId = people.some((p) => p.id === selectedPersonId)
    ? selectedPersonId
    : (people[0]?.id ?? null);
  const showSearch = search.trim().length > 0;

  return (
    <div className={styles.app}>
      <Header />
      <div className={styles.body}>
        <main className={styles.main}>
          {showSearch ? (
            <SearchResults query={search} />
          ) : people.length === 0 ? (
            <EmptyState />
          ) : activePersonId ? (
            <PersonView personId={activePersonId} />
          ) : null}
        </main>
        {selectedItemId && (
          <aside className={styles.aside}>
            <ItemPanel itemId={selectedItemId} />
          </aside>
        )}
      </div>
      <PersonDialog />
      <BulkAddDialog />
    </div>
  );
}
