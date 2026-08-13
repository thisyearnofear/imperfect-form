'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useClientOnly } from '@/hooks/useClientOnly';

interface WalletStatusPillProps {
  className?: string;
  /** Compact mode: drop the "Saved locally" label (dot + action/address only)
      for tight slots like the earned mobile top bar. */
  compact?: boolean;
}

/**
 * Passive wallet-status indicator for the global top bar — never a gate.
 * Connected → green dot + truncated address; disconnected → muted dot +
 * "Saved locally" with a subtle "Connect" link that opens the wallet selector.
 * Mirrors the FoyerStatus wording so the upgrade path reads the same pre- and
 * post-workout (P5: pre-emptive wallet context).
 */
export default function WalletStatusPill({
  className = '',
  compact = false,
}: WalletStatusPillProps) {
  const { wallet, actions } = usePlatform();
  const hasMounted = useClientOnly();

  // Stable placeholder on server + first client render (hydration parity).
  if (!hasMounted) {
    return <span className="wallet-status-pill" aria-hidden="true" />;
  }

  const { isConnected, address, isConnecting } = wallet;
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  const pillClass = `wallet-status-pill${isConnected ? ' is-connected' : ''}${
    className ? ` ${className}` : ''
  }`;

  return (
    <span className={pillClass}>
      <span className="wallet-status-pill__dot" aria-hidden="true" />
      {isConnected ? (
        <span className="wallet-status-pill__label">{shortAddress ?? 'Wallet connected'}</span>
      ) : (
        <>
          {!compact && <span className="wallet-status-pill__label">Saved locally</span>}
          <button
            type="button"
            className="wallet-status-pill__connect"
            disabled={isConnecting}
            onClick={() => void actions.connect()}
          >
            {isConnecting ? 'Connecting…' : 'Connect'}
          </button>
        </>
      )}
    </span>
  );
}
