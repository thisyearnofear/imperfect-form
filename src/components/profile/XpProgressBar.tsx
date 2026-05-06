'use client';

import React from 'react';

interface XpProgressBarProps {
  progress: number; // 0 to 1
  currentLevel: number;
  xpToNextLevel: number;
  className?: string;
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({
  progress,
  currentLevel,
  xpToNextLevel,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-end">
        <div className="flex items-baseline space-x-2">
          <span className="text-xl font-bold text-primary">Lvl {currentLevel}</span>
          <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">
            Progress
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-primary font-mono">{Math.floor(progress * 100)}%</span>
          <div className="text-[10px] text-gray-500 uppercase font-mono">
            {xpToNextLevel} XP TO LVL {currentLevel + 1}
          </div>
        </div>
      </div>

      <div
        className="h-3 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700 p-[2px]"
        role="progressbar"
        aria-valuenow={Math.floor(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`XP progress: ${Math.floor(progress * 100)}% to level ${currentLevel + 1}`}
      >
        <div
          className="h-full bg-gradient-to-r from-primary-dark to-primary rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};
