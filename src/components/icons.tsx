import type { ContactKind } from '../model/types';

interface IconProps {
  className?: string;
  size?: number;
}

export function FlagIcon({ className, size = 12 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 1.5a.75.75 0 0 1 .75.75V3h8.6a.75.75 0 0 1 .6 1.2L10.9 7l2.05 2.8a.75.75 0 0 1-.6 1.2H3.75v3.25a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 3 1.5Z" />
    </svg>
  );
}

export function NoteIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 2.5h6l3 3V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 8h5M5.5 10.5h3.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function TrashIcon({ className, size = 14 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4h11M6 4V2.75h4V4M3.75 4l.7 9.1a1 1 0 0 0 1 .9h5.1a1 1 0 0 0 1-.9l.7-9.1M6.5 7v4.5M9.5 7v4.5" />
    </svg>
  );
}

export function ChevronLeftIcon({ className, size = 14 }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m10 3-5 5 5 5" />
    </svg>
  );
}

const CONTACT_PATHS: Record<ContactKind, string> = {
  email:
    'M2.5 4.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Zm0 .5L8 9l5.5-4',
  phone:
    'M3.6 2.5h2.5l1.2 3-1.7 1.2a7.6 7.6 0 0 0 3.7 3.7l1.2-1.7 3 1.2v2.5a1 1 0 0 1-1 1A10.9 10.9 0 0 1 2.6 3.5a1 1 0 0 1 1-1Z',
  slack: 'M6.2 2.5 4.6 13.5M11.4 2.5 9.8 13.5M2.5 6h11M2.5 10h11',
  telegram: 'M14 2 2 7l4.6 1.8L8.4 14 14 2Zm0 0L6.6 8.8',
  linkedin:
    'M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7ZM5.5 7v4M5.5 5v.01M8 11V8.6a1.4 1.4 0 0 1 2.8 0V11',
  github:
    'M5 3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm6 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM8 10.4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM5 5.6v.6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-.6M8 8.2v2.2',
  x: 'M3 3l10 10M13 3 3 13',
  website:
    'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm-6 6h12M8 2c2.2 2.2 2.2 9.8 0 12M8 2C5.8 4.2 5.8 11.8 8 14',
};

/** Monochrome glyph for a contact kind. */
export function ContactIcon({ kind, className, size = 14 }: IconProps & { kind: ContactKind }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={CONTACT_PATHS[kind]} />
    </svg>
  );
}
