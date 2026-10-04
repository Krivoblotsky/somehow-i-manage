import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { createItem, createPerson, createProject } from '../data/repository';
import type { Item } from '../model/types';
import { ProjectPicker } from './ProjectPicker';

let item: Item;

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.items.clear(), db.projects.clear()]);
  const vira = await createPerson({ name: 'Vira' });
  item = await createItem({ personId: vira.id, title: 'Launch' });
});

describe('ProjectPicker', () => {
  it('picks an existing project, shows it on the pill, and can take it off again', async () => {
    const user = userEvent.setup();
    const mipp = await createProject('MIPP');
    await createProject('Hiring');
    const { rerender } = render(<ProjectPicker item={item} />);

    await user.click(screen.getByRole('button', { name: 'Set a project' }));
    const box = screen.getByRole('combobox', { name: 'Find or create a project' });
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.type(box, 'mi');
    // the match, plus the offer to create exactly what was typed; Enter takes the match
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'MIPP',
      '+Create “mi”',
    ]);
    await user.keyboard('{Enter}');

    await waitFor(async () => expect((await db.items.get(item.id))?.projectId).toBe(mipp.id));
    item = (await db.items.get(item.id))!;
    rerender(<ProjectPicker item={item} />);
    expect(
      await screen.findByRole('button', { name: 'Project: MIPP. Change project' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Project: MIPP. Change project' }));
    await user.click(screen.getByRole('option', { name: 'No project' }));
    await waitFor(async () => expect((await db.items.get(item.id))?.projectId).toBeUndefined());
  });

  it('creates a project from what was typed', async () => {
    const user = userEvent.setup();
    render(<ProjectPicker item={item} />);
    await user.click(screen.getByRole('button', { name: 'Set a project' }));
    await user.type(screen.getByRole('combobox'), 'Release 2.1');
    expect(screen.getByRole('option', { name: 'Create “Release 2.1”' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await waitFor(async () => {
      const projects = await db.projects.toArray();
      expect(projects.map((p) => p.name)).toEqual(['Release 2.1']);
      expect((await db.items.get(item.id))?.projectId).toBe(projects[0].id);
    });
  });
});
