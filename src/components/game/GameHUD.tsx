import React from 'react';

interface GameHUDProps {
  mode: string;
  timeLeft: number;
  repCount: number;
  formatTime: (sec: number) => string;
  isOverlay?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  timeLeft,
  repCount,
  formatTime,
  isOverlay = true,
}) => {
  return (
    <div
      className={`${
        isOverlay
          ? 'absolute top-4 left-0 right-0 z-50 pointer-events-none'
          : 'w-full flex justify-center items-center gap-3 py-2 z-10 relative'
      } flex justify-center items-start gap-3`}
      style={isOverlay ? { transform: 'translate3d(0, 0, 10px)' } : undefined}
    >
      <div className="timer bg-black/90 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-yellow-500 shadow-[0_0_15px_rgba(252,177,49,0.3)] flex flex-col items-center">
        <span className="text-[9px] uppercase text-yellow-500 font-black tracking-widest">
          {mode}
        </span>
        <span className="text-xl font-black font-mono tracking-tighter text-white">
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="rep-counter-container bg-black/90 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex flex-col items-center">
        <span className="text-[9px] uppercase text-blue-400 font-black tracking-widest">Reps</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{repCount}</span>
        </div>
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

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-[85] pointer-events-none"
      style={{ transform: 'translate3d(0, 0, 10px)' }}
    >
      <div className="bg-green-500/30 backdrop-blur-sm rounded-full p-8 animate-bounce">
        <span className="text-6xl font-black text-white drop-shadow-lg">+{count}</span>
      </div>
    </div>
  );
};
