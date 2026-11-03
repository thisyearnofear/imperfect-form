import type { MovementAssessmentInconclusiveReason } from '@/types/movementAssessment';

/**
 * Inconclusive is an honest answer (docs/PHASE_B_PLAN §B3). One record per
 * reason, two registers:
 *
 * - `cause` — what the meter could not see, in the record's voice. Used by
 *   MovementCard + assessment history (the terse, review-facing line).
 * - `fix` — the one fixable thing, in plain English. Used by SessionRecap's
 *   inconclusive lead so the retry is never a shrug.
 *
 * Brass, never red: a refused read is the meter telling the truth.
 */
export interface InconclusiveReadCopy {
  cause: string;
  fix: string;
}

export const INCONCLUSIVE_COPY: Record<MovementAssessmentInconclusiveReason, InconclusiveReadCopy> =
  {
    invalid_protocol: {
      cause: 'This capture did not match the selected baseline protocol.',
      fix: 'Retake the standard five-rep reading — the card only reads that protocol.',
    },
    insufficient_reps: {
      cause: 'The read ended before the five-rep baseline finished.',
      fix: 'Complete all five controlled reps — the baseline counts every one.',
    },
    insufficient_trace: {
      cause: 'The meter saw too little of the set to keep a record.',
      fix: 'Stay in frame for the full protocol — a few more frames and it can read.',
    },
    low_visibility: {
      cause: 'The camera could not keep the working joints clearly in view.',
      fix: 'Step back so both arms stay in frame, and add a little more light.',
    },
    unstable_tracking: {
      cause: 'The meter lost a steady fix on the joints.',
      fix: 'Prop the phone so it cannot move, and keep the background calm.',
    },
    high_noise: {
      cause: 'The movement signal was too noisy to summarize this time.',
      fix: 'Slow the reps down — a controlled rep reads cleaner than a fast one.',
    },
  };

/** Reason-keyed lookup with the history fallback already applied. */
export function inconclusiveRead(
  reason?: MovementAssessmentInconclusiveReason
): InconclusiveReadCopy {
  return INCONCLUSIVE_COPY[reason ?? 'insufficient_trace'];
}
