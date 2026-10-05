import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db';
import { createItem, createPerson, deleteItem, updatePerson } from '../data/repository';
import { useUI } from '../state/ui';
import { BodyPreview } from './BodyPreview';

const mention = (type: string, id: string, label: string) =>
  `<span data-type="${type}" data-id="${id}" data-label="${label}">${type === 'personMention' ? '@' : '#'}${label}</span>`;

beforeEach(async () => {
  await Promise.all([db.people.clear(), db.items.clear(), db.projects.clear()]);
  useUI.setState({
    selectedPersonId: null,
    selectedItemId: null,
    personPanelOpen: false,
    projectFocusId: null,
    view: 'map',
  });
});

describe('BodyPreview', () => {
  it('joins blocks with a dot and makes mentions open what they name, without clicking the card', async () => {
    const user = userEvent.setup();
    const vira = await createPerson({ name: 'Vira' });
    const trip = await createItem({ personId: vira.id, title: 'Business Trip' });
    const body =
      `<ul><li><p>Check with ${mention('personMention', vira.id, 'Vira')}</p></li>` +
      `<li><p>Blocked by ${mention('itemMention', trip.id, 'Business Trip')}</p></li></ul>`;
    const outer = { clicks: 0 };
    render(
      <div onClick={() => outer.clicks++}>
        <BodyPreview html={body} />
      </div>,
    );
    expect(screen.getByText(/· Blocked by/)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '@Vira' }));
    expect(useUI.getState()).toMatchObject({ selectedPersonId: vira.id, personPanelOpen: true });
    expect(outer.clicks).toBe(0);

    await user.click(screen.getByRole('button', { name: '#Business Trip' }));
    expect(useUI.getState().selectedItemId).toBe(trip.id);
  });

  it('shows current names and titles, and plain text for what was deleted', async () => {
    const vira = await createPerson({ name: 'Vira' });
    const trip = await createItem({ personId: vira.id, title: 'Business Trip' });
    const body = `<p>${mention('personMention', vira.id, 'Vira')} ${mention('itemMention', trip.id, 'Business Trip')}</p>`;
    render(<BodyPreview html={body} />);
    await screen.findByRole('button', { name: '#Business Trip' });

    await updatePerson(vira.id, { name: 'Vira Kovalenko' });
    expect(await screen.findByRole('button', { name: '@Vira Kovalenko' })).toBeInTheDocument();
    await deleteItem(trip.id);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '#Business Trip' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('#Business Trip')).toBeInTheDocument(); // still readable, just text
  });

  it('renders nothing for an empty body', () => {
    const { container } = render(<BodyPreview html="<p></p>" />);
    expect(container).toBeEmptyDOMElement();
  });
});
