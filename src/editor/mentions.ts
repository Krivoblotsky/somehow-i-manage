import type { Editor, Range } from '@tiptap/core';
import { Mention } from '@tiptap/extension-mention';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import {
  filterItems,
  filterPeople,
  hasExactName,
  ITEM_MENTION,
  nameFromHandle,
  PERSON_MENTION,
  type LinkableItem,
} from '../model/mentions';
import type { Person } from '../model/types';
import { mentionMenu } from './MentionMenu';

/** What the editor needs to offer and resolve @people and #tasks-or-notes. */
export interface MentionSources {
  people: Person[];
  /** Every task and note that may be linked, with whose it is. */
  items: LinkableItem[];
  /** The item being written, so it is not offered to itself. */
  currentItemId?: string;
  /** Someone typed a name nobody has: add them and link them. */
  createPerson: (name: string) => Promise<Person>;
  openPerson: (id: string) => void;
  openItem: (id: string) => void;
}

/** One row of the suggestion menu. */
export type MentionItem =
  | { kind: 'person'; person: Person }
  | { kind: 'create-person'; name: string }
  | ({ kind: 'item' } & LinkableItem);

// The sources belong to the editor they serve and are looked up at use, so the lists stay fresh
// without rebuilding the editor and nothing is read while React renders.
const SOURCES = new WeakMap<Editor, MentionSources>();

/** Gives an editor its people and items; call again whenever they change. */
export function setMentionSources(editor: Editor, sources: MentionSources): void {
  SOURCES.set(editor, sources);
}
const sourcesOf = (editor: Editor) => SOURCES.get(editor);

type Attrs = { id: string; label: string };

/** Mention's own command: the node, then a space, caret after it. */
function insertMention(editor: Editor, range: Range, type: string, attrs: Attrs, char: string) {
  const nodeAfter = editor.view.state.selection.$to.nodeAfter;
  if (nodeAfter?.text?.startsWith(' ')) range.to += 1;
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      { type, attrs: { ...attrs, mentionSuggestionChar: char } },
      { type: 'text', text: ' ' },
    ])
    .run();
}

/** A click on a chip opens what it names instead of placing the caret on it. */
const openOnClick = (name: string, open: (sources: MentionSources, id: string) => void) =>
  function addProseMirrorPlugins(this: { editor: Editor; parent?: () => Plugin[] }) {
    const editor = this.editor;
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        key: new PluginKey(`${name}Click`),
        props: {
          handleClickOn: (_view, _pos, node) => {
            if (node.type.name !== name || typeof node.attrs.id !== 'string') return false;
            const sources = sourcesOf(editor);
            if (sources) open(sources, node.attrs.id);
            return true;
          },
        },
      }),
    ];
  };

/**
 * The two mention nodes: @person and #task-or-note. Each renders as a chip (a span the previews
 * can read back by data-type / data-id / data-label) and offers a menu while typing after its
 * trigger. The people and items come from `setMentionSources`.
 */
export function mentionExtensions() {
  const personMention = Mention.extend({
    name: PERSON_MENTION,
    addProseMirrorPlugins: openOnClick(PERSON_MENTION, (s, id) => s.openPerson(id)),
  }).configure({
    HTMLAttributes: { class: 'mention mention-person' },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    deleteTriggerWithBackspace: true,
    suggestion: {
      char: '@',
      pluginKey: new PluginKey('personMentionSuggestion'),
      items: ({ editor, query }): MentionItem[] => {
        const people = sourcesOf(editor)?.people ?? [];
        const items: MentionItem[] = filterPeople(people, query).map((person) => ({
          kind: 'person',
          person,
        }));
        const name = nameFromHandle(query);
        if (
          name &&
          !hasExactName(
            people.map((p) => p.name),
            query,
          )
        )
          items.push({ kind: 'create-person', name });
        return items;
      },
      command: ({ editor, range, props }) => {
        const item = props as unknown as MentionItem;
        if (item.kind === 'person') {
          insertMention(
            editor,
            range,
            PERSON_MENTION,
            { id: item.person.id, label: item.person.name },
            '@',
          );
        } else if (item.kind === 'create-person') {
          void sourcesOf(editor)
            ?.createPerson(item.name)
            .then((person) =>
              insertMention(
                editor,
                range,
                PERSON_MENTION,
                { id: person.id, label: person.name },
                '@',
              ),
            );
        }
      },
      render: () => mentionMenu('Nobody yet. Keep typing a name to add them.'),
    },
  });

  const itemMention = Mention.extend({
    name: ITEM_MENTION,
    addProseMirrorPlugins: openOnClick(ITEM_MENTION, (s, id) => s.openItem(id)),
  }).configure({
    HTMLAttributes: { class: 'mention mention-item' },
    renderText: ({ node }) => `#${node.attrs.label ?? node.attrs.id}`,
    deleteTriggerWithBackspace: true,
    suggestion: {
      char: '#',
      pluginKey: new PluginKey('itemMentionSuggestion'),
      items: ({ editor, query }): MentionItem[] => {
        const sources = sourcesOf(editor);
        return filterItems(sources?.items ?? [], query, sources?.currentItemId).map((c) => ({
          kind: 'item',
          ...c,
        }));
      },
      command: ({ editor, range, props }) => {
        const row = props as unknown as MentionItem;
        if (row.kind === 'item')
          insertMention(
            editor,
            range,
            ITEM_MENTION,
            { id: row.item.id, label: row.item.title },
            '#',
          );
      },
      render: () => mentionMenu('No task or note with that in its title.'),
    },
  });

  return [personMention, itemMention];
}
