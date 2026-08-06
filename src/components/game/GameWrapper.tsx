'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
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
    <div className="game-wrapper h-full flex flex-col relative">
      <main className="flex-grow">
        {/* Use address from context if available; Game handles no-address gracefully */}
        <Game thirdwebAddress={address || undefined} />
      </main>
    </div>
  );
}
