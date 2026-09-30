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
