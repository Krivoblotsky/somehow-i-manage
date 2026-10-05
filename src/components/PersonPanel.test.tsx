import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { createItem, createPerson } from '../data/repository';
import { useUI } from '../state/ui';
import { ItemPanel } from './ItemPanel';
import { PersonPanel } from './PersonPanel';
import { PersonView } from './PersonView';

const mention = (id: string, label: string) =>
  `<span data-type="personMention" data-id="${id}" data-label="${label}">@${label}</span>`;

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

describe('Also mentioned in', () => {
  it("lists other people's items that @mention the person, with whose they are", async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const yana = await createPerson({ name: 'Yana Vdovenko' });
    const about = await createItem({
      personId: yana.id,
      title: 'Handover',
      body: `<p>Check with ${mention(vira.id, 'Vira')} first</p>`,
    });
    await createItem({ personId: yana.id, title: 'Unrelated', body: '<p>nothing</p>' });
    await createItem({
      personId: vira.id,
      title: 'Own task',
      body: `<p>${mention(vira.id, 'Vira')}</p>`,
    });

    useUI.getState().selectPerson(vira.id);
    render(<PersonPanel personId={vira.id} />);
    const section = (await screen.findByText('Also mentioned in · 1')).parentElement!;
    expect(within(section).getByText('Handover')).toBeInTheDocument();
    expect(within(section).getByText('Yana Vdovenko')).toBeInTheDocument();
    expect(within(section).queryByText('Unrelated')).not.toBeInTheDocument();

    // opening it keeps Vira as where we came from, so Back returns to her page
    await user.click(within(section).getByText('Handover'));
    expect(useUI.getState()).toMatchObject({ selectedItemId: about.id, selectedPersonId: vira.id });
    render(<ItemPanel itemId={about.id} />);
    expect(await screen.findByTitle('Back to Vira')).toBeInTheDocument();
    expect(screen.getByTitle('Open Yana Vdovenko')).toBeInTheDocument(); // "with Yana" stays the owner
  });

  it('shows the section on the person page in the list view too, and not when nobody mentions them', async () => {
    const vira = await createPerson({ name: 'Vira' });
    const yana = await createPerson({ name: 'Yana Vdovenko' });
    const { unmount } = render(<PersonView personId={vira.id} />);
    await screen.findByRole('heading', { name: 'Vira' });
    expect(screen.queryByText(/Also mentioned in/)).not.toBeInTheDocument();
    unmount();

    await createItem({
      personId: yana.id,
      title: 'Plan',
      body: `<p>${mention(vira.id, 'Vira')}</p>`,
    });
    render(<PersonView personId={vira.id} />);
    expect(await screen.findByText('Also mentioned in')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });
});
