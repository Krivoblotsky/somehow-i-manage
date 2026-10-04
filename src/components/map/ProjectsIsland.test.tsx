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

  it('is folded until the pointer comes in, stays open for a lit project, folds when it is unlit', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const mipp = await createProject('MIPP');
    await createItem({ personId: vira.id, title: 'a', projectId: mipp.id });
    render(<ProjectsIsland items={await db.items.toArray()} />);
    const island = await screen.findByRole('complementary', { name: 'Projects' });
    expect(island).toHaveAttribute('data-open', 'false');

    await user.hover(island);
    expect(island).toHaveAttribute('data-open', 'true');
    await user.unhover(island);
    expect(island).toHaveAttribute('data-open', 'false');

    // a lit project holds it open, pointer or not
    await user.hover(island);
    await user.click(screen.getByRole('button', { name: /MIPP/ }));
    await user.unhover(island);
    expect(island).toHaveAttribute('data-open', 'true');

    // unlit under the pointer (clicking the lit row again): it folds right away and waits for
    // the pointer to leave once. (Not "Show all" here: that button unmounts under the pointer,
    // which the test tooling cannot follow; browsers handle it.)
    await user.hover(island);
    await user.click(screen.getByRole('button', { name: /MIPP/ }));
    expect(useUI.getState().projectFocusId).toBeNull();
    expect(island).toHaveAttribute('data-open', 'false');
    await user.unhover(island);
    await user.hover(island);
    expect(island).toHaveAttribute('data-open', 'true');

    // the title opens it for a tap, and keyboard focus holds it
    await user.unhover(island);
    await user.click(screen.getByRole('button', { name: 'Projects' }));
    expect(island).toHaveAttribute('data-open', 'true');
  });

  it('renders nothing without projects', async () => {
    const { container } = render(<ProjectsIsland items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
