import type { SessionSummary } from '@/services/sessionLogger';
import type { FormSignature, LocalWorkout } from '@/types/workout';

export type FormSignaturePoint = {
  timestamp: number;
  label: string;
  reps: number;
  signature: FormSignature;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function shortLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
  });
}

/**
 * Turn one session summary into a compact, comparable form signature.
 * The signature is intentionally not a score: it describes the user's current
 * movement pattern using depth, depth consistency, and observed-form rate.
 */
export function buildFormSignature(summary: SessionSummary): FormSignature {
  const depths = summary.trace
    .map((snapshot) => snapshot.metrics.depth)
    .filter((depth) => Number.isFinite(depth));
  const averageDepth = clamp(summary.avgDepth);
  const mean =
    depths.length > 0
      ? depths.reduce((sum, depth) => sum + depth, 0) / depths.length
      : averageDepth;
  const variance =
    depths.length > 0
      ? depths.reduce((sum, depth) => sum + (depth - mean) ** 2, 0) / depths.length
      : 0;
  const standardDeviation = Math.sqrt(variance);

  return {
    averageDepth,
    depthConsistency: clamp(1 - standardDeviation / 0.5),
    observationRate: clamp(summary.warningCount / Math.max(summary.trace.length, 1)),
  };
}

/** Build a chronological history from local signatures for one exercise mode. */
export function buildFormSignatureHistory(
  workouts: LocalWorkout[],
  mode: LocalWorkout['type'],
  limit = 6,
  userAddress: string
): FormSignaturePoint[] {
  return workouts
    .filter(
      (workout) =>
        workout.type === mode && workout.formSignature && workout.userAddress === userAddress
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-limit)
    .map((workout) => ({
      timestamp: workout.timestamp,
      label: shortLabel(workout.timestamp),
      reps: workout.reps,
      signature: workout.formSignature!,
    }));
}

/**
 * Choose the strongest prior trace for a self-ghost run. Ties resolve to the
 * most recent session so the challenge feels like a living personal record.
 */
export function chooseSelfGhostWorkout(
  workouts: LocalWorkout[],
  mode: LocalWorkout['type'],
  currentTimestamp: number | undefined,
  userAddress: string
): LocalWorkout | null {
  const candidates = workouts.filter(
    (workout) =>
      workout.type === mode &&
      workout.hasTrace === true &&
      (!userAddress || workout.userAddress === userAddress) &&
      workout.timestamp !== currentTimestamp
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((best, workout) => {
    if (workout.reps > best.reps) return workout;
    if (workout.reps === best.reps && workout.timestamp > best.timestamp) return workout;
    return best;
  });
}

/** Include the just-finished session before persistence catches up. */
export function appendCurrentSignature(
  history: FormSignaturePoint[],
  current: { timestamp: number; reps: number; signature: FormSignature } | null,
  limit = 6
): FormSignaturePoint[] {
  if (!current || history.some((point) => point.timestamp === current.timestamp)) return history;

  return [
    ...history,
    {
      timestamp: current.timestamp,
      label: shortLabel(current.timestamp),
      reps: current.reps,
      signature: current.signature,
    },
  ].slice(-limit);
}
