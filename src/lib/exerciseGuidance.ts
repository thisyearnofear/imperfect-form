import type { ExerciseMode } from '@/utils/biomechanics';

export type ExerciseGuidance = {
  label: string;
  camera: string;
  setup: string;
  focus: string;
};

export const EXERCISE_GUIDANCE: Record<ExerciseMode, ExerciseGuidance> = {
  pushups: {
    label: 'Push-ups',
    camera: 'Set your phone low and side-on so your shoulders, hips, and ankles stay visible.',
    setup: 'Leave enough room to extend into a full plank.',
    focus: 'We will watch depth and body alignment.',
  },
  squats: {
    label: 'Squats',
    camera: 'Place your phone about waist-high, far enough back to see head to toe.',
    setup: 'Face the camera with both feet clearly visible.',
    focus: 'We will watch depth and knee alignment.',
  },
  curls: {
    label: 'Curls',
    camera: 'Frame your shoulders, elbows, and hands from the front.',
    setup: 'Stand an arm’s length from the camera.',
    focus: 'We will watch range and elbow control.',
  },
  pullups: {
    label: 'Pull-ups',
    camera: 'Set your phone back and side-on so the bar, hands, and feet are visible.',
    setup: 'Check that the full movement fits in frame before your first rep.',
    focus: 'We will watch extension and left-right balance.',
  },
  jumps: {
    label: 'Jumps',
    camera: 'Set your phone back far enough to keep your full body in frame through landing.',
    setup: 'Keep clear space around you and land in the same spot.',
    focus: 'We will watch loading and knee alignment.',
  },
};

export function guidanceFor(mode: ExerciseMode): ExerciseGuidance {
  return EXERCISE_GUIDANCE[mode];
}
