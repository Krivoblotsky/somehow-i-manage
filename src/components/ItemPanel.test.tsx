import { render, screen, within } from '@testing-library/react';
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

  it('goes back to the item a link was followed from, then on to where that one came from', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const yana = await createPerson({ name: 'Yana' });
    const trip = await createItem({ personId: vira.id, title: 'Business Trip' });
    const suite = await createItem({ personId: yana.id, title: 'Regression suite' });
    useUI.getState().selectPerson(vira.id);
    useUI.getState().selectItem(trip.id, vira.id); // from Vira's panel
    useUI.getState().selectItem(suite.id, undefined, 'item'); // a "#Regression suite" chip in its text
    expect(useUI.getState()).toMatchObject({
      selectedItemId: suite.id,
      selectedPersonId: vira.id, // the spotlight stays where we were
      paneFrom: { item: 'item' },
      returnItem: { id: trip.id, personId: vira.id, from: 'person' },
    });
    const { unmount } = render(<ItemPanel itemId={suite.id} />);
    await user.click(await screen.findByTitle('Back to Business Trip'));
    expect(useUI.getState()).toMatchObject({
      selectedItemId: trip.id,
      paneFrom: { item: 'person' },
      returnItem: null,
    });
    unmount();
    render(<ItemPanel itemId={trip.id} />);
    expect(await screen.findByTitle('Back to Vira')).toBeInTheDocument();
  });

  it('lists the tasks and notes that link here, and follows one as a link', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const yana = await createPerson({ name: 'Yana' });
    const suite = await createItem({ personId: yana.id, title: 'Regression suite' });
    const trip = await createItem({
      personId: vira.id,
      title: 'Business Trip',
      body: `<p>Depends on <span data-type="itemMention" data-id="${suite.id}" data-label="Regression suite">#Regression suite</span></p>`,
    });
    await createItem({ personId: vira.id, title: 'Unrelated', body: '<p>nothing</p>' });
    useUI.getState().selectPerson(yana.id);
    useUI.getState().selectItem(suite.id, yana.id);
    render(<ItemPanel itemId={suite.id} />);
    const section = await screen.findByRole('region', { name: 'Also mentioned in' });
    expect(section).toHaveTextContent('Also mentioned in · 1');
    expect(within(section).getByText('Business Trip')).toBeInTheDocument();
    expect(within(section).getByText('Vira')).toBeInTheDocument(); // whose it is
    expect(within(section).queryByText('Unrelated')).not.toBeInTheDocument();
    await user.click(within(section).getByText('Business Trip'));
    expect(useUI.getState()).toMatchObject({
      selectedItemId: trip.id,
      paneFrom: { item: 'item' },
      returnItem: { id: suite.id },
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
