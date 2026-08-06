export type CoachingMomentPhase = 'framing' | 'observed' | 'correction' | 'your_turn';

export type CoachingMomentInput = {
  tracking: boolean;
  repCount: number;
  warning: string | null;
  latchedWarning: string | null;
  repAtWarning: number | null;
};

/**
 * Keep the coaching story honest and small:
 * frame → see movement → name a correction → hand the movement back.
 * A latched warning remains actionable until the user completes another rep.
 */
export function deriveCoachingMoment({
  tracking,
  repCount,
  warning,
  latchedWarning,
  repAtWarning,
}: CoachingMomentInput): CoachingMomentPhase {
  if (!tracking) return 'framing';
  if (latchedWarning && repAtWarning !== null && repCount <= repAtWarning) {
    return 'correction';
  }
  if (warning && latchedWarning === null) return 'correction';
  if (repCount > 0) return 'your_turn';
  return 'observed';
}
