import { describe, expect, it } from 'vitest';
import { calculateAngle, convertHeight, formatHeight } from '../poseMath';
import { kp } from './helpers';

describe('calculateAngle', () => {
  it('returns 90 for a right angle', () => {
    const angle = calculateAngle(kp('a', 0, 0), kp('b', 0, 1), kp('c', 1, 1));
    expect(angle).toBeCloseTo(90, 5);
  });

  it('returns 180 for a straight line', () => {
    const angle = calculateAngle(kp('a', 0, 0), kp('b', 1, 0), kp('c', 2, 0));
    expect(angle).toBeCloseTo(180, 5);
  });

  it('returns 0 when both segments point the same way', () => {
    const angle = calculateAngle(kp('a', 2, 0), kp('b', 1, 0), kp('c', 2, 0));
    expect(angle).toBeCloseTo(0, 5);
  });

  it('normalizes reflex angles into 0-180', () => {
    // A 270° sweep should be reported as 90°
    const angle = calculateAngle(kp('a', 0, -1), kp('b', 0, 0), kp('c', -1, 0));
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(180);
    expect(angle).toBeCloseTo(90, 5);
  });
});

describe('convertHeight', () => {
  it('converts pixels to cm at 0.5cm per pixel', () => {
    expect(convertHeight(100, 'cm')).toBe(50);
  });

  it('converts to meters and inches', () => {
    expect(convertHeight(100, 'meters')).toBeCloseTo(0.5);
    expect(convertHeight(100, 'inches')).toBeCloseTo(50 / 2.54);
  });
});

describe('formatHeight', () => {
  it('formats cm rounded', () => {
    expect(formatHeight(101, 'cm')).toBe('51cm');
  });

  it('formats feet with inches', () => {
    // 100px = 50cm ≈ 1.64ft → 1'7.7"
    expect(formatHeight(100, 'feet')).toMatch(/^1'/);
  });
});
