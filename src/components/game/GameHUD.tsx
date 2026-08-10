import React from 'react';
import { useImmersive } from '@/hooks/useImmersive';
import { useSessionIntent } from '@/hooks/useSessionIntent';

interface GameHUDProps {
  mode: string;
  timeLeft: number;
  repCount: number;
  formatTime: (sec: number) => string;
  isOverlay?: boolean;
  isRace?: boolean;
  /** Biomechanical depth (0–1) for the quiet depth indicator. */
  depth?: number;
  /** Form warnings — surfaced as a subtle cue, not a red box. */
  warnings?: string[];
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  timeLeft,
  repCount,
  formatTime,
  isOverlay = true,
  isRace = false,
  depth,
  warnings,
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
    if (timeLeft > 0 && timeLeft < 120) {
      setPulse(1.05);
      const t = setTimeout(() => setPulse(1), 100);
      return () => clearTimeout(t);
    }
  }, [timeLeft]);

  // Studio: quieter pulse — clinical density, not arcade bounce
  const repScale = studio ? 1 : (1 + Math.min(repCount * 0.005, 0.2)) * pulse;

  return (
    <div
      className={`game-hud-container ${isOverlay ? 'hud-overlay-fs' : ''}`}
      data-register={register}
    >
      {isRace && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30">
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
      )}

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

export const RepFeedbackOverlay: React.FC<RepFeedbackProps> = ({ show, count }) => {
  const { register } = useSessionIntent();
  const studio = register !== 'arcade';

  if (!show) return null;

  const getFeedbackMessage = (c: number) => {
    if (studio) {
      if (c % 10 === 0) return 'Strong set';
      if (c % 5 === 0) return 'Solid form';
      return 'Good';
    }
    if (c % 10 === 0) return 'UNSTOPPABLE!';
    if (c % 5 === 0) return 'GREAT FORM!';
    return 'NICE!';
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[85] pointer-events-none"
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
          {getFeedbackMessage(count)}
        </span>
      </div>
    </div>
  );
};
