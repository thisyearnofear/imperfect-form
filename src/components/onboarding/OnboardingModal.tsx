'use client';

import React, { useState } from 'react';
import { Activity, Trophy, Zap, ChevronRight, X } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING STEPS
//
// First-touch surface, calm register ("night studio"): readable, unhurried,
// trust-first. Each step's accent previews one of the app's three registers -
// teal (recovery/trust), gold (arcade), purple (lab).
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  {
    icon: Activity,
    title: 'Your camera coaches you',
    description:
      'Push-ups and squats are counted in real time using pose detection that runs entirely on your device. No video is recorded or uploaded — no wearables, just you.',
    accent: 'text-teal-300',
    bg: 'bg-teal-400/10',
    border: 'border-teal-400/20',
  },
  {
    icon: Trophy,
    title: 'Compete when you want to',
    description:
      'Save reps to on-chain leaderboards, race ghost replays of top performers, and climb the ranks — or just train for yourself.',
    accent: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
  },
  {
    icon: Zap,
    title: 'Grow a little every day',
    description:
      'Earn XP, complete daily quests, unlock achievements, and get AI form analysis after each session. Your streak keeps you honest.',
    accent: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING MODAL
// ═══════════════════════════════════════════════════════════════════════════

interface OnboardingModalProps {
  onComplete?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { hasSeen, markSeen } = useOnboarding();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (hasSeen || dismissed) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      markSeen();
      setDismissed(true);
      onComplete?.();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    markSeen();
    setDismissed(true);
    onComplete?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Imperfect Form"
    >
      <div className="relative w-full max-w-sm bg-teal-500/5 border border-teal-500/20 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(45,212,191,0.1)] animate-slide-up">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 rounded-full text-teal-300/40 hover:text-teal-200 hover:bg-white/5 transition-colors"
          aria-label="Skip onboarding"
        >
          <X size={16} />
        </button>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-6 pt-6 pb-0">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-teal-400/70' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className={`p-4 rounded-2xl ${current.bg} border ${current.border}`}>
            <Icon size={36} className={current.accent} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-light tracking-wide text-teal-50">{current.title}</h2>
            <p className="text-sm font-light text-teal-100/60 leading-relaxed">
              {current.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-2">
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-50 text-sm font-medium hover:bg-teal-500/30 transition-colors"
              aria-label={isLast ? 'Get started' : 'Next step'}
            >
              {isLast ? "Let's begin" : 'Next'}
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            {!isLast && (
              <button
                onClick={handleSkip}
                className="w-full py-2 text-xs font-light text-teal-300/40 hover:text-teal-200 transition-colors"
                aria-label="Skip tutorial"
              >
                skip
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <div className="pb-4 text-center">
          <span className="text-xs font-light text-teal-300/30">
            {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
