/**
 * Persona voice for the live coaching line.
 *
 * `resolveLiveStatus` in LiveCoachingStatus is a pure state machine that returns
 * the *instruction* — what to fix and what to do next. That content must stay
 * identical across personas, or the coaching stops being consistent.
 *
 * What differs by persona is the *delivery*: whether the beat sounds like a
 * patient instructor, a steady one, or a pier barker. Before this module the
 * three personas were fully written (coachPersonalities.ts) and selectable in
 * the UI, but never reached the coaching line — the user always heard the same
 * machine register regardless of who they had chosen.
 *
 * Kept separate from the component and free of storage access so it can be
 * unit-tested: the persona is passed in rather than read here.
 */

import { getPersonalityFeedback, type CoachPersonality } from './coachPersonalities';
import type { CoachingMomentPhase } from './coachingMoment';

/** The beats where a persona's voice is audible rather than just instructional. */
export type PersonaBeat =
  | 'session_start'
  | 'first_signal'
  | 'encouragement'
  | 'your_turn'
  | 'form_feedback'
  | 'rep_complete';

/**
 * Map a coaching phase onto the beat that carries the voice.
 *
 * Correction phases are deliberately excluded: when the coach names a fix, the
 * instruction is the product and must not be reworded per persona.
 */
export function beatForPhase(
  phase: CoachingMomentPhase,
  opts: { firstSignal?: boolean; hasWarning?: boolean } = {}
): PersonaBeat | null {
  if (opts.firstSignal) return 'first_signal';
  switch (phase) {
    case 'framing':
      return 'session_start';
    case 'observed':
      return 'encouragement';
    case 'your_turn':
      return 'your_turn';
    case 'correction':
      // Only when there is no specific fix to name — a generic correction beat
      // is encouragement; a concrete one is instruction.
      return opts.hasWarning ? null : 'form_feedback';
    default:
      return null;
  }
}

/**
 * Compose the coaching line: shared instruction, persona-flavoured delivery.
 *
 * The instruction is returned unchanged when there is no persona beat, so the
 * common correction path is byte-identical to before this existed.
 */
export function deliverCoachingLine({
  instruction,
  phase,
  personality,
  arcade = false,
  firstSignal = false,
  hasWarning = false,
  formScore,
}: {
  instruction: string;
  phase: CoachingMomentPhase;
  personality: CoachPersonality;
  arcade?: boolean;
  firstSignal?: boolean;
  hasWarning?: boolean;
  formScore?: number;
}): string {
  const beat = beatForPhase(phase, { firstSignal, hasWarning });
  if (!beat) return instruction;

  // Arcade already has its own loud register; layering a persona on top of it
  // produced two competing voices, so arcade keeps its scripted line.
  if (arcade) return instruction;

  const voice = personaLine(beat, personality, formScore);

  // Keep the instruction: the voice wraps it rather than replacing it, so the
  // user still learns what to do while hearing a coach rather than a machine.
  return voice ? `${voice} ${instruction}` : instruction;
}

function personaLine(beat: PersonaBeat, personality: CoachPersonality, formScore?: number): string {
  switch (beat) {
    case 'session_start':
      return getPersonalityFeedback(personality, 'session_start');
    case 'first_signal':
    case 'encouragement':
    case 'your_turn':
      return getPersonalityFeedback(personality, 'encouragement');
    case 'form_feedback':
    case 'rep_complete':
      return getPersonalityFeedback(personality, 'form_feedback', formScore);
    default:
      return '';
  }
}
