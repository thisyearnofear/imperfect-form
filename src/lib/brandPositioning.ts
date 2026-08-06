/**
 * Brand / positioning spine for the app shell (imperfectform.fun).
 *
 * Category: approachable physical AI for movement.
 * Promise: watch → understand → show → progress.
 * Loop principle: Trust opens the door. Play keeps them. Physical AI makes them tell someone.
 *
 * Differentiation (see docs/NORTH_STAR.md):
 * - We are a privacy-first camera coaching PRODUCT. The robot teaches the human.
 * - We are not a teleop / pick-and-place / VLA-arm demo with a thin web shell.
 * - Scripted understand→show first; learned policies from real sessions later.
 * - Honest SO-101 scope: upper-body demonstrations only.
 *
 * Aesthetic registers (one surface, one register — do not mix):
 * - Night studio (DEFAULT doorway): Coach intent. Day-0 foyer, camera primer, live coaching.
 *   Type: readable sans (Manrope). Color: teal glass on black. (imperfectcoach DNA)
 * - Arcade: Train / play energy. Earned after first coached feel (Celebrate, XP, UI sound).
 *   Type: Press Start 2P. Color: black / white / gold (#fcb131).
 * - Calm: Breathe / recover. Post-set recovery + optional calm entry — not the day-0 hero.
 *   Soft light, stillness. (imperfect-breath DNA)
 * - Lab: post-workout AI clinical review only — not an entry intent.
 *   Physical AI bay presence is lab-adjacent (precise, alive) — not arcade-loud.
 *
 * Energy ladder (not a mid-rep theme toggle):
 * 1. Session 0 — Studio trust (CoachFoyer → primer → live cues)
 * 2. First celebrate — introduce play (ProgressSpark, Arcade UI sound, gold accents)
 * 3. Explicit Train / Arcade cabinet — later / earned depth, not the mass-market front door
 *
 * Day-0 doorway is CoachFoyer (studio). Intent chooser is not on the first viewport.
 * Landing marketing is deferred; deepen the foyer first (see docs/NORTH_STAR.md).
 *
 * Crafted play stays; puerile slogans do not. Game-loop chrome is earned
 * after the first coached feel — never the foyer.
 */

/** Entry + surface registers. Lab is post-workout only. Cræft is the
 *  Sandow-cabinet exhibit variant of Arcade (see docs/CRAFFT_PRIZE.md). */
export type AestheticRegister = 'arcade' | 'studio' | 'lab' | 'calm' | 'crafft';

/** Why the user opened the cabinet. Maps 1:1 to an entry register. */
export type SessionIntent = 'train' | 'understand' | 'recover';

/** Mass-market default: Coach / Studio — trust before arcade play. */
export const DEFAULT_SESSION_INTENT: SessionIntent = 'understand';

/** localStorage key — keep in sync with e2e / InitializationScreen clears */
export const SESSION_INTENT_KEY = 'imf_sessionIntent';

export const INTENT_TO_REGISTER: Record<SessionIntent, Exclude<AestheticRegister, 'lab'>> = {
  train: 'arcade',
  understand: 'studio',
  recover: 'calm',
} as const;

/** Short foyer lines per register — arcade lines stay pixel-legible. */
export type FoyerCopy = {
  brand: string;
  line1: string;
  line2: string;
  loopLabel: string;
  invitation: string;
  trust: string;
  hint: string;
  cta: string;
};

const ARCADE_FOYER: FoyerCopy = {
  brand: 'IMPERFECT FORM',
  line1: 'CAMERA READS FORM',
  line2: 'COACH SHOWS THE FIX',
  loopLabel: 'ONE REP / ONE FIX',
  invitation: 'PICK a movement. Make one rep better.',
  trust: 'ON-DEVICE · PRIVATE',
  hint: 'PATH → PHYSICAL AI',
  cta: 'PICK A MOVE · START',
};

const STUDIO_FOYER: FoyerCopy = {
  brand: 'IMPERFECT FORM.FUN',
  line1: 'Make one rep better.',
  line2:
    'Your camera spots one useful correction. Coach explains it. The SO-101 shows the fix when connected.',
  loopLabel: 'ONE REP / ONE FIX',
  invitation: 'Not perfect. Just better.',
  trust: 'Private camera coaching · no wallet · no video upload',
  hint: 'Camera → understand → show',
  cta: 'Start camera coaching',
};

const CALM_FOYER: FoyerCopy = {
  brand: 'IMPERFECT FORM',
  line1: 'Settle the system',
  line2: 'Breath and recovery after the work',
  loopLabel: 'BREATHE / RESET / RETURN',
  invitation: 'No perfect session required.',
  trust: 'Private · gentle · no scoreboard energy',
  hint: 'Stillness — imperfect-breath DNA',
  cta: 'Start when you are ready',
};

/**
 * Cræft / Sandow cabinet register — a variant of Arcade for the physical
 * exhibit and the Cræft Prize submission. Victorian seaside strength-tester
 * aesthetic: Britain invented the AI form-check in 1897 (Sandow's mail-order
 * physical culture); we finished it with a robot. Satire with a steel core —
 * playful cabinet, real working instrument underneath. See docs/CRAFFT_PRIZE.md.
 */
const CRAFFT_FOYER: FoyerCopy = {
  brand: 'THE SANDOW MACHINE',
  line1: 'STEP UP · BE GRADED',
  line2: 'Britain invented the form-check in 1897. We finished it with a robot.',
  loopLabel: 'PHOTO IN / FIX OUT',
  invitation: 'One rep in. One correction out.',
  trust: 'ON-DEVICE · GRADED vs. SANDOW 1897',
  hint: 'PHOTO IN → GRADED → ARM SHOWS THE FIX',
  cta: 'INSERT COIN · BEGIN',
};

export type SessionIntentDef = {
  id: SessionIntent;
  register: Exclude<AestheticRegister, 'lab'>;
  /** Chooser label (short) — used for earned / secondary mode entry, not day-0 hero */
  label: string;
  /** Accessible name for the chooser control */
  ariaLabel: string;
  foyer: FoyerCopy;
  /** Primary / secondary control labels (pre-start shell) */
  controls: {
    primary: string;
    primaryAria: string;
    secondary: string;
    secondaryAria: string;
    /** Exercise ModeSwitch: hidden for calm (breath entry, not moves) */
    showExerciseModes: boolean;
    modeGroupLabel: string;
  };
};

/**
 * Intent definitions — register mapping + copy.
 * Day-0 uses CoachFoyer (studio / understand). Other intents remain for
 * summary staging, calm recovery, and future earned Train mode.
 */
export const SESSION_INTENTS: readonly SessionIntentDef[] = [
  {
    id: 'understand',
    register: 'studio',
    label: 'Coach',
    ariaLabel: 'Coach — form understanding studio',
    foyer: STUDIO_FOYER,
    controls: {
      primary: 'Begin',
      primaryAria: 'Begin form coaching',
      secondary: 'Reset',
      secondaryAria: 'Reset session',
      showExerciseModes: true,
      modeGroupLabel: 'Exercise selection',
    },
  },
  {
    id: 'train',
    register: 'arcade',
    label: 'Train',
    ariaLabel: 'Train — arcade workout',
    foyer: ARCADE_FOYER,
    controls: {
      primary: 'START',
      primaryAria: 'Start game',
      secondary: 'RESET',
      secondaryAria: 'Reset game',
      showExerciseModes: true,
      modeGroupLabel: 'Workout mode selection',
    },
  },
  {
    id: 'recover',
    register: 'calm',
    label: 'Breathe',
    ariaLabel: 'Breathe — calm recovery',
    foyer: CALM_FOYER,
    controls: {
      primary: 'Breathe',
      primaryAria: 'Start a breathing session',
      secondary: 'Clear',
      secondaryAria: 'Clear calm session',
      showExerciseModes: false,
      modeGroupLabel: 'Recovery options',
    },
  },
] as const;

export function getIntentDef(intent: SessionIntent): SessionIntentDef {
  return SESSION_INTENTS.find((i) => i.id === intent) ?? SESSION_INTENTS[0];
}

export function registerForIntent(intent: SessionIntent): Exclude<AestheticRegister, 'lab'> {
  return INTENT_TO_REGISTER[intent];
}

export function parseSessionIntent(raw: string | null | undefined): SessionIntent {
  if (raw === 'train' || raw === 'understand' || raw === 'recover') return raw;
  return DEFAULT_SESSION_INTENT;
}

export const BRAND = {
  name: 'Imperfect Form',
  /** Short category line for metadata / shares */
  tagline:
    'Make one rep better. Private camera coaching with a physical coach that can show the fix.',
  /**
   * Arcade foyer lines — short so Press Start 2P stays legible inside #screen.
   * Alias of Train intent; prefer getIntentDef('train').foyer in new code.
   */
  arcade: ARCADE_FOYER,
  /** Day-0 / studio doorway — prefer getIntentDef('understand').foyer */
  studio: STUDIO_FOYER,
  /** Cræft / Sandow cabinet exhibit register — see docs/CRAFFT_PRIZE.md */
  crafft: CRAFFT_FOYER,
  /** Prose equivalents for studio surfaces / SEO */
  visionLine:
    'Camera coaching for imperfect humans — with a physical coach that can show the fix when connected.',
  loopLabel: 'ONE REP / ONE FIX',
  trustLine: 'Pose runs on your device. Nothing leaves the browser until you choose.',
  roboticsHint:
    'Built toward physical AI that can demonstrate the correction — not just describe it.',
  /** Positioning spine — keep copy aligned with docs/NORTH_STAR.md */
  differentiation:
    'The robot exists to teach the human: camera coaching first, physical demonstration second, learned policies from real sessions third.',
} as const;

export const ONBOARDING_STEPS = [
  {
    id: 'understand',
    title: 'Your camera understands your form',
    description:
      'Pose detection runs entirely on your device — counting reps and reading joint angles with no wearables and no video upload. Private by default.',
  },
  {
    id: 'show',
    title: 'A coach that shows the fix',
    description:
      'Live coaching with distinct personas guides you in the moment. The path leads to physical AI that can demonstrate the correction — not just describe it.',
  },
  {
    id: 'progress',
    title: 'Progress you will want to keep',
    description:
      'After you feel a session, game-quality feedback kicks in: XP, quests, ghosts, and optional on-chain records — earned depth, never a gate.',
  },
] as const;
