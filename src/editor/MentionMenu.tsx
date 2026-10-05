import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { createRoot, type Root } from 'react-dom/client';
import { MentionList } from './MentionList';
import styles from './MentionMenu.module.css';
import type { MentionItem } from './mentions';

/** Where the menu goes: under the caret, or above it when the screen runs out. */
function place(el: HTMLElement, rect: DOMRect | null) {
  if (!rect) return;
  const width = 280;
  const left = Math.min(rect.left, window.innerWidth - width - 12);
  const below = rect.bottom + 6;
  const fitsBelow = below + 260 < window.innerHeight;
  el.style.left = `${Math.max(12, left)}px`;
  if (fitsBelow) {
    el.style.top = `${below}px`;
    el.style.bottom = 'auto';
  } else {
    el.style.top = 'auto';
    el.style.bottom = `${window.innerHeight - rect.top + 6}px`;
  }
}

/**
 * The imperative half TipTap's suggestion plugin wants: a floating React list that follows the
 * caret, moves with the arrow keys, picks with Enter or Tab, and goes away on Escape.
 */
export function mentionMenu(empty: string) {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  let items: MentionItem[] = [];
  let selected = 0;
  let command: ((item: MentionItem) => void) | null = null;

  const draw = () => {
    if (!root) return;
    root.render(
      <MentionList
        items={items}
        selected={selected}
        empty={empty}
        onHover={(index) => {
          selected = index;
          draw();
        }}
        onPick={(item) => command?.(item)}
      />,
    );
  };
  const update = (props: SuggestionProps<MentionItem>) => {
    items = props.items;
    command = (item) => props.command(item);
    selected = Math.min(selected, Math.max(0, items.length - 1));
    if (container) place(container, props.clientRect?.() ?? null);
    draw();
  };
  const destroy = () => {
    root?.unmount();
    root = null;
    container?.remove();
    container = null;
  };

  return {
    onStart(props: SuggestionProps<MentionItem>) {
      container = document.createElement('div');
      container.className = styles.menu;
      document.body.appendChild(container);
      root = createRoot(container);
      selected = 0;
      update(props);
    },
    onUpdate(props: SuggestionProps<MentionItem>) {
      update(props);
    },
    onKeyDown({ event }: SuggestionKeyDownProps) {
      if (event.key === 'Escape') {
        destroy();
        return true;
      }
      if (items.length === 0) return false;
      if (event.key === 'ArrowDown') {
        selected = (selected + 1) % items.length;
        draw();
        return true;
      }
      if (event.key === 'ArrowUp') {
        selected = (selected - 1 + items.length) % items.length;
        draw();
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        command?.(items[selected]);
        return true;
      }
      return false;
    },
    onExit() {
      destroy();
    },
  };
}
