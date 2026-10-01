import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { FEEDBACK_EMAIL, feedbackMailto } from '../../model/feedback';
import dlg from '../dialog.module.css';
import ui from '../ui.module.css';
import styles from './FeedbackIsland.module.css';

/**
 * A small coloured island in the map's bottom-right corner. It opens a sheet to write feedback,
 * which leaves as an email: no backend, no account, straight to the inbox of the maker.
 */
export function FeedbackIsland({ hidden = false }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(FEEDBACK_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // no clipboard access: the address is written out in the hint anyway
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={hidden ? `${styles.island} ${styles.hidden}` : styles.island}
          tabIndex={hidden ? -1 : 0}
          aria-hidden={hidden}
        >
          <BubbleIcon />
          Feedback
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={dlg.overlay} />
        <Dialog.Content className={dlg.content}>
          <Dialog.Title className={dlg.title}>Feedback</Dialog.Title>
          <Dialog.Description className={dlg.description}>
            What’s missing, what broke, what you’d love. It goes straight to the person who built
            this.
          </Dialog.Description>
          <textarea
            className={dlg.textarea}
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Something like: the map gets slow once I pass forty people…"
            aria-label="Your feedback"
          />
          <div className={dlg.footer}>
            <button type="button" className={ui.btn} onClick={() => void copyAddress()}>
              {copied ? 'Copied' : 'Copy address'}
            </button>
            <span className={dlg.grow} />
            <a
              className={`${ui.btnPrimary} ${styles.send}`}
              href={feedbackMailto(text)}
              onClick={() => setOpen(false)}
            >
              Send by email
            </a>
          </div>
          <p className={dlg.hint}>
            Opens your mail app with the text filled in, addressed to {FEEDBACK_EMAIL}.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 3.5h10a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 13 11.5H7l-3.2 2.4V11.5H3A1.5 1.5 0 0 1 1.5 10V5A1.5 1.5 0 0 1 3 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
