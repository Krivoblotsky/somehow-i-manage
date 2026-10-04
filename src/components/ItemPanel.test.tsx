import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { createItem, createPerson, createProject } from '../data/repository';
import { useUI } from '../state/ui';
import { ItemPanel } from './ItemPanel';
import { PersonPanel } from './PersonPanel';

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.items.clear(), db.projects.clear()]);
  useUI.setState({
    selectedItemId: null,
    selectedPersonId: null,
    personPanelOpen: false,
    projectFocusId: null,
    paneFrom: { item: null, person: null },
  });
});

describe('Back in the side panels', () => {
  it('goes to the person by default, and to the project the item was opened from', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const mipp = await createProject('MIPP');
    const item = await createItem({ personId: vira.id, title: 'Launch', projectId: mipp.id });

    // from the person's panel (or nowhere in particular): Back is the person
    useUI.getState().selectPerson(vira.id);
    useUI.getState().selectItem(item.id, vira.id);
    expect(useUI.getState().paneFrom.item).toBe('person');
    const { unmount } = render(<ItemPanel itemId={item.id} />);
    // the back button, not the "with Vira" link in the body
    await user.click(await screen.findByTitle('Back to Vira'));
    expect(useUI.getState()).toMatchObject({ selectedItemId: null, personPanelOpen: true });
    unmount();

    // from the project's page: Back is the project, and closing the item shows the page again
    useUI.getState().closePanel();
    useUI.getState().focusProject(mipp.id);
    useUI.getState().selectItem(item.id, vira.id, 'project');
    render(<ItemPanel itemId={item.id} />);
    await user.click(await screen.findByTitle('Back to MIPP'));
    expect(useUI.getState()).toMatchObject({
      selectedItemId: null,
      personPanelOpen: false,
      projectFocusId: mipp.id,
    });
  });

  it('works out the origin from what is showing: a card clicked over a lit project goes back to it', async () => {
    const vira = await createPerson({ name: 'Vira' });
    const mipp = await createProject('MIPP');
    const item = await createItem({ personId: vira.id, title: 'Launch', projectId: mipp.id });
    useUI.getState().focusProject(mipp.id);
    useUI.getState().selectItem(item.id, vira.id); // as the map does
    expect(useUI.getState().paneFrom.item).toBe('project');
    useUI.getState().selectPerson(vira.id); // a hub clicked over the project page
    expect(useUI.getState().paneFrom.person).toBe('project');
  });

  it('shows "‹ Project" on a person panel opened from a project page', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const mipp = await createProject('MIPP');
    useUI.getState().focusProject(mipp.id);
    useUI.getState().selectPerson(vira.id, 'project');
    render(<PersonPanel personId={vira.id} />);
    await user.click(await screen.findByRole('button', { name: 'MIPP' }));
    expect(useUI.getState()).toMatchObject({ personPanelOpen: false, projectFocusId: mipp.id });
  });
});
