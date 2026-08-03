import React from 'react';
import { Smartphone, RotateCcw, X } from 'lucide-react';

interface LandscapePromptProps {
  /** Called when the user dismisses the prompt */
  onDismiss?: () => void;
}

/**
 * Non-blocking landscape hint. When the orientation lock fails (iOS Safari,
 * Farcaster iframe), blocking the session is a dead-end — the user has to
 * "Continue anyway" into a portrait camera anyway. So this is a dismissible
 * toast, not a full-screen gate. The mobile GameCanvas works in portrait.
 */
export const LandscapePrompt: React.FC<LandscapePromptProps> = ({ onDismiss }) => {
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,28rem)] rounded-2xl border border-teal-400/25 bg-[#061013]/95 p-3 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <Smartphone size={28} className="text-teal-400" strokeWidth={1.5} aria-hidden="true" />
          <RotateCcw
            size={12}
            className="absolute -right-1 -top-1 text-teal-300"
            style={{ animationDuration: '2s' }}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white">Rotate for the full view</p>
          <p className="text-[11px] leading-snug text-teal-100/70">
            Landscape fits the camera better — but portrait works too.
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 rounded-full p-1.5 text-teal-200/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss landscape hint"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LandscapePrompt;
