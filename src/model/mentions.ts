import type { Item, Person } from './types';

/** The editor's node names; they end up as data-type="…" on the stored spans. */
export const PERSON_MENTION = 'personMention';
export const ITEM_MENTION = 'itemMention';

/** One run of a body preview: plain words, or a link to a person or to a task or note. */
export type PreviewSegment =
  { kind: 'text'; text: string } | { kind: 'person' | 'item'; id: string; label: string };

/** How blocks (paragraphs, list items) are joined when a body is shown on one line or two. */
export const BLOCK_SEPARATOR = ' · ';

const BLOCKS = new Set([
  'P',
  'DIV',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
  'PRE',
  'TR',
]);

const TAG = /<[^>]+>/g;
const ATTR = (name: string, tag: string) => new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
const unescape = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

const kindOf = (type: string | null | undefined): 'person' | 'item' | null =>
  type === PERSON_MENTION ? 'person' : type === ITEM_MENTION ? 'item' : null;

/**
 * A body as segments for a preview: text with mentions kept as links, blocks separated by
 * " · " instead of being run together. Uses the DOM when there is one (browser, jsdom) and a
 * tag scanner otherwise (the pre-render), which agrees on everything that matters here.
 */
export function previewSegments(html: string): PreviewSegment[] {
  if (!html) return [];
  const out: PreviewSegment[] = [];
  let blockHasContent = false;
  const pushText = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last?.kind === 'text') last.text += text;
    else out.push({ kind: 'text', text });
    if (text.trim()) blockHasContent = true;
  };
  const pushMention = (kind: 'person' | 'item', id: string, label: string) => {
    out.push({ kind, id, label });
    blockHasContent = true;
  };
  const endBlock = () => {
    if (blockHasContent) {
      pushText(BLOCK_SEPARATOR);
      blockHasContent = false;
    }
  };

  if (typeof DOMParser !== 'undefined') {
    const body = new DOMParser().parseFromString(html, 'text/html').body;
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        pushText(node.textContent ?? '');
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const kind = kindOf(el.getAttribute('data-type'));
      if (kind) {
        const id = el.getAttribute('data-id') ?? '';
        const label = el.getAttribute('data-label') ?? el.textContent?.replace(/^[@#]/, '') ?? '';
        if (id) pushMention(kind, id, label);
        return;
      }
      if (el.tagName === 'BR') {
        pushText(' ');
        return;
      }
      const isBlock = BLOCKS.has(el.tagName);
      for (const child of Array.from(el.childNodes)) walk(child);
      if (isBlock) endBlock();
    };
    for (const child of Array.from(body.childNodes)) walk(child);
  } else {
    // no DOM: scan tags; mention spans carry what we need in their attributes
    let i = 0;
    let match: RegExpExecArray | null;
    TAG.lastIndex = 0;
    while ((match = TAG.exec(html))) {
      pushText(unescape(html.slice(i, match.index)));
      i = TAG.lastIndex;
      const tag = match[0];
      const kind = kindOf(ATTR('data-type', tag));
      if (kind) {
        const id = ATTR('data-id', tag) ?? '';
        const label = unescape(ATTR('data-label', tag) ?? '');
        // skip the span's own text (the "@Label") up to its closing tag
        const close = html.indexOf('</span>', i);
        if (close !== -1) i = TAG.lastIndex = close + '</span>'.length;
        if (id) pushMention(kind, id, label);
      } else if (/^<br\b/i.test(tag)) pushText(' ');
      else if (/^<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/i.test(tag)) endBlock();
    }
    pushText(unescape(html.slice(i)));
  }

  // tidy: collapse whitespace, drop the trailing separator and empty runs
  const tidy: PreviewSegment[] = [];
  for (const seg of out) {
    if (seg.kind !== 'text') {
      tidy.push(seg);
      continue;
    }
    const text = seg.text.replace(/\s+/g, ' ');
    if (!text) continue;
    const last = tidy[tidy.length - 1];
    if (last?.kind === 'text') last.text += text;
    else tidy.push({ kind: 'text', text });
  }
  if (tidy.length) {
    const first = tidy[0];
    if (first.kind === 'text') first.text = first.text.replace(/^\s+/, '');
    const last = tidy[tidy.length - 1];
    if (last.kind === 'text') {
      last.text = last.text.replace(/(\s*·\s*)+$/, '').replace(/\s+$/, '');
      if (!last.text) tidy.pop();
    }
  }
  return tidy;
}

/** The preview as plain text: mentions read "@Name" and "#Title". */
export function previewText(html: string): string {
  return previewSegments(html)
    .map((s) => (s.kind === 'text' ? s.text : `${s.kind === 'person' ? '@' : '#'}${s.label}`))
    .join('')
    .trim();
}

const idsOf = (html: string, type: string): string[] => {
  if (!html || !html.includes(type)) return [];
  const ids = new Set<string>();
  const re = /<span\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (ATTR('data-type', m[0]) !== type) continue;
    const id = ATTR('data-id', m[0]);
    if (id) ids.add(id);
  }
  return [...ids];
};

/** People linked from a body, in order of first mention. */
export const mentionedPeople = (html: string): string[] => idsOf(html, PERSON_MENTION);
/** Tasks and notes linked from a body, in order of first mention. */
export const mentionedItems = (html: string): string[] => idsOf(html, ITEM_MENTION);

/** "yana.vdovenko" → "Yana Vdovenko": a readable name for someone typed as a handle. */
export function nameFromHandle(handle: string): string {
  return handle
    .replace(/^[@#]/, '')
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

const norm = (s: string) => s.trim().toLowerCase();
const words = (s: string) => norm(s).split(/\s+/).filter(Boolean);
/** Every word of the query starts some word of the name. */
const wordStart = (name: string, query: string[]) => {
  const parts = words(name);
  return query.every((w) => parts.some((part) => part.startsWith(w)));
};

/** People whose name has a word starting with the query, then anyone whose name contains it. */
export function filterPeople(people: Person[], query: string, limit = 6): Person[] {
  const q = norm(query.replace(/[._-]+/g, ' '));
  const sorted = [...people].sort((a, b) => a.sortOrder - b.sortOrder);
  if (!q) return sorted.slice(0, limit);
  const qw = q.split(' ').filter(Boolean);
  const starts = sorted.filter((p) => wordStart(p.name, qw));
  const within = sorted.filter((p) => !starts.includes(p) && norm(p.name).includes(q));
  return [...starts, ...within].slice(0, limit);
}

/** A task or note offered after "#", with whose it is. */
export interface LinkableItem {
  item: Item;
  owner: Person | undefined;
}

/**
 * Tasks and notes for the "#" menu: titles with a word starting with the query first, then titles
 * containing it; open before completed, latest touched first. Untitled items and `exceptId` (the
 * item being written) are left out.
 */
export function filterItems(
  items: LinkableItem[],
  query: string,
  exceptId?: string,
  limit = 6,
): LinkableItem[] {
  const q = norm(query.replace(/[._-]+/g, ' '));
  const qw = q.split(' ').filter(Boolean);
  const rank = (i: Item) => (i.kind === 'task' && i.isCompleted ? 1 : 0);
  const candidates = items
    .filter(({ item }) => item.id !== exceptId && item.title.trim() !== '')
    .sort((a, b) => rank(a.item) - rank(b.item) || b.item.updatedAt - a.item.updatedAt);
  if (!q) return candidates.slice(0, limit);
  const starts = candidates.filter(({ item }) => wordStart(item.title, qw));
  const within = candidates.filter((c) => !starts.includes(c) && norm(c.item.title).includes(q));
  return [...starts, ...within].slice(0, limit);
}

/** Whether a typed name is already someone's exact name (ignoring case and spacing). */
export const hasExactName = (names: string[], query: string): boolean => {
  const q = norm(query.replace(/[._-]+/g, ' ')).replace(/\s+/g, ' ');
  return q !== '' && names.some((n) => norm(n).replace(/\s+/g, ' ') === q);
};
