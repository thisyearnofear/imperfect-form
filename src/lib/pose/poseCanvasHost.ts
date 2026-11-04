/**
 * Pose canvas host lifecycle.
 *
 * `transferControlToOffscreen` is irreversible: once a <canvas> has handed
 * its control to the worker it is permanently neutered — sizing it throws
 * InvalidStateError and getContext('2d') returns null. When the worker
 * path falls back to the main thread we still need a drawable overlay
 * host, so the fallback clones the element into the DOM and repoints
 * canvasRef at it.
 */

/**
 * Build a drawable clone of a neutered canvas host: copies every
 * attribute (id/class/style — both the React style prop and the
 * imperative box Webcam applies serialize into attributes) plus the
 * intrinsic buffer size and the `_lastDimensions` expando the iOS
 * orientation handler consults.
 *
 * The clone is inserted next to the dead element — the dead element stays
 * in the DOM on purpose: React still owns it and must find it attached
 * when the keyed remount/unmount removes it. A transferred canvas renders
 * nothing, so the dead host is visually inert underneath.
 */
export function cloneTransferredCanvasHost(dead: HTMLCanvasElement): HTMLCanvasElement {
  const fresh = document.createElement('canvas');
  for (let i = 0; i < dead.attributes.length; i++) {
    const attr = dead.attributes[i];
    fresh.setAttribute(attr.name, attr.value);
  }
  // Reading width/height on a transferred canvas is safe (0); copying
  // keeps a partially-sized stale host consistent.
  fresh.width = dead.width;
  fresh.height = dead.height;
  const last = (dead as any)._lastDimensions;
  if (last) (fresh as any)._lastDimensions = { ...last };
  (fresh as any)._isTransferred = false;
  dead.parentNode?.insertBefore(fresh, dead);
  return fresh;
}
