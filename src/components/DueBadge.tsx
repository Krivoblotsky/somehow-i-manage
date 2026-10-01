import { describeDue, formatDateTime } from '../model/format';
import styles from './DueBadge.module.css';

/** "Due Fri" on a card or row; red once the day has passed. */
export function DueBadge({
  dueDate,
  now,
  className,
}: {
  dueDate: number;
  now: number;
  className?: string;
}) {
  const { label, overdue } = describeDue(dueDate, now);
  const cls = [styles.due, overdue && styles.overdue, className].filter(Boolean).join(' ');
  return (
    <span className={cls} title={formatDateTime(dueDate)}>
      {label}
    </span>
  );
}
