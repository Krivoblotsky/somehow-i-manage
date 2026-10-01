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
        Add your first person — a direct report, a peer, a client. Everything you need to do with
        them gathers around their name.
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
          Try with sample data
        </button>
      </div>
      <ol className={styles.steps} aria-label="How it works">
        <li>
          <b>Add people</b>
          <span>you keep things in mind for</span>
        </li>
        <li>
          <b>Capture</b>
          <span>as it happens — type a line, hit ⌘K, paste a list</span>
        </li>
        <li>
          <b>Run your 1:1s</b>
          <span>from their page, prepared</span>
        </li>
      </ol>
    </div>
  );
}
