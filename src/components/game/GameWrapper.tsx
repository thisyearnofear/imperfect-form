'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import AuthDebugPanel from '@/components/debug/AuthDebugPanel';
import { Game } from '@/components/game';
import { Spinner } from '@/components/ui';

/**
 * Guest-first flow: always render the game.
 * Show a small floating connect button until a wallet is connected.
 * This replaces the previous connection gate while reusing existing components.
 */
export default function GameWrapper() {
  const { platform, wallet, isReady } = usePlatform();
  const { address } = wallet;

  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner />
          <p className="text-yellow-400 font-bold animate-pulse">
            {platform === 'farcaster'
              ? 'CONNECTING TO FARCASTER...'
              : 'INITIALIZING IMPERFECT FORM...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <main>
        {/* Use address from context if available; Game handles no-address gracefully */}
        <Game thirdwebAddress={address || undefined} />
      </main>
      <AuthDebugPanel />
    </div>
  );
}
