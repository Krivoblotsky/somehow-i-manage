import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DialogState =
  | { type: 'person'; personId?: string }
  | { type: 'bulk'; personId: string }
  | { type: 'restore' }
  | { type: 'palette' }
  | null;

export type ViewMode = 'map' | 'list';

interface UIState {
  view: ViewMode;
  selectedPersonId: string | null;
  selectedItemId: string | null;
  /** Map view only: show the selected person's details in the side panel. */
  personPanelOpen: boolean;
  /** Ask the map to bring this person's cluster into view. nonce makes repeats distinct. */
  focusRequest: { personId: string; nonce: number } | null;
  search: string;
  dialog: DialogState;
  /** Card whose title is being edited in place on the map. isNew: created moments ago, empty. */
  editingItem: { id: string; isNew: boolean } | null;
  startEditing: (id: string, isNew: boolean) => void;
  /** Ends in-place editing. With an id, only if that card is still the one being edited. */
  stopEditing: (id?: string) => void;
  setView: (view: ViewMode) => void;
  selectPerson: (id: string | null) => void;
  selectItem: (id: string | null, personId?: string) => void;
  closePanel: () => void;
  focusPerson: (personId: string) => void;
  setSearch: (query: string) => void;
  openDialog: (dialog: Exclude<DialogState, null>) => void;
  closeDialog: () => void;
}

/** Transient UI state. View and selection survive reloads; nothing here is user data. */
export const useUI = create<UIState>()(
  persist(
    (set) => ({
      view: 'map',
      selectedPersonId: null,
      selectedItemId: null,
      personPanelOpen: false,
      focusRequest: null,
      search: '',
      dialog: null,
      editingItem: null,
      startEditing: (id, isNew) => set({ editingItem: { id, isNew } }),
      stopEditing: (id) =>
        set((s) => (id !== undefined && s.editingItem?.id !== id ? {} : { editingItem: null })),
      setView: (view) => set({ view }),
      selectPerson: (id) =>
        set({ selectedPersonId: id, selectedItemId: null, personPanelOpen: id !== null }),
      selectItem: (id, personId) =>
        set((s) => ({ selectedItemId: id, selectedPersonId: personId ?? s.selectedPersonId })),
      closePanel: () => set({ selectedItemId: null, personPanelOpen: false }),
      focusPerson: (personId) => set({ focusRequest: { personId, nonce: Date.now() } }),
      setSearch: (search) => set({ search }),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: null }),
    }),
    {
      name: 'personal.ui',
      partialize: (s) => ({
        view: s.view,
        selectedPersonId: s.selectedPersonId,
        selectedItemId: s.selectedItemId,
      }),
    },
  ),
);
