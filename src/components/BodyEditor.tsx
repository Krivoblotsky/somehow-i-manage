import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import styles from './BodyEditor.module.css';

interface BodyEditorProps {
  /** Read once, when the editor mounts. Remount (change the React key) to load another item. */
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** WYSIWYG body editor (TipTap). Emits '' when the document is empty. */
export function BodyEditor({ initialValue, onChange, placeholder }: BodyEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: placeholder ?? 'Write…' })],
    content: initialValue,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: {
      attributes: { class: styles.prose, 'aria-label': 'Body' },
    },
  });

  return <EditorContent editor={editor} className={styles.editor} />;
}
