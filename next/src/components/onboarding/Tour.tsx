import React, { useEffect, useState } from 'react';
import { TourProvider, useTour } from '@reactour/tour';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';

// Imperfect Form Philosophy Tour Steps
const imperfectFormSteps = [
  {
    selector: '#modeSwitch',
    content: (
      <div className="imperfect-step">
        <div className="step-header">
          <span className="step-icon">📐</span>
          <h3>Choose Your Path</h3>
        </div>
        <p>
          Select your discipline - Push-ups or Squats. Each rep brings you closer to your asymptote
          of perfection.
        </p>
        <div className="step-tip">
          💡 Different movements, same journey toward less imperfection
        </div>
      </div>
    ),
  },
  {
    selector: '#startButton',
    content: (
      <div className="imperfect-step">
        <div className="step-header">
          <span className="step-icon">🎯</span>
          <h3>Begin Your Iteration</h3>
        </div>
        <p>
          Ready to measure your current form? Start your 2-minute session and embrace the process of
          improvement.
        </p>
        <div className="step-tip">
          ⚡ AI observes your movement - every rep is data toward perfection
        </div>
      </div>
    ),
  },
  {
    selector: '#wallet-connection',
    content: (
      <div className="imperfect-step">
        <div className="step-header">
          <span className="step-icon">🔗</span>
          <h3>Track Your Progress</h3>
        </div>
        <p>
          Connect your wallet to record your journey. Each session becomes part of your permanent
          record of getting less imperfect.
        </p>
        <div className="step-tip">🌐 Multi-chain progress: Base, Polygon, Celo, and Monad</div>
      </div>
    ),
  },
  {
    selector: '#submit-score-btn',
    content: (
      <div className="imperfect-step">
        <div className="step-header">
          <span className="step-icon">📈</span>
          <h3>Document Your Growth</h3>
        </div>
        <p>
          Submit your score to the eternal ledger. Compare with others on the same asymptotic
          journey toward perfection.
        </p>
        <div className="step-tip">
          🎯 Every submission: measurable progress toward your ideal form
        </div>
      </div>
    ),
  },
];

// Imperfect Form Tour Component with Philosophical Messaging
function ImperfectFormTourComponent() {
  const { setIsOpen } = useTour();

  useEffect(() => {
    // Thoughtful entrance delay
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [setIsOpen]);

  return null;
}

// Main Tour Component
export default function Tour() {
  const { markSeen } = useOnboarding();
  const { currentTheme } = useEnhancedChainTheme();
  const { palette } = currentTheme;
  const [showWelcome, setShowWelcome] = useState(true);

  // Philosophical welcome animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleTourComplete = () => {
    markSeen();
  };

  const handleTourClose = () => {
    markSeen();
  };

  // Imperfect Form Philosophy Styling
  const imperfectFormTourStyles = {
    popover: (base: any) => ({
      ...base,
      '--reactour-accent': palette.accent,
      borderRadius: '16px',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      border: `3px solid ${palette.accent}`,
      fontFamily: "'PressStart2P', monospace",
      boxShadow: `0 0 30px ${palette.accent}40, inset 0 0 20px rgba(255,255,255,0.1)`,
      backdropFilter: 'blur(10px)',
      maxWidth: '400px',
      padding: '24px',
      overflow: 'hidden',
    }),

    maskArea: (base: any) => ({
      ...base,
      rx: 12,
    }),

    maskWrapper: (base: any) => ({
      ...base,
      color: 'rgba(0,0,0,0.8)',
    }),

    badge: (base: any) => ({
      ...base,
      left: 'auto',
      right: '-12px',
      top: '-12px',
      backgroundColor: palette.accent,
      color: '#000',
      fontWeight: 'bold',
      fontSize: '14px',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      border: '2px solid #fff',
      boxShadow: `0 0 15px ${palette.accent}`,
    }),

    controls: (base: any) => ({
      ...base,
      marginTop: '20px',
      gap: '12px',
    }),

    close: (base: any) => ({
      ...base,
      right: '8px',
      top: '8px',
      backgroundColor: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      color: '#fff',
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),
  };

  if (showWelcome) {
    return (
      <div className="imperfect-welcome-overlay">
        <div className="imperfect-welcome-content">
          <div className="welcome-animation">
            <h1 className="welcome-title">
              <span className="welcome-icon">📐</span>
              Welcome to
            </h1>
            <h2 className="app-title">Imperfect Form</h2>
            <div className="welcome-subtitle">Getting less imperfect every day</div>
            <div className="philosophy-note">The asymptote towards perfection</div>
            <div className="loading-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .imperfect-welcome-overlay {
            position: fixed;
            inset: 0;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease-out;
          }

          .imperfect-welcome-content {
            text-align: center;
            color: #fff;
            max-width: 600px;
            padding: 2rem;
          }

          .welcome-animation {
            animation: slideUp 1s ease-out;
          }

          .welcome-title {
            font-family: 'PressStart2P', monospace;
            font-size: clamp(1.2rem, 4vw, 2rem);
            margin-bottom: 1rem;
            color: ${palette.accent};
            text-shadow: 0 0 20px ${palette.accent}80;
            animation: glow 2s ease-in-out infinite alternate;
          }

          .welcome-icon {
            display: block;
            font-size: 3rem;
            margin-bottom: 1rem;
            animation: pulse 2s ease-in-out infinite;
          }

          .app-title {
            font-family: 'PressStart2P', monospace;
            font-size: clamp(1rem, 3vw, 1.5rem);
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 3s ease-in-out infinite;
          }

          .welcome-subtitle {
            font-size: clamp(0.8rem, 2vw, 1rem);
            margin-bottom: 0.5rem;
            opacity: 0.9;
            animation: fadeInUp 1.5s ease-out;
            font-style: italic;
          }

          .philosophy-note {
            font-size: clamp(0.6rem, 1.5vw, 0.8rem);
            margin-bottom: 2rem;
            opacity: 0.7;
            animation: fadeInUp 2s ease-out;
            color: ${palette.accent};
          }

          .loading-rings {
            display: flex;
            justify-content: center;
            gap: 8px;
          }

          .ring {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${palette.accent};
            animation: pulse 1.5s ease-in-out infinite;
          }

          .ring-2 {
            animation-delay: 0.2s;
          }
          .ring-3 {
            animation-delay: 0.4s;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateY(50px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes glow {
            from {
              text-shadow: 0 0 20px ${palette.accent}80;
            }
            to {
              text-shadow:
                0 0 30px ${palette.accent},
                0 0 40px ${palette.accent}60;
            }
          }

          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }

          @keyframes shimmer {
            0% {
              background-position: -200% center;
            }
            100% {
              background-position: 200% center;
            }
          }

          @keyframes fadeInUp {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          /* Mobile optimizations */
          @media (max-width: 768px) {
            .imperfect-welcome-content {
              padding: 1rem;
            }
          }

          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .welcome-animation,
            .welcome-icon,
            .ring {
              animation: none;
            }

            .welcome-title {
              animation: none;
              text-shadow: 0 0 10px ${palette.accent}60;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <TourProvider
        steps={imperfectFormSteps}
        styles={imperfectFormTourStyles}
        showBadge={true}
        showCloseButton={true}
        showNavigation={true}
        showDots={true}
        scrollSmooth={true}
        disableInteraction={false}
        onClickClose={handleTourClose}
        afterOpen={(target) => {
          target?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
          });
        }}
        beforeClose={handleTourComplete}
      >
        <ImperfectFormTourComponent />
      </TourProvider>

      <style jsx global>{`
        .imperfect-step {
          font-family: 'PressStart2P', monospace;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid ${palette.accent}40;
        }

        .step-header h3 {
          margin: 0;
          font-size: 14px;
          color: ${palette.accent};
          text-shadow: 0 0 10px ${palette.accent}60;
        }

        .step-icon {
          font-size: 24px;
          animation: gentle-pulse 2s ease-in-out infinite;
        }

        .imperfect-step p {
          margin: 0 0 16px 0;
          line-height: 1.6;
          font-size: 11px;
          color: #e0e0e0;
        }

        .step-tip {
          background: linear-gradient(135deg, ${palette.accent}20, ${palette.accent}10);
          border: 1px solid ${palette.accent}40;
          border-radius: 8px;
          padding: 12px;
          font-size: 10px;
          color: ${palette.accent};
          margin-top: 12px;
          position: relative;
          overflow: hidden;
        }

        .step-tip::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shimmer 3s ease-in-out infinite;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .step-header h3 {
            font-size: 12px;
          }

          .imperfect-step p {
            font-size: 10px;
          }

          .step-tip {
            font-size: 9px;
            padding: 10px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .step-icon {
            animation: none;
          }

          .step-tip::before {
            animation: none;
          }
        }

        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes gentle-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
}
