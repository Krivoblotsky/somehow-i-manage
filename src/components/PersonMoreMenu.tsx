import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { deletePerson } from '../data/repository';
import type { Person } from '../model/types';
import { useUI } from '../state/ui';
import menu from './menu.module.css';

/**
 * The rarer things you do with a person — paste a list, edit, delete — behind one “⋯” button,
 * so the everyday row stays calm. `className` picks the button size (dossier vs panel).
 */
export function PersonMoreMenu({
  person,
  itemCount,
  className,
}: {
  person: Person;
  itemCount: number;
  className: string;
}) {
  const openDialog = useUI((s) => s.openDialog);
  const selectPerson = useUI((s) => s.selectPerson);

  async function remove() {
    const what = itemCount ? ` and their ${itemCount} item${itemCount === 1 ? '' : 's'}` : '';
    if (window.confirm(`Delete ${person.name}${what}? This cannot be undone.`)) {
      await deletePerson(person.id);
      selectPerson(null);
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={className}
          aria-label={`More for ${person.name}`}
          title="More"
        >
          ⋯
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={menu.menu} align="end" sideOffset={6}>
          <DropdownMenu.Item
            className={menu.item}
            onSelect={() => openDialog({ type: 'bulk', personId: person.id })}
          >
            Paste a list…
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={menu.item}
            onSelect={() => openDialog({ type: 'person', personId: person.id })}
          >
            Edit person…
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={menu.separator} />
          <DropdownMenu.Item
            className={`${menu.item} ${menu.danger}`}
            onSelect={() => void remove()}
          >
            Delete person…
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
