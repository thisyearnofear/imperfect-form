import type { Keypoint } from '@/types/mediapipe';

const MIN_ALPHA = 0.35;
const MAX_ALPHA = 0.9;
const NORMALIZED_FAST_DISTANCE = 0.08;
const PIXEL_FAST_DISTANCE = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Smooth live keypoints without hiding fast movement.
 *
 * Slow movement receives stronger smoothing to reduce webcam jitter. As the
 * distance from the previous point increases, the filter becomes more
 * responsive so curls and other quick reps do not feel delayed. Raw scores
 * remain untouched for confidence decisions.
 */
export class PoseSmoother {
  private previous = new Map<string, Keypoint>();

  update(keypoints: Keypoint[]): Keypoint[] {
    return keypoints.map((keypoint) => {
      const previous = this.previous.get(keypoint.name);
      if (!previous || keypoint.score <= 0.3 || previous.score <= 0.3) {
        const next = { ...keypoint };
        this.previous.set(keypoint.name, next);
        return next;
      }

      const normalized =
        Math.abs(keypoint.x) <= 1.5 &&
        Math.abs(keypoint.y) <= 1.5 &&
        Math.abs(previous.x) <= 1.5 &&
        Math.abs(previous.y) <= 1.5;
      const distance = Math.hypot(keypoint.x - previous.x, keypoint.y - previous.y);
      const fastDistance = normalized ? NORMALIZED_FAST_DISTANCE : PIXEL_FAST_DISTANCE;
      const alpha = clamp(MIN_ALPHA + distance / fastDistance, MIN_ALPHA, MAX_ALPHA);
      const next: Keypoint = {
        ...keypoint,
        x: previous.x + (keypoint.x - previous.x) * alpha,
        y: previous.y + (keypoint.y - previous.y) * alpha,
        ...(keypoint.z !== undefined && previous.z !== undefined
          ? { z: previous.z + (keypoint.z - previous.z) * alpha }
          : {}),
      };

      this.previous.set(keypoint.name, next);
      return next;
    });
  }

  reset(): void {
    this.previous.clear();
  }
}
