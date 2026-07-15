import { describe, expect, it } from 'vitest';
import { createCurlState, processCurls } from '../curlProcessor';
import { kp } from './helpers';

const baseParams = {
  repState: 'DOWN' as const,
  internalReps: 0,
  lastRepIssues: [] as string[],
};

/**
 * Arm poses (screen coords, y down). Torso vertical: hip below shoulder.
 * Extended arm hangs straight down (elbow angle 180°, shoulder angle 0°).
 * Flexed arm: wrist curled up next to the shoulder (elbow angle ~20°).
 */
function armsPose({
  leftElbowAngle = 180,
  rightElbowAngle = 180,
  leftSwing = false,
}: {
  leftElbowAngle?: number;
  rightElbowAngle?: number;
  leftSwing?: boolean;
} = {}) {
  const makeArm = (sideX: number, elbowAngle: number, swing: boolean, side: string) => {
    const shoulder = kp(`${side}_shoulder`, sideX, 100);
    const hip = kp(`${side}_hip`, sideX, 250);
    // Swing pushes the elbow forward (x offset) instead of hanging vertical
    const elbow = swing ? kp(`${side}_elbow`, sideX + 45, 160) : kp(`${side}_elbow`, sideX, 175);
    // Place the wrist to produce the requested elbow angle:
    // vector elbow->shoulder points up; rotate by (180 - angle)
    const rad = ((180 - elbowAngle) * Math.PI) / 180;
    const upX = shoulder.x - elbow.x;
    const upY = shoulder.y - elbow.y;
    const len = Math.hypot(upX, upY);
    const ux = upX / len;
    const uy = upY / len;
    // Rotate the "up" unit vector by rad, then point the wrist the other way
    const wx = -(ux * Math.cos(rad) - uy * Math.sin(rad));
    const wy = -(ux * Math.sin(rad) + uy * Math.cos(rad));
    const wrist = kp(`${side}_wrist`, elbow.x + wx * 70, elbow.y + wy * 70);
    return [shoulder, hip, elbow, wrist];
  };

  return [
    ...makeArm(100, leftElbowAngle, leftSwing, 'left'),
    ...makeArm(300, rightElbowAngle, false, 'right'),
  ];
}

describe('processCurls', () => {
  it('returns null when no arm keypoints exist', () => {
    const result = processCurls({
      ...baseParams,
      keypoints: [kp('nose', 150, 50)],
      curlState: createCurlState(),
    });
    expect(result).toBeNull();
  });

  it('asks to step back when arms are low-confidence', () => {
    const pose = armsPose().map((k) => ({ ...k, score: 0.2 }));
    const result = processCurls({
      ...baseParams,
      keypoints: pose,
      curlState: createCurlState(),
    });
    expect(result?.feedback).toContain('arms');
  });

  it('counts a rep after extend -> flex on one arm', () => {
    const curlState = createCurlState();

    // Frame 1: both arms extended (arms the rep)
    processCurls({ ...baseParams, keypoints: armsPose(), curlState });
    expect(curlState.leftFlag).toBe('extended');

    // Frame 2: left arm curls fully
    const result = processCurls({
      ...baseParams,
      keypoints: armsPose({ leftElbowAngle: 30 }),
      curlState,
    });
    expect(result?.isRepCompleted).toBe(true);
    expect(curlState.repsCompleted).toBe(1);
    expect(result?.repCompletionData?.score).toBe(100);
    expect(result?.feedback).toContain('first curl');
  });

  it('does not count without full extension first (hysteresis)', () => {
    const curlState = createCurlState();

    // Start half-curled (never extended)
    processCurls({ ...baseParams, keypoints: armsPose({ leftElbowAngle: 100 }), curlState });
    const result = processCurls({
      ...baseParams,
      keypoints: armsPose({ leftElbowAngle: 30 }),
      curlState,
    });
    expect(result?.isRepCompleted).toBe(false);
    expect(curlState.repsCompleted).toBe(0);
  });

  it('counts both arms independently (alternating curls)', () => {
    const curlState = createCurlState();

    processCurls({ ...baseParams, keypoints: armsPose(), curlState });
    processCurls({ ...baseParams, keypoints: armsPose({ leftElbowAngle: 30 }), curlState });
    // Left needs re-extension; right curls now
    processCurls({ ...baseParams, keypoints: armsPose({ leftElbowAngle: 30 }), curlState });
    const result = processCurls({
      ...baseParams,
      keypoints: armsPose({ leftElbowAngle: 30, rightElbowAngle: 30 }),
      curlState,
    });
    expect(result?.isRepCompleted).toBe(true);
    expect(curlState.repsCompleted).toBe(2);
  });

  it('detects elbow swing and deducts from the rep score', () => {
    const curlState = createCurlState();

    processCurls({ ...baseParams, keypoints: armsPose(), curlState });
    // Mid-curl with the elbow swung forward
    const swingFrame = processCurls({
      ...baseParams,
      keypoints: armsPose({ leftElbowAngle: 90, leftSwing: true }),
      curlState,
    });
    expect(swingFrame?.formCheckSpeak?.issue).toBe('elbow_swing');
    expect(curlState.swingSinceLastRep).toBe(true);

    // Complete the rep - swing penalty applies
    const result = processCurls({
      ...baseParams,
      keypoints: armsPose({ leftElbowAngle: 30 }),
      curlState,
    });
    expect(result?.isRepCompleted).toBe(true);
    expect(result?.repCompletionData?.score).toBe(70);
    expect(result?.repCompletionData?.issues).toContain('elbow_swing');
    expect(curlState.swingSinceLastRep).toBe(false);
  });
});
