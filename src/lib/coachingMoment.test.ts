import { describe, expect, it } from 'vitest';
import { deriveCoachingMoment } from '@/lib/coachingMoment';

describe('coaching moment phases', () => {
  it('starts with framing until a pose is visible', () => {
    expect(
      deriveCoachingMoment({
        tracking: false,
        repCount: 0,
        warning: null,
        latchedWarning: null,
        repAtWarning: null,
      })
    ).toBe('framing');
  });

  it('acknowledges the first observed movement before the first rep', () => {
    expect(
      deriveCoachingMoment({
        tracking: true,
        repCount: 0,
        warning: null,
        latchedWarning: null,
        repAtWarning: null,
      })
    ).toBe('observed');
  });

  it('holds a correction while the user is still on the same rep', () => {
    expect(
      deriveCoachingMoment({
        tracking: true,
        repCount: 0,
        warning: 'PIN ELBOWS',
        latchedWarning: 'PIN ELBOWS',
        repAtWarning: 0,
      })
    ).toBe('correction');
  });

  it('hands the movement back after a new rep completes', () => {
    expect(
      deriveCoachingMoment({
        tracking: true,
        repCount: 1,
        warning: null,
        latchedWarning: null,
        repAtWarning: null,
      })
    ).toBe('your_turn');
  });
});
