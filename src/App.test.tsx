import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { db } from './data/db';
import { useToast } from './state/toast';
import { useUI } from './state/ui';
import { useSync } from './sync/store';

beforeEach(async () => {
  await db.items.clear();
  await db.people.clear();
  localStorage.clear();
  useToast.getState().dismiss();
  // Tests run as a signed-in account; the backend itself is faked away (see vite.config test.env).
  useSync.setState({
    configured: true,
    ready: true,
    user: { id: 'test-user', email: 'test@example.com' },
    authError: null,
    phase: 'idle',
    online: true,
    pending: 0,
    lastSyncedAt: null,
    error: null,
  });
  useUI.setState({
    view: 'list',
    selectedPersonId: null,
    selectedItemId: null,
    personPanelOpen: false,
    focusRequest: null,
    search: '',
    dialog: null,
  });
});

describe('App (list view)', () => {
  it('shows the empty state, loads sample data and opens the first person', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText(/add your first person/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load sample data/i }));

    expect(await screen.findByRole('heading', { name: 'Vira' })).toBeInTheDocument();
    expect(screen.getByText(/3 tasks, 1 urgent, 2 done, 1 note/)).toBeInTheDocument();
    // header avatars for all three people
    const people = screen.getByLabelText('People');
    expect(within(people).getAllByRole('button')).toHaveLength(3);
  });

  it('adds a person through the dialog and selects them', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);

    await user.click(screen.getByRole('button', { name: 'Add a person' }));
    await user.type(screen.getByLabelText(/^name/i), 'Sergii');
    await user.click(screen.getByRole('button', { name: 'Add person' }));

    expect(await screen.findByRole('heading', { name: 'Sergii' })).toBeInTheDocument();
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(await db.people.count()).toBe(1);
  });

  it('marks a task completed from the list', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByRole('heading', { name: 'Vira' });

    await user.click(screen.getAllByRole('button', { name: 'Mark as completed' })[0]);

    expect(await screen.findByText(/2 tasks, 3 done, 1 note/)).toBeInTheDocument();
  });
});

describe('App (list view) — person contacts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves an email from the dialog and shows it as a mailto link', async () => {
    // Gravatar lookups must never reach the network from tests.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);

    await user.click(screen.getByRole('button', { name: 'Add a person' }));
    await user.type(screen.getByLabelText(/^name/i), 'Sergii');
    await user.type(screen.getByLabelText('Email'), 'sergii@example.com');
    await user.click(screen.getByRole('button', { name: 'Add person' }));

    const link = await screen.findByRole('link', { name: 'Email: sergii@example.com' });
    expect(link).toHaveAttribute('href', 'mailto:sergii@example.com');
    const saved = (await db.people.toArray())[0];
    expect(saved.contacts).toEqual([{ kind: 'email', value: 'sergii@example.com' }]);
  });
});

describe('App — sign-in gate', () => {
  it('asks for a Google sign-in before showing anything', () => {
    useSync.setState({ user: null });
    render(<App />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.queryByLabelText('People')).not.toBeInTheDocument();
    expect(screen.queryByText(/add your first person/i)).not.toBeInTheDocument();
  });

  it('shows what went wrong when Google sent us back with an error', () => {
    useSync.setState({ user: null, authError: 'access_denied: the user cancelled' });
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('access_denied');
  });

  it('waits quietly while the saved session is being checked', () => {
    useSync.setState({ ready: false, user: null });
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('People')).not.toBeInTheDocument();
  });

  it('tells developers when the build has no backend', () => {
    useSync.setState({ configured: false });
    render(<App />);
    expect(screen.getByText('This build has no backend')).toBeInTheDocument();
  });

  it('shows the account menu once signed in', async () => {
    render(<App />);
    await screen.findByText(/add your first person/i);
    expect(screen.getByRole('button', { name: 'Account: test@example.com' })).toBeInTheDocument();
  });
});

describe('App — item context menu in the list', () => {
  it('right-click offers Delete and Move to another person', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByRole('heading', { name: 'Vira' });

    fireEvent.contextMenu(screen.getByText('Business Trip'));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Deleted “Business Trip”');
    expect(screen.queryByText('Business Trip')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByText('Salary Review'));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to…' }));
    // A plain click: user-event would first "travel" the pointer from the trigger into the
    // submenu, and without real geometry in jsdom Radix reads that as leaving the menu.
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Nata' }));
    expect(await screen.findByText('Moved “Salary Review” to Nata')).toBeInTheDocument();
    const moved = (await db.items.toArray()).find((i) => i.title === 'Salary Review');
    const nata = (await db.people.toArray()).find((p) => p.name === 'Nata');
    expect(moved?.personId).toBe(nata?.id);
  });
});

describe('App — quick add and palette', () => {
  it('adds tasks and notes from the inline field without opening the editor', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByRole('heading', { name: 'Vira' });
    const before = await db.items.count();

    const field = screen.getByLabelText('Add a task with Vira');
    await user.type(field, 'Prepare the deck{Enter}');
    expect(await screen.findByText('Prepare the deck')).toBeInTheDocument();
    expect(field).toHaveValue('');
    expect(screen.queryByRole('region', { name: 'Task details' })).not.toBeInTheDocument();

    await user.type(field, 'Likes async work{Shift>}{Enter}{/Shift}');
    expect(await screen.findByText('Likes async work')).toBeInTheDocument();
    const added = (await db.items.toArray()).filter((i) => i.title === 'Likes async work');
    expect(added[0]?.kind).toBe('note');
    expect(await db.items.count()).toBe(before + 2);
  });

  it('jumps to a person and adds a task through the palette', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByRole('heading', { name: 'Vira' });

    useUI.getState().openDialog({ type: 'palette' });
    const input = await screen.findByRole('textbox', { name: 'Command palette' });
    await user.type(input, 'Nata{Enter}');
    expect(await screen.findByRole('heading', { name: 'Nata' })).toBeInTheDocument();

    useUI.getState().openDialog({ type: 'palette' });
    await user.type(
      await screen.findByLabelText('Command palette'),
      'Vira: Book the offsite{Enter}',
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Added task “Book the offsite” with Vira',
    );
    const created = (await db.items.toArray()).find((i) => i.title === 'Book the offsite');
    expect(created?.kind).toBe('task');
  });
});

describe('App — backup restore', () => {
  it('merges a backup file chosen in the restore dialog', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    useUI.getState().openDialog({ type: 'restore' });

    const backup = {
      app: 'somehow-i-manage',
      version: 1,
      exportedAt: '2026-09-30T10:00:00.000Z',
      people: [{ id: 'p1', name: 'Vira', colorIndex: 0, sortOrder: 0, createdAt: 1, updatedAt: 1 }],
      items: [
        {
          id: 'i1',
          personId: 'p1',
          kind: 'task',
          title: 'Ship it',
          body: '',
          isCompleted: false,
          isFlagged: false,
          sortOrder: 0,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    };
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    await user.upload(await screen.findByLabelText('Backup file'), file);

    expect(await screen.findByText('backup.json', { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Merge into my data' }));

    expect(await screen.findByRole('heading', { name: 'Vira' })).toBeInTheDocument();
    expect(await db.items.count()).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('Restored 1 people and 1 items');
  });
});

describe('App (list view) — completed items', () => {
  it('deletes a completed task from the list and brings it back with Undo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByRole('heading', { name: 'Vira' });
    const before = await db.items.count();

    await user.click(screen.getAllByRole('button', { name: 'Delete completed task' })[0]);

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent(/^Deleted “/);
    expect(await db.items.count()).toBe(before - 1);

    await user.click(within(toast).getByRole('button', { name: 'Undo' }));
    expect(await db.items.count()).toBe(before);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('App (map view)', () => {
  it('renders every person and card on the map and opens a card in the panel', async () => {
    useUI.setState({ view: 'map' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));

    const map = await screen.findByTestId('people-map');
    expect(await within(map).findByText('Nata')).toBeInTheDocument();
    expect(within(map).getByText('Anton')).toBeInTheDocument();
    expect(within(map).getByText('Launch MIPP')).toBeInTheDocument();
    expect(within(map).getByText('Team Restructuring')).toBeInTheDocument();
    // 11 sample items → 11 edges
    expect(map.querySelectorAll('.react-flow__edge')).toHaveLength(11);

    // fireEvent: user-event's mousedown has no `view`, which trips d3-drag in jsdom.
    fireEvent.click(within(map).getByText('Salary Review'));
    const panel = await screen.findByRole('region', { name: 'Task details' });
    expect(within(panel).getByLabelText('Title')).toHaveValue('Salary Review');
  });

  it('creates a card from a hub and edits its title in place, without opening the panel', async () => {
    useUI.setState({ view: 'map' });
    const user = userEvent.setup();
    // StrictMode rehearses mount → unmount → mount; the editor must not treat that as leaving.
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    const map = await screen.findByTestId('people-map');
    await within(map).findByText('Anton');

    fireEvent.click(within(map).getByRole('button', { name: 'New task with Anton' }));
    const input = await within(map).findByRole('textbox', { name: 'Task title' });
    await user.type(input, 'Talk about the promo{Enter}');

    expect(await within(map).findByText('Talk about the promo')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Task details' })).not.toBeInTheDocument();
    const created = (await db.items.toArray()).find((i) => i.title === 'Talk about the promo');
    expect(created?.kind).toBe('task');

    // Escape on an empty new card removes it again
    const before = await db.items.count();
    fireEvent.click(within(map).getByRole('button', { name: 'New task with Anton' }));
    const second = await within(map).findByRole('textbox', { name: 'Task title' });
    await user.type(second, '{Escape}');
    await new Promise((r) => setTimeout(r, 50));
    expect(await db.items.count()).toBe(before);
  });

  it('renaming a card on the map updates the same item open in the panel', async () => {
    useUI.setState({ view: 'map' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    const map = await screen.findByTestId('people-map');
    const card = await within(map).findByText('Salary Review');

    fireEvent.click(card);
    const panel = await screen.findByRole('region', { name: 'Task details' });
    expect(within(panel).getByLabelText('Title')).toHaveValue('Salary Review');

    fireEvent.doubleClick(card);
    const input = await within(map).findByRole('textbox', { name: 'Task title' });
    await user.clear(input);
    await user.type(input, 'Salary Review 2{Enter}');

    expect(await within(map).findByText('Salary Review 2')).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(within(panel).getByLabelText('Title')).toHaveValue('Salary Review 2'),
    );
  });

  it('switches to the list view from the header', async () => {
    useUI.setState({ view: 'map' });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByTestId('people-map');

    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(await screen.findByRole('heading', { name: 'Vira' })).toBeInTheDocument();
  });
});

describe('App — 1:1 mode', () => {
  async function discussOrder(agenda: HTMLElement) {
    return within(agenda)
      .getAllByRole('button', { name: /discussed: /i })
      .map((b) => b.getAttribute('aria-label')?.split(': ')[1]);
  }

  it('runs a 1:1: agenda, discussed marks, capture, recap, and records it on the person', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/add your first person/i);
    await user.click(screen.getByRole('button', { name: /load sample data/i }));
    await screen.findByRole('heading', { name: 'Vira' });
    expect(screen.getByText(/Last 1:1 12 days ago/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start 1:1' }));
    const meeting = await screen.findByTestId('one-on-one');
    const agenda = within(meeting).getByRole('region', { name: 'Agenda' });
    // urgent task first, then the other open tasks, then the note
    expect(await discussOrder(agenda)).toEqual([
      'Promotion',
      'Salary Review',
      'Business Trip',
      'Retro takeaways',
    ]);
    // two of them appeared since the last 1:1
    expect(within(agenda).getAllByText('new')).toHaveLength(2);
    // and two tasks got done since then
    const since = within(meeting).getByRole('region', { name: 'Since last 1:1' });
    expect(within(since).getByText('Launch MIPP')).toBeInTheDocument();
    expect(within(since).getByText('Complete Job Description')).toBeInTheDocument();

    // marking something as discussed sinks it to the bottom
    await user.click(
      within(agenda).getByRole('button', { name: 'Mark as discussed: Business Trip' }),
    );
    await vi.waitFor(async () =>
      expect(await discussOrder(agenda)).toEqual([
        'Promotion',
        'Salary Review',
        'Retro takeaways',
        'Business Trip',
      ]),
    );

    // ticking a task keeps it on the agenda, greyed
    const salary = within(agenda)
      .getByText('Salary Review')
      .closest<HTMLElement>('[role="button"]');
    if (!salary) throw new Error('no card');
    await user.click(within(salary).getByRole('button', { name: 'Mark as completed' }));
    await vi.waitFor(() =>
      expect(
        within(salary).getByRole('button', { name: 'Mark as not completed' }),
      ).toBeInTheDocument(),
    );
    expect(within(agenda).getByText('Salary Review')).toBeInTheDocument();

    // whatever comes up is captured next to the box, not in the agenda
    const capture = within(meeting).getByRole('region', { name: 'Capture' });
    await user.type(
      within(capture).getByLabelText('Add a task with Vira'),
      'Follow up on budget{Enter}',
    );
    expect(await within(capture).findByText('Follow up on budget')).toBeInTheDocument();
    expect(within(agenda).queryByText('Follow up on budget')).not.toBeInTheDocument();

    // looking at the map does not end it; the header pill brings you back
    await user.click(screen.getByRole('button', { name: 'Map' }));
    await user.click(await screen.findByRole('button', { name: /1:1 with Vira/ }));
    await screen.findByTestId('one-on-one');

    // ending records it on the person and sums up
    await user.click(screen.getByRole('button', { name: 'End 1:1' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      '1:1 with Vira ended · 1 discussed, 1 done, 1 added',
    );
    const vira = (await db.people.toArray()).find((p) => p.name === 'Vira');
    expect(vira?.meetings).toHaveLength(2);
    expect(screen.queryByTestId('one-on-one')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Start 1:1' })).toBeInTheDocument();
  });
});
