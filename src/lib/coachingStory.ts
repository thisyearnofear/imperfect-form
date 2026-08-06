import type { ExerciseMode } from '@/utils/biomechanics';
import type { SessionSummary } from '@/services/sessionLogger';

const NEXT_FOCUS: Record<ExerciseMode, string> = {
  pushups: 'Keep one long line from shoulders through hips as you lower.',
  squats: 'Keep your knees tracking over your toes on the way down.',
  curls: 'Pin your elbows to your sides and avoid swinging.',
  pullups: 'Finish each rep with a controlled extension at the bottom.',
  jumps: 'Land softly and keep your knees tracking forward.',
};

/** Return the next exercise-specific focus used across live and recap surfaces. */
export function nextFocusFor(mode: ExerciseMode): string {
  return NEXT_FOCUS[mode];
}

/** Turn detector labels into a cue that sounds like a coach, not a console. */
export function readableFormWarning(warning: string): string {
  return warning
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace('Knees In', 'Knees are tracking inward')
    .replace('Pin Elbows', 'Keep your elbows quiet')
    .replace('Leaning Too Far', 'Keep your chest more upright')
    .replace('Pull Evenly', 'Pull evenly through both sides');
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

  if (!summary) {
    return {
      title: 'Your first coached baseline starts here.',
      body: `${reps} ${mode} gave the coach a starting line. Try another set when you are ready to make one adjustment.`,
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
    body: `The camera followed ${reps} ${mode} without a major form observation. Keep this line and use the next set to make it repeatable.`,
    focus,
  };
}
