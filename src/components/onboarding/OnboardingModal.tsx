'use client';

import React, { useState } from 'react';
import { Activity, Trophy, Zap, ChevronRight, X } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING STEPS
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = [
  {
    icon: Activity,
    title: 'AI-Powered Fitness',
    description:
      'Your camera detects push-ups and squats in real time using pose estimation. No wearables needed — just you and your device.',
    accent: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
  },
  {
    icon: Trophy,
    title: 'Compete On-Chain',
    description:
      'Every rep can be saved to a blockchain leaderboard. Race ghost replays of top performers and climb the ranks.',
    accent: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
  },
  {
    icon: Zap,
    title: 'Level Up Daily',
    description:
      'Earn XP, complete daily quests, unlock achievements, and track your progress on the roadmap. Your streak keeps you coming back.',
    accent: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Imperfect Form"
    >
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
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
                i <= step ? 'bg-yellow-400' : 'bg-zinc-700'
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
            <h2 className="text-xl font-bold text-white">{current.title}</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">{current.description}</p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-2">
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl transition-colors text-sm"
              aria-label={isLast ? 'Get started' : 'Next step'}
            >
              {isLast ? 'Get Started' : 'Next'}
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            {!isLast && (
              <button
                onClick={handleSkip}
                className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Skip tutorial"
              >
                Skip tutorial
              </button>
            )}
          </div>
        </div>

        {/* Step counter */}
        <div className="pb-4 text-center">
          <span className="text-xs text-zinc-600">
            {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
