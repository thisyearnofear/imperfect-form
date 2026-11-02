import { describe, expect, it } from 'vitest';
import { combineReadSignals, readQuality, scoreToLevel } from './readQuality';

describe('readQuality', () => {
  it('maps scores to instrument levels', () => {
    expect(scoreToLevel(0.9)).toBe('clear');
    expect(scoreToLevel(0.75)).toBe('clear');
    expect(scoreToLevel(0.6)).toBe('usable');
    expect(scoreToLevel(0.5)).toBe('usable');
    expect(scoreToLevel(0.3)).toBe('early');
  });

  it('weighs the worse signal hardest — confident model, shaky camera', () => {
    const score = combineReadSignals(0.95, 0.3);
    expect(score).toBeLessThan(0.5);
  });

  it('clamps out-of-range inputs', () => {
    expect(combineReadSignals(2, -1)).toBeGreaterThanOrEqual(0);
    expect(combineReadSignals(2, -1)).toBeLessThanOrEqual(1);
  });

  it('holds the previous level inside the hysteresis band', () => {
    // Clear at 0.9; a dip to 0.71 stays 'clear' (threshold 0.75 - 0.06).
    const q = readQuality(0.71, 0.9, 'clear');
    expect(q.level).toBe('clear');
    // But a real drop to 0.65 demotes.
    expect(readQuality(0.65, 0.65, 'clear').level).toBe('usable');
  });

  it('returns a needle position in 0..1', () => {
    const q = readQuality(0.8, 0.8);
    expect(q.needle).toBeGreaterThanOrEqual(0);
    expect(q.needle).toBeLessThanOrEqual(1);
  });
});
