export type ItemKind = 'task' | 'note';

export type ContactKind =
  'email' | 'phone' | 'slack' | 'telegram' | 'linkedin' | 'github' | 'x' | 'website';

/** One way to reach a person. Handles may be stored with or without the leading "@". */
export interface Contact {
  kind: ContactKind;
  value: string;
}

/** Where the avatar image came from; decides whether a new email may replace it. */
export type AvatarSource = 'upload' | 'gravatar';

/** A point on the People Map, in canvas units. */
export interface MapPosition {
  x: number;
  y: number;
}

/** One finished 1:1. Kept on the person so history travels with backups and, later, sync. */
export interface Meeting {
  startedAt: number;
  endedAt: number;
}

/** The root object of the app. Everything hangs off a person. */
export interface Person {
  id: string;
  name: string;
  /** Optional job title or relationship ("iOS Engineer", "Client"). */
  role?: string;
  /** Index into PERSON_PALETTE. */
  colorIndex: number;
  /** Small square image as a data URL (or an https URL); undefined = initials. */
  avatarDataUrl?: string;
  avatarSource?: AvatarSource;
  contacts?: Contact[];
  /** Top-left of the person's node on the map; undefined = automatic layout. */
  mapPosition?: MapPosition;
  /** Past 1:1s with this person, in the order they happened. */
  meetings?: Meeting[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * A piece of work that cuts across people: tasks and notes with different people can carry the
 * same project. One project per item; the colour comes from PROJECT_PALETTE.
 */
export interface Project {
  id: string;
  name: string;
  /** Index into PROJECT_PALETTE. */
  colorIndex: number;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** A task or a note that belongs to exactly one person. */
export interface Item {
  id: string;
  personId: string;
  kind: ItemKind;
  /** The project this belongs to, if any. */
  projectId?: string;
  title: string;
  /** HTML produced by the editor. '' when empty. */
  body: string;
  isCompleted: boolean;
  completedAt?: number;
  /** "urgent" in the design. */
  isFlagged: boolean;
  dueDate?: number;
  /** When this was last covered in a 1:1. */
  discussedAt?: number;
  /** Position relative to the owner's node on the map; undefined = automatic ring layout. */
  mapPosition?: MapPosition;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** The main views, plus the 1:1 screen. Kept here so pure model code can refer to it. */
export type ViewModeLike = 'map' | 'list' | 'meeting';
