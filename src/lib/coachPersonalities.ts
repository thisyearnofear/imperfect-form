/**
 * Coach Personalities
 *
 * Ported from imperfectcoach. Three animal coach personas that drive
 * both canned local feedback and the tone of AI-generated coaching.
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
    description: 'Your patient, encouraging guide',
    supportivePhrase: "Take your time, you're building strength beautifully.",
    motivationalPhrase: 'Steady progress is the best progress. Keep going!',
  },
  STEDDIE: {
    personality: 'STEDDIE',
    name: 'STEDDIE',
    emoji: '🐢',
    theme: 'zen',
    description: 'Your mindful, centered coach',
    supportivePhrase: 'Breathe with the movement, stay centered.',
    motivationalPhrase: 'Feel your form, find your balance. Perfect.',
  },
  RASTA: {
    personality: 'RASTA',
    name: 'RASTA',
    emoji: '🐙',
    theme: 'competitive',
    description: 'Your energetic, dynamic motivator',
    supportivePhrase: 'Come on now, show me that power!',
    motivationalPhrase: "Push those limits! You've got more in you!",
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
      return 'patient and encouraging; celebrate small wins; never rush the athlete';
    case 'STEDDIE':
      return 'calm and mindful; emphasize breath, balance, and control';
    case 'RASTA':
      return 'high-energy and competitive; push for more while keeping it fun';
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
      if (personality === 'SNEL') return 'Ready when you are! Take your time to get positioned.';
      if (personality === 'STEDDIE') return 'Center yourself, breathe deeply. Begin when ready.';
      if (personality === 'RASTA') return "Let's go! Show me what you've got today!";
      break;

    case 'encouragement':
      if (personality === 'SNEL') return "You're doing great! Keep that steady rhythm.";
      if (personality === 'STEDDIE') return 'Stay focused, breathe with each movement.';
      if (personality === 'RASTA') return 'Yes! Keep that energy flowing!';
      break;

    case 'form_feedback':
      if (!formScore) return coach.supportivePhrase;

      if (formScore >= 85) {
        if (personality === 'SNEL') return 'Beautiful control! Your form is excellent.';
        if (personality === 'STEDDIE') return 'Perfect balance and control. Well done.';
        if (personality === 'RASTA') return "Wicked form! You're crushing it!";
      } else if (formScore >= 70) {
        if (personality === 'SNEL') return 'Good work! Focus on controlled movements.';
        if (personality === 'STEDDIE') return 'Steady your form, feel the movement.';
        if (personality === 'RASTA') return 'Almost there! Push for cleaner form!';
      } else {
        if (personality === 'SNEL') return 'Take it slow, focus on quality over speed.';
        if (personality === 'STEDDIE') return 'Breathe, center yourself, focus on form.';
        if (personality === 'RASTA') return "Reset and go again! You've got this!";
      }
      break;

    case 'rep_complete':
      if (personality === 'SNEL') return 'Nice! One more step forward.';
      if (personality === 'STEDDIE') return 'Good. Maintain that rhythm.';
      if (personality === 'RASTA') return 'Yes! Keep the momentum going!';
      break;
  }

  return coach.supportivePhrase;
};

export const getDefaultPersonality = (): CoachPersonality => 'RASTA';
