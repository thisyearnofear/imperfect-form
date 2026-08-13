'use client';

import React from 'react';
import { CheckCircle2, Link2, Wallet } from 'lucide-react';
import { ONCHAIN_UNLOCK_LEVEL } from '@/constants/onchainModes';
import '@/styles/foyer-status.css';

interface FoyerStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  /** Current player level (from useXpProgress, computed once by the parent). */
  level: number;
  onConnect: () => void;
  /** Visual register: studio (teal-led) or arcade (brass-led). */
  register?: 'studio' | 'arcade';
  className?: string;
}

/**
 * Passive pre-session status strip for the foyer — never a gate. It surfaces
 * (1) wallet state ("connected" vs "saved locally · connect to sync") and
 * (2) progression toward the Level 5 on-chain unlock, so the upgrade path is
 * visible *before* a workout instead of springing a wallet wall afterwards.
 * Presentational: wallet/level are passed in, so no duplicate XP subscription.
 */
export function FoyerStatus({
  isConnected,
  isConnecting,
  level,
  onConnect,
  register = 'studio',
  className = '',
}: FoyerStatusProps) {
  const unlocked = level >= ONCHAIN_UNLOCK_LEVEL;
  const cappedLevel = Math.min(level, ONCHAIN_UNLOCK_LEVEL);
  const barProgress = unlocked ? 1 : cappedLevel / ONCHAIN_UNLOCK_LEVEL;

  return (
    <div className={`foyer-status foyer-status--${register}${className ? ` ${className}` : ''}`}>
      <span className="foyer-status__wallet">
        <span className={`foyer-status__dot${isConnected ? ' is-on' : ''}`} aria-hidden="true" />
        {isConnected ? (
          <>
            <Wallet size={12} strokeWidth={2} aria-hidden="true" />
            <span className="foyer-status__label">Wallet connected</span>
          </>
        ) : (
          <>
            <span className="foyer-status__label">Saved locally</span>
            <button
              type="button"
              className="foyer-status__connect"
              disabled={isConnecting}
              onClick={onConnect}
            >
              {isConnecting ? 'Connecting…' : 'Connect to sync'}
            </button>
          </>
        )}
      </span>

      <span className="foyer-status__divider" aria-hidden="true" />

      <span className="foyer-status__level">
        {unlocked ? (
          <>
            <CheckCircle2 size={12} strokeWidth={2} aria-hidden="true" />
            <span className="foyer-status__label foyer-status__label--unlocked">
              On-chain sync unlocked
            </span>
          </>
        ) : (
          <>
            <Link2 size={12} strokeWidth={2} aria-hidden="true" />
            <span className="foyer-status__level-text">
              Lvl <strong>{level}</strong>
              <span className="foyer-status__level-max">/{ONCHAIN_UNLOCK_LEVEL}</span>
            </span>
            <span
              className="foyer-status__bar"
              role="progressbar"
              aria-valuenow={cappedLevel}
              aria-valuemin={0}
              aria-valuemax={ONCHAIN_UNLOCK_LEVEL}
              aria-label={`Level ${level} of ${ONCHAIN_UNLOCK_LEVEL} toward on-chain sync`}
            >
              <span className="foyer-status__fill" style={{ width: `${barProgress * 100}%` }} />
            </span>
            <span className="foyer-status__hint">on-chain at 5</span>
          </>
        )}
      </span>
    </div>
  );
}

export default FoyerStatus;
