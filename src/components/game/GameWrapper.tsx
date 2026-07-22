'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import AuthDebugPanel from '@/components/debug/AuthDebugPanel';
import { Game } from '@/components/game';
import { TOGGLE_AUTH_DEBUG_EVENT } from '@/lib/appEvents';

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
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(TOGGLE_AUTH_DEBUG_EVENT))}
        className="fixed bottom-4 right-4 z-50 p-2 text-xs rounded-full bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/80 border border-white/5 hover:border-white/20 transition-all opacity-0 hover:opacity-100 focus:opacity-100"
        title="Toggle Auth Debug (Ctrl+Shift+\\)"
        aria-label="Toggle Auth Debug"
      >
        🛠️
      </button>
    </div>
  );
}
