import type { SessionSummary } from '@/services/sessionLogger';
import type { MovementAssessment, MovementAssessmentProtocol } from '@/types/movementAssessment';

/**
 * Reach-reading detail — the honest numbers behind a protocol read, derived
 * from the session trace and the assessment record. Nothing here invents a
 * metric: every figure is either already in the assessment record or comes
 * from the same trace signals the rep counter read (elevation, trunk lean,
 * symmetry, warnings). The meter compares to the protocol's own gates and
 * her own numbers only — never a population.
 */

/** Elevation the rep counter armed on (reachProcessor.LOWERED_DEG). */
const LOWERED_DEG = 50;
/** Elevation that counts a rep (reachProcessor.RAISED_DEG). */
export const REACH_LINE_DEG = 135;
/**
 * The trace stores elevation as depth = activeElevation / 160
 * (analyzeBiomechanics, reach branch). Converting back is honest — it is the
 * same signal the live gauge and the rep counter shared.
 */
const DEPTH_TO_ELEV_DEG = 160;

export interface ReachRaisePeak {
  /** 1-based raise index across the whole trace (includes the warm-up). */
  index: number;
  /** Peak elevation in degrees, the same unit the 135° line uses. */
  elevationDeg: number;
  /** Whether the excursion crossed the rep line. */
  metLine: boolean;
}

/**
 * Per-raise elevation peaks: contiguous excursions above the arm-lowered
 * line, each carrying its apex. The 5fps trace can miss a frame or two at
 * the very top, so callers render these as approximate degrees.
 */
export function reachRaisePeaks(summary: SessionSummary | null): ReachRaisePeak[] {
  const trace = summary?.trace;
  if (!trace || trace.length === 0) return [];
  const peaks: ReachRaisePeak[] = [];
  let current: number | null = null;
  for (const frame of trace) {
    const elevation = frame.metrics.depth * DEPTH_TO_ELEV_DEG;
    if (!Number.isFinite(elevation)) continue;
    if (elevation > LOWERED_DEG) {
      current = current === null ? elevation : Math.max(current, elevation);
    } else if (current !== null) {
      peaks.push({
        index: peaks.length + 1,
        elevationDeg: Math.round(current),
        metLine: current >= REACH_LINE_DEG,
      });
      current = null;
    }
  }
  if (current !== null) {
    peaks.push({
      index: peaks.length + 1,
      elevationDeg: Math.round(current),
      metLine: current >= REACH_LINE_DEG,
    });
  }
  return peaks;
}

export interface ReachSwayRead {
  /** Highest trunk-lean angle observed across the trace, degrees. */
  maxLeanDeg: number;
  /** Frames/observations where the meter flagged the back doing the reach's work. */
  flaggedCount: number;
  /** False when the hip chain was never observed — sway could not be judged. */
  judged: boolean;
}

/**
 * Trunk-sway read from the same two places the meter used: the per-frame
 * trunkLean channel and the observations it logged ('TRUNK SWAY' /
 * 'trunk_lean'). When no lean was ever measured the hips were out of frame —
 * the honest answer is "not judged", not zero.
 */
export function reachSwayRead(summary: SessionSummary | null): ReachSwayRead | null {
  const trace = summary?.trace;
  if (!trace || trace.length === 0) return null;
  const maxLeanDeg = Math.round(
    trace.reduce((max, frame) => Math.max(max, frame.metrics.trunkLean ?? 0), 0)
  );
  const judged = trace.some((frame) => (frame.metrics.trunkLean ?? 0) > 0.5);
  const flaggedCount =
    (summary?.anomalies ?? []).filter((snapshot) =>
      snapshot.metrics.warnings.some((w) => /trunk/i.test(w))
    ).length + trace.filter((frame) => frame.metrics.warnings.some((w) => /trunk/i.test(w))).length;
  return { maxLeanDeg, flaggedCount, judged };
}

export interface QualityGate {
  label: string;
  /** Observed value (0–1 ratios are rendered as % by the caller). */
  observed: number;
  /** The protocol's own minimum — a capture gate, not a norm. */
  minimum: number;
  /** Display strings, pre-formatted so the component stays dumb. */
  observedText: string;
  minimumText: string;
  pass: boolean;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * The protocol gates the assessment record was measured against — the exact
 * numbers `evaluateMovementAssessment` used, side by side with what it saw.
 * A failed gate explains an inconclusive read; a passed set explains a valid
 * one. These are protocol capture targets, never claims about her body.
 */
export function qualityGates(
  assessment: MovementAssessment,
  protocol: MovementAssessmentProtocol
): QualityGate[] {
  const q = assessment.quality;
  return [
    {
      label: 'Reps',
      observed: q.repCount,
      minimum: protocol.targetReps,
      observedText: `${q.repCount}`,
      minimumText: `${protocol.targetReps}`,
      pass: q.repCount >= protocol.targetReps,
    },
    {
      label: 'Frames',
      observed: q.traceFrames,
      minimum: protocol.minTraceFrames,
      observedText: `${q.traceFrames}`,
      minimumText: `≥${protocol.minTraceFrames}`,
      pass: q.traceFrames >= protocol.minTraceFrames,
    },
    {
      label: 'Confidence',
      observed: q.poseConfidence,
      minimum: protocol.minPoseConfidence,
      observedText: pct(q.poseConfidence),
      minimumText: `≥${pct(protocol.minPoseConfidence)}`,
      pass: q.poseConfidence >= protocol.minPoseConfidence,
    },
    {
      label: 'Observed',
      observed: q.observedFrameRatio,
      minimum: protocol.minObservedFrameRatio,
      observedText: pct(q.observedFrameRatio),
      minimumText: `≥${pct(protocol.minObservedFrameRatio)}`,
      pass: q.observedFrameRatio >= protocol.minObservedFrameRatio,
    },
    {
      label: 'Both arms',
      observed: q.bilateralFrameRatio,
      minimum: protocol.minBilateralFrameRatio,
      observedText: pct(q.bilateralFrameRatio),
      minimumText: `≥${pct(protocol.minBilateralFrameRatio)}`,
      pass: q.bilateralFrameRatio >= protocol.minBilateralFrameRatio,
    },
    {
      label: 'Stable',
      observed: q.stableFrameRatio,
      minimum: protocol.minStableFrameRatio,
      observedText: pct(q.stableFrameRatio),
      minimumText: `≥${pct(protocol.minStableFrameRatio)}`,
      pass: q.stableFrameRatio >= protocol.minStableFrameRatio,
    },
  ];
}

/**
 * The quiet expectation line for a live reach reading — the protocol's own
 * target stated before the first raise, and what a complete rep needs once
 * one has landed. Callers gate this behind the higher-priority voices
 * (missing-arm line, the processor's own cue, the framing hint) — this is
 * the floor, never the loudest thing on stage.
 */
export function reachExpectationLine({
  repCount,
  countedReps,
  elevationDeg,
}: {
  /** Raw detector rep count (the warm-up rep included). */
  repCount: number;
  /** Meter-counted reps — raw minus the rehearsal rep. */
  countedReps: number;
  /** Live smoothed elevation in degrees, or null when no arm is read. */
  elevationDeg: number | null;
}): string | null {
  if (repCount === 0) {
    return 'The line is 135° — raise to your comfortable max, your own pace.';
  }
  // Between reps = arm back below the processor's own lowered line. While the
  // arm is still travelling the near-miss / re-arm cues do the talking.
  if (countedReps >= 1 && elevationDeg !== null && elevationDeg < LOWERED_DEG) {
    return 'Reach the line, come back down — that’s one.';
  }
  return null;
}
