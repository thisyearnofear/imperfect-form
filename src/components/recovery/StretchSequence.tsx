'use client';

import React, { useEffect, useState } from 'react';
import { Check, PersonStanding } from 'lucide-react';
import { getStretches } from '@/lib/recovery/recoveryContent';

/**
 * Guided stretch sequence (recovery register): timed stretches matched to
 * the exercise just performed. Dark = post-workout modal; light = Calm panel.
 */

interface StretchSequenceProps {
  mode: string;
  onComplete: () => void;
  tone?: 'dark' | 'light';
}

const StretchSequence: React.FC<StretchSequenceProps> = ({ mode, onComplete, tone = 'dark' }) => {
  const stretches = getStretches(mode);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(stretches[0]?.seconds ?? 20);
  const done = index >= stretches.length;
  const current = stretches[index];
  const light = tone === 'light';

  useEffect(() => {
    if (done) return;
    if (remaining <= 0) {
      setIndex((i) => i + 1);
      setRemaining(stretches[index + 1]?.seconds ?? 20);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, done, index, stretches]);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 py-6 font-sans">
        <div className="recovery-card__completion" aria-hidden="true">
          <Check size={24} />
        </div>
        <p
          className={`text-sm font-light tracking-wide ${light ? 'text-slate-600' : 'text-teal-100'}`}
        >
          Recovery complete. Your muscles thank you.
        </p>{' '}
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
      </div>
    );
  }

  const progress = current ? 1 - remaining / current.seconds : 0;

  return (
    <div className="flex flex-col items-center gap-4 py-6 font-sans">
      <div className="recovery-card__movement-mark" aria-hidden="true">
        <PersonStanding size={24} />
      </div>
      <div className="text-center space-y-1">
        <p
          className={`text-base font-light tracking-[0.2em] uppercase ${
            light ? 'text-teal-800' : 'text-teal-100'
          }`}
        >
          {current.name}
        </p>
        <p className={`text-[10px] font-mono ${light ? 'text-teal-600/70' : 'text-teal-300/60'}`}>
          {index + 1} of {stretches.length} · {remaining}s
        </p>
      </div>

      <div
        className={`w-48 h-1.5 rounded-full overflow-hidden ${light ? 'bg-teal-900/10' : 'bg-white/10'}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear motion-reduce:transition-none ${
            light ? 'bg-teal-600/70' : 'bg-teal-400/60'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p
        className={`text-xs font-light text-center max-w-[240px] leading-relaxed ${
          light ? 'text-slate-600' : 'text-teal-100/70'
        }`}
      >
        {current.cue}
      </p>

      <button
        type="button"
        onClick={() => {
          setIndex((i) => i + 1);
          setRemaining(stretches[index + 1]?.seconds ?? 20);
        }}
        className={
          light
            ? 'text-[10px] text-slate-400 hover:text-teal-700 transition-colors'
            : 'text-[10px] text-teal-300/50 hover:text-teal-200 transition-colors'
        }
      >
        skip →
      </button>
    </div>
  );
};

export default StretchSequence;
