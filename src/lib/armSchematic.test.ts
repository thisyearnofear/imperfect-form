import { describe, expect, it } from 'vitest';
import {
  buildRangeArc,
  clampElbowDeg,
  elbowDegToForearmRotation,
  elbowGapDeg,
} from './armSchematic';

describe('arm schematic geometry', () => {
  it('clamps elbow degrees to the 0–180 instrument range', () => {
    expect(clampElbowDeg(-10)).toBe(0);
    expect(clampElbowDeg(200)).toBe(180);
    expect(clampElbowDeg(120)).toBe(120);
  });

  it('maps extended (0°) down and flexed (180°) up', () => {
    expect(elbowDegToForearmRotation(0)).toBe(180);
    expect(elbowDegToForearmRotation(180)).toBe(0);
    expect(elbowDegToForearmRotation(90)).toBe(90);
  });

  it('makes the gap between user and coach the obvious number', () => {
    expect(elbowGapDeg(120, 155)).toBe(35);
    expect(elbowGapDeg(50, 50)).toBe(0);
    expect(elbowGapDeg(null, 155)).toBeNull();
  });

  it('draws a range arc only when the sweep is visible', () => {
    expect(buildRangeArc(160, 158)).toBeNull();
    expect(buildRangeArc(160, 50)).toMatch(/^M /);
  });
});
