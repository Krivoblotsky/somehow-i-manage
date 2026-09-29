import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DialogState =
  { type: 'person'; personId?: string } | { type: 'bulk'; personId: string } | null;

interface UIState {
  selectedPersonId: string | null;
  selectedItemId: string | null;
  search: string;
  dialog: DialogState;
  selectPerson: (id: string | null) => void;
  selectItem: (id: string | null, personId?: string) => void;
  setSearch: (query: string) => void;
  openDialog: (dialog: Exclude<DialogState, null>) => void;
  closeDialog: () => void;
}

/** Transient UI state. Selection survives reloads; nothing here is user data. */
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      selectedPersonId: null,
      selectedItemId: null,
      search: '',
      dialog: null,
      selectPerson: (id) => set({ selectedPersonId: id, selectedItemId: null }),
      selectItem: (id, personId) =>
        set((s) => ({ selectedItemId: id, selectedPersonId: personId ?? s.selectedPersonId })),
      setSearch: (search) => set({ search }),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: null }),
    }),
    {
      name: 'personal.ui',
      partialize: (s) => ({
        selectedPersonId: s.selectedPersonId,
        selectedItemId: s.selectedItemId,
      }),
    },
  ),
);
