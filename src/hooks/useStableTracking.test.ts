import { describe, expect, it } from 'vitest';
import { TrackingLatch } from './useStableTracking';

function latchWithClock(holdMs = 700) {
  let now = 10_000;
  const clock = () => now;
  return {
    latch: new TrackingLatch(false, holdMs, clock),
    tick: (ms: number) => {
      now += ms;
    },
  };
}

describe('TrackingLatch', () => {
  it('stays false while tracking was never acquired', () => {
    const { latch, tick } = latchWithClock();
    tick(5000);
    expect(latch.update(false)).toBe(false);
  });

  it('announces tracking immediately and holds it through brief dropouts', () => {
    const { latch, tick } = latchWithClock();
    expect(latch.update(true)).toBe(true);

    tick(100);
    expect(latch.update(false)).toBe(true); // inside hold window
    tick(100);
    expect(latch.update(true)).toBe(true);

    // Strobing at 100ms intervals never reports loss.
    for (let i = 0; i < 10; i += 1) {
      tick(100);
      expect(latch.update(false)).toBe(true);
      tick(100);
      expect(latch.update(true)).toBe(true);
    }
  });

  it('announces loss only after the hold window of continuous absence', () => {
    const { latch, tick } = latchWithClock(700);
    latch.update(true);
    tick(699);
    expect(latch.update(false)).toBe(true);
    tick(2);
    expect(latch.update(false)).toBe(false);
  });

  it('recovers immediately after a loss', () => {
    const { latch, tick } = clocked();
    function clocked() {
      return latchWithClock(700);
    }
    latch.update(true);
    tick(800);
    expect(latch.update(false)).toBe(false);
    expect(latch.update(true)).toBe(true);
  });

  it('does not resurrect from a dropout that started before a recovery gap', () => {
    // tracked at t0, lost at t0+1, no updates until t0+hold+10 → loss sticks.
    const { latch, tick } = latchWithClock(700);
    latch.update(true);
    tick(1);
    latch.update(false);
    tick(709);
    expect(latch.update(false)).toBe(false);
  });
});
