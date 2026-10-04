import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../data/db';
import { createItem, createPerson, createProject } from '../data/repository';
import { useUI } from '../state/ui';
import { ProjectPanel } from './ProjectPanel';

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.items.clear(), db.projects.clear()]);
  useUI.setState({ selectedItemId: null, selectedPersonId: null, personPanelOpen: false });
});

describe('ProjectPanel', () => {
  it('groups the project’s items by person, opens an item, and closes by unlighting', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const anton = await createPerson({ name: 'Anton' });
    const mipp = await createProject('MIPP');
    const other = await createProject('Hiring');
    const launch = await createItem({ personId: vira.id, title: 'Launch', projectId: mipp.id });
    await createItem({ personId: vira.id, title: 'Patents', kind: 'note', projectId: mipp.id });
    await createItem({ personId: anton.id, title: 'Budget', projectId: mipp.id });
    await createItem({ personId: anton.id, title: 'Elsewhere', projectId: other.id });
    await createItem({ personId: anton.id, title: 'Untagged' });
    useUI.setState({ projectFocusId: mipp.id });
    render(<ProjectPanel projectId={mipp.id} />);

    expect(await screen.findByRole('heading', { name: 'MIPP' })).toBeInTheDocument();
    expect(screen.getByText('3 items, 2 open · 2 people')).toBeInTheDocument();
    const groups = screen.getAllByRole('region', { name: /^With / });
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['With Vira', 'With Anton']);
    expect(screen.getByText('Launch')).toBeInTheDocument();
    expect(screen.getByText('Patents')).toBeInTheDocument();
    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();
    expect(screen.queryByText('Untagged')).not.toBeInTheDocument();

    await user.click(screen.getByText('Launch'));
    expect(useUI.getState().selectedItemId).toBe(launch.id);
    expect(useUI.getState().selectedPersonId).toBe(vira.id);

    await user.click(screen.getByRole('button', { name: 'Open Vira' }));
    expect(useUI.getState().personPanelOpen).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(useUI.getState().projectFocusId).toBeNull();
  });

  it('renames in place and deletes after confirming', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const mipp = await createProject('MIPP');
    await createItem({ personId: vira.id, title: 'Launch', projectId: mipp.id });
    useUI.setState({ projectFocusId: mipp.id });
    render(<ProjectPanel projectId={mipp.id} />);
    await screen.findByRole('heading', { name: 'MIPP' });

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    const field = screen.getByRole('textbox', { name: 'Project name' });
    await user.clear(field);
    await user.type(field, 'MIPP 2026{Enter}');
    expect(await screen.findByRole('heading', { name: 'MIPP 2026' })).toBeInTheDocument();
    expect((await db.projects.get(mipp.id))?.name).toBe('MIPP 2026');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'More for MIPP 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete project' }));
    await waitFor(async () => expect(await db.projects.get(mipp.id)).toBeUndefined());
    expect(useUI.getState().projectFocusId).toBeNull();
    expect((await db.items.toArray())[0].projectId).toBeUndefined();
  });
});
