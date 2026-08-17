import React from 'react';
import { useImmersive } from '@/hooks/useImmersive';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { zIndexClasses } from '@/lib/zTokens';

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
}) => {
  const { register } = useSessionIntent();
  // The live HUD follows the session register: an explicit Train session keeps
  // the full cabinet (gold Press Start chrome + arcade copy) end to end, while
  // the studio coach keeps the quiet teal instrument look. The register is
  // preserved through the session, so this never flips mid-workout.
  const studio = register !== 'arcade';
  const { immersive } = useImmersive();

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

  // Studio: quieter pulse — clinical density, not arcade bounce
  const repScale = studio ? 1 : (1 + Math.min(repCount * 0.005, 0.2)) * pulse;

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
    const milestone = repPulse && repCount > 0 && repCount % 5 === 0;
    return (
      <div
        className={`game-hud-container game-hud-container--compact ${isOverlay ? 'hud-overlay-fs' : ''}`}
        data-register={register}
      >
        {raceBannerEl}
        <div className="hud-pill">
          <span className="hud-label hud-pill__label">{mode}</span>
          <span
            className={`hud-value hud-pill__time ${studio ? 'text-teal-300' : 'text-yellow-500'}`}
          >
            {formatTime(timeLeft)}
          </span>
          <span className="hud-pill__divider" aria-hidden="true">
            ·
          </span>
          <span
            key={repCount}
            className={`hud-value motion-rep hud-pill__rep ${studio ? 'text-teal-200' : 'text-yellow-500'}${repPulse ? ' hud-pill__rep--flash' : ''}`}
          >
            {repCount}
          </span>
          <span className="hud-label hud-pill__label">
            {studio ? (immersive ? 'Graded' : 'Reps') : 'Score'}
          </span>
        </div>
        {milestone && (
          <div className="hud-milestone" role="status" aria-live="polite">
            {repMilestoneMessage(repCount, studio)}
          </div>
        )}
        {typeof depth === 'number' && depth > 0 && (
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
        <span className={`hud-value ${studio ? 'text-teal-300' : 'text-yellow-500'}`}>
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
          key={repCount}
          className={`hud-value motion-rep sandow-gauge__value ${studio ? 'text-teal-200' : 'text-yellow-500'}`}
        >
          {repCount}
        </span>
      </div>

      {/* Quiet depth indicator — replaces the loud on-canvas depth gauge bar.
          Studio aesthetic: a thin teal fill, not a red gradient. */}
      {typeof depth === 'number' && depth > 0 && (
        <div className="hud-block hud-depth" aria-label="Rep depth">
          <span className="hud-label">Depth</span>
          <span className="hud-depth__bar" aria-hidden="true">
            <span
              className="hud-depth__fill"
              style={{ width: `${Math.min(100, Math.round(depth * 100))}%` }}
            />
          </span>
          {warnings && warnings.length > 0 && (
            <span className="hud-depth__warn" title={warnings[0]}>
              {warnings[0]}
            </span>
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
