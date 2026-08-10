'use client';

import React, { useState, useEffect } from 'react';
import { Ghost, Trophy, ChevronRight, Share2, Play } from 'lucide-react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useSearchParams } from 'next/navigation';

interface ChallengeWidgetProps {
  onStartGhostRace?: (mode: 'pushups' | 'squats') => void;
}

export const ChallengeWidget: React.FC<ChallengeWidgetProps> = ({ onStartGhostRace }) => {
  const { progress } = useXpProgress();
  const [hasIncomingChallenge, setHasIncomingChallenge] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const raceParam = searchParams?.get('race');
    if (raceParam) {
      setHasIncomingChallenge(true);
    }
  }, [searchParams]);

  const canUseGhostMode = progress.currentLevel >= 3;
  const canUseOnChain = progress.currentLevel >= 5;

  const handleStartChallenge = (mode: 'pushups' | 'squats') => {
    if (onStartGhostRace) {
      onStartGhostRace(mode);
    }
  };

  return (
    <div className="earned-surface earned-surface--ghost p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ghost className="w-5 h-5" style={{ color: 'var(--sandow-brass)' }} />
          <h3 className="earned-surface__title" style={{ fontSize: '0.75rem' }}>
            Ghost challenges
          </h3>
        </div>
      </div>

      {hasIncomingChallenge && (
        <div
          className="mb-4 p-3 rounded-lg"
          role="status"
          style={{
            background: 'rgba(252, 177, 49, 0.12)',
            border: '1px solid var(--sandow-rule)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(252, 177, 49, 0.2)' }}
            >
              <Ghost className="w-5 h-5" style={{ color: 'var(--sandow-brass)' }} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: 'var(--studio-paper-soft)' }}>
                Incoming challenge
              </div>
              <div className="text-xs" style={{ color: 'var(--sandow-brass-soft)' }}>
                A friend challenged you to race their ghost
              </div>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--sandow-brass)' }} />
          </div>
        </div>
      )}

      <div
        className="mb-4 p-4 rounded-lg"
        style={{
          background: canUseGhostMode ? 'rgba(252, 177, 49, 0.08)' : 'var(--studio-surface-item)',
          border: canUseGhostMode
            ? '1px solid var(--sandow-rule-quiet)'
            : '1px solid var(--studio-border)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: canUseGhostMode ? 'rgba(252, 177, 49, 0.18)' : 'rgba(9, 33, 34, 0.8)',
            }}
          >
            <Ghost
              className="w-5 h-5"
              style={{
                color: canUseGhostMode ? 'var(--sandow-brass)' : 'var(--studio-muted-dim)',
              }}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4
                className="font-bold text-sm"
                style={{
                  color: canUseGhostMode ? 'var(--studio-paper-soft)' : 'var(--studio-muted)',
                }}
              >
                Race your ghost
              </h4>
              {canUseGhostMode ? (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(86, 217, 195, 0.14)',
                    color: 'var(--studio-teal-bright)',
                  }}
                >
                  Active
                </span>
              ) : (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1"
                  style={{
                    background: 'var(--studio-surface-item)',
                    color: 'var(--studio-muted)',
                  }}
                >
                  <Lock size={10} /> LVL 3
                </span>
              )}
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--studio-muted)' }}>
              {canUseGhostMode
                ? 'Your best line, drawn as a ghost — beat it, then move it.'
                : 'Complete workouts to unlock racing your own line.'}
            </p>
            {canUseGhostMode && (
              <button
                type="button"
                onClick={() => handleStartChallenge('pushups')}
                className="earned-cta-brass w-full py-2 text-xs flex items-center justify-center gap-2"
              >
                <Play size={14} />
                Start ghost race
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mb-4 text-center text-xs" style={{ color: 'var(--studio-muted)' }}>
        Finish a set to send a private movement correction to someone else.
      </p>

      <div style={{ borderTop: '1px solid var(--studio-border)', paddingTop: '1rem' }}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4" style={{ color: 'var(--sandow-brass)' }} />
          <h4 className="earned-surface__title">Race champions</h4>
        </div>

        <div className="text-center py-6" style={{ color: 'var(--studio-muted-dim)' }}>
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs max-w-[24rem] mx-auto">
            No champions yet — finish a set and your best line becomes the first ghost to beat.
          </p>
        </div>
      </div>

      {canUseOnChain && (
        <div
          className="mt-4 p-3 rounded-lg"
          style={{
            background: 'rgba(86, 217, 195, 0.08)',
            border: '1px solid var(--studio-border)',
          }}
        >
          <div
            className="flex items-center gap-2 text-xs font-bold"
            style={{ color: 'var(--studio-teal-bright)' }}
          >
            <Share2 size={14} />
            <span>On-chain challenges active</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--studio-muted)' }}>
            Your challenges are now recorded on-chain for verified competition
          </p>
        </div>
      )}
    </div>
  );
};

function Lock({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default ChallengeWidget;
