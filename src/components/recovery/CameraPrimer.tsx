'use client';

import React from 'react';

/**
 * Calm-register camera permission primer ("night studio").
 *
 * Shown before the browser's camera prompt on first use: builds trust with
 * plain language about on-device processing before the scary system dialog
 * appears. Readable sans type, teal glass, nothing shouting.
 */

interface CameraPrimerProps {
  onEnable: () => void;
  onCancel: () => void;
}

const REASSURANCES = [
  { emoji: '📱', text: 'Form analysis runs entirely on your device' },
  { emoji: '🚫', text: 'No video is ever recorded or uploaded' },
  { emoji: '✋', text: 'Stop anytime — the camera turns off with your workout' },
];

const CameraPrimer: React.FC<CameraPrimerProps> = ({ onEnable, onCancel }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 h-full min-h-[320px] bg-black font-sans text-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-20 w-20 rounded-full bg-teal-400/10 blur-2xl" />
        <span className="text-4xl" aria-hidden>
          📷
        </span>
      </div>

      <div className="space-y-2 max-w-[280px]">
        <h3 className="text-base font-light tracking-wide text-teal-50">
          Your camera stays private
        </h3>
        <p className="text-xs font-light leading-relaxed text-teal-100/60">
          To count your reps and coach your form, we need to see you move.
        </p>
      </div>

      <ul className="space-y-2.5 text-left max-w-[280px]">
        {REASSURANCES.map((item) => (
          <li key={item.text} className="flex items-start gap-2.5">
            <span className="text-sm shrink-0" aria-hidden>
              {item.emoji}
            </span>
            <span className="text-xs font-light leading-relaxed text-teal-100/80">{item.text}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2 w-full max-w-[280px]">
        <button
          onClick={onEnable}
          className="w-full px-6 py-3 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-50 text-sm font-medium hover:bg-teal-500/30 shadow-[0_0_20px_rgba(45,212,191,0.15)] transition-colors"
        >
          Enable camera
        </button>
        <button
          onClick={onCancel}
          className="text-xs font-light text-teal-300/50 hover:text-teal-200 transition-colors py-1"
        >
          not now
        </button>
      </div>
    </div>
  );
};

export default CameraPrimer;

const PRIMER_SEEN_KEY = 'cameraPrimerSeen';

/**
 * True when the primer should be shown (first use). Synchronous on purpose:
 * the caller must keep fullscreen/orientation calls in the same user gesture,
 * so no awaits are allowed before them.
 */
export function shouldShowCameraPrimer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PRIMER_SEEN_KEY) !== 'true';
}

export function markCameraPrimerSeen(): void {
  window.localStorage.setItem(PRIMER_SEEN_KEY, 'true');
}
