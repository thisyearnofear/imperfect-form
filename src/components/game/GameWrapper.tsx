'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import AuthDebugPanel from '@/components/debug/AuthDebugPanel';
import { Game } from '@/components/game';
import { Spinner } from '@/components/ui';

interface GameWrapperProps {
  profileSearchTarget?: string;
}

/**
 * Guest-first flow: always render the game.
 * Show a small floating connect button until a wallet is connected.
 * This replaces the previous connection gate while reusing existing components.
 */
export default function GameWrapper({ profileSearchTarget }: GameWrapperProps) {
  const { platform, wallet, isReady } = usePlatform();
  const { address } = wallet;

  // Remove initial loading state - Game component handles its own loading
  return (
    <div className="h-full bg-black flex flex-col relative">
      <main className="flex-grow">
        {/* Use address from context if available; Game handles no-address gracefully */}
        <Game thirdwebAddress={address || undefined} profileSearchTarget={profileSearchTarget} />
      </main>
      <AuthDebugPanel />
    </div>
  );

  return (
    <div className="h-full bg-black flex flex-col relative">
      <main className="flex-grow">
        {/* Use address from context if available; Game handles no-address gracefully */}
        <Game thirdwebAddress={address || undefined} profileSearchTarget={profileSearchTarget} />
      </main>
      <AuthDebugPanel />
    </div>
  );
}
