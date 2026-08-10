'use client';

import React from 'react';
import { CountUp } from '@/components/ui/CountUp';

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
          <span className="text-xl font-bold text-[var(--studio-paper-soft)]">
            Lvl {currentLevel}
          </span>
          <span className="text-[11px] text-[var(--studio-muted)] uppercase tracking-widest font-mono">
            Progress
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-[var(--sandow-brass)] font-mono">
            <CountUp to={Math.floor(progress * 100)} />%
          </span>
          <div className="text-[11px] text-[var(--studio-muted)] uppercase font-mono">
            {xpToNextLevel} XP to lvl {currentLevel + 1}
          </div>
        </div>
      </div>

      {/* earned-xp-track / earned-xp-fill — sandow-spine brass fill on a teal
          rail. Rail height (0.55rem) comes from the class so it matches the
          earned shell; w-full stretches it to the card. */}
      <div
        className="earned-xp-track w-full"
        role="progressbar"
        aria-valuenow={Math.floor(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`XP progress: ${Math.floor(progress * 100)}% to level ${currentLevel + 1}`}
      >
        <div className="earned-xp-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
};
