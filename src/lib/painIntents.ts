import type { ExerciseMode } from '@/utils/biomechanics';
import { FORM_CHECK_THRESHOLDS } from '@/lib/coachingEngine';

export type PainIntentId = 'unsure' | 'alone' | 'squat' | 'stuck' | (string & {});

export const PAIN_INTENT_KEY = 'imf_painIntent_v1';

export interface PainIntent {
  id: PainIntentId;
  /** Chip label, quoted back to the visitor ("You said: ..."). */
  label: string;
  /** The move the chip preselects. */
  mode: ExerciseMode;
  subhead: string;
  /** Two to three plain sentences naming the pain. */
  pain: string;
  firstRepLine: string;
  recapLine: string;
  /** Optional callout text for the curls demo plate. */
  plateCallout?: string;
}

export const PAIN_INTENTS: PainIntent[] = [
  {
    id: 'unsure',
    label: "I'm not sure my form is right",
    mode: 'curls',
    subhead:
      'Your camera sees the rep. The coach names the one thing to fix first, so you are not guessing.',
    pain: 'You can feel a rep, but you cannot see it. A mirror shows one angle, and a clip you film yourself is hard to judge. It is easy to repeat the same small fault without knowing.',
    firstRepLine: 'On your first rep you get one cue: the most important thing the coach saw.',
    recapLine:
      'You came here unsure about your form. This read is your starting point for the next one.',
    plateCallout: 'Elbow drifts forward',
  },
  {
    id: 'alone',
    label: 'I train alone and nobody checks me',
    mode: 'pushups',
    subhead:
      'No spotter, no trainer. Your camera watches each rep and names the one thing to change.',
    pain: 'There is nobody to say your hips are sagging or your depth is short. You usually find out about a habit once it is already a habit.',
    firstRepLine: 'On your first rep the coach checks depth and body line, then names one fix.',
    recapLine: 'You train without a second pair of eyes. This is what the camera saw on your rep.',
  },
  {
    id: 'squat',
    label: 'My back or knees feel off when I squat',
    mode: 'squats',
    subhead:
      'Squats hide a lot from the person doing them. The coach watches depth, forward lean and knee tracking.',
    pain: 'How far you lean and whether your knees drift inward are hard to feel from the inside. Seeing what your body is doing is a sensible first step. If anything hurts, stop. This is general wellness guidance, not medical advice.',
    firstRepLine:
      'On your first rep the coach checks depth, lean and knee tracking, then names the first thing to fix.',
    recapLine:
      'You asked about your back and knees. This read covers depth, lean and knee tracking. If something hurts, stop and see a professional.',
  },
  {
    id: 'stuck',
    label: "I keep training but I'm not improving",
    mode: 'curls',
    subhead:
      'Reps alone do not show change. Your first read becomes a baseline, and the next one shows what moved.',
    pain: "You show up, but 'felt about the same' is not something you can compare. Without a record you cannot tell whether a rep got cleaner or only felt different.",
    firstRepLine: 'Your first rep sets a baseline. Come back and compare it to your next read.',
    recapLine: 'This read is your baseline. Run it again later and compare.',
    plateCallout: 'Same rep, compare it next time',
  },
];

const BY_ID = new Map(PAIN_INTENTS.map((intent) => [intent.id, intent]));

export function parsePainIntent(raw: string | null | undefined): PainIntentId | null {
  if (!raw) return null;
  return BY_ID.has(raw as PainIntentId) ? (raw as PainIntentId) : null;
}

export function getPainIntent(id: PainIntentId | null | undefined): PainIntent | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

/**
 * Decide which mode a restored chip should apply on mount.
 * Returns the mode to switch to, or null when nothing should change: no chip,
 * an incoming challenge (it owns the movement), or the chip's move already
 * selected.
 */
export function resolveRestoredPainIntentMode(
  painIntent: PainIntent | null,
  currentMode: ExerciseMode,
  incomingChallenge: boolean
): ExerciseMode | null {
  if (!painIntent || incomingChallenge) return null;
  return painIntent.mode === currentMode ? null : painIntent.mode;
}

/**
 * "What the coach looks at" lines, generated FROM FORM_CHECK_THRESHOLDS so the
 * numbers cannot drift from the engine or docs/COACH_GATES.md. Per-mode
 * applicability mirrors evaluateFormGates: depth is skipped for curls (the
 * live session grades curls on an elbow-angle instrument), ankle mobility is
 * squats-only, and squats tolerate more forward lean.
 */
export function describeChecks(mode: ExerciseMode): string[] {
  // The overhead-reach screen measures arm elevation and trunk sway — the
  // depth/lean/knee gates below describe the fitness moves, not this screen.
  if (mode === 'reach') {
    return [
      'Elevation: a rep counts when the arm rises past 135° from hanging — your own pace.',
      'Trunk sway: flagged when the shoulder-hip line leans past 30 degrees while the arm is up.',
      'Left/right balance: a two-arm read keeps both sides inside 90 degrees of each other.',
    ];
  }
  const T = FORM_CHECK_THRESHOLDS;
  const leanWarning = mode === 'squats' ? T.trunkLean.squatsWarning : T.trunkLean.warning;

  const lines = [
    'Stability: the rep must be stable before anything is graded.',
    ...(mode !== 'curls'
      ? [
          `Range of motion: critical below ${T.depth.critical} of full range, flagged below ${T.depth.warning}, good at ${T.depth.good}.`,
        ]
      : []),
    `Forward lean: flagged above ${leanWarning} degrees${
      mode === 'squats' ? ' for squats' : ''
    }, critical above ${T.trunkLean.critical}.`,
    `Knees drifting inward: flagged above ${T.kneeValgus.warning} degrees, critical above ${T.kneeValgus.critical}.`,
    ...(mode === 'squats'
      ? [
          `Ankle mobility: noted below ${T.ankleFlexion.info} degrees, target ${T.ankleFlexion.target}.`,
        ]
      : []),
    `Left/right balance: flagged below ${T.symmetry.warning}, target ${T.symmetry.target}.`,
  ];

  return lines;
}
