import React from 'react';
import { SandowGradeMark } from '@/components/ui/SandowGradeMark';
import { useImmersive } from '@/hooks/useImmersive';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { zIndexClasses } from '@/lib/zTokens';
import { readableFormWarning } from '@/lib/coachingStory';
import { countedReadingReps, READING_REHEARSAL_REPS } from '@/lib/movementAssessment';
import { playStudioCue } from '@/lib/uiSound';
import ReadGauge from '@/components/readings/ReadGauge';
import type { ReadLevel } from '@/lib/readQuality';

interface GameHUDProps {
  mode: string;
  timeLeft: number;
  repCount: number;
  formatTime: (sec: number) => string;
  isOverlay?: boolean;
  isRace?: boolean;
  isMobile?: boolean;
  /** Biomechanical depth (0–1) for the quiet depth indicator. */
  depth?: number;
  /** Form warnings — surfaced as a subtle cue, not a red box. */
  warnings?: string[];
  /** True during the ~800ms rep-feedback window: on mobile this drives the
   *  pill-count pulse + milestone chip instead of a full-screen flash. */
  repPulse?: boolean;
  /** Instrument read — needle 0..1 + level. Renders the meter face when the
   *  session feeds it live signals (docs/PHASE_B_PLAN §B1). */
  read?: { needle: number; level: ReadLevel };
  /** Gentle persistent exit for the pain-ICP — "It hurts — stop". */
  onPainExit?: () => void;
  /** Reading mode: a 1–N pip counter ("Reading · 3 of 5") replaces the open
   *  rep tally when the session is a fixed-protocol reading. */
  readingTargetReps?: number | null;
}

/**
 * The protocol pip counter. `repCount` is the detector's raw count — every
 * reading opens with `rehearsal` uncounted warm-up reps, so the meter only
 * ever tallies `counted = repCount - rehearsal`. The first rep of the set
 * is the free one: "warm-up" until it lands, one line of coaching while the
 * counted set is still empty, then "Reading · N of 5".
 */
function ReadingPips({
  repCount,
  target,
  rehearsal = 0,
}: {
  repCount: number;
  target: number;
  rehearsal?: number;
}) {
  const counted = countedReadingReps(repCount, rehearsal);
  const { triggerHaptic } = useHapticFeedback();
  // The pip tick — a quiet cue riding the same rep beat the plate's pips
  // latch on. Only counted reps tick; the warm-up rep makes no mark.
  const prevCountedRef = React.useRef(counted);
  React.useEffect(() => {
    if (counted > prevCountedRef.current) {
      playStudioCue('soft');
      triggerHaptic(18);
    }
    prevCountedRef.current = counted;
  }, [counted, triggerHaptic]);

  const label =
    rehearsal > 0 && counted === 0
      ? repCount >= rehearsal
        ? `That's it — ${target} for the meter now`
        : 'Warm-up — this one’s free'
      : `Reading · ${Math.min(counted, target)} of ${target}`;

  return (
    <div
      className={`hud-reading${counted === 0 ? ' hud-reading--warmup' : ''}`}
      role="status"
      aria-label={label}
    >
      <span className="hud-reading__label">{label}</span>
      <span className="hud-reading__pips" aria-hidden="true">
        {Array.from({ length: target }, (_, i) => (
          <span key={i} className={`hud-reading__pip${i < counted ? ' is-filled' : ''}`} />
        ))}
      </span>
    </div>
  );
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  timeLeft,
  repCount,
  formatTime,
  isOverlay = true,
  isRace = false,
  isMobile = false,
  depth,
  warnings,
  repPulse = false,
  read,
  onPainExit,
  readingTargetReps = null,
}) => {
  const { register } = useSessionIntent();
  // The live HUD follows the session register: an explicit Train session keeps
  // the full cabinet (gold Press Start chrome + arcade copy) end to end, while
  // the studio coach keeps the quiet teal instrument look. The register is
  // preserved through the session, so this never flips mid-workout.
  const studio = register !== 'arcade';
  const { immersive } = useImmersive();

  // Rehearsed readings hide the warm-up rep from every counted surface —
  // the tally, the milestone chip, and the pips all read counted reps only.
  const rehearsalReps = readingTargetReps ? READING_REHEARSAL_REPS : 0;
  const countedReps = countedReadingReps(repCount, rehearsalReps);

  // Logic for scaling based on rep count to create "delight"
  // Calculate a "beat" effect based on time to make the UI feel alive
  const [pulse, setPulse] = React.useState(1);

  React.useEffect(() => {
    // Skip the per-second timer beat on mobile — it re-renders + scale-transforms
    // every second, which fights the pose pipeline for frame budget. The compact
    // pill stays static.
    if (isMobile) return;
    if (timeLeft > 0 && timeLeft < 120) {
      setPulse(1.05);
      const t = setTimeout(() => setPulse(1), 100);
      return () => clearTimeout(t);
    }
  }, [timeLeft, isMobile]);

  // Studio (the default register): a fixed size, pulsed only on the beat. The
  // arcade register grows the count with the rep total; that is a deliberate
  // arcade flourish, but a number you must read mid-set should not change size
  // as the set goes on — so the studio path never accumulates growth.
  const repScale = studio ? pulse : 1 + Math.min(countedReps * 0.005, 0.2) * pulse;

  const raceBannerEl = isRace ? (
    <div className={`absolute -top-1 left-1/2 -translate-x-1/2 ${zIndexClasses.raceBanner}`}>
      <div
        className={
          studio
            ? 'bg-teal-800/90 px-5 py-1.5 rounded-b-xl border border-teal-400/30 shadow-none'
            : 'bg-gradient-to-r from-primary via-[#f59e0b] to-[#ea580c] px-6 py-2 rounded-b-2xl shadow-[0_4px_20px_rgba(252,177,49,0.6)] border-x-2 border-b-2 border-white/40 animate-pulse'
        }
      >
        <span
          className={
            studio
              ? 'text-[11px] font-semibold text-teal-100 tracking-[0.2em] uppercase'
              : 'text-[12px] font-black text-black tracking-[0.25em] uppercase flex items-center gap-3'
          }
        >
          {studio ? (
            // You vs. you: the self-ghost is your own best line, drawn as a
            // trace to beat — the brand thesis made visible mid-session.
            'Beat your line'
          ) : (
            <>
              <span className="animate-bounce">›</span>
              <span className="drop-shadow-sm">RACING</span>
              <span className="animate-bounce">‹</span>
            </>
          )}
        </span>
      </div>
    </div>
  ) : null;

  // Mobile: one compact pill (mode · time · reps) with a thin depth edge glow,
  // instead of three stacked blocks competing for the camera viewport.
  // Rep beats pulse the count in place; every 5th rep gets a brief milestone
  // chip — the full-screen flash is desktop-only, so the coaching line and
  // instrument are never occluded mid-set on a phone.
  if (isMobile) {
    const milestone = repPulse && countedReps > 0 && countedReps % 5 === 0;
    return (
      <div
        className={`game-hud-container game-hud-container--compact ${isOverlay ? 'hud-overlay-fs' : ''}`}
        data-register={register}
      >
        {raceBannerEl}
        <div className="hud-pill">
          <span className="hud-label hud-pill__label">{mode}</span>
          <span className={`hud-value hud-pill__time ${studio ? 'text-teal-300' : 'text-brass'}`}>
            {formatTime(timeLeft)}
          </span>
          <span className="hud-pill__divider" aria-hidden="true">
            ·
          </span>
          <span
            key={countedReps}
            className={`hud-value motion-rep hud-pill__rep ${studio ? 'text-teal-200' : 'text-brass'}${repPulse ? ' hud-pill__rep--flash' : ''}`}
          >
            {countedReps}
          </span>
          <span className="hud-label hud-pill__label">
            {studio ? (immersive ? 'Graded' : 'Reps') : 'Score'}
          </span>
        </div>
        {readingTargetReps ? (
          <ReadingPips repCount={repCount} target={readingTargetReps} rehearsal={rehearsalReps} />
        ) : null}
        {milestone && (
          <div className="hud-milestone" role="status" aria-live="polite">
            {repMilestoneMessage(countedReps, studio)}
          </div>
        )}
        {/* Depth stays mounted at 0. Hiding it when the joint is fully extended
            removed the instrument exactly when a user is holding still between
            reps, which is when they most need to see it exists. */}
        {typeof depth === 'number' && (
          <div
            className="hud-depth-edge"
            role="progressbar"
            aria-label="Rep depth"
            aria-valuenow={Math.round(depth * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="hud-depth-edge__fill"
              style={{ width: `${Math.min(100, Math.round(depth * 100))}%` }}
            />
          </div>
        )}
        {/* Mobile previously had no form-warning surface at all — the warning
            lived only in the desktop branch, so a phone user mid-set got no
            signal at all. This is the shared warning row. */}
        {warnings && warnings.length > 0 && (
          <div className="hud-warning-strip" role="status" aria-live="polite">
            {readableFormWarning(warnings[0])}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`game-hud-container ${isOverlay ? 'hud-overlay-fs' : ''}`}
      data-register={register}
    >
      {raceBannerEl}

      <div
        className="hud-block timer"
        style={{
          transform: `scale(${repScale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <span className="hud-label">{mode}</span>
        <span className={`hud-value ${studio ? 'text-teal-300' : 'text-brass'}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div
        className="hud-block reps sandow-gauge"
        style={{
          transform: `scale(${repScale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <span className="hud-label sandow-gauge__label">
          {studio ? (immersive ? 'Graded' : 'Reps') : 'Score'}
        </span>
        <span
          key={countedReps}
          className={`hud-value motion-rep sandow-gauge__value ${studio ? 'text-teal-200' : 'text-brass'}`}
        >
          {countedReps}
        </span>
        <SandowGradeMark className="hud-sandow-stamp" />
      </div>

      {readingTargetReps ? (
        <ReadingPips repCount={repCount} target={readingTargetReps} rehearsal={rehearsalReps} />
      ) : null}

      {/* Quiet depth indicator — replaces the loud on-canvas depth gauge bar.
          Studio aesthetic: a thin teal fill, not a red gradient. Mounted at 0
          too, so the instrument does not vanish while the user holds still. */}
      {typeof depth === 'number' && (
        <div className="hud-block hud-depth" aria-label="Rep depth">
          <span className="hud-label">Depth</span>
          <span className="hud-depth__bar" aria-hidden="true">
            <span
              className="hud-depth__fill"
              style={{ width: `${Math.min(100, Math.round(depth * 100))}%` }}
            />
          </span>
        </div>
      )}
      {/* Shared form warning row — previously nested inside the depth block, so
          it disappeared whenever depth read 0. */}
      {warnings && warnings.length > 0 && (
        <div className="hud-warning-strip" role="status" aria-live="polite" title={warnings[0]}>
          {readableFormWarning(warnings[0])}
        </div>
      )}
      {/* Instrument cluster — studio register only. The meter face mounts when
          the session feeds live signals; the pain exit is always gentle,
          never an error. */}
      {studio && (read || onPainExit) && (
        <div className="hud-instrument">
          {read && <ReadGauge needle={read.needle} level={read.level} />}
          {onPainExit && (
            <button type="button" className="hud-pain-exit" onClick={onPainExit}>
              It hurts — stop
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface RepFeedbackProps {
  show: boolean;
  count: number;
}

/** Shared rep-beat copy — the desktop full-screen flash and the mobile
 *  milestone chip say the same thing at the same reps. */
export function repMilestoneMessage(count: number, studio: boolean): string {
  if (studio) {
    if (count % 10 === 0) return 'Strong set';
    if (count % 5 === 0) return 'Solid form';
    return 'Good';
  }
  if (count % 10 === 0) return 'UNSTOPPABLE!';
  if (count % 5 === 0) return 'GREAT FORM!';
  return 'NICE!';
}

export const RepFeedbackOverlay: React.FC<RepFeedbackProps> = ({ show, count }) => {
  const { register } = useSessionIntent();
  const studio = register !== 'arcade';

  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center ${zIndexClasses.overlayFeedback} pointer-events-none`}
      style={{ transform: 'translate3d(0, 0, 10px)' }}
      data-register={register}
    >
      <div
        className={
          studio
            ? 'motion-rep bg-teal-950/70 backdrop-blur-md rounded-2xl px-8 py-6 flex flex-col items-center gap-2 border border-teal-400/40 shadow-[0_0_24px_rgba(45,212,191,0.2)]'
            : 'motion-rep bg-[#241503]/90 backdrop-blur-md rounded-none px-8 py-6 flex flex-col items-center gap-2 border-2 border-[#fcb131]/70 shadow-[0_0_30px_rgba(252,177,49,0.35)]'
        }
      >
        <span
          className={
            studio
              ? 'text-6xl font-semibold text-teal-50 tabular-nums'
              : 'text-8xl font-black text-[#ffd97a] drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
          }
        >
          {count}
        </span>
        <span
          className={
            studio
              ? 'text-sm font-medium text-teal-100/90 tracking-wide'
              : 'text-xl font-black text-[#fcb131] tracking-widest uppercase drop-shadow-md'
          }
        >
          {repMilestoneMessage(count, studio)}
        </span>
      </div>
    </div>
  );
};
