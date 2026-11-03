import type { MovementAssessmentMeasurements } from '@/types/movementAssessment';

/**
 * The plain-language line under a valid reading — what the meter saw, in
 * the user's words, before any numbers. Control and symmetry only; the card
 * keeps the instrumentation.
 */
export function readingSentence(m: MovementAssessmentMeasurements): string {
  const word = m.control >= 0.8 ? 'steady' : m.control >= 0.6 ? 'mostly steady' : 'a bit wobbly';
  if (m.symmetry === null) {
    return `Control was ${word}. Left and right couldn’t be compared — keep both arms in frame next time.`;
  }
  if (m.symmetry >= 0.9) {
    return `Both sides moved closely matched, and control was ${word}.`;
  }
  if (m.symmetry >= 0.75) {
    return `One side moved a little differently from the other; control was ${word}.`;
  }
  return `Left and right moved noticeably differently; control was ${word}.`;
}
