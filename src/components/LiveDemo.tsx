import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { DatabaseProvider, type DatabaseScope } from '../data/DatabaseContext';
import { PersonalDB } from '../data/db';
import { loadSampleData } from '../data/seed';
import { useUI } from '../state/ui';
import styles from './LiveDemo.module.css';
import { PeopleMap } from './map/PeopleMap';

/** A throwaway database for the landing page, reset to the sample team on every visit. */
const demoDb = new PersonalDB('demo');
const DEMO_SCOPE: DatabaseScope = { db: demoDb, demo: true };
const DEMO_FOCUS = 'James Patel';

let resetting: Promise<void> | null = null;

/** Clears and reseeds once, even when two mounts ask at the same time (StrictMode rehearses). */
function resetDemo(): Promise<void> {
  resetting ??= (async () => {
    await demoDb.transaction('rw', [demoDb.people, demoDb.items, demoDb.outbox], async () => {
      await Promise.all([demoDb.people.clear(), demoDb.items.clear(), demoDb.outbox.clear()]);
    });
    await loadSampleData(demoDb);
  })().finally(() => {
    resetting = null;
  });
  return resetting;
}

/** The real People Map, live, with the sample team — the "try" before the "go". */
export default function LiveDemo() {
  const [ready, setReady] = useState(false);
  const people = useLiveQuery(() => demoDb.people.orderBy('sortOrder').toArray(), []);
  const items = useLiveQuery(() => demoDb.items.toArray(), []);
  const closePanel = useUI((s) => s.closePanel);

  useEffect(() => {
    let cancelled = false;
    void resetDemo().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
      closePanel(); // leave no demo selection behind for the real app
    };
  }, [closePanel]);

  // The workspace's keyboard handler is not mounted here; Esc still clears the spotlight.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closePanel]);

  if (!ready || !people || !items) return <div className={styles.loading} aria-busy="true" />;

  return (
    <DatabaseProvider value={DEMO_SCOPE}>
      <div className={styles.frame} data-testid="live-demo">
        <PeopleMap
          people={people}
          items={items}
          // the person in the middle of the sample grid, so the rest show as markers all around
          focusPersonId={(people.find((p) => p.name === DEMO_FOCUS) ?? people[0])?.id}
        />
        <div className={styles.hints} aria-label="Things to try">
          <span className={styles.hint}>
            <b>Try</b> tick a task
          </span>
          <span className={styles.hint}>drag a card onto someone else</span>
          <span className={styles.hint}>press + on a person</span>
        </div>
      </div>
    </DatabaseProvider>
  );
}
