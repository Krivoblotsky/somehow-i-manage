import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import styles from './App.module.css';
import { BulkAddDialog } from './components/BulkAddDialog';
import { CommandPalette } from './components/CommandPalette';
import { EmptyState } from './components/EmptyState';
import { FeedbackPrompts } from './components/FeedbackPrompts';
import { Header } from './components/Header';
import { ItemPanel } from './components/ItemPanel';
import { OneOnOne } from './components/OneOnOne';
import { Pane } from './components/Pane';
import { PeopleMap } from './components/map/PeopleMap';
import { PersonDialog } from './components/PersonDialog';
import { PersonPanel } from './components/PersonPanel';
import { PersonView } from './components/PersonView';
import { ProjectPanel } from './components/ProjectPanel';
import { RestoreDialog } from './components/RestoreDialog';
import { SearchResults } from './components/SearchResults';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SyncDialog } from './components/SyncDialog';
import { db } from './data/db';
import { createItem, ensureMapPositions } from './data/repository';
import { useUI } from './state/ui';

/** The app proper, for a signed-in account. Loaded lazily so the landing page stays light. */
export default function Workspace() {
  const people = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []);
  const items = useLiveQuery(() => db.items.toArray(), []);
  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const view = useUI((s) => s.view);
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const selectedItemId = useUI((s) => s.selectedItemId);
  const personPanelOpen = useUI((s) => s.personPanelOpen);
  const search = useUI((s) => s.search);
  const meeting = useUI((s) => s.meeting);
  const projectFocusId = useUI((s) => s.projectFocusId);

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
      const target = e.target instanceof Element ? e.target : null;
      const inDialog = target?.closest('[role="dialog"]') !== null && target !== null;
      const typing =
        target !== null && target.closest('input, textarea, [contenteditable="true"]') !== null;
      const ui = useUI.getState();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        // ⌘K toggles the palette; other dialogs stay untouched
        if (ui.dialog === null) {
          e.preventDefault();
          ui.openDialog({ type: 'palette' });
        } else if (ui.dialog.type === 'palette') {
          e.preventDefault();
          ui.closeDialog();
        }
      } else if (e.key === 'Escape' && !inDialog && ui.dialog === null) {
        if (ui.selectedItemId) ui.selectItem(null);
        else if (ui.personPanelOpen) ui.closePanel();
        else if (ui.projectFocusId !== null) ui.focusProject(null);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'n') {
        // ⌘⇧N: new task with the current person
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
      } else if (
        (e.key === '?' || (e.key === '/' && e.shiftKey)) &&
        !typing &&
        !inDialog &&
        ui.dialog === null
      ) {
        e.preventDefault();
        ui.openDialog({ type: 'shortcuts' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // A 1:1 with someone who no longer exists cannot continue.
  useEffect(() => {
    if (meeting && people && !people.some((p) => p.id === meeting.personId)) {
      useUI.getState().endMeeting();
    }
  }, [meeting, people]);

  // A lit project that was deleted (here or on another device) goes dark.
  useEffect(() => {
    if (projectFocusId && projects && !projects.some((p) => p.id === projectFocusId)) {
      useUI.getState().focusProject(null);
    }
  }, [projectFocusId, projects]);

  if (!people || !items) return null;

  const runningMeeting = meeting && people.some((p) => p.id === meeting.personId) ? meeting : null;
  const activePersonId = people.some((p) => p.id === selectedPersonId)
    ? selectedPersonId
    : (people[0]?.id ?? null);
  const showSearch = search.trim().length > 0;
  const isMap = view === 'map' && !showSearch && people.length > 0;

  let main;
  if (showSearch) main = <SearchResults query={search} />;
  else if (people.length === 0) main = <EmptyState />;
  else if (view === 'meeting' && runningMeeting) main = <OneOnOne meeting={runningMeeting} />;
  else if (view === 'map')
    main = <PeopleMap people={people} items={items} projects={projects ?? []} />;
  else if (activePersonId) main = <PersonView personId={activePersonId} />;

  let aside = null;
  // The most specific thing wins: an open item, then a person, then the lit project.
  // Only for records that still exist: an empty panel wrapper would sit over the main area.
  if (selectedItemId && items.some((i) => i.id === selectedItemId))
    aside = <ItemPanel itemId={selectedItemId} />;
  else if (view === 'map' && personPanelOpen && activePersonId)
    aside = <PersonPanel personId={activePersonId} />;
  else if (view === 'map' && projectFocusId && projects?.some((p) => p.id === projectFocusId))
    aside = <ProjectPanel projectId={projectFocusId} />;

  return (
    <div className={styles.app}>
      <Header />
      <div className={styles.body}>
        <main
          className={
            isMap ? styles.mainMap : aside ? `${styles.main} ${styles.mainWithPane}` : styles.main
          }
        >
          {main}
        </main>
        <Pane className={styles.aside} closingClassName={styles.asideClosing}>
          {aside}
        </Pane>
      </div>
      <PersonDialog />
      <BulkAddDialog />
      <RestoreDialog />
      <SyncDialog />
      <ShortcutsDialog />
      <CommandPalette />
      <FeedbackPrompts />
    </div>
  );
}
