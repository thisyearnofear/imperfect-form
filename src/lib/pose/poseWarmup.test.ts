import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PoseDetectorConfig } from '@/types/mediapipe';
import type { SessionPoseDetector } from './trackerRegistry';

// Only createPoseDetector is stubbed — resolvePoseConfig and friends keep
// their real behaviour so config keys are the same JSON the session builds.
const { createPoseDetectorMock } = vi.hoisted(() => ({
  createPoseDetectorMock: vi.fn<(config: PoseDetectorConfig) => Promise<SessionPoseDetector>>(),
}));
vi.mock('./trackerRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./trackerRegistry')>();
  return {
    ...actual,
    createPoseDetector: (config: PoseDetectorConfig) => createPoseDetectorMock(config),
  };
});

import { adoptWarmPoseDetector, discardWarmPoseDetector, warmPoseDetector } from './poseWarmup';

const fakeDetector = (label: string): SessionPoseDetector =>
  ({
    label,
    estimatePoses: vi.fn(),
    dispose: vi.fn(),
  }) as unknown as SessionPoseDetector;

const CONFIG_A: PoseDetectorConfig = {
  tracker: 'poselandmarker-full',
  backend: 'webgl',
  inputSize: 640,
  enableSmoothing: false,
  minPoseScore: 0.25,
  multiPoseMaxDimension: 512,
  enableTracking: false,
};

const CONFIG_B: PoseDetectorConfig = { ...CONFIG_A, tracker: 'movenet-lightning' };
const CONFIG_C: PoseDetectorConfig = { ...CONFIG_A, backend: 'wasm' };

describe('poseWarmup', () => {
  beforeEach(() => {
    discardWarmPoseDetector();
    createPoseDetectorMock.mockReset();
  });

  it('returns the in-flight build for a repeat warm of the same config', async () => {
    const detector = fakeDetector('a');
    createPoseDetectorMock.mockResolvedValue(detector);

    const first = warmPoseDetector(CONFIG_A);
    const second = warmPoseDetector(CONFIG_A);

    expect(second).toBe(first);
    expect(createPoseDetectorMock).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBe(detector);
  });

  it('adopts a warm build only when the resolved config matches exactly', async () => {
    createPoseDetectorMock.mockResolvedValue(fakeDetector('a'));
    warmPoseDetector(CONFIG_A);

    // A different tracker or backend is a different session — never adopt.
    expect(adoptWarmPoseDetector(CONFIG_B)).toBeNull();
    expect(adoptWarmPoseDetector(CONFIG_C)).toBeNull();

    const adopted = adoptWarmPoseDetector(CONFIG_A);
    expect(adopted).not.toBeNull();
    await expect(adopted!).resolves.toBeTruthy();
  });

  it('transfers ownership on adoption — the slot does not hand out twice', () => {
    createPoseDetectorMock.mockResolvedValue(fakeDetector('a'));
    warmPoseDetector(CONFIG_A);

    expect(adoptWarmPoseDetector(CONFIG_A)).not.toBeNull();
    expect(adoptWarmPoseDetector(CONFIG_A)).toBeNull();
  });

  it('disposes a discarded build instead of leaking it', async () => {
    const detector = fakeDetector('a');
    createPoseDetectorMock.mockResolvedValue(detector);
    warmPoseDetector(CONFIG_A);
    // Let the build resolve before discarding.
    await Promise.resolve();
    await Promise.resolve();

    discardWarmPoseDetector();
    await Promise.resolve();
    await Promise.resolve();
    expect(detector.dispose).toHaveBeenCalledTimes(1);
  });

  it('a new warm for a different config disposes the stale build', async () => {
    const stale = fakeDetector('stale');
    createPoseDetectorMock.mockResolvedValueOnce(stale).mockResolvedValueOnce(fakeDetector('b'));
    warmPoseDetector(CONFIG_A);
    await Promise.resolve();
    await Promise.resolve();

    warmPoseDetector(CONFIG_B);
    await Promise.resolve();
    await Promise.resolve();
    expect(stale.dispose).toHaveBeenCalledTimes(1);

    // And the old key is gone — only the newest build is adoptable.
    expect(adoptWarmPoseDetector(CONFIG_A)).toBeNull();
    expect(adoptWarmPoseDetector(CONFIG_B)).not.toBeNull();
  });

  it('evicts a rejected warm so the session builds fresh instead of adopting a failure', async () => {
    createPoseDetectorMock.mockRejectedValueOnce(new Error('wasm fetch failed'));
    warmPoseDetector(CONFIG_A);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(adoptWarmPoseDetector(CONFIG_A)).toBeNull();

    createPoseDetectorMock.mockResolvedValueOnce(fakeDetector('retry'));
    const retry = warmPoseDetector(CONFIG_A);
    await expect(retry).resolves.toBeTruthy();
    expect(createPoseDetectorMock).toHaveBeenCalledTimes(2);
  });
});
