import { McpServer } from 'npm:@modelcontextprotocol/server@^2.3.0';
import { z } from 'npm:zod@^4.3.6';
import {
  type Change,
  completedTasks,
  DAY,
  describeAgo,
  describeDue,
  findItem,
  findPerson,
  findProject,
  formatDate,
  type Item,
  lastMeeting,
  newId,
  nextSortOrder,
  notes,
  openTasks,
  parseDate,
  type Person,
  PERSON_PALETTE_SIZE,
  pickColor,
  type Project,
  PROJECT_PALETTE_SIZE,
  type Snapshot,
  type Store,
  stripHtml,
  textToHtml,
} from './model.ts';

const INSTRUCTIONS =
  `Somehow I Manage is a people-first task manager for managers. Everything hangs off a person:
a task is something the manager has to do *with* a person, a note is something to remember *about*
them. People can be named by name (first name is enough when unique) or by id; items and projects by
id (ids are shown in brackets in every listing). Dates are YYYY-MM-DD in the user's local time.
A project is an optional tag that groups tasks and notes across people. Start with list_people
to see who is here. Prefer prepare_one_on_one before a meeting and whats_due for the week ahead.`;

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

const text = (t: string): ToolResult => ({ content: [{ type: 'text', text: t }] });
const fail = (t: string): ToolResult => ({ content: [{ type: 'text', text: t }], isError: true });

const projectName = (projects: Project[], id: string | undefined) =>
  id ? projects.find((p) => p.id === id)?.name : undefined;

function itemLine(item: Item, projects: Project[], now: number, withPerson?: Person): string {
  const bits: string[] = [];
  if (item.isFlagged && !item.isCompleted) bits.push('URGENT');
  if (item.dueDate !== undefined && !item.isCompleted) bits.push(describeDue(item.dueDate, now));
  if (item.isCompleted) bits.push(`done ${describeAgo(item.completedAt ?? item.updatedAt, now)}`);
  const project = projectName(projects, item.projectId);
  if (project) bits.push(`project ${project}`);
  if (withPerson) bits.push(`with ${withPerson.name}`);
  const head = `- ${item.title || 'Untitled'}${
    bits.length ? ` (${bits.join(', ')})` : ''
  } [${item.kind} ${item.id}]`;
  const body = stripHtml(item.body);
  return body ? `${head}\n  ${body.length > 240 ? `${body.slice(0, 237)}…` : body}` : head;
}

function personLine(person: Person, items: Item[], projects: Project[], now: number): string {
  const open = openTasks(items);
  const urgent = open.filter((i) => i.isFlagged).length;
  const noteCount = notes(items).length;
  const last = lastMeeting(person);
  const projectNames = [
    ...new Set(items.map((i) => projectName(projects, i.projectId)).filter(Boolean)),
  ];
  const bits = [
    `${open.length} open${urgent ? `, ${urgent} urgent` : ''}`,
    noteCount ? `${noteCount} note${noteCount === 1 ? '' : 's'}` : null,
    last ? `last 1:1 ${describeAgo(last.endedAt, now)}` : 'no 1:1 recorded',
    projectNames.length ? `projects: ${projectNames.join(', ')}` : null,
  ].filter(Boolean);
  return `- ${person.name}${person.role ? ` — ${person.role}` : ''} · ${
    bits.join(' · ')
  } [person ${person.id}]`;
}

function resolvePerson(
  snapshot: Snapshot,
  query: string,
): { person: Person } | { error: ToolResult } {
  const { person, candidates } = findPerson(snapshot.people, query);
  if (person) return { person };
  if (candidates.length > 1) {
    return {
      error: fail(
        `Several people match “${query}”: ${
          candidates.map((p) => `${p.name} [${p.id}]`).join(', ')
        }. Say which one.`,
      ),
    };
  }
  const names = snapshot.people.map((p) => p.name).join(', ');
  return {
    error: fail(
      snapshot.people.length
        ? `Nobody here is called “${query}”. People: ${names}. Use add_person to add someone new.`
        : `There are no people yet. Use add_person to add the first one.`,
    ),
  };
}

function resolveItem(snapshot: Snapshot, id: string): { item: Item } | { error: ToolResult } {
  const item = findItem(snapshot.items, id);
  return item
    ? { item }
    : { error: fail(`No task or note has the id “${id}”. Ids are shown in brackets in listings.`) };
}

/** An existing project by name or id, or a new one; the change to push rides along when created. */
function ensureProject(
  snapshot: Snapshot,
  query: string,
  now: number,
): { project: Project; created?: Change } {
  const found = findProject(snapshot.projects, query);
  if (found) return { project: found };
  const project: Project = {
    id: newId(),
    name: query.replace(/\s+/g, ' ').trim(),
    colorIndex: pickColor(
      snapshot.projects.map((p) => p.colorIndex),
      PROJECT_PALETTE_SIZE,
    ),
    sortOrder: nextSortOrder(snapshot.projects),
    createdAt: now,
    updatedAt: now,
  };
  snapshot.projects.push(project);
  return {
    project,
    created: { id: project.id, kind: 'project', data: project, updated_at: now, deleted_at: null },
  };
}

const put = (kind: Change['kind'], data: Person | Item | Project, now: number): Change => ({
  id: data.id,
  kind,
  data,
  updated_at: now,
  deleted_at: null,
});

/** The MCP server for one signed-in user. `now` is injectable so tests get stable dates. */
export function buildServer(store: Store, now: () => number = Date.now): McpServer {
  const server = new McpServer(
    { name: 'somehow-i-manage', version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    'list_people',
    {
      title: 'List people',
      description:
        'Everyone the user manages or works with, with how much is open with each of them, their last 1:1 and their projects. Start here.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const s = await store.load();
      if (s.people.length === 0) return text('No people yet. Use add_person to add the first one.');
      const t = now();
      return text(
        `${s.people.length} people:\n${
          s.people
            .map((p) => personLine(p, s.items.filter((i) => i.personId === p.id), s.projects, t))
            .join('\n')
        }`,
      );
    },
  );

  server.registerTool(
    'get_person',
    {
      title: 'Get a person',
      description:
        "One person's page: role, contacts, last 1:1, open tasks (urgent first), notes, and what got done recently. Items carry their ids for other tools.",
      inputSchema: z.object({
        person: z.string().describe('Name (first name is enough when unique) or id'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ person: query }) => {
      const s = await store.load();
      const r = resolvePerson(s, query);
      if ('error' in r) return r.error;
      const { person } = r;
      const t = now();
      const items = s.items.filter((i) => i.personId === person.id);
      const open = openTasks(items);
      const noteList = notes(items);
      const done = completedTasks(items).slice(0, 5);
      const last = lastMeeting(person);
      const contacts = (person.contacts ?? []).map((c) => `${c.kind} ${c.value}`).join(', ');
      const lines = [
        `# ${person.name} [person ${person.id}]`,
        [person.role, contacts].filter(Boolean).join(' · '),
        last
          ? `Last 1:1 ${describeAgo(last.endedAt, t)} (${formatDate(last.endedAt)}); ${
            (person.meetings ?? []).length
          } recorded.`
          : 'No 1:1 recorded yet.',
        '',
        `## Open tasks (${open.length})`,
        open.length ? open.map((i) => itemLine(i, s.projects, t)).join('\n') : '- nothing open',
        '',
        `## Notes (${noteList.length})`,
        noteList.length ? noteList.map((i) => itemLine(i, s.projects, t)).join('\n') : '- none',
      ];
      if (done.length) {
        lines.push(
          '',
          `## Done recently`,
          done.map((i) => itemLine(i, s.projects, t)).join('\n'),
        );
      }
      return text(lines.filter((l) => l !== undefined).join('\n'));
    },
  );

  server.registerTool(
    'search',
    {
      title: 'Search',
      description:
        'Find people, tasks, notes and projects whose name, title or text contains the words.',
      inputSchema: z.object({ query: z.string().min(1) }),
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => {
      const s = await store.load();
      const q = query.trim().toLowerCase();
      const t = now();
      const people = s.people.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.role ?? '').toLowerCase().includes(q) ||
          (p.contacts ?? []).some((c) => c.value.toLowerCase().includes(q)),
      );
      const projectIds = new Set(
        s.projects.filter((p) => p.name.toLowerCase().includes(q)).map((p) => p.id),
      );
      const items = s.items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          stripHtml(i.body).toLowerCase().includes(q) ||
          (i.projectId !== undefined && projectIds.has(i.projectId)),
      );
      const byId = new Map(s.people.map((p) => [p.id, p]));
      if (!people.length && !items.length && !projectIds.size) {
        return text(`Nothing matches “${query}”.`);
      }
      const out: string[] = [];
      if (people.length) {
        out.push(
          `## People`,
          ...people.map((p) =>
            personLine(p, s.items.filter((i) => i.personId === p.id), s.projects, t)
          ),
        );
      }
      if (projectIds.size) {
        out.push(
          `## Projects`,
          ...s.projects.filter((p) => projectIds.has(p.id)).map((p) =>
            `- ${p.name} [project ${p.id}]`
          ),
        );
      }
      if (items.length) {
        out.push(
          `## Tasks and notes`,
          ...items.slice(0, 30).map((i) => itemLine(i, s.projects, t, byId.get(i.personId))),
        );
      }
      return text(out.join('\n'));
    },
  );

  server.registerTool(
    'whats_due',
    {
      title: "What's due",
      description:
        'Open tasks across everyone that are overdue or due within the next days, soonest first.',
      inputSchema: z.object({ days: z.number().int().min(0).max(90).default(7) }),
      annotations: { readOnlyHint: true },
    },
    async ({ days }) => {
      const s = await store.load();
      const t = now();
      const limit = t + days * DAY;
      const byId = new Map(s.people.map((p) => [p.id, p]));
      const due = s.items
        .filter((i) =>
          i.kind === 'task' && !i.isCompleted && i.dueDate !== undefined && i.dueDate <= limit
        )
        .sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
      if (!due.length) return text(`Nothing is overdue or due in the next ${days} days.`);
      return text(
        `${due.length} task${
          due.length === 1 ? '' : 's'
        } overdue or due in the next ${days} days:\n${
          due
            .map((i) => itemLine(i, s.projects, t, byId.get(i.personId)))
            .join('\n')
        }`,
      );
    },
  );

  server.registerTool(
    'prepare_one_on_one',
    {
      title: 'Prepare a 1:1',
      description:
        'The agenda for a 1:1 with a person, the way the app builds it: open tasks urgent first, notes to bring up, what got done since the last 1:1 and what is new since then.',
      inputSchema: z.object({ person: z.string() }),
      annotations: { readOnlyHint: true },
    },
    async ({ person: query }) => {
      const s = await store.load();
      const r = resolvePerson(s, query);
      if ('error' in r) return r.error;
      const { person } = r;
      const t = now();
      const items = s.items.filter((i) => i.personId === person.id);
      const last = lastMeeting(person);
      const since = last?.endedAt ?? 0;
      const open = openTasks(items);
      const noteList = notes(items);
      const doneSince = completedTasks(items).filter((i) => (i.completedAt ?? 0) >= since);
      const newSince = last ? items.filter((i) => i.createdAt >= since && !i.isCompleted) : [];
      const lines = [
        `# 1:1 with ${person.name}`,
        last ? `Last 1:1 ${describeAgo(last.endedAt, t)}.` : 'First 1:1 recorded here.',
        '',
        `## To discuss (${open.length} open)`,
        open.length
          ? open.map((i) => itemLine(i, s.projects, t)).join('\n')
          : '- nothing open: a good moment to ask how things are going',
        '',
        `## Notes to bring up (${noteList.length})`,
        noteList.length ? noteList.map((i) => itemLine(i, s.projects, t)).join('\n') : '- none',
      ];
      if (last) {
        lines.push(
          '',
          `## Since last time`,
          doneSince.length
            ? `Done: ${doneSince.map((i) => i.title || 'Untitled').join('; ')}`
            : 'Done: nothing recorded',
          newSince.length
            ? `New: ${newSince.map((i) => i.title || 'Untitled').join('; ')}`
            : 'New: nothing',
        );
      }
      lines.push(
        '',
        'In the app, “Start 1:1” on this person records the meeting and marks what was covered.',
      );
      return text(lines.join('\n'));
    },
  );

  server.registerTool(
    'add_person',
    {
      title: 'Add a person',
      description: 'Add someone the user works with: a direct report, a peer, a client.',
      inputSchema: z.object({
        name: z.string().min(1),
        role: z.string().optional().describe('Job title or relationship, e.g. "iOS Engineer"'),
        email: z.string().optional(),
      }),
    },
    async ({ name, role, email }) => {
      const s = await store.load();
      const t = now();
      const existing = findPerson(s.people, name);
      if (existing.person && existing.person.name.toLowerCase() === name.trim().toLowerCase()) {
        return fail(`${existing.person.name} is already here [person ${existing.person.id}].`);
      }
      const person: Person = {
        id: newId(),
        name: name.replace(/\s+/g, ' ').trim(),
        role: role?.trim() || undefined,
        colorIndex: pickColor(
          s.people.map((p) => p.colorIndex),
          PERSON_PALETTE_SIZE,
        ),
        contacts: email?.trim() ? [{ kind: 'email', value: email.trim() }] : undefined,
        sortOrder: nextSortOrder(s.people),
        createdAt: t,
        updatedAt: t,
      };
      await store.push([put('person', person, t)]);
      return text(`Added ${person.name} [person ${person.id}].`);
    },
  );

  const itemInput = {
    person: z.string().describe('Who it is with: name or id'),
    title: z.string().min(1),
    details: z.string().optional().describe(
      'Plain text or light Markdown; paragraphs and "-" lists',
    ),
    project: z.string().optional().describe('Project name; created if it does not exist yet'),
  };

  async function addItem(
    kind: Item['kind'],
    input: {
      person: string;
      title: string;
      details?: string;
      project?: string;
      due_date?: string;
      urgent?: boolean;
    },
  ): Promise<ToolResult> {
    const s = await store.load();
    const r = resolvePerson(s, input.person);
    if ('error' in r) return r.error;
    const t = now();
    const changes: Change[] = [];
    let projectId: string | undefined;
    if (input.project?.trim()) {
      const p = ensureProject(s, input.project, t);
      projectId = p.project.id;
      if (p.created) changes.push(p.created);
    }
    let dueDate: number | undefined;
    if (kind === 'task' && input.due_date) {
      dueDate = parseDate(input.due_date);
      if (dueDate === undefined) return fail(`“${input.due_date}” is not a date. Use YYYY-MM-DD.`);
    }
    const siblings = s.items.filter((i) => i.personId === r.person.id);
    const item: Item = {
      id: newId(),
      personId: r.person.id,
      kind,
      projectId,
      title: input.title.trim(),
      body: input.details?.trim() ? textToHtml(input.details) : '',
      isCompleted: false,
      isFlagged: kind === 'task' && (input.urgent ?? false),
      dueDate,
      sortOrder: nextSortOrder(siblings),
      createdAt: t,
      updatedAt: t,
    };
    changes.push(put('item', item, t));
    await store.push(changes);
    const projectText = projectId ? ` in project ${projectName(s.projects, projectId)}` : '';
    return text(
      `Added ${kind} “${item.title}” ${
        kind === 'task' ? 'with' : 'about'
      } ${r.person.name}${projectText} [item ${item.id}].`,
    );
  }

  server.registerTool(
    'add_task',
    {
      title: 'Add a task',
      description:
        'Something the user has to do with a person. Optional due date (YYYY-MM-DD), urgent flag and project.',
      inputSchema: z.object({
        ...itemInput,
        due_date: z.string().optional().describe('YYYY-MM-DD'),
        urgent: z.boolean().optional(),
      }),
    },
    (input) => addItem('task', input),
  );

  server.registerTool(
    'add_note',
    {
      title: 'Add a note',
      description:
        'Something to remember about a person: an observation, a preference, what they said.',
      inputSchema: z.object(itemInput),
    },
    (input) => addItem('note', input),
  );

  server.registerTool(
    'update_item',
    {
      title: 'Update a task or note',
      description:
        'Change a task or note by id: title, details (replaces the text), due date (YYYY-MM-DD, or "" to clear), urgent, completed, kind (task/note), project (name, or "" to remove the tag).',
      inputSchema: z.object({
        item: z.string().describe('The item id'),
        title: z.string().optional(),
        details: z.string().optional(),
        due_date: z.string().optional(),
        urgent: z.boolean().optional(),
        completed: z.boolean().optional(),
        kind: z.enum(['task', 'note']).optional(),
        project: z.string().optional(),
      }),
    },
    async (input) => {
      const s = await store.load();
      const r = resolveItem(s, input.item);
      if ('error' in r) return r.error;
      const t = now();
      const changes: Change[] = [];
      const item: Item = { ...r.item, updatedAt: t };
      if (input.title !== undefined) item.title = input.title.trim();
      if (input.details !== undefined) {
        item.body = input.details.trim() ? textToHtml(input.details) : '';
      }
      if (input.kind !== undefined) {
        item.kind = input.kind;
        if (input.kind === 'note') {
          item.isCompleted = false;
          delete item.completedAt;
          item.isFlagged = false;
          delete item.dueDate;
        }
      }
      if (input.due_date !== undefined) {
        if (input.due_date.trim() === '') delete item.dueDate;
        else {
          const ms = parseDate(input.due_date);
          if (ms === undefined) return fail(`“${input.due_date}” is not a date. Use YYYY-MM-DD.`);
          item.dueDate = ms;
        }
      }
      if (input.urgent !== undefined) item.isFlagged = input.urgent;
      if (input.completed !== undefined && item.kind === 'task') {
        item.isCompleted = input.completed;
        if (input.completed) item.completedAt = t;
        else delete item.completedAt;
      }
      if (input.project !== undefined) {
        if (input.project.trim() === '') delete item.projectId;
        else {
          const p = ensureProject(s, input.project, t);
          item.projectId = p.project.id;
          if (p.created) changes.push(p.created);
        }
      }
      changes.push(put('item', item, t));
      await store.push(changes);
      return text(`Updated “${item.title || 'Untitled'}” [item ${item.id}].`);
    },
  );

  server.registerTool(
    'complete_task',
    {
      title: 'Complete a task',
      description: 'Tick a task off (or untick it with completed=false).',
      inputSchema: z.object({ item: z.string(), completed: z.boolean().default(true) }),
    },
    async ({ item: id, completed }) => {
      const s = await store.load();
      const r = resolveItem(s, id);
      if ('error' in r) return r.error;
      if (r.item.kind !== 'task') {
        return fail(`“${r.item.title}” is a note; notes are not completed.`);
      }
      const t = now();
      const item: Item = { ...r.item, isCompleted: completed, updatedAt: t };
      if (completed) item.completedAt = t;
      else delete item.completedAt;
      await store.push([put('item', item, t)]);
      return text(
        `${completed ? 'Completed' : 'Reopened'} “${item.title || 'Untitled'}” [item ${item.id}].`,
      );
    },
  );

  server.registerTool(
    'move_item',
    {
      title: 'Move a task or note to another person',
      description:
        'Hand a task or note over: it leaves one person and joins another, history included.',
      inputSchema: z.object({ item: z.string(), person: z.string() }),
    },
    async ({ item: id, person: query }) => {
      const s = await store.load();
      const r = resolveItem(s, id);
      if ('error' in r) return r.error;
      const p = resolvePerson(s, query);
      if ('error' in p) return p.error;
      const t = now();
      const siblings = s.items.filter((i) => i.personId === p.person.id);
      const item: Item = {
        ...r.item,
        personId: p.person.id,
        sortOrder: nextSortOrder(siblings),
        updatedAt: t,
      };
      delete item.mapPosition; // placed afresh around the new person
      await store.push([put('item', item, t)]);
      return text(`Moved “${item.title || 'Untitled'}” to ${p.person.name} [item ${item.id}].`);
    },
  );

  server.registerTool(
    'delete_item',
    {
      title: 'Delete a task or note',
      description: 'Remove a task or note for good. Prefer complete_task for finished work.',
      inputSchema: z.object({ item: z.string() }),
      annotations: { destructiveHint: true },
    },
    async ({ item: id }) => {
      const s = await store.load();
      const r = resolveItem(s, id);
      if ('error' in r) return r.error;
      const t = now();
      await store.push([{ id: r.item.id, kind: 'item', data: null, updated_at: t, deleted_at: t }]);
      return text(`Deleted “${r.item.title || 'Untitled'}”.`);
    },
  );

  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'The projects (tags across people) and how many tasks and notes each carries.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const s = await store.load();
      if (!s.projects.length) {
        return text('No projects yet. Add one with create_project, or give a task a project.');
      }
      const lines = s.projects.map((p) => {
        const items = s.items.filter((i) => i.projectId === p.id);
        const open = items.filter((i) => i.kind === 'task' && !i.isCompleted).length;
        const people = new Set(items.map((i) => i.personId)).size;
        return `- ${p.name} · ${items.length} item${
          items.length === 1 ? '' : 's'
        }, ${open} open · ${people} ${people === 1 ? 'person' : 'people'} [project ${p.id}]`;
      });
      return text(lines.join('\n'));
    },
  );

  server.registerTool(
    'create_project',
    {
      title: 'Create a project',
      description:
        'A new project tag. Tasks and notes are added to it by name through add_task, add_note or update_item.',
      inputSchema: z.object({ name: z.string().min(1) }),
    },
    async ({ name }) => {
      const s = await store.load();
      const t = now();
      const p = ensureProject(s, name, t);
      if (!p.created) return text(`“${p.project.name}” already exists [project ${p.project.id}].`);
      await store.push([p.created]);
      return text(`Created project “${p.project.name}” [project ${p.project.id}].`);
    },
  );

  return server;
}
