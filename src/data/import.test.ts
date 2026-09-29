import { describe, expect, it } from 'vitest';
import { parseBulkText } from './import';

describe('parseBulkText', () => {
  it('strips bullets and numbering', () => {
    expect(parseBulkText('- one\n* two\n• three\n1. four\n2) five').map((l) => l.title)).toEqual([
      'one',
      'two',
      'three',
      'four',
      'five',
    ]);
  });

  it('recognises completed and open checkboxes', () => {
    const lines = parseBulkText('[x] done\n[ ] open\n✅ also done\n☐ still open\n- [X] Done too');
    expect(lines.map((l) => [l.title, l.isCompleted])).toEqual([
      ['done', true],
      ['open', false],
      ['also done', true],
      ['still open', false],
      ['Done too', true],
    ]);
    expect(lines.every((l) => l.kind === 'task')).toBe(true);
  });

  it('turns "# " and "note:" lines into notes', () => {
    const lines = parseBulkText('# Retro feedback\nnote: likes async work\nN: prefers mornings');
    expect(lines.map((l) => [l.kind, l.title])).toEqual([
      ['note', 'Retro feedback'],
      ['note', 'likes async work'],
      ['note', 'prefers mornings'],
    ]);
  });

  it('ignores blank lines and lines that are only markers', () => {
    expect(parseBulkText('\n\n- \n[x]\n   ')).toEqual([]);
  });

  it('handles Windows line endings', () => {
    expect(parseBulkText('a\r\nb').map((l) => l.title)).toEqual(['a', 'b']);
  });
});
