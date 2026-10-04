import { useRef, useState, type KeyboardEvent } from 'react';
import { createItem } from '../data/repository';
import type { ItemKind } from '../model/types';
import { useDictation } from '../state/dictation';
import { useUI } from '../state/ui';
import { MicButton } from './MicButton';
import styles from './QuickAdd.module.css';

/** "base" is what was typed before the mic was pressed; dictation continues after it. */
const join = (base: string, spoken: string): string => (base ? `${base} ${spoken}` : spoken);

interface QuickAddProps {
  personId: string;
  personName: string;
  tone?: 'dark' | 'light';
}

/**
 * Type a title, press Enter: the task exists and the field is ready for the next one.
 * Shift+Enter makes a note, ⌘/Ctrl+Enter also opens the new item in the editor. The mic dictates
 * into the same field: speak, pause, then Enter as usual.
 */
export function QuickAdd({ personId, personName, tone = 'dark' }: QuickAddProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const selectItem = useUI((s) => s.selectItem);
  const inputRef = useRef<HTMLInputElement>(null);
  const spokenAfter = useRef('');
  const dictation = useDictation((text, isFinal) => {
    setValue(join(spokenAfter.current, text));
    if (isFinal) inputRef.current?.focus(); // so Enter saves it, like anything typed
  });
  function onMic() {
    spokenAfter.current = value.trim();
    dictation.toggle();
  }

  async function submit(kind: ItemKind, open: boolean) {
    const title = value.trim();
    if (!title) return;
    setValue('');
    const item = await createItem({ personId, kind, title });
    if (open) selectItem(item.id, personId);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit(e.shiftKey ? 'note' : 'task', e.metaKey || e.ctrlKey);
    } else if (e.key === 'Escape' && value) {
      // clear first; a second Escape reaches the app and closes panels as usual
      e.preventDefault();
      e.stopPropagation();
      setValue('');
    }
  }

  return (
    <div className={tone === 'light' ? `${styles.wrap} ${styles.light}` : styles.wrap}>
      <span className={styles.plus} aria-hidden="true">
        +
      </span>
      <input
        ref={inputRef}
        className={styles.input}
        value={value}
        placeholder={dictation.listening ? 'Listening…' : `Something to do with ${personName}…`}
        aria-label={`Add a task with ${personName}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      {dictation.error ? (
        <span className={styles.problem} role="status">
          {dictation.error}
        </span>
      ) : (
        focused && (
          <span className={styles.hint}>
            <kbd>↵</kbd> task · <kbd>⇧↵</kbd> note · <kbd>⌘↵</kbd> open
          </span>
        )
      )}
      {dictation.supported && (
        <MicButton listening={dictation.listening} onToggle={onMic} what="a task" />
      )}
    </div>
  );
}
