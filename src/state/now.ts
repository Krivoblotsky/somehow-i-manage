import { useSyncExternalStore } from 'react';

/**
 * The current time, refreshed every half minute while something is showing it. Reading
 * Date.now() during render is impure; this keeps "12 min" and "3 days ago" ticking honestly.
 */
const TICK_MS = 30_000;
const listeners = new Set<() => void>();
let current = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      listeners.forEach((fn) => fn());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => current;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
