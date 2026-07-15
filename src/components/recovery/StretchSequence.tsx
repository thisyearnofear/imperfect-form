'use client';

import React, { useEffect, useState } from 'react';
import { getStretches } from '@/lib/recovery/recoveryContent';

/**
 * Guided stretch sequence (recovery register): timed stretches matched to
 * the exercise just performed, with a soft teal progress ring and calm cues.
 */

interface StretchSequenceProps {
  mode: string;
  onComplete: () => void;
}

const StretchSequence: React.FC<StretchSequenceProps> = ({ mode, onComplete }) => {
  const stretches = getStretches(mode);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(stretches[0]?.seconds ?? 20);
  const done = index >= stretches.length;
  const current = stretches[index];

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
        <div className="text-4xl">🌿</div>
        <p className="text-sm font-light tracking-wide text-teal-100">
          Recovery complete. Your muscles thank you.
        </p>
        <button
          onClick={onComplete}
          className="px-6 py-2 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-100 text-xs font-medium hover:bg-teal-500/30 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  const progress = current ? 1 - remaining / current.seconds : 0;

  return (
    <div className="flex flex-col items-center gap-4 py-6 font-sans">
      <div className="text-4xl" aria-hidden>
        {current.emoji}
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-light tracking-[0.2em] uppercase text-teal-100">
          {current.name}
        </p>
        <p className="text-[10px] font-mono text-teal-300/60">
          {index + 1} of {stretches.length} · {remaining}s
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-teal-400/60 transition-all duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="text-xs font-light text-teal-100/70 text-center max-w-[240px] leading-relaxed">
        {current.cue}
      </p>

      <button
        onClick={() => {
          setIndex((i) => i + 1);
          setRemaining(stretches[index + 1]?.seconds ?? 20);
        }}
        className="text-[10px] text-teal-300/50 hover:text-teal-200 transition-colors"
      >
        skip →
      </button>
    </div>
  );
};

export default StretchSequence;
