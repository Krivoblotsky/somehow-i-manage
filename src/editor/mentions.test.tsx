import { act, waitFor } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Item, Person } from '../model/types';
import { mentionExtensions, setMentionSources, type MentionSources } from './mentions';

const person = (id: string, name: string, sortOrder = 0): Person => ({
  id,
  name,
  colorIndex: 0,
  sortOrder,
  createdAt: 0,
  updatedAt: 0,
});
const item = (id: string, title: string, personId: string, extra: Partial<Item> = {}): Item => ({
  id,
  personId,
  kind: 'task',
  title,
  body: '',
  isCompleted: false,
  isFlagged: false,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = '';
});

function setup(overrides: Partial<MentionSources> = {}) {
  const vira = person('p-vira', 'Vira');
  const yana = person('p-yana', 'Yana Vdovenko', 1);
  const sources: MentionSources = {
    people: [vira, yana],
    items: [
      { item: item('i-trip', 'Business Trip', 'p-vira', { updatedAt: 2 }), owner: vira },
      { item: item('i-me', 'The note being written', 'p-yana', { updatedAt: 3 }), owner: yana },
      { item: item('i-plan', 'Trip plan', 'p-yana', { kind: 'note', updatedAt: 1 }), owner: yana },
    ],
    currentItemId: 'i-me',
    createPerson: vi.fn(async (name: string) => person('p-new', name)),
    openPerson: vi.fn(),
    openItem: vi.fn(),
    ...overrides,
  };
  const element = document.createElement('div');
  document.body.appendChild(element);
  editor = new Editor({
    element,
    extensions: [StarterKit, ...mentionExtensions()],
    content: '<p>Check with</p>',
  });
  setMentionSources(editor, sources);
  editor.commands.focus('end');
  return { editor, sources };
}
const type = (text: string) => act(() => void editor!.commands.insertContent(text));
const key = (k: string) =>
  act(() => {
    editor!.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  });
const menu = () => document.querySelector('[role="listbox"]');

describe('mentions in the editor', () => {
  it('offers matching people after "@" and inserts a chip the previews can read', async () => {
    const { editor } = setup();
    await type(' @vi');
    await waitFor(() => expect(menu()).toHaveTextContent('Vira'));
    expect(menu()).not.toHaveTextContent('Yana');
    expect(menu()).toHaveTextContent('Add person “Vi”'); // a new name is always on offer
    await key('Enter');
    expect(editor.getHTML()).toContain('data-type="personMention"');
    expect(editor.getHTML()).toContain('data-id="p-vira"');
    expect(editor.getHTML()).toContain('data-label="Vira"');
    expect(editor.getText()).toBe('Check with @Vira ');
    await waitFor(() => expect(menu()).toBeNull());
  });

  it('turns a handle nobody has into a new person, named readably', async () => {
    const { editor, sources } = setup();
    await type(' @yana.petrenko');
    await waitFor(() => expect(menu()).toHaveTextContent('Add person “Yana Petrenko”'));
    await key('Enter');
    await waitFor(() => expect(editor.getHTML()).toContain('data-id="p-new"'));
    expect(sources.createPerson).toHaveBeenCalledWith('Yana Petrenko');
    expect(editor.getText()).toBe('Check with @Yana Petrenko ');
  });

  it('offers tasks and notes after "#", with whose they are, never the one being written', async () => {
    const { editor } = setup();
    await type(' #trip');
    await waitFor(() => expect(menu()).toHaveTextContent('Business Trip'));
    expect(menu()).toHaveTextContent('Trip plan');
    expect(menu()).not.toHaveTextContent('being written');
    expect(menu()).not.toHaveTextContent('Add'); // nothing gets created from "#"
    const rows = menu()!.querySelectorAll('[role="option"]');
    expect(rows[0]).toHaveTextContent('Business Trip');
    expect(rows[0]).toHaveTextContent('Vira');
    await key('ArrowDown'); // onto "Trip plan"
    await key('Tab');
    expect(editor.getHTML()).toContain('data-type="itemMention"');
    expect(editor.getHTML()).toContain('data-id="i-plan"');
    expect(editor.getHTML()).toContain('data-label="Trip plan"');
    expect(editor.getText()).toBe('Check with #Trip plan ');
  });

  it('says so when no title matches, and closes on Escape without inserting anything', async () => {
    const { editor } = setup();
    await type(' #zzz');
    await waitFor(() => expect(document.body).toHaveTextContent('No task or note with that'));
    expect(menu()).toBeNull();
    await key('Escape');
    await waitFor(() => expect(document.body).not.toHaveTextContent('No task or note'));
    expect(editor.getText()).toBe('Check with #zzz');
  });
});
