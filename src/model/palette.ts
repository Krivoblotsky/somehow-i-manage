/** Person colours, in the order the design uses them (see docs/DESIGN.md §6). */
export const PERSON_PALETTE = [
  '#3C63EA',
  '#3DEBD6',
  '#EB3EA6',
  '#F5DDDD',
  '#FBB13C',
  '#FFB4A2',
] as const;

export const PERSON_COLOR_NAMES = ['Blue', 'Teal', 'Pink', 'Rose', 'Orange', 'Salmon'] as const;

export function personColor(index: number): string {
  const n = PERSON_PALETTE.length;
  return PERSON_PALETTE[((Math.trunc(index) % n) + n) % n];
}

/** Black or white, whichever reads better on the given colour. */
export function contrastText(hex: string): '#111111' | '#FFFFFF' {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 150 ? '#111111' : '#FFFFFF';
}

/** The least-used palette index, ties resolved in palette order. */
export function pickColor(usedIndexes: number[]): number {
  const counts = PERSON_PALETTE.map((_, i) => usedIndexes.filter((u) => u === i).length);
  let best = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] < counts[best]) best = i;
  }
  return best;
}
