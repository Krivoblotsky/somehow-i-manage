import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true from the first client render after it. Lets a
 * component render the pre-rendered markup first and swap in browser-only parts without a
 * hydration mismatch (and without the "switched to client rendering" error a suspended lazy
 * boundary would raise).
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
