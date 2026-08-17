'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Pure hysteresis latch for raw per-frame pose tracking — testable without
 * a DOM. Feed it `update(detected, now)` in publish order; it holds the last
 * "tracked" state for `holdMs` after the signal drops, so a lost landmark is
 * only announced once it has actually been lost for most of a second.
 * Recovery is immediate.
 */
export class TrackingLatch {
  private stable: boolean;
  private lastTrueMs: number | null;

  constructor(
    initialDetected: boolean,
    private readonly holdMs: number,
    private readonly now: () => number = () => Date.now()
  ) {
    this.stable = initialDetected;
    this.lastTrueMs = initialDetected ? this.now() : null;
  }

  update(detected: boolean): boolean {
    const t = this.now();
    if (detected) {
      this.lastTrueMs = t;
      this.stable = true;
      return this.stable;
    }
    // Never tracked — remain false rather than announcing a "loss".
    if (this.lastTrueMs == null) return this.stable;
    this.stable = t - this.lastTrueMs < this.holdMs;
    return this.stable;
  }

  get value(): boolean {
    return this.stable;
  }
}

/**
 * Hysteresis for raw per-frame pose tracking.
 *
 * `poseDetected` flips at the pose publish rate (up to ~20Hz); marginal
 * framing makes it strobe, and anything keyed on it — the live coaching
 * line, the coaching phase machine — rewrites its sentence on every flip.
 * This hook smooths that: loss is only reported after `holdMs` of
 * continuous absence; recovery is immediate.
 */
export function useStableTracking(detected: boolean, holdMs = 700): boolean {
  const latchRef = useRef<TrackingLatch | null>(null);
  if (latchRef.current == null) {
    latchRef.current = new TrackingLatch(detected, holdMs);
  }
  const latch = latchRef.current;

  const [stable, setStable] = useState(latch.value);

  useEffect(() => {
    const next = latch.update(detected);
    setStable((prev) => (prev === next ? prev : next));
  }, [detected, latch]);

  return stable;
}

export default useStableTracking;
