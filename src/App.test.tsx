import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { db } from './data/db';
import { useUI } from './state/ui';

beforeEach(async () => {
  await db.items.clear();
  await db.people.clear();
  localStorage.clear();
  useUI.setState({ selectedPersonId: null, selectedItemId: null, search: '', dialog: null });
});

describe('App', () => {
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
