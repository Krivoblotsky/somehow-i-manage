export type ItemKind = 'task' | 'note';

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
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}
