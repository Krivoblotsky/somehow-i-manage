import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1';
import { Client, StreamableHTTPClientTransport } from 'npm:@modelcontextprotocol/client@^2.3.0';
import { createMcpHandler } from 'npm:@modelcontextprotocol/server@^2.3.0';
import {
  type Change,
  DAY,
  type Item,
  type Person,
  type Project,
  type Snapshot,
  type Store,
} from './model.ts';
import { buildServer } from './server.ts';

const NOW = new Date(2026, 9, 4, 12, 0).getTime(); // Sun 4 Oct 2026, noon local

/** What the server sees: records in memory, writes applied the way sync_push() would. */
class MemoryStore implements Store {
  snapshot: Snapshot;
  pushed: Change[] = [];
  constructor(snapshot: Snapshot) {
    this.snapshot = snapshot;
  }
  load(): Promise<Snapshot> {
    return Promise.resolve(structuredClone(this.snapshot));
  }
  push(changes: Change[]): Promise<void> {
    this.pushed.push(...changes);
    for (const c of changes) {
      const list = c.kind === 'person'
        ? this.snapshot.people
        : c.kind === 'item'
        ? this.snapshot.items
        : this.snapshot.projects;
      const index = list.findIndex((r) => r.id === c.id);
      if (c.deleted_at !== null || !c.data) {
        if (index !== -1) list.splice(index, 1);
      } else if (index === -1) (list as unknown[]).push(c.data);
      else (list as unknown[])[index] = c.data;
    }
    return Promise.resolve();
  }
}

const person = (id: string, name: string, extra: Partial<Person> = {}): Person => ({
  id,
  name,
  colorIndex: 0,
  sortOrder: 0,
  createdAt: NOW - 30 * DAY,
  updatedAt: NOW - 30 * DAY,
  ...extra,
});
const item = (id: string, personId: string, title: string, extra: Partial<Item> = {}): Item => ({
  id,
  personId,
  kind: 'task',
  title,
  body: '',
  isCompleted: false,
  isFlagged: false,
  sortOrder: 0,
  createdAt: NOW - 20 * DAY,
  updatedAt: NOW - 20 * DAY,
  ...extra,
});
const project = (id: string, name: string): Project => ({
  id,
  name,
  colorIndex: 0,
  sortOrder: 0,
  createdAt: NOW - 30 * DAY,
  updatedAt: NOW - 30 * DAY,
});

function sample(): Snapshot {
  return {
    people: [
      person('p-emily', 'Emily Carter', {
        role: 'Senior iOS Engineer',
        contacts: [{ kind: 'email', value: 'emily@example.com' }],
        meetings: [{ startedAt: NOW - 12 * DAY, endedAt: NOW - 12 * DAY + 1_800_000 }],
      }),
      person('p-anton', 'Anton Melnyk', { sortOrder: 1 }),
    ],
    items: [
      item('i-promo', 'p-emily', 'Promotion', {
        isFlagged: true,
        dueDate: NOW + 3 * DAY,
        body: '<p>Ready for Staff.</p>',
      }),
      item('i-trip', 'p-emily', 'Business trip', { dueDate: NOW - 2 * DAY, projectId: 'pr-mipp' }),
      item('i-retro', 'p-emily', 'Retro takeaways', {
        kind: 'note',
        body: '<p>Wants more <b>ownership</b>.</p>',
      }),
      item('i-launch', 'p-emily', 'Launch MIPP', {
        isCompleted: true,
        completedAt: NOW - 3 * DAY,
        projectId: 'pr-mipp',
      }),
      item('i-old', 'p-emily', 'Old thing', { isCompleted: true, completedAt: NOW - 40 * DAY }),
      item('i-budget', 'p-anton', 'Budget', { dueDate: NOW + 20 * DAY }),
    ],
    projects: [project('pr-mipp', 'MIPP')],
  };
}

/** A real MCP client talking Streamable HTTP to the handler, served in-process. */
async function withClient(store: Store, fn: (client: Client) => Promise<void>) {
  const handler = createMcpHandler(() => buildServer(store, () => NOW));
  const server = Deno.serve({ port: 0, onListen() {} }, (req) => handler.fetch(req));
  const url = new URL(`http://127.0.0.1:${(server.addr as Deno.NetAddr).port}/functions/v1/mcp`);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url));
  try {
    await fn(client);
  } finally {
    await client.close();
    await server.shutdown();
  }
}

const textOf = (result: unknown): string =>
  ((result as { content: { type: string; text?: string }[] }).content ?? [])
    .map((c) => c.text ?? '')
    .join('\n');
const isError = (result: unknown): boolean => Boolean((result as { isError?: boolean }).isError);

Deno.test('lists its tools and describes the people', async () => {
  const store = new MemoryStore(sample());
  await withClient(store, async (client) => {
    const { tools } = await client.listTools();
    assertEquals(
      tools.map((t) => t.name).sort(),
      [
        'add_note',
        'add_person',
        'add_task',
        'complete_task',
        'create_project',
        'delete_item',
        'get_person',
        'list_people',
        'list_projects',
        'move_item',
        'prepare_one_on_one',
        'search',
        'update_item',
        'whats_due',
      ],
    );
    const people = textOf(await client.callTool({ name: 'list_people', arguments: {} }));
    assertStringIncludes(people, '2 people:');
    assertStringIncludes(
      people,
      'Emily Carter — Senior iOS Engineer · 2 open, 1 urgent · 1 note · last 1:1 12 days ago · projects: MIPP [person p-emily]',
    );
    assertStringIncludes(people, 'Anton Melnyk · 1 open · no 1:1 recorded [person p-anton]');
  });
});

Deno.test('shows a person and prepares their 1:1', async () => {
  const store = new MemoryStore(sample());
  await withClient(store, async (client) => {
    const dossier = textOf(
      await client.callTool({ name: 'get_person', arguments: { person: 'emily' } }),
    );
    assertStringIncludes(dossier, '# Emily Carter [person p-emily]');
    assertStringIncludes(dossier, 'Senior iOS Engineer · email emily@example.com');
    assertStringIncludes(
      dossier,
      '- Promotion (URGENT, due Wed 7 Oct) [task i-promo]\n  Ready for Staff.',
    );
    assertStringIncludes(dossier, '- Business trip (2 days overdue, project MIPP) [task i-trip]');
    assertStringIncludes(dossier, '- Retro takeaways [note i-retro]\n  Wants more ownership.');
    assertStringIncludes(
      dossier,
      '## Done recently\n- Launch MIPP (done 3 days ago, project MIPP)',
    );

    const agenda = textOf(
      await client.callTool({ name: 'prepare_one_on_one', arguments: { person: 'Emily Carter' } }),
    );
    assertStringIncludes(agenda, '# 1:1 with Emily Carter\nLast 1:1 12 days ago.');
    assertStringIncludes(agenda, '## To discuss (2 open)\n- Promotion (URGENT');
    assertStringIncludes(agenda, 'Done: Launch MIPP');

    const unknown = await client.callTool({ name: 'get_person', arguments: { person: 'Zed' } });
    assert(isError(unknown));
    assertStringIncludes(
      textOf(unknown),
      'Nobody here is called “Zed”. People: Emily Carter, Anton Melnyk.',
    );
  });
});

Deno.test('finds what is due and what matches a search', async () => {
  const store = new MemoryStore(sample());
  await withClient(store, async (client) => {
    const due = textOf(await client.callTool({ name: 'whats_due', arguments: { days: 7 } }));
    assertStringIncludes(due, '2 tasks overdue or due in the next 7 days:');
    assertStringIncludes(due, '- Business trip (2 days overdue, project MIPP, with Emily Carter)');
    assertStringIncludes(due, '- Promotion (URGENT, due Wed 7 Oct, with Emily Carter)');
    assert(!due.includes('Budget'));

    const found = textOf(await client.callTool({ name: 'search', arguments: { query: 'mipp' } }));
    assertStringIncludes(found, '## Projects\n- MIPP [project pr-mipp]');
    assertStringIncludes(found, 'Business trip');
    assertStringIncludes(found, 'Launch MIPP');
  });
});

Deno.test('adds a task with a person, creating its project, then edits, moves, completes and deletes', async () => {
  const store = new MemoryStore(sample());
  await withClient(store, async (client) => {
    const added = textOf(
      await client.callTool({
        name: 'add_task',
        arguments: {
          person: 'Anton',
          title: 'Draft the hiring plan',
          details: 'Two roles.\n\n- senior iOS\n- designer',
          due_date: '2026-10-14',
          urgent: true,
          project: 'Hiring',
        },
      }),
    );
    assertStringIncludes(
      added,
      'Added task “Draft the hiring plan” with Anton Melnyk in project Hiring [item ',
    );
    const created = store.snapshot.items.find((i) => i.title === 'Draft the hiring plan')!;
    assertEquals(created.personId, 'p-anton');
    assertEquals(created.isFlagged, true);
    assertEquals(created.dueDate, new Date(2026, 9, 14).getTime());
    assertEquals(
      created.body,
      '<p>Two roles.</p><ul><li><p>senior iOS</p></li><li><p>designer</p></li></ul>',
    );
    assertEquals(created.sortOrder, 1);
    const hiring = store.snapshot.projects.find((p) => p.name === 'Hiring')!;
    assertEquals(created.projectId, hiring.id);
    assertEquals(hiring.colorIndex, 1); // MIPP has 0
    // the project went up before the item that points at it
    assertEquals(store.pushed.map((c) => c.kind), ['project', 'item']);
    assert(store.pushed.every((c) => c.updated_at === NOW && c.deleted_at === null));

    const note = textOf(
      await client.callTool({
        name: 'add_note',
        arguments: { person: 'p-emily', title: 'Prefers async' },
      }),
    );
    assertStringIncludes(note, 'Added note “Prefers async” about Emily Carter [item ');

    const edited = textOf(
      await client.callTool({
        name: 'update_item',
        arguments: { item: created.id, due_date: '', project: '', title: 'Hiring plan' },
      }),
    );
    assertStringIncludes(edited, 'Updated “Hiring plan”');
    const afterEdit = store.snapshot.items.find((i) => i.id === created.id)!;
    assertEquals(afterEdit.dueDate, undefined);
    assertEquals(afterEdit.projectId, undefined);

    await client.callTool({ name: 'move_item', arguments: { item: created.id, person: 'Emily' } });
    assertEquals(store.snapshot.items.find((i) => i.id === created.id)!.personId, 'p-emily');

    await client.callTool({ name: 'complete_task', arguments: { item: created.id } });
    const done = store.snapshot.items.find((i) => i.id === created.id)!;
    assertEquals(done.isCompleted, true);
    assertEquals(done.completedAt, NOW);

    const noteDone = await client.callTool({
      name: 'complete_task',
      arguments: { item: 'i-retro' },
    });
    assert(isError(noteDone));

    await client.callTool({ name: 'delete_item', arguments: { item: created.id } });
    assertEquals(store.snapshot.items.some((i) => i.id === created.id), false);
    const tombstone = store.pushed.at(-1)!;
    assertEquals(tombstone.data, null);
    assertEquals(tombstone.deleted_at, NOW);

    const twin = await client.callTool({ name: 'add_person', arguments: { name: 'anton melnyk' } });
    assert(isError(twin));
    const newcomer = textOf(
      await client.callTool({
        name: 'add_person',
        arguments: { name: 'Nata Koval', role: 'Designer', email: 'nata@example.com' },
      }),
    );
    assertStringIncludes(newcomer, 'Added Nata Koval [person ');
    const nata = store.snapshot.people.find((p) => p.name === 'Nata Koval')!;
    assertEquals(nata.colorIndex, 1);
    assertEquals(nata.sortOrder, 2);
    assertEquals(nata.contacts, [{ kind: 'email', value: 'nata@example.com' }]);
  });
});
