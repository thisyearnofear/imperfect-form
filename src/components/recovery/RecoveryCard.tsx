'use client';

import React, { useState } from 'react';
import { Check, Wind, X, PersonStanding } from 'lucide-react';
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
          : 'studio-card studio-card__body text-left'
      }
      data-testid={panel ? 'calm-session-panel' : 'recovery-card'}
    >
      <div className="recovery-card__header flex items-center justify-between">
        <div>
          <span
            className={`recovery-card__eyebrow text-[10px] font-medium uppercase tracking-[0.25em] font-sans ${
              panel ? 'text-teal-700/80' : 'text-teal-300/80'
            }`}
          >
            {panel ? 'Calm' : 'Cool Down'}
          </span>
          <p className={`recovery-card__title ${panel ? 'text-slate-800' : 'text-teal-50'}`}>
            Leave the session better than you found it.
          </p>
        </div>
        {(active !== null || panel) && (
          <button
            type="button"
            onClick={() => {
              if (panel && onDismiss) onDismiss();
              else setActive(null);
            }}
            className={`recovery-card__close ${
              panel ? 'text-slate-400 hover:text-slate-600' : 'text-teal-300/50 hover:text-teal-200'
            }`}
            aria-label="Close session"
          >
            <X size={15} aria-hidden="true" />
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
          <div className="recovery-card__options grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActive('breathe')}
              className={`recovery-card__option ${
                panel ? 'recovery-card__option--light' : 'recovery-card__option--dark'
              }`}
            >
              <span className="recovery-card__option-icon" aria-hidden="true">
                {completed.has('breathe') ? <Check size={18} /> : <Wind size={20} />}
              </span>
              <span className={`text-xs font-light ${panel ? 'text-teal-900' : 'text-teal-100'}`}>
                Breathe
              </span>
              <span className={`text-[10px] ${panel ? 'text-slate-500' : 'text-teal-300/50'}`}>
                4 breaths · 30s
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActive('stretch')}
              className={`recovery-card__option ${
                panel ? 'recovery-card__option--light' : 'recovery-card__option--dark'
              }`}
            >
              <span className="recovery-card__option-icon" aria-hidden="true">
                {completed.has('stretch') ? <Check size={18} /> : <PersonStanding size={20} />}
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
            className={`recovery-card__note text-[10px] font-light text-center ${
              panel ? 'text-slate-500' : 'text-teal-100/40'
            }`}
          >
            optional · take a minute to recover
          </p>
        </div>
      )}
    </div>
  );
};

export default RecoveryCard;
