import { copyToClipboard } from '../model/clipboard';
import { CONTACT_LABEL, contactDisplay, contactHref, isExternalHref } from '../model/contacts';
import type { Contact } from '../model/types';
import { useToast } from '../state/toast';
import styles from './ContactLinks.module.css';
import { ContactIcon } from './icons';

interface ContactLinksProps {
  contacts?: Contact[];
  /** `light` for white panels, `dark` for the canvas and dossier. */
  tone?: 'dark' | 'light';
}

/** A row of icon links for a person's contacts. Handles without a URL copy to the clipboard. */
export function ContactLinks({ contacts, tone = 'dark' }: ContactLinksProps) {
  const show = useToast((s) => s.show);
  const list = contacts ?? [];
  if (list.length === 0) return null;

  async function copy(text: string) {
    show((await copyToClipboard(text)) ? `Copied ${text}` : `Could not copy ${text}`);
  }

  return (
    <div className={tone === 'light' ? `${styles.links} ${styles.light}` : styles.links}>
      {list.map((contact) => {
        const href = contactHref(contact);
        const text = contactDisplay(contact);
        const label = `${CONTACT_LABEL[contact.kind]}: ${text}`;
        return href ? (
          <a
            key={contact.kind}
            className={styles.link}
            href={href}
            target={isExternalHref(href) ? '_blank' : undefined}
            rel="noreferrer"
            title={label}
            aria-label={label}
          >
            <ContactIcon kind={contact.kind} />
          </a>
        ) : (
          <button
            key={contact.kind}
            type="button"
            className={styles.link}
            title={`${label} — click to copy`}
            aria-label={`Copy ${label}`}
            onClick={() => void copy(text)}
          >
            <ContactIcon kind={contact.kind} />
          </button>
        );
      })}
    </div>
  );
}
