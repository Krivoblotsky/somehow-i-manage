import { loadSampleData } from '../data/seed';
import { useUI } from '../state/ui';
import styles from './EmptyState.module.css';
import ui from './ui.module.css';

export function EmptyState() {
  const openDialog = useUI((s) => s.openDialog);
  return (
    <div className={styles.empty}>
      <div className={styles.big}>Work with people, not tasks.</div>
      <p className={styles.text}>
        Add your first person — a direct report, a peer, a client — and start collecting everything
        you need to do with them: tasks and notes, gathered around their name.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.btnPrimary}
          onClick={() => openDialog({ type: 'person' })}
        >
          Add a person
        </button>
        <button type="button" className={ui.btn} onClick={() => void loadSampleData()}>
          Load sample data
        </button>
      </div>
    </div>
  );
}
