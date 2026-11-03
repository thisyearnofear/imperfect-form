import type { ExerciseMode } from '@/utils/biomechanics';
import { countedLabel } from '@/lib/exerciseGuidance';
import type { SessionSummary } from '@/services/sessionLogger';

const NEXT_FOCUS: Record<ExerciseMode, string> = {
  pushups: 'Keep one long line from shoulders through hips as you lower.',
  squats: 'Keep your knees tracking over your toes on the way down.',
  curls: 'Pin your elbows to your sides and avoid swinging.',
  pullups: 'Finish each rep with a controlled extension at the bottom.',
  jumps: 'Land softly and keep your knees tracking forward.',
  reach: 'Raise slowly and let the arm do the work — no lean-back.',
};

/** Return the next exercise-specific focus used across live and recap surfaces. */
export function nextFocusFor(mode: ExerciseMode): string {
  return NEXT_FOCUS[mode];
}

/** Turn detector labels into a cue that sounds like a coach, not a console. */
export function readableFormWarning(warning: string): string {
  const normalized = warning.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'elbow_swing' || normalized === 'pin_elbows') {
    return 'Keep your elbows quiet';
  }
  if (normalized === 'knees_in') return 'Knees are tracking inward';
  if (normalized === 'leaning_too_far') return 'Keep your chest more upright';
  if (normalized === 'pull_evenly' || normalized === 'asymmetry') {
    return 'Pull evenly through both sides';
  }
  if (normalized === 'trunk_sway' || normalized === 'trunk_lean') {
    return 'Reach with the arm, not the back';
  }
  if (normalized === 'match_arms') return 'Both arms — keep them matched';
  return warning.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type SessionStory = {
  title: string;
  body: string;
  focus: string;
};

/** Build the session's human-readable conclusion from measured session data. */
export function sessionStory(
  summary: SessionSummary | null,
  mode: ExerciseMode,
  reps: number
): SessionStory {
  const firstWarning = summary?.anomalies[0]?.metrics.warnings[0];
  // Carry the observed correction into the retry CTA when one exists. A
  // clean baseline still gets the exercise-specific next focus, but we never
  // invent a correction that the coach did not observe.
  const focus = firstWarning ? readableFormWarning(firstWarning) : nextFocusFor(mode);
  // "5 overhead reaches", not "5 reach" — the raw mode id is not a noun.
  const movementNoun = countedLabel(mode, reps).toLowerCase();

  if (!summary) {
    return {
      title: 'Your first coached baseline starts here.',
      body: `${reps} ${movementNoun} gave the coach a starting line. Try another set when you are ready to make one adjustment.`,
      focus,
    };
  }

  if (firstWarning) {
    return {
      title: 'The coach found one useful thing to work on.',
      body: `During this set, I noticed: ${readableFormWarning(firstWarning)}. Keep that in mind on your next rep — the goal is a clearer line, not a perfect one.`,
      focus,
    };
  }

  return {
    title: 'You gave the coach a clean baseline.',
    body: `The camera followed ${reps} ${movementNoun} without a major form observation. Keep this line and use the next set to make it repeatable.`,
    focus,
  };
}
