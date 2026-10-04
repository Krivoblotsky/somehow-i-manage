import { Placeholder } from '@tiptap/extensions';
import { Selection } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef } from 'react';
import { useDictation } from '../state/dictation';
import styles from './BodyEditor.module.css';
import { MicButton } from './MicButton';

interface BodyEditorProps {
  /** Read once, when the editor mounts. Remount (change the React key) to load another item. */
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * WYSIWYG body editor (TipTap). Emits '' when the document is empty. The mic dictates at the
 * cursor: the words appear as the browser firms them up, and the cursor ends after them.
 */
export function BodyEditor({ initialValue, onChange, placeholder }: BodyEditorProps) {
  // Until the person has put the cursor somewhere, dictation goes to the end of the text.
  const touched = useRef(false);
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: placeholder ?? 'Write…' })],
    content: initialValue,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    onFocus: () => {
      touched.current = true;
    },
    editorProps: {
      attributes: { class: styles.prose, 'aria-label': 'Body' },
    },
  });

  // Where the spoken text lives while it is still changing, so each update replaces the last.
  const spoken = useRef<{ from: number; to: number } | null>(null);
  const dictation = useDictation((text, isFinal) => {
    if (!editor) return;
    const cursor = touched.current
      ? editor.state.selection.to
      : Selection.atEnd(editor.state.doc).to;
    const range = spoken.current ?? { from: cursor, to: cursor };
    // a space first, unless the sentence starts a paragraph or follows whitespace
    const before = editor.state.doc.textBetween(Math.max(0, range.from - 1), range.from);
    const content = (before && !/\s$/.test(before) ? ' ' : '') + text;
    if (content) editor.commands.insertContentAt(range, { type: 'text', text: content });
    else editor.commands.deleteRange(range);
    const to = range.from + content.length;
    spoken.current = { from: range.from, to };
    if (isFinal) {
      spoken.current = null;
      editor.chain().focus().setTextSelection(to).run();
    }
  });
  function onMic() {
    spoken.current = null;
    dictation.toggle();
  }

  return (
    <div className={styles.editor}>
      <EditorContent editor={editor} />
      {dictation.supported && (
        <div className={styles.mic}>
          <MicButton listening={dictation.listening} onToggle={onMic} what="here" />
        </div>
      )}
      {dictation.error && (
        <p className={styles.problem} role="status">
          {dictation.error}
        </p>
      )}
    </div>
  );
}
