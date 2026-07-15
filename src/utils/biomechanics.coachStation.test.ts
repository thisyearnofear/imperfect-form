import { describe, expect, it } from 'vitest';
import {
  consumeFormCheckSpeak,
  createEngineRepDetectorState,
  detectEngineRep,
  normalizeExerciseMode,
} from './biomechanics';
import type { Keypoint } from '@/types/mediapipe';

const kp = (name: string, x: number, y: number, score = 0.9): Keypoint =>
  ({ name, x, y, score }) as Keypoint;

/**
 * Mirror of curlProcessor.test armsPose — torso vertical, optional elbow swing.
 */
function armsPose({
  leftElbowAngle = 180,
  leftSwing = false,
}: {
  leftElbowAngle?: number;
  leftSwing?: boolean;
} = {}): Keypoint[] {
  const makeArm = (sideX: number, elbowAngle: number, swing: boolean, side: string) => {
    const shoulder = kp(`${side}_shoulder`, sideX, 100);
    const hip = kp(`${side}_hip`, sideX, 250);
    const elbow = swing ? kp(`${side}_elbow`, sideX + 45, 160) : kp(`${side}_elbow`, sideX, 175);
    const rad = ((180 - elbowAngle) * Math.PI) / 180;
    const upX = shoulder.x - elbow.x;
    const upY = shoulder.y - elbow.y;
    const len = Math.hypot(upX, upY);
    const ux = upX / len;
    const uy = upY / len;
    const wx = -(ux * Math.cos(rad) - uy * Math.sin(rad));
    const wy = -(ux * Math.sin(rad) + uy * Math.cos(rad));
    const wrist = kp(`${side}_wrist`, elbow.x + wx * 70, elbow.y + wy * 70);
    return [shoulder, hip, elbow, wrist];
  };

  return [...makeArm(100, leftElbowAngle, leftSwing, 'left'), ...makeArm(300, 180, false, 'right')];
}

describe('normalizeExerciseMode', () => {
  it('passes through every real exercise mode including curls', () => {
    expect(normalizeExerciseMode('curls')).toBe('curls');
    expect(normalizeExerciseMode('pullups')).toBe('pullups');
    expect(normalizeExerciseMode('jumps')).toBe('jumps');
    expect(normalizeExerciseMode('pushups')).toBe('pushups');
    expect(normalizeExerciseMode('squats')).toBe('squats');
  });

  it('defaults unknown/null values to pushups', () => {
    expect(normalizeExerciseMode(null)).toBe('pushups');
    expect(normalizeExerciseMode(undefined)).toBe('pushups');
    expect(normalizeExerciseMode('deadlift')).toBe('pushups');
  });
});

describe('detectEngineRep formCheckSpeak', () => {
  it('surfaces elbow_swing so the coach station can demonstrate a strict curl', () => {
    const state = createEngineRepDetectorState('curls');

    detectEngineRep(armsPose(), 'curls', state);
    detectEngineRep(armsPose({ leftElbowAngle: 90, leftSwing: true }), 'curls', state);

    const speak = consumeFormCheckSpeak(state);
    expect(speak?.issue).toBe('elbow_swing');
    expect(speak?.phrase).toMatch(/elbow/i);
    expect(consumeFormCheckSpeak(state)).toBeUndefined();
  });
});
