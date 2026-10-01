import { useUI } from '../../state/ui';
import styles from './MapTips.module.css';

/** First-run island at the bottom of the map: the three things that are not obvious. "Got it" hides it for good. */
export function MapTips() {
  const dismissed = useUI((s) => s.tipsDismissed);
  const dismiss = useUI((s) => s.dismissTips);
  if (dismissed) return null;
  return (
    <div className={styles.tips} role="note" aria-label="Tips">
      <span className={styles.label}>Tips</span>
      <span>Drag a card onto a person to hand it over</span>
      <span className={styles.dot} aria-hidden="true">
        ·
      </span>
      <span>Right-click anything for more</span>
      <span className={styles.dot} aria-hidden="true">
        ·
      </span>
      <span>
        <kbd>⌘K</kbd> finds anyone or anything
      </span>
      <button type="button" className={styles.gotIt} onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
