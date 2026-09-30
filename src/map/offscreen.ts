import { PERSON_NODE } from './layout';

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TrackedPerson {
  id: string;
  /** Avatar centre in flow coordinates. */
  center: { x: number; y: number };
}

export interface EdgeMarker {
  id: string;
  /** Marker centre inside the container, px. */
  x: number;
  y: number;
  /** Direction from the marker to the person in degrees: 0 = right, 90 = down. */
  angle: number;
  /** Screen distance from the marker to the person's avatar centre, px. */
  distance: number;
}

/** How far from the container edge a marker's centre sits. */
export const MARKER_INSET = 36;

export function toScreen(point: { x: number; y: number }, viewport: ViewportTransform) {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * One marker per person whose avatar is entirely outside the visible area. The marker is the
 * person's screen position clamped to the container edge (inset), plus the direction and
 * distance to where they really are. Nothing is returned for containers too small to host one.
 */
export function computeEdgeMarkers(
  people: TrackedPerson[],
  viewport: ViewportTransform,
  size: Size,
  inset = MARKER_INSET,
): EdgeMarker[] {
  if (size.width < inset * 2 || size.height < inset * 2) return [];
  const avatarRadius = PERSON_NODE.ringRadius * viewport.zoom;
  const markers: EdgeMarker[] = [];
  for (const person of people) {
    const s = toScreen(person.center, viewport);
    const visible =
      s.x >= -avatarRadius &&
      s.x <= size.width + avatarRadius &&
      s.y >= -avatarRadius &&
      s.y <= size.height + avatarRadius;
    if (visible) continue;
    const x = clamp(s.x, inset, size.width - inset);
    const y = clamp(s.y, inset, size.height - inset);
    const angle = (Math.atan2(s.y - y, s.x - x) * 180) / Math.PI;
    markers.push({ id: person.id, x, y, angle, distance: Math.hypot(s.x - x, s.y - y) });
  }
  return markers;
}
