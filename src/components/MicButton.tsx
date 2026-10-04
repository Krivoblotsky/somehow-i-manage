import { MicIcon } from './icons';
import styles from './MicButton.module.css';

/** The mic in a text field: press to dictate, press again to stop; pulses while listening. */
export function MicButton({
  listening,
  onToggle,
  what,
}: {
  listening: boolean;
  onToggle: () => void;
  /** What gets dictated, for the label: "a task", "a note". */
  what: string;
}) {
  return (
    <button
      type="button"
      className={listening ? `${styles.mic} ${styles.listening}` : styles.mic}
      onClick={onToggle}
      aria-pressed={listening}
      aria-label={listening ? 'Stop dictating' : `Dictate ${what}`}
      title={listening ? 'Stop' : `Dictate ${what}`}
    >
      <MicIcon size={16} />
    </button>
  );
}
