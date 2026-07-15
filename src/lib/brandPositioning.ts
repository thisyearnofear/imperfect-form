/**
 * Brand / positioning spine for the app shell (imperfectform.fun).
 *
 * Category: approachable physical AI for movement.
 * Promise: watch → understand → show → progress.
 *
 * Crafted play stays; puerile slogans do not. Game-loop chrome (XP, quests,
 * ghosts, chain) is earned after the first coached feel — never the foyer.
 *
 * See docs/NORTH_STAR.md. Keep onboarding + pre-start copy in sync here.
 */

export const BRAND = {
  name: 'Imperfect Form',
  /** Short category line for metadata / shares */
  tagline: 'Private camera coaching. Game-quality feedback. A path into physical AI.',
  /** Hero vision — first viewport */
  visionLine: 'Your camera understands your form. A coach shows you how to fix it.',
  /** Trust — privacy-first */
  trustLine: 'Pose runs on your device. Nothing leaves the browser until you choose.',
  /** Soft robotics invite — not a hardware CTA */
  roboticsHint:
    'Built toward physical AI that can demonstrate the correction — not just describe it.',
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
