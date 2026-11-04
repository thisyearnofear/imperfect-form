'use client';

/**
 * zoomRegister — the joint figure isn't a ladder, it's a zoom. One shared
 * magnification per session: `move` (the hairline figure — the movement
 * itself, glanceable), `anatomy` (the plate teardown — what's moving),
 * `built` (the 3D peelable model — how it's built). Context defaults to
 * `anatomy`; the user toggles on the plate's frame-edge notches.
 *
 * Module state only — every JointPlate on the page reads the same
 * register, and the choice survives remounts within the session without
 * touching localStorage (the register is a preference of the moment, not
 * a stored identity).
 */

import { useSyncExternalStore } from 'react';

export type ZoomRegister = 'move' | 'anatomy' | 'built';
export const ZOOM_REGISTERS: readonly ZoomRegister[] = ['move', 'anatomy', 'built'];

let current: ZoomRegister = 'anatomy';
const listeners = new Set<() => void>();

export function getZoomRegister(): ZoomRegister {
  return current;
}

export function setZoomRegister(next: ZoomRegister): void {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

export function subscribeZoomRegister(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shared register + setter — every awake plate shows the same zoom. */
export function useZoomRegister(): [ZoomRegister, (r: ZoomRegister) => void] {
  const value = useSyncExternalStore(subscribeZoomRegister, getZoomRegister, getZoomRegister);
  return [value, setZoomRegister];
}
