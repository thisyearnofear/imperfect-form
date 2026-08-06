import { describe, expect, it } from 'vitest';
import { ghostService } from './GhostService';
import type { SessionSnapshot } from '@/types/workout';

const keypointNames = [
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

function trace(): SessionSnapshot[] {
  return [0, 500, 1000].map((timestamp) => ({
    timestamp,
    metrics: {
      trunkLean: 0.1,
      kneeValgus: 0,
      ankleFlexion: 0.2,
      depth: 0.7,
      symmetry: 1,
      isStable: true,
      warnings: [],
    },
    keypoints: keypointNames.map((name, index) => ({
      name,
      x: 20 + index * 3 + timestamp / 1000,
      y: 30 + index * 2,
      score: 0.9,
    })),
  }));
}

describe('GhostService challenge links', () => {
  it('encodes a pose trace and exercise mode in a shareable URL', () => {
    const url = ghostService.generateShareUrl(trace(), 'curls', 'https://imperfectform.fun');
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://imperfectform.fun');
    expect(parsed.pathname).toBe('/');
    expect(parsed.searchParams.get('mode')).toBe('curls');
    expect(parsed.searchParams.get('race')).toBeTruthy();
    expect(parsed.searchParams.has('video')).toBe(false);
    expect(parsed.searchParams.has('image')).toBe(false);
  });

  it('extracts the compressed trace from the race parameter', () => {
    const url = ghostService.generateShareUrl(trace(), 'pushups', 'https://example.test');
    const parsedTrace = ghostService.extractFromUrl(new URL(url).searchParams.get('race'));

    expect(parsedTrace).not.toBeNull();
    expect(parsedTrace).toHaveLength(3);
    expect(parsedTrace?.[0].keypoints.length).toBeGreaterThan(0);
  });
});
