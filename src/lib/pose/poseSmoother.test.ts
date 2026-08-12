import { describe, expect, it } from 'vitest';
import type { Keypoint } from '@/types/mediapipe';
import { PoseSmoother } from './poseSmoother';

const point = (x: number, y: number, score = 0.9): Keypoint => ({
  name: 'left_elbow',
  x,
  y,
  score,
});

describe('PoseSmoother', () => {
  it('reduces small coordinate jitter', () => {
    const smoother = new PoseSmoother();
    smoother.update([point(100, 100)]);

    const smoothed = smoother.update([point(102, 100)]);

    expect(smoothed[0].x).toBeGreaterThan(100);
    expect(smoothed[0].x).toBeLessThan(102);
  });

  it('responds quickly to larger movement', () => {
    const smoother = new PoseSmoother();
    smoother.update([point(100, 100)]);

    const smoothed = smoother.update([point(140, 100)]);

    expect(smoothed[0].x).toBeGreaterThan(135);
  });

  it('resets its temporal state', () => {
    const smoother = new PoseSmoother();
    smoother.update([point(100, 100)]);
    smoother.reset();

    expect(smoother.update([point(140, 100)])[0].x).toBe(140);
  });
});
