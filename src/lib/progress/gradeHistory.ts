/**
 * Grade arc — a movement's form grade across sessions, not just within one.
 *
 * Sandow graded photographs against an ideal and mailed back the correction;
 * the modern loop grades every rep and persists the session average
 * (`formScoreAvg`). This builds the long-term arc the recap never surfaced:
 * "your control graded D three weeks ago, B this week." Progress against
 * yourself — the heritage argument made personal.
 */

import { getFormGrade } from '@/lib/formGrade';
import type { LocalWorkout } from '@/types/workout';
import type { ExerciseMode } from '@/utils/biomechanics';

export type GradePoint = {
  /** Session timestamp (ms) */
  t: number;
  /** Short label e.g. "3/12" */
  label: string;
  /** Average per-rep form score 0–100 for the session */
  score: number;
  /** Letter grade for that score */
  grade: string;
};

export type GradeSeries = {
  /** Oldest → newest graded sessions */
  points: GradePoint[];
  first: GradePoint | null;
  latest: GradePoint | null;
  /** True when there are ≥2 graded sessions to draw an arc */
  hasArc: boolean;
};

const DEFAULT_LIMIT = 8;

function shortLabel(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

/**
 * Build a chronological grade series from the graded workouts of one mode.
 * Sessions without a finite `formScoreAvg` (non-graded modes, or history from
 * before grading shipped) are skipped — the arc only draws where there is
 * signal, so it never fabricates a trend.
 */
export function buildGradeSeries(
  workouts: LocalWorkout[],
  mode: ExerciseMode,
  limit: number = DEFAULT_LIMIT
): GradeSeries {
  const graded = workouts
    .filter(
      (w) =>
        w.type === mode && typeof w.formScoreAvg === 'number' && Number.isFinite(w.formScoreAvg)
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  const chronological = [...graded].reverse();
  const points: GradePoint[] = chronological.map((w) => {
    const score = Math.round(w.formScoreAvg as number);
    return {
      t: w.timestamp,
      label: shortLabel(w.timestamp),
      score,
      grade: getFormGrade(score).grade,
    };
  });

  return {
    points,
    first: points[0] ?? null,
    latest: points[points.length - 1] ?? null,
    hasArc: points.length >= 2,
  };
}
