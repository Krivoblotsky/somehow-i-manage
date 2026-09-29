import type { ItemKind } from '../model/types';

export interface ParsedLine {
  kind: ItemKind;
  title: string;
  isCompleted: boolean;
}

const BULLET = /^(?:[-*•‣▪◦–—]|\d+[.)])(?:\s+|$)/;
const DONE = /^(?:\[\s*[xX✓✔]\s*\]|✅|✓|✔|☑|☒)\s*/;
const OPEN = /^(?:\[\s*\]|☐)\s*/;
const NOTE_HASH = /^#\s+/;
const NOTE_WORD = /^(?:note|n):\s*/i;

/**
 * Turn a pasted list (Apple Notes, Markdown, plain lines) into items.
 * One line = one item. "- [x]", "✅" → completed task; "# " or "note:" → note.
 */
export function parseBulkText(text: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim().replace(BULLET, '').trim();
    if (!line) continue;

    let kind: ItemKind = 'task';
    let isCompleted = false;

    const done = DONE.exec(line);
    const open = done ? null : OPEN.exec(line);
    if (done) {
      isCompleted = true;
      line = line.slice(done[0].length);
    } else if (open) {
      line = line.slice(open[0].length);
    } else if (NOTE_HASH.test(line)) {
      kind = 'note';
      line = line.replace(NOTE_HASH, '');
    } else if (NOTE_WORD.test(line)) {
      kind = 'note';
      line = line.replace(NOTE_WORD, '');
    }

    line = line.trim();
    if (!line) continue;
    out.push({ kind, title: line, isCompleted });
  }
  return out;
}
