/**
 * Recent progress series for ProgressSpark (celebrate + earned dashboard).
 * Progress = last N sessions as a curve, not the live HUD counter.
 */

import { getLocalWorkouts } from '@/services/integrations/WorkoutDataAdapter';
import { XP_CONSTANTS } from '@/services/XPService';
import type { LocalWorkout } from '@/types/workout';

export type ProgressSeriesPoint = {
  /** Session timestamp (ms) */
  t: number;
  /** Short label e.g. "Mon" or "3/12" */
  label: string;
  /** Primary metric — session XP estimate (reps-driven) */
  value: number;
  reps: number;
  mode: LocalWorkout['type'];
};

export type ProgressSeries = {
  points: ProgressSeriesPoint[];
  /** True when we have enough history to draw a meaningful curve */
  hasTrend: boolean;
};

const DEFAULT_LIMIT = 7;

function sessionXpEstimate(workout: LocalWorkout): number {
  return workout.reps * XP_CONSTANTS.XP_PER_REP + XP_CONSTANTS.XP_PER_WORKOUT;
}

function shortLabel(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

/**
 * Build a chronological series from the newest workouts (oldest → newest for chart).
 */
export function buildProgressSeries(
  workouts: LocalWorkout[],
  limit: number = DEFAULT_LIMIT
): ProgressSeries {
  const sorted = [...workouts].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  const chronological = [...sorted].reverse();
  const points: ProgressSeriesPoint[] = chronological.map((w) => ({
    t: w.timestamp,
    label: shortLabel(w.timestamp),
    value: sessionXpEstimate(w),
    reps: w.reps,
    mode: w.type,
  }));
  return {
    points,
    hasTrend: points.length >= 2,
  };
}

/** Async convenience used by celebrate / hero. */
export async function getRecentProgressSeries(
  limit: number = DEFAULT_LIMIT
): Promise<ProgressSeries> {
  try {
    const workouts = await getLocalWorkouts();
    return buildProgressSeries(workouts, limit);
  } catch {
    return { points: [], hasTrend: false };
  }
}
