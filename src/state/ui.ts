import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DialogState =
  | { type: 'person'; personId?: string }
  | { type: 'bulk'; personId: string }
  | { type: 'restore' }
  | { type: 'palette' }
  | { type: 'sync' }
  | { type: 'shortcuts' }
  | null;

/** Map, list, or the screen of the 1:1 that is running. */
export type ViewMode = 'map' | 'list' | 'meeting';

/**
 * Where the open panel was opened from, so its Back goes there: the pane behaves like a stack.
 * `item`: the item panel came from the person's panel, from the project's page, or from
 * neither (then Back goes to the person). `person`: the person panel came from the project's page.
 */
export interface PaneFrom {
  item: 'person' | 'project' | null;
  person: 'project' | null;
}
const NOWHERE: PaneFrom = { item: null, person: null };

/** A 1:1 that is running right now. Survives reloads; only the user ends it. */
export interface ActiveMeeting {
  personId: string;
  startedAt: number;
  /** Where to go back to when it ends. */
  returnView: 'map' | 'list';
}

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
  meeting: ActiveMeeting | null;
  /** The first-run tips island on the map was closed. */
  tipsDismissed: boolean;
  /** Map: spotlight one project; everything outside it steps back. null = show all. */
  projectFocusId: string | null;
  paneFrom: PaneFrom;
  dismissTips: () => void;
  focusProject: (id: string | null) => void;
  startEditing: (id: string, isNew: boolean) => void;
  /** Ends in-place editing. With an id, only if that card is still the one being edited. */
  stopEditing: (id?: string) => void;
  /** Opens the 1:1 screen for this person, with the clock started at `startedAt`. */
  startMeeting: (personId: string, startedAt: number) => void;
  /** Forgets the running 1:1 and goes back to where it was started from. Record it first. */
  endMeeting: () => void;
  setView: (view: ViewMode) => void;
  /** `from`: what the panel replaces; left out, it is worked out from what is showing now. */
  selectPerson: (id: string | null, from?: PaneFrom['person']) => void;
  selectItem: (id: string | null, personId?: string, from?: PaneFrom['item']) => void;
  closePanel: () => void;
  focusPerson: (personId: string) => void;
  setSearch: (query: string) => void;
  openDialog: (dialog: Exclude<DialogState, null>) => void;
  closeDialog: () => void;
}

/**
 * The person the map should spotlight: whoever's panel or card is open. null = nobody, show all.
 * Everyone else's hubs, cards and edges fade while this is set.
 */
export const selectFocusPersonId = (s: {
  personPanelOpen: boolean;
  selectedItemId: string | null;
  selectedPersonId: string | null;
}): string | null => (s.personPanelOpen || s.selectedItemId !== null ? s.selectedPersonId : null);

/** Transient UI state. View, selection and the running 1:1 survive reloads; nothing here is user data. */
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
      meeting: null,
      tipsDismissed: false,
      projectFocusId: null,
      paneFrom: NOWHERE,
      dismissTips: () => set({ tipsDismissed: true }),
      focusProject: (id) => set({ projectFocusId: id }),
      startEditing: (id, isNew) => set({ editingItem: { id, isNew } }),
      stopEditing: (id) =>
        set((s) => (id !== undefined && s.editingItem?.id !== id ? {} : { editingItem: null })),
      startMeeting: (personId, startedAt) =>
        set((s) => ({
          meeting: {
            personId,
            startedAt,
            returnView: s.view === 'meeting' ? (s.meeting?.returnView ?? 'list') : s.view,
          },
          view: 'meeting',
          selectedPersonId: personId,
          selectedItemId: null,
          personPanelOpen: false,
          paneFrom: NOWHERE,
          search: '',
        })),
      endMeeting: () =>
        set((s) => ({
          meeting: null,
          view: s.view === 'meeting' ? (s.meeting?.returnView ?? 'list') : s.view,
        })),
      setView: (view) => set({ view }),
      selectPerson: (id, from) =>
        set((s) => ({
          selectedPersonId: id,
          selectedItemId: null,
          personPanelOpen: id !== null,
          paneFrom: {
            item: null,
            // opened over the project's page (no person panel yet): Back returns to it
            person:
              id === null
                ? null
                : (from ?? (s.projectFocusId !== null && !s.personPanelOpen ? 'project' : null)),
          },
        })),
      selectItem: (id, personId, from) =>
        set((s) => ({
          selectedItemId: id,
          selectedPersonId: personId ?? s.selectedPersonId,
          paneFrom: {
            ...s.paneFrom,
            item:
              id === null
                ? null
                : (from ??
                  (s.personPanelOpen ? 'person' : s.projectFocusId !== null ? 'project' : null)),
          },
        })),
      closePanel: () => set({ selectedItemId: null, personPanelOpen: false, paneFrom: NOWHERE }),
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
        meeting: s.meeting,
        tipsDismissed: s.tipsDismissed,
      }),
    },
  ),
);
