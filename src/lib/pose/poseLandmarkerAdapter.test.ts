import { describe, expect, it } from 'vitest';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  BLAZEPOSE_LANDMARK_NAMES,
  COCO_NAME_TO_BLAZEPOSE_INDEX,
  delegateForBackend,
  landmarkerKeypoints,
} from '@/lib/pose/poseLandmarkerAdapter';

/** The COCO-17 names every downstream processor `find`s by name. */
const COCO_17_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

const landmark = (overrides: Partial<NormalizedLandmark> = {}): NormalizedLandmark => ({
  x: 0.5,
  y: 0.5,
  z: 0,
  visibility: 0.9,
  ...overrides,
});

describe('poseLandmarker landmark mapping', () => {
  it('names all 33 BlazePose landmarks', () => {
    expect(BLAZEPOSE_LANDMARK_NAMES).toHaveLength(33);
    expect(new Set(BLAZEPOSE_LANDMARK_NAMES).size).toBe(33);
  });

  it('maps every COCO-17 name to the correct BlazePose index', () => {
    for (const name of COCO_17_NAMES) {
      const index = COCO_NAME_TO_BLAZEPOSE_INDEX[name];
      expect(index, name).toBeTypeOf('number');
      expect(BLAZEPOSE_LANDMARK_NAMES[index]).toBe(name);
    }
    expect(Object.keys(COCO_NAME_TO_BLAZEPOSE_INDEX)).toHaveLength(17);
  });

  it('pins the arm chain the reach/curl processors read', () => {
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.left_shoulder).toBe(11);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.right_shoulder).toBe(12);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.left_elbow).toBe(13);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.right_elbow).toBe(14);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.left_wrist).toBe(15);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.right_wrist).toBe(16);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.left_hip).toBe(23);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.right_hip).toBe(24);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.left_knee).toBe(25);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.right_knee).toBe(26);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.left_ankle).toBe(27);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.right_ankle).toBe(28);
    expect(COCO_NAME_TO_BLAZEPOSE_INDEX.nose).toBe(0);
  });

  it('denormalizes coordinates to pixels and keeps visibility as score', () => {
    const landmarks: NormalizedLandmark[] = Array.from({ length: 33 }, (_, i) =>
      landmark({ x: i / 33, y: (33 - i) / 33, visibility: i / 33 })
    );
    const keypoints = landmarkerKeypoints(landmarks, 640, 480);
    expect(keypoints).toHaveLength(33);
    const shoulder = keypoints.find((k) => k.name === 'left_shoulder')!;
    expect(shoulder.x).toBeCloseTo((11 / 33) * 640);
    expect(shoulder.y).toBeCloseTo((22 / 33) * 480);
    expect(shoulder.score).toBeCloseTo(11 / 33);
  });

  it('falls back to presence when a model emits no visibility', () => {
    const keypoints = landmarkerKeypoints(
      [landmark({ visibility: undefined as never, presence: 0.42 })],
      100,
      100
    );
    expect(keypoints[0].score).toBeCloseTo(0.42);
  });

  it('scores zero rather than fabricating confidence', () => {
    const keypoints = landmarkerKeypoints(
      [landmark({ visibility: undefined as never, presence: undefined })],
      100,
      100
    );
    expect(keypoints[0].score).toBe(0);
  });

  it('selects the delegate each backend actually maps to', () => {
    expect(delegateForBackend('webgl')).toBe('GPU');
    expect(delegateForBackend('cpu')).toBe('CPU');
    expect(delegateForBackend('wasm')).toBe('CPU');
  });
});
