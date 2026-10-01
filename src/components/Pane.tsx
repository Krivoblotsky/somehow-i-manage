import { useEffect, useState, type ReactNode } from 'react';

/** Keep in step with the aside-in / aside-out keyframes in App.module.css. */
const SLIDE_MS = 280;

/**
 * The side pane's wrapper, with an entrance and an exit. Content slides in when the pane first
 * appears, swaps in place while the pane stays open, and slides out when it goes away: the
 * last content stays mounted for the length of the exit animation.
 */
export function Pane({
  children,
  className,
  closingClassName,
}: {
  children: ReactNode | null;
  className: string;
  closingClassName: string;
}) {
  const [shown, setShown] = useState<ReactNode>(children);
  // Adjusting state during render, so new content shows in the same pass (no effect, no flash).
  if (children != null && children !== shown) setShown(children);
  const closing = children == null && shown != null;

  useEffect(() => {
    if (!closing) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const t = setTimeout(() => setShown(null), reduce ? 0 : SLIDE_MS);
    return () => clearTimeout(t);
  }, [closing]);

  if (shown == null) return null;
  return (
    <aside className={closing ? `${className} ${closingClassName}` : className}>{shown}</aside>
  );
}
