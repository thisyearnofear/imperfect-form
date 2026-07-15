'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import AuthDebugPanel from '@/components/debug/AuthDebugPanel';
import { Game } from '@/components/game';

/**
 * Guest-first flow: always render the game.
 * Show a small floating connect button until a wallet is connected.
 * This replaces the previous connection gate while reusing existing components.
 */
export default function GameWrapper() {
  const { wallet } = usePlatform();
  const { address } = wallet;

  return (
    <div className="h-full bg-black flex flex-col relative">
      <main className="flex-grow">
        {/* Use address from context if available; Game handles no-address gracefully */}
        <Game thirdwebAddress={address || undefined} />
      </main>
      <AuthDebugPanel />
    </div>
  );
}
