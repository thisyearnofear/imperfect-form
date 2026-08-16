'use client';

import React, { useState } from 'react';
import { Eye, Hand, Sparkles, ChevronRight, X } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { BRAND, ONBOARDING_STEPS } from '@/lib/brandPositioning';

/**
 * First-touch surface — calm "night studio" register.
 * Beats follow brand positioning: understand → show → progress (crafted play).
 * Never leads with XP, wallets, or chain.
 */

const STEP_UI = [
  {
    icon: Eye,
    accent: 'text-teal-300',
    bg: 'bg-teal-400/10',
    border: 'border-teal-400/20',
  },
  {
    icon: Hand,
    accent: 'text-amber-300',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    icon: Sparkles,
    // Studio brass, not violet — the design lock names yellow/violet Tailwind
    // accents as the "second app" anti-pattern (design.md).
    accent: 'text-amber-200',
    bg: 'bg-amber-300/10',
    border: 'border-amber-300/20',
  },
] as const;

interface OnboardingModalProps {
  onComplete?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const { hasSeen, markSeen } = useOnboarding();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (hasSeen || dismissed) return null;

  const copy = ONBOARDING_STEPS[step];
  const ui = STEP_UI[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const Icon = ui.icon;

  const finish = () => {
    markSeen();
    setDismissed(true);
    onComplete?.();
  };

  const handleNext = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={`Welcome to ${BRAND.name}`}
    >
      <div className="relative w-full max-w-sm bg-teal-500/5 border border-teal-500/20 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(45,212,191,0.1)] animate-slide-up">
        <button
          onClick={finish}
          className="absolute top-3 right-3 p-1.5 rounded-full text-teal-300/40 hover:text-teal-200 hover:bg-white/5 transition-colors"
          aria-label="Skip onboarding"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-6 pb-0 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-teal-300/50 font-medium">
            {BRAND.name}
          </p>
          <div className="flex gap-1.5">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={ONBOARDING_STEPS[i].id}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-teal-400/70' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className={`p-4 rounded-2xl ${ui.bg} border ${ui.border}`}>
            <Icon size={36} className={ui.accent} aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-light tracking-wide text-teal-50">{copy.title}</h2>
            <p className="text-sm font-light text-teal-100/60 leading-relaxed">
              {copy.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-2">
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-50 text-sm font-medium hover:bg-teal-500/30 transition-colors"
              aria-label={isLast ? 'Get started' : 'Next step'}
            >
              {isLast ? 'Begin' : 'Next'}
              <ChevronRight size={16} aria-hidden="true" />
            </button>

            {!isLast && (
              <button
                onClick={finish}
                className="w-full py-2 text-xs font-light text-teal-300/40 hover:text-teal-200 transition-colors"
                aria-label="Skip tutorial"
              >
                skip
              </button>
            )}
          </div>
        </div>

        <div className="pb-4 text-center">
          <span className="text-xs font-light text-teal-300/30">
            {step + 1} of {ONBOARDING_STEPS.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
