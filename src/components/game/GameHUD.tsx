import React from 'react';

interface GameHUDProps {
  mode: string;
  timeLeft: number;
  repCount: number;
  formatTime: (sec: number) => string;
  isOverlay?: boolean;
  isRace?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  timeLeft,
  repCount,
  formatTime,
  isOverlay = true,
  isRace = false,
}) => {
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

  const repScale = (1 + Math.min(repCount * 0.005, 0.2)) * pulse;

  return (
    <div className={`game-hud-container ${isOverlay ? 'hud-overlay-fs' : ''}`}>
      {/* Race/Ghost Challenge Badge */}
      {isRace && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-gradient-to-r from-[primary] via-[#f59e0b] to-[#ea580c] px-6 py-2 rounded-b-2xl shadow-[0_4px_20px_rgba(252,177,49,0.6)] border-x-2 border-b-2 border-white/40 animate-pulse">
            <span className="text-[12px] font-black text-black tracking-[0.25em] uppercase flex items-center gap-3">
              <span className="animate-bounce">🏁</span>
              <span className="drop-shadow-sm">RACING</span>
              <span className="animate-bounce">🏁</span>
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
        <span className="hud-value text-yellow-500">{formatTime(timeLeft)}</span>
      </div>
      <div
        className="hud-block reps"
        style={{
          transform: `scale(${repScale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <span className="hud-label">Reps</span>
        <span className="hud-value text-blue-400">{repCount}</span>
      </div>
    </div>
  );
};

interface RepFeedbackProps {
  show: boolean;
  count: number;
}

export const RepFeedbackOverlay: React.FC<RepFeedbackProps> = ({ show, count }) => {
  if (!show) return null;

  // Determine feedback message based on count milestones
  const getFeedbackMessage = (c: number) => {
    if (c % 10 === 0) return 'UNSTOPPABLE! 🔥';
    if (c % 5 === 0) return 'GREAT FORM! 💪';
    return 'NICE! ✨';
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[85] pointer-events-none"
      style={{ transform: 'translate3d(0, 0, 10px)' }}
    >
      <div className="bg-green-500/30 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center gap-2 border-2 border-green-400/50 animate-bounce shadow-[0_0_30px_rgba(34,197,94,0.4)]">
        <span className="text-8xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {count}
        </span>
        <span className="text-xl font-black text-green-100 tracking-widest uppercase drop-shadow-md">
          {getFeedbackMessage(count)}
        </span>
      </div>
    </div>
  );
};
