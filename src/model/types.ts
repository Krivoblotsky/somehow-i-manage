export type ItemKind = 'task' | 'note';

/** A point on the People Map, in canvas units. */
export interface MapPosition {
  x: number;
  y: number;
}

/** The root object of the app. Everything hangs off a person. */
export interface Person {
  id: string;
  name: string;
  /** Optional job title or relationship ("iOS Engineer", "Client"). */
  role?: string;
  /** Index into PERSON_PALETTE. */
  colorIndex: number;
  /** Small square JPEG/PNG as a data URL; undefined = initials. */
  avatarDataUrl?: string;
  /** Top-left of the person's node on the map; undefined = automatic layout. */
  mapPosition?: MapPosition;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** A task or a note that belongs to exactly one person. */
export interface Item {
  id: string;
  personId: string;
  kind: ItemKind;
  title: string;
  /** HTML produced by the editor. '' when empty. */
  body: string;
  isCompleted: boolean;
  completedAt?: number;
  /** "urgent" in the design. */
  isFlagged: boolean;
  dueDate?: number;
  /** Position relative to the owner's node on the map; undefined = automatic ring layout. */
  mapPosition?: MapPosition;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}
