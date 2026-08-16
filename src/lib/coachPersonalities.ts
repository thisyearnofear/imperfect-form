/**
 * Coach Personalities
 *
 * Three instructors from the Sandow seaside-arcade world — the same three
 * registers the physical coach uses when the SO-101 arm demonstrates:
 * persona choice is a *tempo* choice (slow-deliberate / smooth-centered /
 * fast-energetic; see coach-station primitives). Voice and arm move together.
 */

export type CoachPersonality = 'SNEL' | 'STEDDIE' | 'RASTA';

export interface CoachInfo {
  personality: CoachPersonality;
  name: string;
  emoji: string;
  theme: 'supportive' | 'zen' | 'competitive';
  description: string;
  supportivePhrase: string;
  motivationalPhrase: string;
}

export const COACH_PERSONALITIES: Record<CoachPersonality, CoachInfo> = {
  SNEL: {
    personality: 'SNEL',
    name: 'SNEL',
    emoji: '🐌',
    theme: 'supportive',
    description:
      'The patient instructor — grades kindly, never rushes you. Arm demonstrates slow and deliberate.',
    supportivePhrase: 'Take your time — one clean rep is worth ten rushed.',
    motivationalPhrase: 'Steady progress is the best progress. Keep going!',
  },
  STEDDIE: {
    personality: 'STEDDIE',
    name: 'STEDDIE',
    emoji: '🐢',
    theme: 'zen',
    description: 'The steady — breath first, control always. Arm demonstrates smooth and centered.',
    supportivePhrase: 'Breathe with the movement; the bar will wait for you.',
    motivationalPhrase: 'Feel your form, find your balance. Perfect.',
  },
  RASTA: {
    personality: 'RASTA',
    name: 'RASTA',
    emoji: '🐙',
    theme: 'competitive',
    description:
      'The pier barker — calls the crowd, wants the big finish. Arm demonstrates fast and energetic.',
    supportivePhrase: 'Step up! Show the boardwalk what you have today.',
    motivationalPhrase: 'One more, and make it a clean one!',
  },
};

export const getCoachInfo = (personality: CoachPersonality): CoachInfo => {
  return COACH_PERSONALITIES[personality];
};

/**
 * Tone instructions injected into AI prompts so generated feedback
 * matches the selected persona.
 */
export const getPersonalityPromptStyle = (personality: CoachPersonality): string => {
  switch (personality) {
    case 'SNEL':
      return 'patient and encouraging like a Victorian correspondence instructor; celebrate small wins; never rush the athlete';
    case 'STEDDIE':
      return 'calm and mindful like a boardwalk strongman; emphasize breath, balance, and control';
    case 'RASTA':
      return 'high-energy seaside-arcade barker; push for more while keeping it fun';
  }
};

export const getPersonalityFeedback = (
  personality: CoachPersonality,
  context: 'encouragement' | 'form_feedback' | 'rep_complete' | 'session_start',
  formScore?: number
): string => {
  const coach = COACH_PERSONALITIES[personality];

  switch (context) {
    case 'session_start':
      if (personality === 'SNEL') return 'Ready when you are. Take your time getting set.';
      if (personality === 'STEDDIE') return 'Center yourself, breathe deeply. Begin when ready.';
      if (personality === 'RASTA') return "Step right up — today's the day!";
      break;

    case 'encouragement':
      if (personality === 'SNEL') return 'Good. Keep that steady rhythm — no need to hurry.';
      if (personality === 'STEDDIE') return 'Stay with your breath, one movement at a time.';
      if (personality === 'RASTA') return 'Yes! The crowd is watching — keep it flowing!';
      break;

    case 'form_feedback':
      if (!formScore) return coach.supportivePhrase;

      if (formScore >= 85) {
        if (personality === 'SNEL') return 'Beautiful control. That is a rep Sandow would stamp.';
        if (personality === 'STEDDIE')
          return 'Balanced and quiet — that is what control looks like.';
        if (personality === 'RASTA') return 'Wicked form! The pier is cheering!';
      } else if (formScore >= 70) {
        if (personality === 'SNEL') return 'Good work. Slow the hard part down and it will come.';
        if (personality === 'STEDDIE') return 'Steady. Breathe out on the effort, feel the line.';
        if (personality === 'RASTA') return 'Almost there! One cleaner and the bell rings!';
      } else {
        if (personality === 'SNEL') return 'No matter — slow right down, one honest rep at a time.';
        if (personality === 'STEDDIE') return 'Reset your stance, breathe, begin again gently.';
        if (personality === 'RASTA') return 'Reset and go again — the strikers never quit!';
      }
      break;

    case 'rep_complete':
      if (personality === 'SNEL') return 'Nicely done. One more step forward.';
      if (personality === 'STEDDIE') return 'Good. Hold that rhythm.';
      if (personality === 'RASTA') return 'Yes! Keep the momentum going!';
      break;
  }

  return coach.supportivePhrase;
};

/**
 * The default coach is the patient one — day-0 is a trust-building register,
 * and the competitive barker is an explicit choice, not a first impression.
 */
export const getDefaultPersonality = (): CoachPersonality => 'SNEL';
