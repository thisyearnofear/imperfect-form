'use client';

import React, { useState } from 'react';
import BreathingCooldown from './BreathingCooldown';
import StretchSequence from './StretchSequence';

/**
 * Recovery register surface.
 * - card: post-workout SummaryModal (night studio glass)
 * - panel: Breathe intent foyer inside #screen (Calm register, light)
 */

type ActiveRecovery = 'breathe' | 'stretch' | null;

interface RecoveryCardProps {
  mode: string;
  variant?: 'card' | 'panel';
  onDismiss?: () => void;
}

const RecoveryCard: React.FC<RecoveryCardProps> = ({ mode, variant = 'card', onDismiss }) => {
  const [active, setActive] = useState<ActiveRecovery>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const panel = variant === 'panel';
  const tone = panel ? 'light' : 'dark';

  const finish = (kind: 'breathe' | 'stretch') => {
    setCompleted((prev) => new Set(prev).add(kind));
    setActive(null);
    // Panel stays open so they can stretch next or dismiss via ✕ / Clear
  };

  return (
    <div
      className={
        panel
          ? 'h-full w-full flex flex-col justify-center rounded-none border-0 bg-transparent p-4 text-left'
          : 'rounded-2xl border border-teal-500/20 bg-teal-500/5 backdrop-blur-sm p-4 text-left shadow-[0_0_20px_rgba(45,212,191,0.08)]'
      }
      data-testid={panel ? 'calm-session-panel' : 'recovery-card'}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.25em] font-sans ${
            panel ? 'text-teal-700/80' : 'text-teal-300/80'
          }`}
        >
          {panel ? 'Calm' : 'Cool Down'}
        </span>
        {(active !== null || panel) && (
          <button
            onClick={() => {
              if (panel && onDismiss) onDismiss();
              else setActive(null);
            }}
            className={
              panel
                ? 'text-slate-400 hover:text-slate-600 text-xs transition-colors'
                : 'text-teal-300/50 hover:text-teal-200 text-xs transition-colors'
            }
            aria-label="Close session"
          >
            ✕
          </button>
        )}
      </div>

      {active === 'breathe' && (
        <BreathingCooldown tone={tone} onComplete={() => finish('breathe')} />
      )}
      {active === 'stretch' && (
        <StretchSequence mode={mode} tone={tone} onComplete={() => finish('stretch')} />
      )}

      {active === null && (
        <div className="mt-3 space-y-2 font-sans">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActive('breathe')}
              className={
                panel
                  ? 'flex flex-col items-center gap-1 rounded-xl border border-teal-600/20 bg-white/70 hover:bg-white p-3 transition-colors'
                  : 'flex flex-col items-center gap-1 rounded-xl border border-teal-400/20 bg-white/5 hover:bg-teal-500/10 p-3 transition-colors'
              }
            >
              <span className="text-xl" aria-hidden>
                {completed.has('breathe') ? '✓' : '🌬️'}
              </span>
              <span className={`text-xs font-light ${panel ? 'text-teal-900' : 'text-teal-100'}`}>
                Breathe
              </span>
              <span className={`text-[10px] ${panel ? 'text-slate-500' : 'text-teal-300/50'}`}>
                4 breaths · 30s
              </span>
            </button>
            <button
              onClick={() => setActive('stretch')}
              className={
                panel
                  ? 'flex flex-col items-center gap-1 rounded-xl border border-teal-600/20 bg-white/70 hover:bg-white p-3 transition-colors'
                  : 'flex flex-col items-center gap-1 rounded-xl border border-teal-400/20 bg-white/5 hover:bg-teal-500/10 p-3 transition-colors'
              }
            >
              <span className="text-xl" aria-hidden>
                {completed.has('stretch') ? '✓' : '🧘'}
              </span>
              <span className={`text-xs font-light ${panel ? 'text-teal-900' : 'text-teal-100'}`}>
                Stretch
              </span>
              <span className={`text-[10px] ${panel ? 'text-slate-500' : 'text-teal-300/50'}`}>
                3 moves · 1 min
              </span>
            </button>
          </div>
          <p
            className={`text-[10px] font-light text-center ${
              panel ? 'text-slate-500' : 'text-teal-100/40'
            }`}
          >
            optional — take a minute to recover
          </p>
        </div>
      )}
    </div>
  );
};

export default RecoveryCard;
