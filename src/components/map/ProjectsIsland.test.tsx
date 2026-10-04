import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import { createItem, createPerson, createProject } from '../../data/repository';
import { useUI } from '../../state/ui';
import { ProjectsIsland } from './ProjectsIsland';

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.items.clear(), db.projects.clear()]);
  useUI.setState({ projectFocusId: null });
});

describe('ProjectsIsland', () => {
  it('lists projects with counts, busiest first, and toggles the spotlight', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const mipp = await createProject('MIPP');
    const hiring = await createProject('Hiring');
    await createItem({ personId: vira.id, title: 'a', projectId: hiring.id });
    await createItem({ personId: vira.id, title: 'b', projectId: hiring.id });
    await createItem({ personId: vira.id, title: 'c', projectId: mipp.id });
    const items = await db.items.toArray();
    render(<ProjectsIsland items={items} />);

    const rows = await screen.findAllByRole('button', { pressed: false });
    expect(rows.map((r) => r.textContent)).toEqual(['Hiring2', 'MIPP1']);

    await user.click(screen.getByRole('button', { name: /Hiring/ }));
    expect(useUI.getState().projectFocusId).toBe(hiring.id);
    expect(screen.getByRole('button', { name: /Hiring/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Show all' }));
    expect(useUI.getState().projectFocusId).toBeNull();
  });

  it('renders nothing without projects', async () => {
    const { container } = render(<ProjectsIsland items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
