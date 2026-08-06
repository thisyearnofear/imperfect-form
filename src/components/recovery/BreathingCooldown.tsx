'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { RECOVERY_AFFIRMATIONS } from '@/lib/recovery/recoveryContent';

/**
 * Guided breathing cooldown (recovery register): a soft teal circle that
 * swells on a 4s inhale and settles on a 4s exhale, with rotating
 * affirmations. Dark = post-workout modal; light = Calm / Breathe intent panel.
 */

const INHALE_MS = 4000;
const EXHALE_MS = 4000;
const TOTAL_BREATHS = 4;

interface BreathingCooldownProps {
  onComplete: () => void;
  /** light = Calm foyer panel; dark = night-studio SummaryModal (default) */
  tone?: 'dark' | 'light';
}

const BreathingCooldown: React.FC<BreathingCooldownProps> = ({ onComplete, tone = 'dark' }) => {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [breaths, setBreaths] = useState(0);
  const done = breaths >= TOTAL_BREATHS;
  const light = tone === 'light';

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(
      () => {
        if (phase === 'inhale') {
          setPhase('exhale');
        } else {
          setBreaths((b) => b + 1);
          setPhase('inhale');
        }
      },
      phase === 'inhale' ? INHALE_MS : EXHALE_MS
    );
    return () => clearTimeout(timer);
  }, [phase, done]);

  const affirmation = RECOVERY_AFFIRMATIONS[breaths % RECOVERY_AFFIRMATIONS.length];

  return (
    <div className="flex flex-col items-center gap-5 py-6 font-sans">
      {done ? (
        <>
          <div className="recovery-card__completion" aria-hidden="true">
            <Check size={24} />
          </div>
          <p
            className={`text-sm font-light tracking-wide ${light ? 'text-slate-600' : 'text-teal-100'}`}
          >
            Well done. Breathe easy.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className={
              light
                ? 'px-6 py-2 rounded-full bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors'
                : 'px-6 py-2 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-100 text-xs font-medium hover:bg-teal-500/30 transition-colors'
            }
          >
            Done
          </button>
        </>
      ) : (
        <>
          <div className="relative flex items-center justify-center h-44 w-44">
            <div
              className={`absolute h-36 w-36 rounded-full blur-2xl transition-transform ease-in-out motion-reduce:transition-none ${
                light ? 'bg-teal-400/25' : 'bg-teal-400/10'
              }`}
              style={{
                transform: phase === 'inhale' ? 'scale(1.35)' : 'scale(0.8)',
                transitionDuration: `${phase === 'inhale' ? INHALE_MS : EXHALE_MS}ms`,
              }}
            />
            <div
              className={`h-28 w-28 rounded-full border transition-transform ease-in-out motion-reduce:transition-none ${
                light
                  ? 'bg-teal-500/15 border-teal-600/25 shadow-[0_0_30px_rgba(13,148,136,0.2)]'
                  : 'bg-teal-400/20 border-teal-300/30 shadow-[0_0_30px_rgba(45,212,191,0.25)]'
              }`}
              style={{
                transform: phase === 'inhale' ? 'scale(1.25)' : 'scale(0.75)',
                transitionDuration: `${phase === 'inhale' ? INHALE_MS : EXHALE_MS}ms`,
              }}
            />
          </div>

          <div className="text-center space-y-1">
            <p
              className={`text-base font-light tracking-[0.3em] uppercase ${
                light ? 'text-teal-800' : 'text-teal-100'
              }`}
            >
              {phase === 'inhale' ? 'Breathe In' : 'Release'}
            </p>
            <p
              className={`text-[10px] font-mono ${light ? 'text-teal-600/70' : 'text-teal-300/60'}`}
            >
              breath {Math.min(breaths + 1, TOTAL_BREATHS)} of {TOTAL_BREATHS}
            </p>
          </div>

          <p
            className={`text-xs italic font-light text-center max-w-[220px] ${
              light ? 'text-slate-500' : 'text-teal-100/60'
            }`}
          >
            {affirmation}
          </p>
        </>
      )}
    </div>
  );
};

export default BreathingCooldown;
