import { registerSW } from 'virtual:pwa-register';
import { useToast } from './state/toast';

/**
 * Registers the service worker and, when a new build is waiting, says so with a Reload action
 * instead of swapping versions behind the user's back on the next launch.
 */
export function registerUpdates(): void {
  const update = registerSW({
    onNeedRefresh() {
      useToast.getState().show('A new version is ready.', {
        actionLabel: 'Reload',
        onAction: () => void update(true),
        durationMs: 10 * 60_000,
      });
    },
    onOfflineReady() {
      useToast.getState().show('Ready to work offline.');
    },
  });
}
