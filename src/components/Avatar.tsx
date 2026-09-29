import type { CSSProperties } from 'react';
import { getInitials } from '../model/derive';
import { contrastText, personColor } from '../model/palette';
import type { Person } from '../model/types';
import styles from './Avatar.module.css';

type AvatarPerson = Pick<Person, 'name' | 'colorIndex' | 'avatarDataUrl'>;

interface AvatarProps {
  person: AvatarPerson;
  /** Diameter in px, without the ring. */
  size?: number;
  /** Ring width in px; 0 hides the ring. */
  ring?: number;
  /** Colour of the gap between photo and ring — match the surface behind it. */
  gapColor?: string;
  className?: string;
  title?: string;
}

/** Circular avatar with the person's colour ring; initials when there is no photo. */
export function Avatar({
  person,
  size = 40,
  ring = 3,
  gapColor = 'var(--bg)',
  className,
  title,
}: AvatarProps) {
  const color = personColor(person.colorIndex);
  const gap = ring > 0 ? 2 : 0;
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.4),
    boxShadow: ring > 0 ? `0 0 0 ${gap}px ${gapColor}, 0 0 0 ${gap + ring}px ${color}` : undefined,
    background: person.avatarDataUrl ? 'var(--chrome)' : color,
    color: contrastText(color),
  };
  return (
    <span
      className={className ? `${styles.avatar} ${className}` : styles.avatar}
      style={style}
      role="img"
      aria-label={person.name}
      title={title ?? person.name}
    >
      {person.avatarDataUrl ? (
        <img src={person.avatarDataUrl} alt="" draggable={false} />
      ) : (
        <span className={styles.initials}>{getInitials(person.name)}</span>
      )}
    </span>
  );
}
