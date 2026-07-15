/**
 * Recovery register content - stretches and affirmations.
 *
 * Design language adapted from imperfect-breath (rebuilt, not ported):
 * calm voice, short cues, per-exercise stretch sequences.
 */

export interface Stretch {
  name: string;
  emoji: string;
  seconds: number;
  cue: string;
}

const GENERAL_STRETCHES: Stretch[] = [
  {
    name: 'Reach & Fold',
    emoji: '🙆',
    seconds: 20,
    cue: 'Reach up tall, then fold forward and hang loose.',
  },
  {
    name: 'Side Stretch',
    emoji: '🌙',
    seconds: 20,
    cue: 'Arm overhead, lean gently to each side.',
  },
  { name: 'Neck Release', emoji: '🧘', seconds: 20, cue: 'Ear toward shoulder, slow and easy.' },
];

export const STRETCHES: Record<string, Stretch[]> = {
  pushups: [
    {
      name: 'Chest Opener',
      emoji: '🫁',
      seconds: 20,
      cue: 'Clasp hands behind you, lift gently, open the chest.',
    },
    {
      name: 'Triceps Stretch',
      emoji: '💪',
      seconds: 20,
      cue: 'Elbow overhead, hand down the spine. Switch halfway.',
    },
    {
      name: 'Wrist Release',
      emoji: '🖐️',
      seconds: 20,
      cue: 'Extend one arm, gently pull fingers back. Switch halfway.',
    },
  ],
  squats: [
    {
      name: 'Quad Stretch',
      emoji: '🦵',
      seconds: 20,
      cue: 'Heel to glute, knees together. Switch halfway.',
    },
    {
      name: 'Hamstring Fold',
      emoji: '🙇',
      seconds: 20,
      cue: 'Soft knees, fold forward, let the arms hang.',
    },
    {
      name: 'Calf Stretch',
      emoji: '🧱',
      seconds: 20,
      cue: 'Step back, press the heel down, lean in.',
    },
  ],
  pullups: [
    {
      name: 'Lat Stretch',
      emoji: '🌴',
      seconds: 20,
      cue: 'Grab something overhead or lean sideways, feel the side body.',
    },
    {
      name: 'Cross-Body Shoulder',
      emoji: '🤝',
      seconds: 20,
      cue: 'Arm across the chest, gentle pull. Switch halfway.',
    },
    {
      name: 'Forearm Release',
      emoji: '🖐️',
      seconds: 20,
      cue: 'Palm up, gently draw fingers down. Switch halfway.',
    },
  ],
  jumps: [
    {
      name: 'Calf Stretch',
      emoji: '🧱',
      seconds: 20,
      cue: 'Step back, press the heel down, lean in.',
    },
    {
      name: 'Quad Stretch',
      emoji: '🦵',
      seconds: 20,
      cue: 'Heel to glute, knees together. Switch halfway.',
    },
    {
      name: 'Ankle Circles',
      emoji: '🌀',
      seconds: 20,
      cue: 'Slow circles each direction. Switch halfway.',
    },
  ],
};

export function getStretches(mode: string): Stretch[] {
  return STRETCHES[mode] ?? GENERAL_STRETCHES;
}

export const RECOVERY_AFFIRMATIONS = [
  'Your breath anchors you to now.',
  'Recovery is where strength is built.',
  'Slow is smooth. Smooth is strong.',
  'Every breath is a new beginning.',
  "You showed up. That's what counts.",
];
