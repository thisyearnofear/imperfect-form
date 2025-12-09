'use client';

import React, { useEffect } from 'react';
import { designTokens } from '@/lib/designTokens';

interface InitializationScreenProps {
  onComplete: () => void;
  platform?: string;
}

export default function InitializationScreen({
  onComplete,
}: Omit<InitializationScreenProps, 'platform'>) {
  // Use design tokens for consistent branding during initialization
  const defaultAccentColor = designTokens.colors.primary;

  useEffect(() => {
    // Mark onboarding as seen and intro dialog as skipped during initialization
    // This prevents any tour or intro dialogs from showing after initialization
    if (typeof window !== 'undefined') {
      localStorage.setItem('imf_seenOnboarding_v1', '1');
      localStorage.setItem('imf_skipWalletIntro', '1');
    }

    // Complete initialization after minimal 300ms (enough for layout shift)
    const timer = setTimeout(onComplete, 300);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="imperfect-welcome-overlay">
      <div className="imperfect-welcome-content">
        <div className="welcome-animation">
          <h1 className="welcome-title">
            <span className="welcome-icon">💪</span>
          </h1>
          <h2 className="app-title">Imperfect Form</h2>
          <p className="beauty-text">Beauty is imperfection.</p>
        </div>
      </div>

      <style jsx>{`
        .imperfect-welcome-overlay {
          position: fixed;
          inset: 0;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .imperfect-welcome-content {
          text-align: center;
          color: #fff;
          padding: 2rem;
        }

        .welcome-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .welcome-title {
          font-size: 3rem;
          margin: 0;
        }

        .app-title {
          font-family: 'PressStart2P', monospace;
          font-size: clamp(1rem, 3vw, 1.5rem);
          margin: 0;
          background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .beauty-text {
          font-size: 0.9rem;
          color: #ccc;
          margin: 0;
        }

        @media (max-width: 768px) {
          .imperfect-welcome-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
