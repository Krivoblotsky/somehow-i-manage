import * as Dialog from '@radix-ui/react-dialog';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { db } from '../data/db';
import { createItem } from '../data/repository';
import {
  buildResults,
  type PaletteAction,
  type PaletteGroup,
  type PaletteResult,
} from '../model/commandPalette';
import { personColor } from '../model/palette';
import { backupToFile, startOneOnOne } from '../state/actions';
import { useToast } from '../state/toast';
import { useUI } from '../state/ui';
import styles from './CommandPalette.module.css';
import dlg from './dialog.module.css';
import { SearchIcon } from './icons';

const GROUP_LABEL: Record<PaletteGroup, string> = {
  add: 'Add',
  people: 'People',
  items: 'Tasks & notes',
  commands: 'Commands',
};

/** ⌘K: jump to a person or item, run a command, or add a task with "Name: title". */
export function CommandPalette() {
  const dialog = useUI((s) => s.dialog);
  const closeDialog = useUI((s) => s.closeDialog);
  const open = dialog?.type === 'palette';
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeDialog();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={dlg.overlay} />
        <Dialog.Content className={styles.content} aria-describedby={undefined}>
          <Dialog.Title style={{ position: 'absolute', left: -9999 }}>Commands</Dialog.Title>
          {open && <PaletteBody onDone={closeDialog} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody({ onDone }: { onDone: () => void }) {
  const peopleRows = useLiveQuery(() => db.people.orderBy('sortOrder').toArray(), []);
  const itemRows = useLiveQuery(() => db.items.toArray(), []);
  const people = useMemo(() => peopleRows ?? [], [peopleRows]);
  const items = useMemo(() => itemRows ?? [], [itemRows]);
  const view = useUI((s) => s.view);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => buildResults(query, people, items, view),
    [query, people, items, view],
  );
  const clamped = Math.min(active, Math.max(results.length - 1, 0));

  useEffect(() => {
    // scrollIntoView is missing in jsdom; optional call keeps tests honest
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${clamped}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [clamped, results]);

  const byId = new Map(people.map((p) => [p.id, p]));

  async function run(action: PaletteAction) {
    const ui = useUI.getState();
    switch (action.type) {
      case 'person':
        ui.setSearch('');
        ui.selectPerson(action.personId);
        if (ui.view === 'map') ui.focusPerson(action.personId);
        break;
      case 'item':
        ui.setSearch('');
        ui.selectItem(action.itemId, action.personId);
        if (ui.view === 'map') ui.focusPerson(action.personId);
        break;
      case 'add': {
        const item = await createItem({
          personId: action.personId,
          kind: action.kind,
          title: action.title,
        });
        const owner = byId.get(action.personId);
        const link = action.kind === 'task' ? 'with' : 'about';
        useToast
          .getState()
          .show(`Added ${action.kind} “${action.title}” ${link} ${owner?.name ?? 'them'}`, {
            actionLabel: 'Open',
            onAction: () => useUI.getState().selectItem(item.id, action.personId),
          });
        break;
      }
      case 'meeting':
        onDone();
        void startOneOnOne(action.personId);
        return;
      case 'command':
        switch (action.command) {
          case 'new-person':
            onDone();
            ui.openDialog({ type: 'person' });
            return;
          case 'restore':
            onDone();
            ui.openDialog({ type: 'restore' });
            return;
          case 'view-map':
            ui.setView('map');
            break;
          case 'view-list':
            ui.setView('list');
            break;
          case 'backup':
            void backupToFile();
            break;
        }
    }
    onDone();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = results[clamped];
      if (chosen) void run(chosen.action);
    }
  }

  const rows = results.map((r, index) => ({
    r,
    header: index === 0 || results[index - 1].group !== r.group ? GROUP_LABEL[r.group] : null,
  }));

  return (
    <>
      <div className={styles.inputRow}>
        <SearchIcon size={18} />
        <input
          className={styles.input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a person, find a task, or type “Vira: prepare the review”"
          aria-label="Command palette"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className={styles.list} role="listbox" aria-label="Results" ref={listRef}>
        {results.length === 0 && <div className={styles.empty}>Nothing matches “{query}”.</div>}
        {rows.map(({ r, header }, index) => (
          <ResultRow
            key={r.id}
            result={r}
            index={index}
            header={header}
            selected={index === clamped}
            color={r.personId ? personColor(byId.get(r.personId)?.colorIndex ?? 0) : undefined}
            onHover={() => setActive(index)}
            onRun={() => void run(r.action)}
          />
        ))}
      </div>
      <div className={styles.footer}>
        <span>
          <kbd>↑↓</kbd> move
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>
          <kbd>esc</kbd> close
        </span>
      </div>
    </>
  );
}

function ResultRow({
  result,
  index,
  header,
  selected,
  color,
  onHover,
  onRun,
}: {
  result: PaletteResult;
  index: number;
  header: string | null;
  selected: boolean;
  color?: string;
  onHover: () => void;
  onRun: () => void;
}) {
  return (
    <>
      {header && <div className={styles.group}>{header}</div>}
      <div
        className={styles.option}
        role="option"
        aria-selected={selected}
        data-index={index}
        onMouseMove={onHover}
        onClick={onRun}
      >
        {color && <span className={styles.dot} style={{ background: color }} aria-hidden="true" />}
        <span className={styles.label}>{result.label}</span>
        {result.hint && <span className={styles.hint}>{result.hint}</span>}
      </div>
    </>
  );
}
