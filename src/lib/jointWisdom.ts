import type { NiggleJointId } from '@/lib/niggleIntents';
import { STRETCHES, type Stretch } from '@/lib/recovery/recoveryContent';

/**
 * The morsel deck — small engraved plates of honest anatomy (docs/
 * DESIGN_EVOLUTION.md retention arc). Each morsel is ONE fact in the
 * instrument's voice: a figure title in the plate idiom (Fig 1 is the
 * foyer's teardown, Fig 2 is your reading — the deck continues at Fig 3),
 * and a line short enough to engrave. Wellness, never medicine: mechanics
 * and honest caveats only — no population claims, no diagnoses, no guilt.
 *
 * The deck is FINITE and curated — it rotates daily, it never scrolls.
 */

export interface JointMorsel {
  id: string;
  joint: NiggleJointId;
  /** Engraved plate naming — 'Fig 3 · The Trapezius'. */
  figureTitle: string;
  /** One honest fact, ≤ ~140 chars, instrument voice. */
  line: string;
  /** Optional pointer to a stretch in recoveryContent — `${mode}:${index}`
   *  into STRETCHES. Resolved via stretchForEaseMove. */
  easeMoveId?: string;
}

const NECK_SHOULDERS: JointMorsel[] = [
  {
    id: 'ns-trap-load',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 3 · The Trapezius',
    line: 'The head is ~12lb; at a 45° lean the trap carries ~42lb — that is the desk ache.',
    easeMoveId: 'reach:2',
  },
  {
    id: 'ns-levator',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 4 · The Levator',
    line: 'The levator turns your head toward your armpit — the exact spot that aches after a long scroll.',
    easeMoveId: 'reach:3',
  },
  {
    id: 'ns-morning',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 5 · The Overnight Disc',
    line: 'Overnight the neck barely moves and its discs refill with fluid — morning stiffness is mechanics, not damage.',
    easeMoveId: 'reach:0',
  },
  {
    id: 'ns-week-of-reads',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 6 · The Week',
    line: 'One read is a number; a week of reads is a direction — it can show a trend, never a diagnosis.',
  },
  {
    id: 'ns-forward-head',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 7 · The Chin',
    line: 'Each inch the chin drifts forward adds roughly another head’s weight for the neck to carry.',
    easeMoveId: 'reach:1',
  },
  {
    id: 'ns-three-traps',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 8 · The Three Traps',
    line: 'The trap is three muscles — top lifts, middle squeezes, bottom pulls down. Desk work tires the top.',
    easeMoveId: 'reach:2',
  },
  {
    id: 'ns-deadline-shrug',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 9 · The Deadline',
    line: 'Shoulders creep toward the ears under deadline — the trap holds them there long after the send.',
  },
  {
    id: 'ns-joint-food',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 10 · The Joint',
    line: 'Cartilage has no blood supply of its own — slow, easy movement is literally how a joint feeds itself.',
    easeMoveId: 'reach:0',
  },
  {
    id: 'ns-sore-day',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 11 · The Sore Day',
    line: 'Soreness a day or two after new movement is usually ordinary DOMS — it fades on its own.',
  },
  {
    id: 'ns-screen-height',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 12 · The Screen',
    line: 'Eyes level with the top third of the screen — every inch lower is another degree of neck lean.',
  },
  {
    id: 'ns-held-breath',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 13 · The Breath',
    line: 'A held breath lifts the shoulders with it — slow exhales are the quiet way to drop them.',
  },
  {
    id: 'ns-scalenes',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 14 · The Scalenes',
    line: 'The scalenes tilt the neck and lift the ribs — tension here is felt twice: turning and breathing.',
  },
  {
    id: 'ns-see-a-pro',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 15 · The Line',
    line: 'Pain past the elbow, numbness, or tingling is a professional’s question — not a stretch’s.',
  },
  {
    id: 'ns-two-minutes',
    joint: 'neck-shoulders',
    figureTitle: 'Fig 16 · The Habit',
    line: 'Two minutes of gentle movement most days beats one heroic stretch on a Sunday.',
    easeMoveId: 'reach:4',
  },
];

const BACK: JointMorsel[] = [
  {
    id: 'bk-first-hour',
    joint: 'back',
    figureTitle: 'Fig 3 · The First Hour',
    line: 'Discs plump with fluid overnight — the first hour awake is when the back is least bendy.',
  },
  {
    id: 'bk-still-chair',
    joint: 'back',
    figureTitle: 'Fig 4 · The Still Chair',
    line: 'A chair-shaped ache is usually a stillness story — variety moves it more than perfect posture does.',
    easeMoveId: 'squats:1',
  },
  {
    id: 'bk-trunk-read',
    joint: 'back',
    figureTitle: 'Fig 5 · The Trunk Read',
    line: 'The back complains in motion, not in stills — the meter reads trunk lean and depth, not the ache.',
  },
  {
    id: 'bk-old-advice',
    joint: 'back',
    figureTitle: 'Fig 6 · The Old Advice',
    line: 'Bed rest beyond a day or two slows recovery — the spine is built to keep moving gently.',
  },
  {
    id: 'bk-see-a-pro',
    joint: 'back',
    figureTitle: 'Fig 7 · The Line',
    line: 'Pain shooting below the knee, or numbness, is a professional’s question — not a meter’s.',
  },
];

const KNEE: JointMorsel[] = [
  {
    id: 'kn-stair-load',
    joint: 'knee',
    figureTitle: 'Fig 3 · The Stair Load',
    line: 'Stairs load the knee at roughly three to four times body weight — the ache is a load story.',
  },
  {
    id: 'kn-drift',
    joint: 'knee',
    figureTitle: 'Fig 4 · The Drift',
    line: 'A knee drifting inward under load is usually a hip story — the meter watches what you cannot feel.',
    easeMoveId: 'squats:0',
  },
  {
    id: 'kn-day-after',
    joint: 'knee',
    figureTitle: 'Fig 5 · The Day After',
    line: 'Post-run knees ache most the next day — ordinary soreness fades; swelling and locking do not.',
  },
  {
    id: 'kn-quads',
    joint: 'knee',
    figureTitle: 'Fig 6 · The Shock Absorber',
    line: 'Quads are the knee’s own shock absorbers — a controlled squat is their honest workout.',
    easeMoveId: 'squats:0',
  },
  {
    id: 'kn-chair-rep',
    joint: 'knee',
    figureTitle: 'Fig 7 · The Chair Rep',
    line: 'Getting up from a chair is a squat you do all day — how you rise is the read.',
  },
];

const ARM: JointMorsel[] = [
  {
    id: 'ar-grip',
    joint: 'arm',
    figureTitle: 'Fig 3 · The Grip',
    line: 'Grip quietly tracks whole-arm health — a weaker-feeling grip is worth a baseline, not a guess.',
  },
  {
    id: 'ar-anchor',
    joint: 'arm',
    figureTitle: 'Fig 4 · The Anchor',
    line: 'Tennis elbow is usually a wrist story — the forearm tendons complain where they anchor.',
    easeMoveId: 'curls:1',
  },
  {
    id: 'ar-clean-travel',
    joint: 'arm',
    figureTitle: 'Fig 5 · The Clean Travel',
    line: 'Elbows like clean travel — drift in a curl means the shoulder is doing the biceps’ job.',
    easeMoveId: 'curls:2',
  },
  {
    id: 'ar-trajectory',
    joint: 'arm',
    figureTitle: 'Fig 6 · The Trajectory',
    line: 'A tweaked arm needs a trajectory, not a verdict — the honest question is week over week.',
  },
  {
    id: 'ar-see-a-pro',
    joint: 'arm',
    figureTitle: 'Fig 7 · The Line',
    line: 'Tingling in the fingers is the nerve talking — that is a professional’s territory, not a stretch’s.',
  },
];

export const JOINT_MORSELS: readonly JointMorsel[] = [...NECK_SHOULDERS, ...BACK, ...KNEE, ...ARM];

const DECKS: Record<Exclude<NiggleJointId, 'not-sure'>, JointMorsel[]> = {
  'neck-shoulders': NECK_SHOULDERS,
  back: BACK,
  knee: KNEE,
  arm: ARM,
};

/** The joint's deck — 'not-sure' and anything unknown fall back to
 *  neck & shoulders (the doorway the meter was built for). */
export function morselsForJoint(joint: NiggleJointId | string | null | undefined): JointMorsel[] {
  return DECKS[joint as keyof typeof DECKS] ?? NECK_SHOULDERS;
}

/**
 * Today's morsel — deterministic: the day number modulo the deck, so the
 * same plate shows all day and tomorrow advances one. No feed, no shuffle.
 */
export function morselForToday(
  joint: NiggleJointId | string | null | undefined,
  now = Date.now()
): JointMorsel {
  const deck = morselsForJoint(joint);
  const dayNumber = Math.floor(now / 86_400_000);
  return deck[dayNumber % deck.length];
}

export interface EaseMoveTarget {
  /** The STRETCHES key — the sequence mode the move lives in. */
  mode: string;
  index: number;
  stretch: Stretch;
}

/** Resolve a morsel's `${mode}:${index}` pointer into a real stretch —
 *  null when the pointer is absent or the deck no longer holds it. */
export function stretchForEaseMove(easeMoveId: string | null | undefined): EaseMoveTarget | null {
  if (!easeMoveId) return null;
  const [mode, rawIndex] = easeMoveId.split(':');
  const index = Number.parseInt(rawIndex, 10);
  const sequence = STRETCHES[mode];
  if (!sequence || !Number.isInteger(index) || index < 0 || index >= sequence.length) return null;
  return { mode, index, stretch: sequence[index] };
}
