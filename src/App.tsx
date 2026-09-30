import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import styles from './App.module.css';
import { BulkAddDialog } from './components/BulkAddDialog';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { ItemPanel } from './components/ItemPanel';
import { PeopleMap } from './components/map/PeopleMap';
import { PersonDialog } from './components/PersonDialog';
import { PersonPanel } from './components/PersonPanel';
import { PersonView } from './components/PersonView';
import { RestoreDialog } from './components/RestoreDialog';
import { SearchResults } from './components/SearchResults';
import { Toast } from './components/Toast';
import { db } from './data/db';
import { createItem, ensureMapPositions } from './data/repository';
import { useUI } from './state/ui';

export default function App() {
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []);
  const items = useLiveQuery(() => db.items.toArray(), []);
  const view = useUI((s) => s.view);
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const selectedItemId = useUI((s) => s.selectedItemId);
  const personPanelOpen = useUI((s) => s.personPanelOpen);
  const search = useUI((s) => s.search);

  // Data from before positions were stored gets placed once, on startup.
  useEffect(() => {
    void ensureMapPositions();
    // Ask the browser not to evict our IndexedDB under storage pressure. Best effort.
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  // Latest people list for the keyboard handler, which is registered once.
  const peopleRef = useRef(people);
  useEffect(() => {
    peopleRef.current = people;
  }, [people]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Radix dialogs/menus call preventDefault() when they consume Escape; leave those alone.
      if (e.defaultPrevented) return;
      const inDialog = e.target instanceof Element && e.target.closest('[role="dialog"]') !== null;
      const ui = useUI.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape' && !inDialog && ui.dialog === null) {
        if (ui.selectedItemId) ui.selectItem(null);
        else if (ui.personPanelOpen) ui.closePanel();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        // ⌘⇧N: new task for the current person
        const current = peopleRef.current ?? [];
        const personId = current.some((p) => p.id === ui.selectedPersonId)
          ? ui.selectedPersonId
          : (current[0]?.id ?? null);
        if (!personId) return;
        e.preventDefault();
        void createItem({ personId, kind: 'task' }).then((item) =>
          useUI.getState().selectItem(item.id, personId),
        );
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        ui.openDialog({ type: 'person' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!people || !items) return null;

  const activePersonId = people.some((p) => p.id === selectedPersonId)
    ? selectedPersonId
    : (people[0]?.id ?? null);
  const showSearch = search.trim().length > 0;
  const isMap = view === 'map' && !showSearch && people.length > 0;

  let main;
  if (showSearch) main = <SearchResults query={search} />;
  else if (people.length === 0) main = <EmptyState />;
  else if (view === 'map') main = <PeopleMap people={people} items={items} />;
  else if (activePersonId) main = <PersonView personId={activePersonId} />;

  let aside = null;
  if (selectedItemId) aside = <ItemPanel itemId={selectedItemId} />;
  else if (view === 'map' && personPanelOpen && activePersonId)
    aside = <PersonPanel personId={activePersonId} />;

  return (
    <div className={styles.app}>
      <Header />
      <div className={styles.body}>
        <main className={isMap ? styles.mainMap : styles.main}>{main}</main>
        {aside && <aside className={styles.aside}>{aside}</aside>}
      </div>
      <PersonDialog />
      <BulkAddDialog />
      <RestoreDialog />
      <Toast />
    </div>
  );
}
