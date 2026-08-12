export type MobileQualityTier = 'high' | 'balanced' | 'light';

export interface MobileQualityProfile {
  width: number;
  height: number;
  frameRate: number;
}

export const MOBILE_QUALITY_PROFILES: Record<MobileQualityTier, MobileQualityProfile> = {
  high: { width: 640, height: 480, frameRate: 30 },
  balanced: { width: 480, height: 360, frameRate: 24 },
  light: { width: 320, height: 240, frameRate: 15 },
};

export interface MobileQualitySample {
  /** Measured completed-inference loop FPS, including RAF/scheduling gaps. */
  fps: number;
  /** Time spent inside estimatePoses, in milliseconds. */
  detectionTimeMs: number;
  /** Monotonic timestamp for this completed inference. */
  timestampMs: number;
}

export interface MobileQualityDecision {
  from: MobileQualityTier;
  tier: MobileQualityTier;
  direction: 'down' | 'up';
  fps: number;
  detectionTimeMs: number;
  timestampMs: number;
}

export interface AdaptiveMobileQualityOptions {
  /** Samples required before each decision window is evaluated. */
  windowSize?: number;
  /** Ignore warm-up measurements while the model and backend settle. */
  warmupMs?: number;
  /** Minimum time between camera quality changes. */
  cooldownMs?: number;
}

const MATERIAL_SETTING_CHANGE_RATIO = 0.1;
const MAX_PROFILE_OVERSHOOT_RATIO = 1.25;
const MIN_PROFILE_RATIO = 0.75;

const DEFAULT_WINDOW_SIZE = 30;
const DEFAULT_WARMUP_MS = 4_000;
const DEFAULT_COOLDOWN_MS = 8_000;

const TIER_ORDER: MobileQualityTier[] = ['light', 'balanced', 'high'];

function nextTier(tier: MobileQualityTier, direction: 'up' | 'down'): MobileQualityTier | null {
  const index = TIER_ORDER.indexOf(tier);
  const nextIndex = direction === 'up' ? index + 1 : index - 1;
  return TIER_ORDER[nextIndex] ?? null;
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function windowFps(samples: MobileQualitySample[]): number {
  if (samples.length < 2) return 0;
  const elapsedMs = samples[samples.length - 1].timestampMs - samples[0].timestampMs;
  return elapsedMs > 0 ? ((samples.length - 1) * 1000) / elapsedMs : 0;
}

/**
 * Keeps mobile quality changes deliberately slow and reversible. A single
 * dropped frame never changes the camera; a sustained bad window does.
 */
export class AdaptiveMobileQualityController {
  private readonly windowSize: number;
  private readonly warmupMs: number;
  private readonly cooldownMs: number;
  private samples: MobileQualitySample[] = [];
  private startedAtMs: number | null = null;
  private lastChangeAtMs = -Infinity;
  private tier: MobileQualityTier;

  constructor(
    initialTier: MobileQualityTier = 'balanced',
    options: AdaptiveMobileQualityOptions = {}
  ) {
    this.tier = initialTier;
    this.windowSize = Math.max(4, options.windowSize ?? DEFAULT_WINDOW_SIZE);
    this.warmupMs = Math.max(0, options.warmupMs ?? DEFAULT_WARMUP_MS);
    this.cooldownMs = Math.max(0, options.cooldownMs ?? DEFAULT_COOLDOWN_MS);
  }

  get currentTier(): MobileQualityTier {
    return this.tier;
  }

  observe(sample: MobileQualitySample): MobileQualityDecision | null {
    if (!Number.isFinite(sample.fps) || !Number.isFinite(sample.detectionTimeMs)) return null;
    if (!Number.isFinite(sample.timestampMs)) return null;

    this.startedAtMs ??= sample.timestampMs;
    this.samples.push(sample);
    if (this.samples.length < this.windowSize) return null;

    const window = this.samples.splice(0, this.windowSize);
    if (sample.timestampMs - this.startedAtMs < this.warmupMs) return null;
    if (sample.timestampMs - this.lastChangeAtMs < this.cooldownMs) return null;

    // Use elapsed window throughput rather than averaging reciprocal frame
    // intervals; jittery 10ms/100ms intervals must not look like 55 FPS.
    const fps = windowFps(window);
    const detectionTimeMs = average(window.map((entry) => entry.detectionTimeMs));
    const direction = this.getDirection(fps, detectionTimeMs);
    if (!direction) return null;

    const next = nextTier(this.tier, direction);
    if (!next) return null;

    const from = this.tier;
    return { from, tier: next, direction, fps, detectionTimeMs, timestampMs: sample.timestampMs };
  }

  /** Commit a decision only after the camera track accepts the new settings. */
  commit(decision: MobileQualityDecision, timestampMs = decision.timestampMs): boolean {
    if (this.tier !== decision.from) return false;
    this.tier = decision.tier;
    this.lastChangeAtMs = timestampMs;
    return true;
  }

  private getDirection(fps: number, detectionTimeMs: number): 'up' | 'down' | null {
    // Conservative downgrade thresholds protect station cue timing and avoid
    // spending CPU on a camera feed the device cannot process comfortably.
    const shouldDownshift =
      this.tier === 'high'
        ? fps < 18 || detectionTimeMs > 180
        : this.tier === 'balanced'
          ? fps < 15 || detectionTimeMs > 220
          : false;
    if (shouldDownshift) return 'down';

    // Upgrade only after the device is clearly healthy. The gap between these
    // thresholds and the downgrade thresholds provides hysteresis.
    const shouldUpshift =
      this.tier === 'light'
        ? fps >= 20 && detectionTimeMs <= 160
        : this.tier === 'balanced'
          ? fps >= 23 && detectionTimeMs <= 130
          : false;
    return shouldUpshift ? 'up' : null;
  }
}

export function getMobileQualityConstraints(tier: MobileQualityTier): MediaTrackConstraints {
  const profile = MOBILE_QUALITY_PROFILES[tier];
  return {
    width: { ideal: profile.width },
    height: { ideal: profile.height },
    frameRate: { ideal: profile.frameRate },
  };
}

/**
 * Browsers treat ideal camera constraints as a request, not a guarantee. Only
 * announce a tier after the track reports a meaningful move toward that
 * profile; otherwise Safari can keep the old capture settings while the UI
 * claims that the session became lighter or was restored.
 */
export function hasMaterialCameraQualityChange(
  before: MediaTrackSettings,
  after: MediaTrackSettings,
  profile: MobileQualityProfile,
  direction: 'down' | 'up'
): boolean {
  const values = [
    { before: before.width, after: after.width, target: profile.width },
    { before: before.height, after: after.height, target: profile.height },
    { before: before.frameRate, after: after.frameRate, target: profile.frameRate },
  ];
  const knownValues = values.filter(
    (value): value is { before: number; after: number; target: number } =>
      Number.isFinite(value.before) && Number.isFinite(value.after)
  );
  if (knownValues.length === 0) return false;

  const movedMaterially = knownValues.some(({ before: previous, after: current }) =>
    direction === 'down'
      ? current <= previous * (1 - MATERIAL_SETTING_CHANGE_RATIO)
      : current >= previous * (1 + MATERIAL_SETTING_CHANGE_RATIO)
  );
  if (!movedMaterially) return false;

  return knownValues.every(({ after: current, target }) =>
    direction === 'down'
      ? current <= target * MAX_PROFILE_OVERSHOOT_RATIO
      : current >= target * MIN_PROFILE_RATIO
  );
}
