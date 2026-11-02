/**
 * Read quality → instrument level. The meter's honest voice (docs/PHASE_B_PLAN):
 * Clear / Usable / Early — the same vocabulary the docs and copy already use.
 * Pure mapping with hysteresis so the needle doesn't flap between zones on a
 * borderline signal.
 */

export type ReadLevel = 'clear' | 'usable' | 'early';

export interface ReadQuality {
  level: ReadLevel;
  /** 0..1 needle position across the dial. */
  needle: number;
}

const CLEAR_THRESHOLD = 0.75;
const USABLE_THRESHOLD = 0.5;
/** Stickiness: a level must be beaten by this margin to change downward. */
const HYSTERESIS = 0.06;

export function scoreToNeedle(score: number): number {
  return Math.min(1, Math.max(0, score));
}

export function scoreToLevel(score: number): ReadLevel {
  if (score >= CLEAR_THRESHOLD) return 'clear';
  if (score >= USABLE_THRESHOLD) return 'usable';
  return 'early';
}

const LEVEL_RANK: Record<ReadLevel, number> = { clear: 2, usable: 1, early: 0 };

/**
 * Combine pose-model confidence with tracking stability into one read score.
 * Confidence is how sure the model is; stability is how steady the capture is.
 * The read is only as good as the worse of the two, weighted slightly toward
 * stability — a confident model on a shaking camera is still a bad read.
 */
export function combineReadSignals(confidence: number, stability: number): number {
  const c = scoreToNeedle(confidence);
  const s = scoreToNeedle(stability);
  return Math.min(c, s) * 0.6 + ((c + s) / 2) * 0.4;
}

/** Level with hysteresis against the previous level. */
export function readQuality(
  confidence: number,
  stability: number,
  previous?: ReadLevel
): ReadQuality {
  const score = combineReadSignals(confidence, stability);
  let level = scoreToLevel(score);
  if (previous && LEVEL_RANK[level] < LEVEL_RANK[previous]) {
    const threshold = previous === 'clear' ? CLEAR_THRESHOLD : USABLE_THRESHOLD;
    if (score >= threshold - HYSTERESIS) level = previous;
  }
  return { level, needle: scoreToNeedle(score) };
}
