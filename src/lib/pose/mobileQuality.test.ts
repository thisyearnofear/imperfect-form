import { describe, expect, it } from 'vitest';
import {
  AdaptiveMobileQualityController,
  getMobileQualityConstraints,
  hasMaterialCameraQualityChange,
  MOBILE_QUALITY_PROFILES,
  type MobileQualityDecision,
} from './mobileQuality';

function observeWindow(
  controller: AdaptiveMobileQualityController,
  options: { fps: number; detectionTimeMs: number; startAt?: number; stepMs?: number }
) {
  const startAt = options.startAt ?? 0;
  const stepMs = options.stepMs ?? 50;
  let decision: MobileQualityDecision | null = null;
  for (let index = 0; index < 30; index += 1) {
    const nextDecision = controller.observe({
      fps: options.fps,
      detectionTimeMs: options.detectionTimeMs,
      timestampMs: startAt + index * stepMs,
    });
    if (nextDecision) {
      decision = nextDecision;
      controller.commit(nextDecision);
    }
  }
  return decision;
}

describe('adaptive mobile quality', () => {
  it('starts balanced and downshifts after a sustained poor window', () => {
    const controller = new AdaptiveMobileQualityController('balanced', {
      warmupMs: 0,
      cooldownMs: 0,
    });

    const decision = observeWindow(controller, {
      fps: 12,
      detectionTimeMs: 240,
      stepMs: 100,
    });

    expect(decision?.direction).toBe('down');
    expect(decision?.from).toBe('balanced');
    expect(decision?.tier).toBe('light');
    expect(controller.currentTier).toBe('light');
  });

  it('does not oscillate on a single bad sample', () => {
    const controller = new AdaptiveMobileQualityController('balanced', {
      warmupMs: 0,
      cooldownMs: 0,
    });

    const decision = controller.observe({ fps: 5, detectionTimeMs: 400, timestampMs: 0 });

    expect(decision).toBeNull();
    expect(controller.currentTier).toBe('balanced');
  });

  it('upshifts only after a healthy window with hysteresis', () => {
    const controller = new AdaptiveMobileQualityController('light', {
      warmupMs: 0,
      cooldownMs: 0,
    });

    const decision = observeWindow(controller, { fps: 22, detectionTimeMs: 120 });

    expect(decision?.direction).toBe('up');
    expect(decision?.tier).toBe('balanced');
  });

  it('uses elapsed window throughput when frame timing is jittery', () => {
    const controller = new AdaptiveMobileQualityController('high', {
      windowSize: 4,
      warmupMs: 0,
      cooldownMs: 0,
    });
    const timestamps = [0, 10, 120, 230];
    const decision = timestamps.reduce<MobileQualityDecision | null>((latest, timestampMs) => {
      const nextDecision = controller.observe({
        fps: 40,
        detectionTimeMs: 100,
        timestampMs,
      });
      return nextDecision ?? latest;
    }, null);

    expect(decision?.direction).toBe('down');
    expect(decision?.fps).toBeCloseTo(13.04, 1);
  });

  it('returns conservative camera constraints for the light tier', () => {
    expect(MOBILE_QUALITY_PROFILES.light).toEqual({ width: 320, height: 240, frameRate: 15 });
    expect(getMobileQualityConstraints('light')).toEqual({
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { ideal: 15 },
    });
  });

  it('does not claim a downshift when the browser ignores the request', () => {
    const unchanged = {
      width: 640,
      height: 480,
      frameRate: 30,
    };

    expect(
      hasMaterialCameraQualityChange(unchanged, unchanged, MOBILE_QUALITY_PROFILES.balanced, 'down')
    ).toBe(false);
  });

  it('accepts a materially applied downshift within the requested profile', () => {
    expect(
      hasMaterialCameraQualityChange(
        { width: 640, height: 480, frameRate: 30 },
        { width: 480, height: 360, frameRate: 24 },
        MOBILE_QUALITY_PROFILES.balanced,
        'down'
      )
    ).toBe(true);
  });

  it('requires a material move before announcing an upgrade', () => {
    expect(
      hasMaterialCameraQualityChange(
        { width: 480, height: 360, frameRate: 24 },
        { width: 500, height: 370, frameRate: 25 },
        MOBILE_QUALITY_PROFILES.high,
        'up'
      )
    ).toBe(false);

    expect(
      hasMaterialCameraQualityChange(
        { width: 480, height: 360, frameRate: 24 },
        { width: 640, height: 480, frameRate: 30 },
        MOBILE_QUALITY_PROFILES.high,
        'up'
      )
    ).toBe(true);
  });
});
