import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toast: Toast | null;
  show: (
    message: string,
    options?: { actionLabel?: string; onAction?: () => void; durationMs?: number },
  ) => void;
  dismiss: () => void;
}

const DEFAULT_DURATION_MS = 6000;
let timer: ReturnType<typeof setTimeout> | undefined;

/** One transient message at a time, e.g. "Deleted X · Undo". A new one replaces the old. */
export const useToast = create<ToastState>()((set) => ({
  toast: null,
  show: (message, options) => {
    clearTimeout(timer);
    const id = Date.now();
    set({ toast: { id, message, actionLabel: options?.actionLabel, onAction: options?.onAction } });
    timer = setTimeout(
      () => set((s) => (s.toast?.id === id ? { toast: null } : s)),
      options?.durationMs ?? DEFAULT_DURATION_MS,
    );
  },
  dismiss: () => {
    clearTimeout(timer);
    set({ toast: null });
  },
}));
