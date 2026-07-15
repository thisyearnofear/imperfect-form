'use client';

import React, { useState } from 'react';
import BreathingCooldown from './BreathingCooldown';
import StretchSequence from './StretchSequence';

/**
 * The recovery register's home in the post-workout flow ("night studio"):
 * a calm teal glass card offering an optional breathing cooldown or stretch
 * sequence. Both are skippable - recovery is an invitation, not a gate.
 */

type ActiveRecovery = 'breathe' | 'stretch' | null;

interface RecoveryCardProps {
  mode: string;
}

const RecoveryCard: React.FC<RecoveryCardProps> = ({ mode }) => {
  const [active, setActive] = useState<ActiveRecovery>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const finish = (kind: 'breathe' | 'stretch') => {
    setCompleted((prev) => new Set(prev).add(kind));
    setActive(null);
  };

  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 backdrop-blur-sm p-4 text-left shadow-[0_0_20px_rgba(45,212,191,0.08)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-teal-300/80 font-sans">
          Cool Down
        </span>
        {active !== null && (
          <button
            onClick={() => setActive(null)}
            className="text-teal-300/50 hover:text-teal-200 text-xs transition-colors"
            aria-label="Close cooldown"
          >
            ✕
          </button>
        )}
      </div>

      {active === 'breathe' && <BreathingCooldown onComplete={() => finish('breathe')} />}
      {active === 'stretch' && <StretchSequence mode={mode} onComplete={() => finish('stretch')} />}

      {active === null && (
        <div className="mt-3 space-y-2 font-sans">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActive('breathe')}
              className="flex flex-col items-center gap-1 rounded-xl border border-teal-400/20 bg-white/5 hover:bg-teal-500/10 p-3 transition-colors"
            >
              <span className="text-xl" aria-hidden>
                {completed.has('breathe') ? '✓' : '🌬️'}
              </span>
              <span className="text-xs font-light text-teal-100">Breathe</span>
              <span className="text-[10px] text-teal-300/50">4 breaths · 30s</span>
            </button>
            <button
              onClick={() => setActive('stretch')}
              className="flex flex-col items-center gap-1 rounded-xl border border-teal-400/20 bg-white/5 hover:bg-teal-500/10 p-3 transition-colors"
            >
              <span className="text-xl" aria-hidden>
                {completed.has('stretch') ? '✓' : '🧘'}
              </span>
              <span className="text-xs font-light text-teal-100">Stretch</span>
              <span className="text-[10px] text-teal-300/50">3 moves · 1 min</span>
            </button>
          </div>
          <p className="text-[10px] font-light text-teal-100/40 text-center">
            optional — take a minute to recover
          </p>
        </div>
      )}
    </div>
  );
};

export default RecoveryCard;
