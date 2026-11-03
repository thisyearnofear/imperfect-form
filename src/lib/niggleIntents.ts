import type { ExerciseMode } from '@/utils/biomechanics';
import type { PainIntent } from '@/lib/painIntents';

/**
 * Niggle intake — "name the niggle" (joint → context), the instrument's
 * front door per docs/DESIGN_EVOLUTION.md.
 *
 * The user picks where it nags, then what it does. Each joint maps to the
 * protocol that can honestly read it today; contexts personalize the foyer
 * subhead, the "Sound familiar" section, first-rep and recap lines. The
 * resolved shape is `PainIntent`-compatible so every downstream consumer
 * (LandingSections, FirstRepCelebration, SessionRecap) works unchanged.
 *
 * Honest scope rule: a joint maps to the read the engine can actually make —
 * never to a promise the camera cannot keep. Neck/shoulder and back are
 * proxy reads and the copy says so; a meter that overclaims is a broken
 * meter (docs/POSITIONING.md).
 */

export type NiggleJointId = 'back' | 'neck-shoulders' | 'knee' | 'arm' | 'not-sure';

export interface NiggleContextDef {
  id: string;
  /** Chip label, in the user's words. */
  label: string;
  subhead: string;
  /** Two to three plain sentences naming the pain. */
  pain: string;
  firstRepLine: string;
  recapLine: string;
  plateCallout?: string;
}

export interface NiggleJoint {
  id: NiggleJointId;
  /** Chip label, in the user's words. */
  label: string;
  /** The protocol this joint's read runs on today. */
  mode: ExerciseMode;
  /** One-line honest description of what gets measured. */
  readLabel: string;
  contexts: NiggleContextDef[];
}

const SAFETY = 'If anything hurts, stop. This is general wellness guidance, not medical advice.';

export const NIGGLE_KEY = 'imf_niggle_v1';

export const NIGGLE_JOINTS: readonly NiggleJoint[] = [
  {
    id: 'neck-shoulders',
    label: 'My neck & shoulders',
    mode: 'reach',
    readLabel: 'Overhead reach read',
    contexts: [
      {
        id: 'desk',
        label: 'Tension after desk work',
        subhead:
          'A camera cannot photograph tension — but it can read how your shoulder and arm actually move.',
        pain: `Neck-and-shoulder tension is the most-searched ache there is, and words cannot measure it. This read watches how your arm travels through a slow, comfortable arm raise — only as high as feels OK — drift, control, left-right difference. A dedicated shoulder read is coming; this is the honest version today. ${SAFETY}`,
        firstRepLine:
          'On your first reps the meter watches shoulder drift and control — the baseline for your tension question.',
        recapLine:
          'Your shoulder-movement baseline. Tension cannot be photographed — drift and control can. Re-check next week; if it persists or worsens, see a professional.',
        plateCallout: 'Shoulder drift · control',
      },
      {
        id: 'strained',
        label: 'Strained it training',
        subhead:
          'A tweaked shoulder needs watching, not guessing. The meter reads the arm through a slow, comfortable arm raise — only as high as feels OK.',
        pain: `Whether it is settling is a question you cannot feel the answer to — soreness one day tells you nothing about trajectory. This read measures range, drift and control on the side that complained, so a week from now you can see whether it is actually improving. ${SAFETY}`,
        firstRepLine:
          'First reps set the baseline — range and control on the side that complained.',
        recapLine:
          'Baseline set. The same read next week shows whether it is settling. Stop if it hurts — a meter is not a diagnosis.',
        plateCallout: 'Range · drift',
      },
      {
        id: 'overhead',
        label: 'Overhead feels limited',
        subhead:
          'Reaching up should not feel like a negotiation. The meter reads how far and how cleanly the arm travels.',
        pain: `Limited overhead movement usually shows up first as compensation — arching, shrugging, drifting. You cannot see your own substitution; the camera can. This read measures how the arm travels through a slow, comfortable arm raise — only as high as feels OK. ${SAFETY}`,
        firstRepLine:
          'First reps: the meter watches how the arm travels — drift and control, not just the top.',
        recapLine:
          'Your movement baseline on the overhead question. The same read in a week shows whether anything moved.',
        plateCallout: 'Arm travel · control',
      },
    ],
  },
  {
    id: 'back',
    label: 'My lower back',
    mode: 'squats',
    readLabel: 'Trunk + depth read',
    contexts: [
      {
        id: 'after-sitting',
        label: 'Aches after sitting',
        subhead:
          'A chair-shaped ache is still a movement question. The meter reads how your trunk actually moves.',
        pain: `Hours in a chair, and your back complains on the way up. You cannot see what your trunk does when you stand or squat — and neither can a search engine. The camera reads depth, trunk lean and control. ${SAFETY}`,
        firstRepLine: 'Your first reps set the baseline — depth, trunk lean, control.',
        recapLine:
          'This read is your baseline for the after-sitting ache. Same protocol next week, compare the numbers.',
        plateCallout: 'Trunk lean · depth',
      },
      {
        id: 'mornings',
        label: 'Stiff in the mornings',
        subhead:
          'Morning stiffness is a range question. The meter reads how your trunk and hips actually move.',
        pain: `Stiff is a feeling; range is a measurement. This read watches your trunk and hips through a controlled squat — depth, lean, control — so the next read tells you whether anything is loosening. ${SAFETY}`,
        firstRepLine: 'First reps set the baseline — depth and trunk control.',
        recapLine:
          'Baseline set. Take the same read next week and see whether the numbers agree with how it feels.',
        plateCallout: 'Depth · trunk lean',
      },
      {
        id: 'bending',
        label: 'Complains when I bend',
        subhead: 'Bending is a trunk question. The meter reads lean and control, not a verdict.',
        pain: `How far you lean and how steadily you get there are things you cannot feel accurately from the inside. The meter reads trunk lean, depth and control through a controlled squat. ${SAFETY}`,
        firstRepLine: 'First reps: trunk lean and control — the baseline read.',
        recapLine:
          'Your bending baseline. Same read next week shows what moved. If pain sharpens or shoots down a leg, see a professional.',
        plateCallout: 'Lean · control',
      },
    ],
  },
  {
    id: 'knee',
    label: 'My knee',
    mode: 'squats',
    readLabel: 'Depth + tracking read',
    contexts: [
      {
        id: 'stairs',
        label: 'Aches on stairs',
        subhead: 'Stairs ask for controlled depth. The meter reads how your knee actually tracks.',
        pain: `Stair pain usually travels with a tracking habit you cannot see — knees drifting, depth cut short, tempo rushed. The meter reads depth, knee tracking and control through a controlled squat. ${SAFETY}`,
        firstRepLine: 'First reps set the baseline — depth, tracking, control.',
        recapLine:
          'Your knee baseline. Same read next week; compare the numbers, not the soreness.',
        plateCallout: 'Depth · knee track',
      },
      {
        id: 'running',
        label: 'After a run',
        subhead: 'Post-run knees need a read, not a guess. The meter measures what you cannot see.',
        pain: `After a run your knee tells you it hurts but not why — or whether it is changing week to week. The meter reads depth, tracking and control so the numbers do the remembering. ${SAFETY}`,
        firstRepLine: 'First reps: depth and knee tracking — your post-run baseline.',
        recapLine:
          'Baseline set. Re-check after your next run week and compare. If swelling or sharp pain persists, see a professional.',
        plateCallout: 'Depth · tracking',
      },
      {
        id: 'chairs',
        label: 'Getting up from chairs',
        subhead: 'Standing up is a controlled-depth rep you do all day. The meter reads it.',
        pain: `Rising from a chair is a squat you never see. Depth, lean, and how the knees track under control are all readable — and all worth a baseline. ${SAFETY}`,
        firstRepLine: 'First reps set the baseline — depth, lean, tracking.',
        recapLine: 'Your standing baseline. Same read next week shows whether control is building.',
        plateCallout: 'Lean · tracking',
      },
    ],
  },
  {
    id: 'arm',
    label: 'My arm or elbow',
    mode: 'curls',
    readLabel: 'Elbow read',
    contexts: [
      {
        id: 'grip',
        label: 'Grip feels weaker',
        subhead:
          'Grip is downstream of arm control. The meter reads how cleanly the elbow travels.',
        pain: `Weak-feeling grip often hides in the rep — the elbow drifting, the tempo rushed, one side doing more. The meter reads the travel, not the feeling. ${SAFETY}`,
        firstRepLine: 'First reps: elbow travel and control — your baseline.',
        recapLine: 'Baseline set. Same read next week and the numbers do the comparing.',
        plateCallout: 'Elbow drift',
      },
      {
        id: 'tweaked',
        label: 'Tweaked it lifting',
        subhead:
          'A tweaked elbow needs a baseline, not a wait-and-see. The meter reads the arm through a slow, comfortable arm raise — only as high as feels OK.',
        pain: `The question is never "does it hurt today" but "is it settling week to week." The meter reads range, drift and control so a week from now you can see the answer. ${SAFETY}`,
        firstRepLine: 'First reps set the baseline — range and control on that side.',
        recapLine:
          'Baseline set. Same read next week shows the direction. Stop if it hurts — a meter is not a diagnosis.',
        plateCallout: 'Range · drift',
      },
    ],
  },
  {
    id: 'not-sure',
    label: 'Not sure — just check me',
    mode: 'curls',
    readLabel: 'Baseline read',
    contexts: [
      {
        id: 'general',
        label: 'Just give me a read',
        subhead: 'The camera sees the rep. The meter names what it measured — no guessing.',
        pain: `You can feel a rep but you cannot see it. A mirror shows one angle, and a clip you film yourself is hard to judge. The meter reads it, labels the confidence, and keeps the baseline. ${SAFETY}`,
        firstRepLine:
          'On your first rep you get one read — the most important thing the meter saw.',
        recapLine: 'This read is your starting point for the next one.',
        plateCallout: 'Baseline read',
      },
    ],
  },
];

const JOINTS_BY_ID = new Map(NIGGLE_JOINTS.map((j) => [j.id, j]));

export function getNiggleJoint(id: string | null | undefined): NiggleJoint | null {
  if (!id) return null;
  return JOINTS_BY_ID.get(id as NiggleJointId) ?? null;
}

/** Stored intake shape. `context` falls back to the joint's first context. */
export interface StoredNiggle {
  joint: NiggleJointId;
  context: string;
}

export function parseStoredNiggle(raw: string | null | undefined): StoredNiggle | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredNiggle>;
    const joint = getNiggleJoint(parsed.joint);
    if (!joint) return null;
    const context = joint.contexts.find((c) => c.id === parsed.context)?.id ?? joint.contexts[0].id;
    return { joint: joint.id, context };
  } catch {
    return null;
  }
}

/**
 * Resolve a stored intake into the PainIntent-shaped copy object downstream
 * surfaces consume. Selecting a joint alone resolves to its first context.
 */
export function resolveNiggleIntent(stored: StoredNiggle | null): PainIntent | null {
  if (!stored) return null;
  const joint = getNiggleJoint(stored.joint);
  if (!joint) return null;
  const context = joint.contexts.find((c) => c.id === stored.context) ?? joint.contexts[0];
  return {
    id: `${joint.id}:${context.id}`,
    label: context.label,
    mode: joint.mode,
    subhead: context.subhead,
    pain: context.pain,
    firstRepLine: context.firstRepLine,
    recapLine: context.recapLine,
    plateCallout: context.plateCallout,
  };
}

export const NIGGLE_LOCAL_EVENT = 'imf:niggle';

/** Sender greeting for shared niggle links (`&from=<name>`), read once by the foyer. */
export const SENT_BY_KEY = 'imf_sent_by_v1';

/** Persist the intake exactly as useNiggle does — storage + same-tab event. */
export function storeNiggle(stored: StoredNiggle | null): void {
  if (typeof window === 'undefined') return;
  if (stored) localStorage.setItem(NIGGLE_KEY, JSON.stringify(stored));
  else localStorage.removeItem(NIGGLE_KEY);
  window.dispatchEvent(new Event(NIGGLE_LOCAL_EVENT));
}

/**
 * `?niggle=<jointId>[:<contextId>]` — unknown joints are ignored; a missing
 * or unknown context resolves to the joint's first (same rule as intake).
 */
export function parseNiggleParam(raw: string | null | undefined): StoredNiggle | null {
  if (!raw) return null;
  const [jointId, contextId] = raw.split(':');
  const joint = getNiggleJoint(jointId);
  if (!joint) return null;
  const context = joint.contexts.find((c) => c.id === contextId)?.id ?? joint.contexts[0].id;
  return { joint: joint.id, context };
}

/**
 * `&from=<name>` — rendered as text, never markup; still trimmed to a
 * name-sized line so a crafted link cannot stretch the foyer.
 */
export function sanitizeSenderName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
  return cleaned.length > 0 ? cleaned : null;
}
