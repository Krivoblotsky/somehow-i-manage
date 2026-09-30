import { useToast } from '../state/toast';
import styles from './Toast.module.css';

export function Toast() {
  const toast = useToast((s) => s.toast);
  const dismiss = useToast((s) => s.dismiss);
  if (!toast) return null;
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.message}>{toast.message}</span>
      {toast.actionLabel && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.onAction?.();
            dismiss();
          }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
