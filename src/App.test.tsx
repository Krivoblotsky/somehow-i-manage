import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { db } from './data/db';
import { useToast } from './state/toast';
import { useUI } from './state/ui';

beforeEach(async () => {
  await db.items.clear();
  await db.people.clear();
  localStorage.clear();
  useToast.getState().dismiss();
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
    expect(screen.getByText('3 tasks, 1 urgent, 2 done, 1 note')).toBeInTheDocument();
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

    expect(await screen.findByText('2 tasks, 3 done, 1 note')).toBeInTheDocument();
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
