'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, Camera, ChevronDown, Sparkles } from 'lucide-react';
import { playStudioCue } from '@/lib/uiSound';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { coachStation, type StationStatus } from '@/services/coachStation';
import {
  getNiggleJoint,
  NIGGLE_JOINTS,
  GIFT_NOTE_KEY,
  SENT_BY_KEY,
  parseStoredNiggle,
  NIGGLE_KEY,
  type NiggleJointId,
  type StoredNiggle,
} from '@/lib/niggleIntents';
import { assessmentProtocolFor, READING_REHEARSAL_REPS } from '@/lib/movementAssessment';
import { getLocalMovementAssessments } from '@/services/integrations/MovementAssessmentDataAdapter';
import { useNiggle } from '@/hooks/useNiggle';
import { prefetchWebcamChunk, prefersReducedMotion } from '@/components/game/CoachFoyer';
import type { ExerciseMode } from '@/utils/biomechanics';
import { FAQ_ITEMS } from '@/components/home/LandingSections';
import ReachPlate from '@/components/receive/ReachPlate';
import JointPlate from '@/components/receive/JointPlate';
import SendTheMeter from '@/components/receive/SendTheMeter';
import {
  useArmCycle,
  usePrefersReducedMotion,
  useReceivingScroll,
  pixelDissolve,
} from '@/components/receive/useReceivingMotion';
import { charPieces, useTypewriter } from '@/lib/textMotion';
import '@/styles/coach-foyer.css';
import '@/styles/landing-sections.css';
import '@/styles/receiving-foyer.css';

type ReceivingFoyerProps = {
  mode: ExerciseMode;
  onModeChange: (mode: ExerciseMode) => void;
  onStart: () => void;
  /** Organic landing variant — wordmark envelope, hero intake chips, the
   *  movement picker behind "or pick a movement". `?niggle=` arrivals pass
   *  false and keep the sender greeting + collapsed change-it intake. */
  organic: boolean;
};

/** Same-session repeat views skip the envelope straight to Act 1. */
const ENVELOPE_SEEN_KEY = 'imf_rf_envelope_v1';

/** Rep counts read as words in the expectation line — "one to warm up ·
 *  five to count" — engraved register, digits fall through past ten. */
const REP_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];
const repWord = (n: number) => REP_WORDS[n] ?? String(n);

/** Joint-aware short phrase for "Your ___, measured." */
const JOINT_PHRASE: Record<NiggleJointId, string> = {
  'neck-shoulders': 'neck & shoulders',
  back: 'lower back',
  knee: 'knee',
  arm: 'arm',
  'not-sure': 'movement',
};

/** The company beat — the three flagship zones from the DESIGN_EVOLUTION
 *  epidemiology table (US CDC 2019 / GP surveys), one stat block each. */
const COMPANY_STATS: {
  id: 'back' | 'neck' | 'knee';
  label: string;
  stat: string;
  /** Joints whose selection lights this block. */
  joints: NiggleJointId[];
}[] = [
  { id: 'back', label: 'Back', stat: '~39%', joints: ['back'] },
  { id: 'neck', label: 'Neck & shoulders', stat: '~18–43%', joints: ['neck-shoulders'] },
  { id: 'knee', label: 'Knee', stat: '~17–36%', joints: ['knee'] },
];

type ExerciseOption = {
  mode: ExerciseMode;
  label: string;
  detail: string;
};

/** The movement picker behind "or pick a movement" — the CoachFoyer card
 *  list, all six exercises in one unfold (the unfold itself is the demotion). */
const RF_EXERCISES: ExerciseOption[] = [
  { mode: 'curls', label: 'Curls', detail: 'Elbow swing · arm demo' },
  { mode: 'pushups', label: 'Push-ups', detail: 'Chest · elbows · line' },
  { mode: 'reach', label: 'Overhead reach', detail: 'Shoulder range · trunk sway' },
  { mode: 'squats', label: 'Squats', detail: 'Mobility · depth · knees' },
  { mode: 'pullups', label: 'Pull-ups', detail: 'Extension · symmetry' },
  { mode: 'jumps', label: 'Jumps', detail: 'Landing · knees' },
];

type EnvelopePhase = 'show' | 'dissolving' | 'done';

export function ReceivingFoyer({ mode, onModeChange, onStart, organic }: ReceivingFoyerProps) {
  const reduced = usePrefersReducedMotion();
  const { triggerHaptic } = useHapticFeedback();
  const niggle = useNiggle();

  // The stored intake is written by Game's URL-param effect before this
  // foyer mounts — read it lazily so first paint already greets the right
  // joint (useNiggle hydrates one effect later and takes over from there).
  const [initialStored] = useState<StoredNiggle | null>(() =>
    typeof window === 'undefined' ? null : parseStoredNiggle(localStorage.getItem(NIGGLE_KEY))
  );
  const joint = niggle.hydrated ? niggle.joint : getNiggleJoint(initialStored?.joint);
  // Same lazy-stored fallback for the context — its giftLine is part of the
  // first-paint greeting, so it can't wait on useNiggle's hydration either.
  const initialContext = initialStored
    ? (getNiggleJoint(initialStored.joint)?.contexts.find((c) => c.id === initialStored.context) ??
      null)
    : null;
  const context = niggle.hydrated ? niggle.context : initialContext;
  const { setJoint, setContext } = niggle;

  const [sentBy, setSentBy] = useState<string | null>(null);
  const [giftNote, setGiftNote] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  // Organic progressive disclosure: a stored niggle pre-selects the intake,
  // so the hero carries one quiet line ("still your ___? change") instead of
  // the chip grid — tapping unfolds the same chips a first visit shows.
  const [heroIntakeOpen, setHeroIntakeOpen] = useState(false);
  // The link hero already knows the joint — its Fig 1 plate starts quiet
  // and the teaching chrome (anatomy labels + live-read panels) wakes on a
  // beat after the envelope lifts, not all at once.
  const [linkPlateAwake, setLinkPlateAwake] = useState(false);
  const [movesOpen, setMovesOpen] = useState(false);
  const [coachStatus, setCoachStatus] = useState<StationStatus>(coachStation.status);
  const [beat3Progress, setBeat3Progress] = useState(() =>
    typeof window !== 'undefined' && prefersReducedMotion() ? 1 : 0.35
  );

  const rootRef = useRef<HTMLElement>(null);
  const heroPlateRef = useRef<HTMLDivElement>(null);
  const finalPlateRef = useRef<HTMLDivElement>(null);
  const beat3Ref = useRef<HTMLElement>(null);
  const envelopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const dissolveFastRef = useRef(false);

  useEffect(() => {
    setSentBy(localStorage.getItem(SENT_BY_KEY));
    setGiftNote(localStorage.getItem(GIFT_NOTE_KEY));
  }, []);

  // Return-visit continuity: a prior VALID local read earns one hairline
  // under the title — "Last read: a clean read — N days ago". Assessments
  // carry no grade (M0 is honest reads, not verdicts), so the line names
  // the read, not a score. Anything missing or inconclusive → silence; the
  // CTA is never gated on it.
  const [lastReadDays, setLastReadDays] = useState<number | null>(null);
  // The last read's measured range — the hero plate remembers it (see the
  // .rf-lastarc imprint on the plate below).
  const [lastReadRange, setLastReadRange] = useState<number | null>(null);
  useEffect(() => {
    if (!organic) return;
    let alive = true;
    void getLocalMovementAssessments()
      .then((records) => {
        if (!alive) return;
        const valid = records.filter((r) => r.assessment.status === 'valid');
        if (valid.length === 0) return;
        const latest = valid.reduce((a, b) =>
          a.assessment.capturedAt > b.assessment.capturedAt ? a : b
        );
        const days = Math.floor((Date.now() - latest.assessment.capturedAt) / 86_400_000);
        setLastReadDays(Math.max(0, days));
        setLastReadRange(latest.assessment.measurements?.range ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [organic]);

  // A joint restored from storage (organic return visit) carries its protocol
  // movement — apply it once so the CTA and the read stay honest. Link
  // arrivals already get this from Game's URL-param effect; same value.
  const restoredModeAppliedRef = useRef(false);
  useEffect(() => {
    if (restoredModeAppliedRef.current) return;
    restoredModeAppliedRef.current = true;
    if (joint) onModeChange(joint.mode);
    // Applied once per mount — later movement picks stay picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Station status only feeds the exercise cards' robot-demo chip — the same
  // dormant/live reading the CoachFoyer list shows. No station → dormant.
  useEffect(() => {
    if (!coachStation.enabled) return;
    const unsubscribe = coachStation.onStatus(setCoachStatus);
    coachStation.connect();
    return unsubscribe;
  }, []);

  // Unfolds grow the page height — ScrollTrigger's cached seam/beat offsets go
  // stale, so nudge a refresh (it listens on window resize) once the grid-rows
  // transition settles. No-op under reduced motion, where no triggers exist.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 560);
    return () => clearTimeout(t);
  }, [movesOpen, intakeOpen, heroIntakeOpen, joint?.id]);

  // Organic arrivals get the wordmark materializing in the ring; a `?from=`
  // name (or a niggle link without one) keeps the sender greeting.
  const greeting = organic
    ? 'NIGGLEOMETER'
    : sentBy
      ? `${sentBy} sent you this`
      : 'A friend sent you this';

  // The gift, not the diagnosis: the sender's own `&note=` line wins; the
  // context's empathy line covers a link without one. Renders alone when a
  // note arrives with no `&from=`.
  const giftQuote = giftNote ?? context?.giftLine ?? null;

  // —— Act 0: the envelope ————————————————————————————————
  const [envelope, setEnvelope] = useState<EnvelopePhase>(() => {
    if (typeof window === 'undefined') return 'done';
    if (prefersReducedMotion() || sessionStorage.getItem(ENVELOPE_SEEN_KEY)) return 'done';
    return 'show';
  });

  const startDissolve = useCallback(
    (fast = false) => {
      if (envelope !== 'show') return;
      dissolveFastRef.current = fast;
      // Fill the dissolve canvas before the overlay's own background goes
      // transparent — same commit, no hero flash-through.
      const canvas = envelopeCanvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(canvas.clientWidth * dpr);
        canvas.height = Math.round(canvas.clientHeight * dpr);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#061013';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
      setEnvelope('dissolving');
    },
    [envelope]
  );

  // Auto-seam after ~1.2s.
  useEffect(() => {
    if (envelope !== 'show') return;
    const t = setTimeout(() => startDissolve(false), 1250);
    return () => clearTimeout(t);
  }, [envelope, startDissolve]);

  // The gift note types itself once the envelope lifts — a note tucked into
  // the parcel, written while she reads, capped under ~2.5s however long
  // the sender's line runs. Reduced motion returns the full string instantly.
  const giftTyped = useTypewriter(giftQuote, {
    enabled: envelope !== 'show',
    msPerChar: 16,
    maxDuration: 2300,
    startDelay: 420,
  });

  useEffect(() => {
    if (envelope !== 'dissolving') return;
    const canvas = envelopeCanvasRef.current;
    let alive = true;
    (async () => {
      if (canvas) {
        await pixelDissolve(canvas, {
          duration: dissolveFastRef.current ? 260 : 460,
          skipFill: true,
        });
      }
      if (alive) {
        sessionStorage.setItem(ENVELOPE_SEEN_KEY, '1');
        setEnvelope('done');
      }
    })();
    return () => {
      alive = false;
    };
  }, [envelope]);

  // —— Act 1: the living plate ————————————————————————————
  // The loop only spins once the envelope lifts (and never under reduced
  // motion — the figure rests at the raised pose with pips filled).
  const { progress, litPips, playRep, beginScrub, scrubTo, endScrub } = useArmCycle({
    active: envelope !== 'show',
    reduced,
  });

  // Link hero: the plate's teaching chrome wakes ~600ms after Act 1 begins
  // (the envelope lifting, or first paint when the seen-flag skips it). A
  // smooth reveal — .jp-detail fades in; reduced motion lands it instantly.
  // Organic heroes wake on the answered joint instead (a picked or stored
  // chip), so this timer is link-only.
  useEffect(() => {
    if (organic || linkPlateAwake || envelope === 'show') return;
    const t = setTimeout(() => setLinkPlateAwake(true), 600);
    return () => clearTimeout(t);
  }, [organic, linkPlateAwake, envelope]);

  // Scroll choreography — GSAP + ScrollTrigger dynamic, no-op when reduced.
  useReceivingScroll({
    rootRef,
    scrubRef: beat3Ref,
    enabled: envelope !== 'show',
    reduced,
    onScrubProgress: setBeat3Progress,
  });

  // Warm the camera + pose chunk while she reads — the OS prompt still only
  // fires on CTA press.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(prefetchWebcamChunk, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(prefetchWebcamChunk, 1200);
    return () => clearTimeout(timer);
  }, []);

  // —— Tap = one slow rep; hold = scrub (pointer angle → arm angle) ————
  const scrubbingRef = useRef(false);
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const pointerToProgress = useCallback((clientX: number, clientY: number): number | null => {
    const svg = heroPlateRef.current?.querySelector('svg');
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / 320, rect.height / 372);
    if (scale <= 0) return null;
    const ox = rect.left + (rect.width - 320 * scale) / 2;
    const oy = rect.top + (rect.height - 372 * scale) / 2;
    const px = (clientX - ox) / scale;
    const py = (clientY - oy) / scale;
    const angle = Math.atan2(px - 192, py - 142); // 0 = hanging, π = overhead
    return Math.min(1, Math.max(0, (angle - 0.1) / (Math.PI - 0.2)));
  }, []);

  const onPlatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    scrubbingRef.current = false;
  };

  const onPlatePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const down = downRef.current;
    if (!down) return;
    // A JointPlate peel tap swallows pointerup before it reaches here —
    // drop the stale press instead of scrubbing on the next hover move.
    if (e.buttons === 0) {
      downRef.current = null;
      return;
    }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (!scrubbingRef.current && moved > 8) {
      scrubbingRef.current = true;
      heroPlateRef.current?.setPointerCapture?.(e.pointerId);
      beginScrub();
    }
    if (scrubbingRef.current) {
      const p = pointerToProgress(e.clientX, e.clientY);
      if (p != null) scrubTo(p);
    }
  };

  const onPlatePointerUp = () => {
    const down = downRef.current;
    downRef.current = null;
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      endScrub();
      return;
    }
    if (down && performance.now() - down.t < 400) {
      playStudioCue('soft');
      triggerHaptic(30);
      playRep();
    }
  };

  const onPlatePointerCancel = () => {
    downRef.current = null;
    if (scrubbingRef.current) {
      scrubbingRef.current = false;
      endScrub();
    }
  };

  // —— Act 3: the iris — the plate's frame becomes the HUD frame ————————
  const handleStart = (plate?: HTMLDivElement | null) => {
    playStudioCue('press');
    triggerHaptic([50, 100]);
    if (!reduced) plate?.classList.add('is-iris');
    onStart();
  };

  const readingProtocol = joint ? assessmentProtocolFor(mode) : null;
  // CTA honesty: promise the exact rep count only when a joint is answered
  // AND this movement has a fixed protocol; everything else is one rep.
  const ctaLabel = readingProtocol
    ? `Take a ${readingProtocol.targetReps}-rep reading`
    : 'Try one rep';
  const phrase = joint ? JOINT_PHRASE[joint.id] : 'niggle';
  const litStat = joint ? COMPANY_STATS.find((s) => s.joints.includes(joint.id))?.id : undefined;

  // A stored niggle pre-selects the intake on organic — the hero collapses
  // the chip grid to one quiet line until "change" unfolds it. A joint
  // picked THIS visit keeps the grid; the collapse is the stored answer's.
  const intakeCollapsed = organic && Boolean(initialStored) && Boolean(joint);

  // The organic outro send card personalizes to the answered niggle; with
  // none yet it falls back to the flagship joint (same as the readings tab).
  const sendJoint = joint ?? getNiggleJoint('neck-shoulders');
  const sendContext = context ?? sendJoint?.contexts[0] ?? null;

  // The hero plate's detail chrome is earned, not default: organic wakes it
  // when the joint is answered (a picked or stored chip); the link hero
  // wakes on the post-envelope beat. ReachPlate heroes have no chrome to
  // quiet — the prop only reaches JointPlate.
  // A return visit with a stored read wakes the plate too — the meter
  // remembers, so its detail chrome is earned even before a joint answer.
  const heroPlateQuiet = organic ? !(joint || lastReadRange !== null) : !linkPlateAwake;
  const ritualLine = readingProtocol
    ? `Once a week, same setup, ${readingProtocol.targetReps} slow raises.`
    : 'Once a week, same setup, a few slow reps.';

  // —— The character grammar — one effect per text role ————————————————
  // Envelope greeting: handwritten per-char reveal (chars inside the word
  // spans; the greeting is a flex row so words keep their CSS margin).
  const greetingChars = charPieces(greeting, {
    charClassName: 'rf-envelope__char',
    wordClassName: 'rf-envelope__word',
    baseDelay: 300,
    step: 20,
  });
  // Headline: letterpress settle — the whole line presses in fast, then the
  // brass <em> lands a beat late like the heaviest sort in the forme.
  const titleLead = organic ? `Your ${phrase},` : 'See if it’s actually';
  const titleEm = organic ? 'measured.' : 'getting better.';
  const titleLeadPieces = charPieces(titleLead, {
    charClassName: 'rf-title__char',
    wordClassName: 'rf-title__word',
    baseDelay: 140,
    step: 13,
    includeSpaces: true,
  });
  const titleEmPieces = charPieces(titleEm, {
    charClassName: 'rf-title__char',
    wordClassName: 'rf-title__word',
    baseDelay: 140,
    step: 13,
    startIndex: titleLeadPieces.count,
    extraDelay: 170,
    includeSpaces: true,
  });

  const robotChipState =
    !coachStation.enabled || coachStatus === 'offline'
      ? 'dormant'
      : coachStatus === 'connected'
        ? 'live'
        : 'connecting';

  const pickJoint = (j: (typeof NIGGLE_JOINTS)[number], el?: HTMLButtonElement) => {
    playStudioCue('soft');
    triggerHaptic(30);
    if (joint?.id === j.id) {
      setJoint(null);
      return;
    }
    setJoint(j.id);
    onModeChange(j.mode);
    el?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  // The intake, in plate idiom — the same hairline chips render in the hero
  // (organic) and inside the folded "change it" section (niggle link).
  const intakeChips = (
    <div className="rf-pick" role="group" aria-label="Where does it nag?">
      <span className="rf-pick__label">Where does it nag?</span>
      <div className="rf-chips">
        {NIGGLE_JOINTS.map((j) => {
          const selected = joint?.id === j.id;
          return (
            <button
              key={j.id}
              type="button"
              className={`rf-chip${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={(e) => pickJoint(j, e.currentTarget)}
            >
              {j.label}
            </button>
          );
        })}
      </div>
      {/* Picking a joint unfolds its context row — and for link arrivals
          "Send this to a friend" lives here, in the unfolded finale intake.
          Organic moved its send card to the outro (the hero stays ask-only). */}
      <div className={`rf-unfold${joint ? ' is-open' : ''}`}>
        <div className="rf-unfold__content">
          {joint && joint.contexts.length > 1 && (
            <>
              <span className="rf-pick__label">What does it do?</span>
              <div className="rf-chips">
                {joint.contexts.map((c) => {
                  const selected = context?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`rf-chip rf-chip--context${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => {
                        playStudioCue('soft');
                        triggerHaptic(30);
                        setContext(c.id);
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {joint && !organic && (
            <SendTheMeter
              joint={joint}
              contextId={context?.id}
              giftLine={context?.giftLine}
              buttonLabel="Send this to a friend"
              surface="receiving-foyer"
            />
          )}
        </div>
      </div>
    </div>
  );

  // The CoachFoyer exercise card, verbatim — the unfold is the demotion.
  const renderExerciseButton = (exercise: ExerciseOption) => {
    const selected = exercise.mode === mode;
    return (
      <button
        key={exercise.mode}
        type="button"
        className={`coach-foyer__exercise${selected ? ' is-selected' : ''}`}
        aria-pressed={selected}
        onClick={() => {
          playStudioCue('soft');
          triggerHaptic(40);
          onModeChange(exercise.mode);
        }}
      >
        <span className="coach-foyer__exercise-copy">
          <span className="coach-foyer__exercise-title">
            <strong>{exercise.label}</strong>
            {exercise.mode === 'curls' ? (
              <span className={`coach-foyer__robot-chip is-${robotChipState}`}>
                <Sparkles size={10} strokeWidth={2} aria-hidden="true" />
                Robot demo
              </span>
            ) : exercise.mode === 'squats' ? (
              <span className="coach-foyer__robot-chip is-mobility">
                <Activity size={10} strokeWidth={2} aria-hidden="true" />
                Mobility check
              </span>
            ) : null}
          </span>
          <small>{exercise.detail}</small>
        </span>
        <span className="coach-foyer__radio" aria-hidden="true" />
      </button>
    );
  };

  return (
    <section
      ref={rootRef}
      className="receiving-foyer"
      aria-labelledby="rf-title"
      data-envelope={envelope}
    >
      <a className="coach-foyer__skip" href="#startButton">
        Skip to start
      </a>

      {/* ——— Act 0 — the envelope ——— */}
      {envelope !== 'done' && (
        <div
          className={`rf-envelope${envelope === 'dissolving' ? ' is-dissolving' : ''}`}
          onPointerDown={() => startDissolve(true)}
          aria-hidden="true"
        >
          <canvas ref={envelopeCanvasRef} className="rf-envelope__canvas" />
          <div className="rf-envelope__inner">
            <svg className="rf-envelope__ring" viewBox="0 0 240 240" focusable="false">
              <circle className="rf-envelope__ring-track" cx="120" cy="120" r="104" />
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * 30 * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    className="rf-envelope__ring-tick"
                    x1={120 + 98 * Math.cos(a)}
                    y1={120 + 98 * Math.sin(a)}
                    x2={120 + 104 * Math.cos(a)}
                    y2={120 + 104 * Math.sin(a)}
                  />
                );
              })}
              <circle className="rf-envelope__ring-draw" cx="120" cy="120" r="104" pathLength={1} />
            </svg>
            <p
              className={`rf-envelope__greeting${!sentBy && organic ? ' rf-envelope__greeting--brand' : ''}`}
              aria-label={greeting}
            >
              {greetingChars.nodes}
            </p>
          </div>
        </div>
      )}

      <div className="rf-inner">
        {/* ——— Act 1 — Fig 1, the living plate ——— */}
        <div className="rf-hero">
          <div
            ref={heroPlateRef}
            className="rf-plate rf-hero__plate"
            onPointerDown={onPlatePointerDown}
            onPointerMove={onPlatePointerMove}
            onPointerUp={onPlatePointerUp}
            onPointerCancel={onPlatePointerCancel}
            role="button"
            tabIndex={0}
            aria-label="Fig 1 — the reach. Tap to play one slow raise; hold and drag to move the arm."
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playRep();
              }
            }}
          >
            {/* Neck & shoulders runs the reach read — Fig 1 becomes the
                anatomical teardown for it. Every other joint/movement keeps
                the reach figure's plate. */}
            {joint?.id === 'neck-shoulders' && mode === 'reach' ? (
              <JointPlate progress={progress} litPips={litPips} quiet={heroPlateQuiet} />
            ) : (
              <ReachPlate progress={progress} litPips={litPips} />
            )}
            {/* Return-visit memory — chosen over holding the loop's first
                pose (that would mean teaching useArmCycle a start pose;
                this is ~15 lines). A faint static copy of the same plate
                stacks absolute over the living figure — same viewBox — at
                the SessionRecap "· This read ·" mini's pose:
                progress={last read's range} fixes the arm at the stored
                max elevation and the swept range arc draws proportional
                to progress. CSS dims it to an imprint and shifts the arc
                brass — memory, not now. */}
            {organic && lastReadRange !== null && (
              <div className="rf-lastarc" aria-hidden="true">
                {joint?.id === 'neck-shoulders' && mode === 'reach' ? (
                  <JointPlate
                    progress={lastReadRange}
                    caption=""
                    plateNum=""
                    pips={0}
                    ghostCount={0}
                    interactive={false}
                    quiet
                  />
                ) : (
                  <ReachPlate
                    progress={lastReadRange}
                    caption=""
                    plateNum=""
                    drawArc
                    ghostCount={0}
                    pips={0}
                  />
                )}
              </div>
            )}
            <span className="rf-plate__hint" aria-hidden="true">
              tap for one raise · hold to scrub
            </span>
          </div>

          <div className="rf-hero__copy">
            {/* Sender line + gift quote are link arrivals only — the stored
                greeting must never leak onto the organic landing. */}
            {!organic && sentBy && <p className="rf-sent-by">{greeting}</p>}
            {/* The gift, not the diagnosis — a note tucked under the sender
                line: their &note= words, else the context's empathy line. */}
            {!organic && giftQuote && (
              <blockquote
                className={`rf-gift${giftTyped.done ? ' is-typed' : ''}`}
                aria-label={giftQuote}
              >
                <span className="rf-gift__mark" aria-hidden="true">
                  &ldquo;
                </span>
                {/* The ghost holds the card's final height so typing never
                    shifts the layout; the live line types over it and the
                    brass caret fades once the last character lands. */}
                <span className="rf-gift__body" aria-hidden="true">
                  <span className="rf-gift__ghost">{giftQuote}</span>
                  <span className="rf-gift__live">
                    {giftTyped.text}
                    <span className="rf-gift__cursor" />
                  </span>
                </span>
              </blockquote>
            )}
            {/* Link recipients get the promise a worried person wants; the
                joint-aware "Your ___, measured." stays the organic title. */}
            <h1 id="rf-title" className="rf-title" aria-label={`${titleLead} ${titleEm}`}>
              {titleLeadPieces.nodes} <em className="rf-title-brass">{titleEmPieces.nodes}</em>
            </h1>

            {/* Return-visit continuity — one quiet hairline under the title.
                Organic only, and only when a prior read actually exists. */}
            {organic && lastReadDays !== null && (
              <p className="rf-lastread">
                Last read: a clean read —{' '}
                {lastReadDays === 0
                  ? 'today'
                  : lastReadDays === 1
                    ? 'yesterday'
                    : `${lastReadDays} days ago`}
              </p>
            )}

            {/* The framing line rides with the ask: organic keeps it beside
                the hero CTA; link arrivals meet it at the finale instead. */}
            {organic && (
              <p className="rf-line">
                {readingProtocol
                  ? `${readingProtocol.targetReps} slow raises. The camera watches; nothing leaves your phone.`
                  : 'Slow reps. The camera watches; nothing leaves your phone.'}
              </p>
            )}

            {/* Organic: the intake IS the hero — hairline chips under the
                title; picking a joint unfolds its context row and retitles
                the plate copy. A stored niggle already answered, so its hero
                carries one quiet line instead — "change" unfolds the same
                chips. Link arrivals learn first: no CTA here, the reading
                ask waits in the outro as the finale. */}
            {organic &&
              (intakeCollapsed ? (
                <>
                  <button
                    type="button"
                    className="rf-still"
                    aria-expanded={heroIntakeOpen}
                    aria-controls="rf-hero-intake"
                    onClick={() => {
                      playStudioCue('soft');
                      triggerHaptic(30);
                      setHeroIntakeOpen((v) => !v);
                    }}
                  >
                    still your {phrase}? <span className="rf-still__action">change</span>
                  </button>
                  <div
                    id="rf-hero-intake"
                    className={`rf-unfold${heroIntakeOpen ? ' is-open' : ''}`}
                  >
                    <div className="rf-unfold__content">{intakeChips}</div>
                  </div>
                </>
              ) : (
                intakeChips
              ))}

            {organic && (
              <>
                <button
                  type="button"
                  id="startButton"
                  className="coach-foyer__start coach-foyer__start--hero feel-press rf-cta"
                  onPointerEnter={prefetchWebcamChunk}
                  onTouchStart={prefetchWebcamChunk}
                  onClick={() => handleStart(heroPlateRef.current)}
                >
                  <Camera size={18} strokeWidth={2} aria-hidden="true" />
                  <span>{ctaLabel}</span>
                  <ArrowRight
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="coach-foyer__start-arrow"
                  />
                </button>

                <button
                  type="button"
                  className="rf-change"
                  aria-expanded={movesOpen}
                  aria-controls="rf-moves"
                  onClick={() => {
                    playStudioCue('soft');
                    triggerHaptic(30);
                    setMovesOpen((v) => !v);
                  }}
                >
                  or pick a movement
                </button>

                <div id="rf-moves" className={`rf-intake${movesOpen ? ' is-open' : ''}`}>
                  <div className="rf-intake__content">
                    <fieldset className="coach-foyer__exercise-list coach-foyer__exercise-list--extras">
                      <legend className="sr-only">Pick a movement</legend>
                      {RF_EXERCISES.map(renderExerciseButton)}
                    </fieldset>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Link recipients only: the hero teaches, it does not ask. A scroll
              cue names what is below; one quiet link lets an impatient reader
              jump straight to the reading in the outro. */}
          {!organic && (
            <div className="rf-next">
              <span className="rf-next__cue" aria-hidden="true">
                the meter, explained
                <ChevronDown size={13} className="rf-next__chevron" />
              </span>
              <a className="rf-next__skip" href="#rf-reading">
                Skip to the reading
              </a>
            </div>
          )}
        </div>

        {/* ——— Act 2 — the scroll story, a seam between each beat ——— */}
        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The question">
          <span className="rf-beat__num" aria-hidden="true">
            · I ·
          </span>
          <p className="rf-beat__eyebrow">The question</p>
          <h2 className="rf-beat__title">Tension can&rsquo;t be photographed.</h2>
          <p className="rf-beat__body">
            But how the arm travels can — range, control, left-right. A meter, not a mirror.
          </p>
          <div className="rf-beat__figure rf-beat__figure--plate">
            <ReachPlate progress={0.55} ghostBoost={1.7} pips={0} />
          </div>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The company">
          <span className="rf-beat__num" aria-hidden="true">
            · II ·
          </span>
          <p className="rf-beat__eyebrow">The company</p>
          <h2 className="rf-beat__title">
            {joint
              ? 'You’re in enormous, invisible company.'
              : 'Whichever it is, you’re in company.'}
          </h2>
          {/* The three flagship zones from the epidemiology table the
              instrument was designed from — the answered niggle's block
              lights brass; arm / not-sure / unanswered light none. */}
          <div className="rf-stats">
            {COMPANY_STATS.map((s) => (
              <div key={s.id} className={`rf-stat${litStat === s.id ? ' is-lit' : ''}`}>
                <span className="rf-stat__zone">{s.label}</span>
                <span className="rf-stat__figure">{s.stat}</span>
              </div>
            ))}
          </div>
          <p className="rf-beat__body">
            Share of adults reporting pain in any three-month stretch — desk work makes it nearly
            universal. What isn&rsquo;t common is measuring it. Almost everyone guesses.
          </p>
          <p className="rf-beat__footnote">
            US CDC 2019, GP surveys — the table this instrument was designed from.
          </p>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section ref={beat3Ref} className="rf-beat" aria-label="The read">
          <span className="rf-beat__num" aria-hidden="true">
            · III ·
          </span>
          <p className="rf-beat__eyebrow">The read</p>
          <h2 className="rf-beat__title">The meter watches three things.</h2>
          <div className="rf-beat__figure rf-beat__figure--plate">
            <ReachPlate
              progress={beat3Progress}
              drawArc
              controlRing
              mirror
              ghostCount={2}
              pips={5}
            />
          </div>
          <p className="rf-read-labels" aria-hidden="true">
            <span className={beat3Progress > 0.05 ? 'is-lit' : ''}>Range</span>
            <span className="rf-read-labels__sep">·</span>
            <span className={beat3Progress > 0.38 ? 'is-lit' : ''}>Control</span>
            <span className="rf-read-labels__sep">·</span>
            <span className={beat3Progress > 0.7 ? 'is-lit' : ''}>Balance</span>
          </p>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The ritual">
          <span className="rf-beat__num" aria-hidden="true">
            · IV ·
          </span>
          <p className="rf-beat__eyebrow">The ritual</p>
          <h2 className="rf-beat__title">A healthy way to hold a niggle.</h2>
          <p className="rf-beat__body">{ritualLine}</p>
          <div className="rf-ritual">
            <p className="rf-ritual__row">Feels better and the meter agrees — confidence.</p>
            <p className="rf-ritual__row">
              Numbers moved but it feels the same — healing on a schedule you can&rsquo;t feel yet.
            </p>
            <p className="rf-ritual__row">
              Hurts more and nothing moved — see a professional; that&rsquo;s the body&rsquo;s job,
              not the meter&rsquo;s.
            </p>
          </div>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The coach arm">
          <p className="rf-beat__eyebrow">The coach arm</p>
          <h2 className="rf-beat__title">The fix, shown in steel.</h2>
          <figure className="rf-arm-plate">
            <span className="rf-arm-plate__caption" aria-hidden="true">
              · Fig 2 · The Coach Arm ·
            </span>
            <div className="rf-arm-plate__media">
              <img
                className="rf-arm-plate__img"
                src="/atmosphere/so101-follower-cutout.webp"
                alt="The SO-101 coach arm, a small desktop robot arm used to demonstrate corrections"
                width={1280}
                height={960}
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption className="rf-arm-plate__num" aria-hidden="true">
              Plate II
            </figcaption>
          </figure>
          <p className="rf-beat__body">
            A small robot arm demonstrates the fix when the coach bay is connected — without it, the
            on-screen coach shows the same.
          </p>
          <div className="rf-ritual">
            <p className="rf-ritual__row">Camera reads your form.</p>
            <p className="rf-ritual__row">Coach names one fix.</p>
            <p className="rf-ritual__row">The arm shows it.</p>
          </div>
        </section>

        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-beat" aria-label="The honesty">
          <span className="rf-beat__num" aria-hidden="true">
            · V ·
          </span>
          <p className="rf-beat__eyebrow">The honesty</p>
          <h2 className="rf-beat__title">A meter that can&rsquo;t read says so.</h2>
          <ul className="rf-ledger">
            <li>video never uploads</li>
            <li>reads stay in this browser</li>
            <li>wellness guidance, not medicine</li>
          </ul>
        </section>

        {/* ——— Outro ——— */}
        <div className="rf-seam" aria-hidden="true">
          <span className="rf-seam__rule" />
          <canvas className="rf-seam__canvas" />
        </div>

        <section className="rf-outro" aria-label="Common questions">
          <h2 className="rf-beat__title rf-outro__title">Common questions</h2>
          <div className="ls-faq__list">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="ls-faq__item">
                <summary>
                  <span>{item.q}</span>
                  <ChevronDown size={15} aria-hidden="true" className="ls-chevron" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>

          {/* The finale — the same CTA block the organic hero carries, held
              until after the story for link recipients. #rf-reading is the
              hero's "Skip to the reading" anchor; #startButton stays the
              single start target whichever variant mounted it. */}
          <div className="rf-final" id="rf-reading">
            <div ref={finalPlateRef} className="rf-plate rf-final__plate">
              <ReachPlate progress={0.62} ghostBoost={1.4} pips={5} litPips={3} />
            </div>
            {!organic && (
              <p className="rf-line rf-final__line">
                {readingProtocol
                  ? `${readingProtocol.targetReps} slow raises. The camera watches; nothing leaves your phone.`
                  : 'Slow reps. The camera watches; nothing leaves your phone.'}
              </p>
            )}
            <button
              type="button"
              id={organic ? undefined : 'startButton'}
              className="coach-foyer__start feel-press rf-cta"
              onClick={() => handleStart(finalPlateRef.current)}
            >
              <Camera size={18} strokeWidth={2} aria-hidden="true" />
              <span>{ctaLabel}</span>
              <ArrowRight
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className="coach-foyer__start-arrow"
              />
            </button>
            {/* The expectation hairline — names the rehearsal rep the
                meter gives away before the counted ones. Protocol modes
                only; renders under the finale ask in both variants. */}
            {readingProtocol && READING_REHEARSAL_REPS > 0 && (
              <p className="rf-line rf-final__line rf-final__expect">
                {repWord(READING_REHEARSAL_REPS)} to warm up · {repWord(readingProtocol.targetReps)}{' '}
                to count
              </p>
            )}
            {/* The "change it" door moved here with the ask — the hero no
                longer carries any action for link arrivals. */}
            {!organic && (
              <>
                <button
                  type="button"
                  className="rf-change"
                  aria-expanded={intakeOpen}
                  aria-controls="rf-intake"
                  onClick={() => {
                    playStudioCue('soft');
                    triggerHaptic(30);
                    setIntakeOpen((v) => !v);
                  }}
                >
                  not your niggle? change it
                </button>

                <div id="rf-intake" className={`rf-intake${intakeOpen ? ' is-open' : ''}`}>
                  <div className="rf-intake__content">{intakeChips}</div>
                </div>
              </>
            )}
            {/* Organic moved the send card out of the hero intake — it lives
                here, after the story, beside the final ask. The reply row
                still only appears when a stored sender exists (earned). */}
            {organic && sendJoint && (
              <SendTheMeter
                joint={sendJoint}
                contextId={sendContext?.id}
                giftLine={sendContext?.giftLine}
                lead="Pass the meter to someone whose joint nags."
                surface="receiving-foyer-outro"
                className="rf-send"
              />
            )}
            <p className="coach-foyer__assist coach-foyer__assist--meter rf-final__note">
              A meter, not a diagnosis. If it hurts, stop.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}

export default ReceivingFoyer;
