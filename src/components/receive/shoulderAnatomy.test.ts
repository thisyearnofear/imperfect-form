import { describe, expect, it } from 'vitest';
import {
  JP_PIVOT,
  JP_REP_P,
  clamp01,
  jointSeq,
  jpArmPose,
  jpArmPath,
  jpScapAngle,
  reachElevationToProgress,
} from './shoulderAnatomy';
import { armElevationDeg } from '@/lib/exercise-engine/reachProcessor';

/**
 * The live session inset maps the rep counter's own elevation measure onto
 * plate progress — these tests pin the mapping so "the trap lights as she
 * raises" means the same thing on the plate, the ghost and the readout.
 */

describe('armElevationDeg (reachProcessor)', () => {
  it('reads 0° hanging, ~90° horizontal, ~180° overhead', () => {
    const shoulder = { x: 300, y: 200, score: 0.9, name: 'right_shoulder' };
    expect(armElevationDeg(shoulder, { x: 300, y: 300, score: 0.9 })).toBeCloseTo(0, 5);
    expect(armElevationDeg(shoulder, { x: 400, y: 200, score: 0.9 })).toBeCloseTo(90, 5);
    expect(armElevationDeg(shoulder, { x: 300, y: 100, score: 0.9 })).toBeCloseTo(180, 5);
    // Mirror side reads the same (|dx|).
    expect(armElevationDeg(shoulder, { x: 200, y: 200, score: 0.9 })).toBeCloseTo(90, 5);
  });
});

describe('reachElevationToProgress', () => {
  it('maps a hanging arm to ~0 and overhead to 1', () => {
    expect(reachElevationToProgress(0)).toBe(0);
    expect(reachElevationToProgress(10)).toBeLessThan(0.05);
    expect(reachElevationToProgress(180)).toBe(1);
    expect(reachElevationToProgress(200)).toBe(1); // clamps
  });

  it('crosses the rep-counting threshold exactly at 135°', () => {
    // The plate's counting line and the rep counter's RAISED_DEG must agree.
    expect(reachElevationToProgress(135)).toBeCloseTo(JP_REP_P, 10);
    expect(jointSeq(reachElevationToProgress(134)).counted).toBe(false);
    expect(jointSeq(reachElevationToProgress(136)).counted).toBe(true);
  });
});

describe('jointSeq', () => {
  it('lights regions in the raise order: deltoid → trapezius → scapula → levator → counted', () => {
    const at = (p: number) => jointSeq(p);
    expect(at(0)).toEqual({
      deltoid: false,
      trapezius: false,
      scapula: false,
      levator: false,
      counted: false,
    });
    // Mid-raise framing pose (the ghost's 0.65): the trap is lit —
    // "the trap lighting up as she raises".
    expect(at(0.65)).toEqual({
      deltoid: true,
      trapezius: true,
      scapula: true,
      levator: true,
      counted: false,
    });
    expect(at(0.05).deltoid).toBe(false);
    expect(at(0.07).deltoid).toBe(true);
    expect(at(0.29).trapezius).toBe(false);
    expect(at(0.31).trapezius).toBe(true);
    expect(at(0.54).scapula).toBe(true);
    expect(at(0.54).levator).toBe(false);
    expect(at(0.56).levator).toBe(true);
  });
});

describe('jpArmPose / jpArmPath / jpScapAngle', () => {
  it('hangs the arm near straight-down at p=0 and puts the wrist overhead at p=1', () => {
    const down = jpArmPose(0);
    expect(down.ey).toBeGreaterThan(JP_PIVOT.y); // elbow below the glenoid
    const up = jpArmPose(1);
    expect(up.wy).toBeLessThan(JP_PIVOT.y); // hand above the glenoid
  });

  it('emits a shoulder→elbow→wrist polyline', () => {
    expect(jpArmPath(0.5)).toMatch(/^M192 142 L[\d.-]+ [\d.-]+ L[\d.-]+ [\d.-]+$/);
  });

  it('rotates the scapula only as the arm rises', () => {
    expect(jpScapAngle(0)).toBeCloseTo(0);
    expect(jpScapAngle(1)).toBeLessThan(0);
    expect(jpScapAngle(-1)).toBeCloseTo(0);
  });
});

describe('clamp01', () => {
  it('clamps', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(9)).toBe(1);
  });
});
