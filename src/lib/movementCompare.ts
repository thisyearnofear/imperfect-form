import { compareMovementAssessments } from '@/lib/movementAssessment';
import { formatSignedPercent } from '@/lib/movementAssessmentHistory';
import { isFeelEntry, type NiggleEntry } from '@/lib/niggleEntries';
import type { NiggleJointId } from '@/lib/niggleIntents';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';

/**
 * The weekly pairing — numbers vs feelings, told honestly (retention arc §3).
 *
 * When a session ends on a valid protocol read and a previous valid read
 * exists, the recap can put the two halves of the story side by side: what
 * the meter saw (the MovementAssessmentComparison delta) and what she
 * logged (the 1–5 feel check-ins around it). Three states, no fourth:
 *
 *   felt-it-too   numbers improved and the feel log agrees
 *   meter-first   the numbers moved but the feel log held flat —
 *                 feeling often lags
 *   still-hurts   the feel log worsened — the professional door,
 *                 regardless of the numbers
 *
 * Anything else (numbers flat or down while feels hold or improve, or the
 * feel windows too thin to average) renders nothing — a pairing that can
 * only be told vaguely is not told at all.
 */

export const WEEK_PAIRING = {
  /**
   * Numbers "moved" past ±3 percentage points of normalized signal. The
   * protocol reads on a 0–1 scale; below this the captures are within
   * ordinary setup noise and saying "the meter moved" would overclaim.
   */
  movementEpsilon: 0.03,
  /**
   * Feeling "changed" past half a point on the 1–5 scale — a full chip
   * between weekly averages before we call it a shift, not a mood.
   */
  feelEpsilon: 0.5,
  /**
   * The recent feel window — roughly the re-read week. Entries inside it
   * are "this week"; entries before it are the prior baseline.
   */
  windowDays: 10,
  /** The recent window needs at least two check-ins to average honestly. */
  minRecentFeels: 2,
} as const;

export type WeekPairingState = 'felt-it-too' | 'meter-first' | 'still-hurts';

export interface WeekPairing {
  state: WeekPairingState;
  /** The headline in the instrument's voice. */
  headline: string;
  /** The quiet supporting line — the actual numbers behind the headline. */
  detail: string;
  rangeDelta: number;
  feelDelta: number;
}

export interface FeelWindowDelta {
  recentAvg: number;
  priorAvg: number;
  /** recentAvg − priorAvg; positive = feels worse (severity climbs). */
  delta: number;
  recentCount: number;
  priorCount: number;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Avg feel this window vs the prior record — the subjective half of the
 * pairing. Entries are 1–5 severity (1 = barely there, 5 = a lot), so a
 * positive delta means it feels WORSE. Returns null when the data is thin:
 * fewer than two recent check-ins, or no prior entry to compare against.
 */
export function feelWindowDelta(
  entries: NiggleEntry[],
  now = Date.now(),
  windowDays = WEEK_PAIRING.windowDays,
  joint?: NiggleJointId
): FeelWindowDelta | null {
  const cutoff = now - windowDays * 86_400_000;
  const feels = entries.filter(isFeelEntry).filter((entry) => !joint || entry.joint === joint);
  const recent = feels
    .filter((entry) => entry.timestamp >= cutoff)
    .map((entry) => entry.severity as number);
  const prior = feels
    .filter((entry) => entry.timestamp < cutoff)
    .map((entry) => entry.severity as number);
  if (recent.length < WEEK_PAIRING.minRecentFeels || prior.length === 0) return null;
  const recentAvg = average(recent);
  const priorAvg = average(prior);
  return {
    recentAvg,
    priorAvg,
    delta: recentAvg - priorAvg,
    recentCount: recent.length,
    priorCount: prior.length,
  };
}

const HEADLINES: Record<WeekPairingState, string> = {
  'felt-it-too': 'you felt it too — the numbers agree',
  'meter-first': 'the meter moved first — feeling often lags',
  'still-hurts': 'if it keeps hurting, worth seeing a professional',
};

/**
 * Compare the two halves and pick the honest headline — or none. Reuses
 * `compareMovementAssessments` for the numbers half (same protocol gate,
 * same delta fields the history card shows).
 */
export function weekPairing(
  previous: MovementAssessment,
  current: MovementAssessment,
  entries: NiggleEntry[],
  opts: { now?: number; joint?: NiggleJointId } = {}
): WeekPairing | null {
  const comparison = compareMovementAssessments(previous, current);
  if (!comparison.comparable || comparison.rangeDelta === null) return null;

  const feel = feelWindowDelta(entries, opts.now, WEEK_PAIRING.windowDays, opts.joint);
  if (!feel) return null;

  const { movementEpsilon: moveEps, feelEpsilon: feelEps } = WEEK_PAIRING;
  const rangeDelta = comparison.rangeDelta;
  const feelDelta = feel.delta;
  const detail = `range ${formatSignedPercent(rangeDelta)} vs your last read · feel avg ${feel.recentAvg.toFixed(1)} vs ${feel.priorAvg.toFixed(1)}`;

  // Feels worse outranks everything — the meter's good news never talks
  // over a body trending the wrong way.
  if (feelDelta > feelEps) {
    return {
      state: 'still-hurts',
      headline: HEADLINES['still-hurts'],
      detail,
      rangeDelta,
      feelDelta,
    };
  }
  // Numbers improved AND the feel log agrees.
  if (rangeDelta > moveEps && feelDelta < -feelEps) {
    return {
      state: 'felt-it-too',
      headline: HEADLINES['felt-it-too'],
      detail,
      rangeDelta,
      feelDelta,
    };
  }
  // The numbers moved (either direction) while the feel log held flat.
  // Numbers down + feels better is a disagreement, not a lag — no line.
  if (Math.abs(rangeDelta) > moveEps && Math.abs(feelDelta) <= feelEps) {
    return {
      state: 'meter-first',
      headline: HEADLINES['meter-first'],
      detail,
      rangeDelta,
      feelDelta,
    };
  }
  return null;
}

/**
 * The recap's whole gate in one call: a valid current read, an earlier
 * valid read on the same protocol (the current one excluded by timestamp —
 * it may or may not be persisted yet), then the pairing itself. Thin data
 * at any step renders nothing.
 */
export function weeklyPairingFor({
  current,
  stored,
  entries,
  joint,
  now,
}: {
  current: MovementAssessment;
  stored: StoredMovementAssessment[];
  entries: NiggleEntry[];
  joint?: NiggleJointId;
  now?: number;
}): WeekPairing | null {
  if (current.status !== 'valid' || !current.measurements) return null;
  const previous = stored
    .filter(
      (record) =>
        record.assessment.protocolId === current.protocolId &&
        record.assessment.status === 'valid' &&
        record.assessment.capturedAt !== current.capturedAt
    )
    .sort((a, b) => b.assessment.capturedAt - a.assessment.capturedAt)[0]?.assessment;
  if (!previous) return null;
  return weekPairing(previous, current, entries, { now, joint });
}
