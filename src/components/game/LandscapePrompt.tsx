import React from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

interface LandscapePromptProps {
  /** Called when the user dismisses the prompt */
  onDismiss?: () => void;
}

export const LandscapePrompt: React.FC<LandscapePromptProps> = ({ onDismiss }) => {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
      aria-live="polite"
      role="dialog"
      aria-modal="true"
      aria-label="Rotate to landscape"
    >
      <div className="flex max-w-xs flex-col items-center text-center">
        <div className="relative mb-6">
          <Smartphone size={64} className="text-teal-400" strokeWidth={1.5} aria-hidden="true" />
          <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20">
            <RotateCcw
              size={18}
              className="animate-spin text-teal-300"
              style={{ animationDuration: '2s' }}
              aria-hidden="true"
            />
          </div>
        </div>

        <h2 className="mb-2 text-xl font-bold text-white">Rotate your phone</h2>
        <p className="mb-6 text-sm leading-relaxed text-teal-100/80">
          Coaching works best in landscape. Turn your device sideways for the full camera view and
          easy thumb controls.
        </p>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Continue anyway
          </button>
        )}
      </div>
    </div>
  );
};

export default LandscapePrompt;
