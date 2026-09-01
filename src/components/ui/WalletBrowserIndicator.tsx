'use client';

import React from 'react';
import { Wallet, Smartphone } from 'lucide-react';
import useDeviceDetect from '@/hooks/useDeviceDetect';

interface WalletBrowserIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Component that shows when the user is in a wallet browser context
 * Helps with debugging and user awareness
 */
export default function WalletBrowserIndicator({
  className = '',
  showDetails = false,
}: WalletBrowserIndicatorProps) {
  const { isWalletBrowser, walletBrowserType, isMobile } = useDeviceDetect();

  if (!isWalletBrowser) {
    return null;
  }

  const getWalletDisplayName = (type: string | null) => {
    if (!type) return 'Wallet Browser';

    const displayNames: Record<string, string> = {
      metamask: 'MetaMask',
      coinbase: 'Coinbase Wallet',
      trust: 'Trust Wallet',
      rainbow: 'Rainbow',
      phantom: 'Phantom',
      walletconnect: 'WalletConnect',
      imtoken: 'imToken',
      tokenpocket: 'TokenPocket',
      safepal: 'SafePal',
      mathwallet: 'MathWallet',
      binance: 'Binance Wallet',
      okx: 'OKX Wallet',
      bitget: 'Bitget Wallet',
      unknown_wallet: 'Wallet Browser',
    };

    return displayNames[type] || 'Wallet Browser';
  };

  return (
    <div className={`wallet-browser-indicator ${className}`}>
      {showDetails ? (
        <div className="bg-studio-surface border border-studio-border-strong rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-studio-teal-bright" aria-hidden="true" />
            <span className="text-sm font-bold text-studio-paper">
              {getWalletDisplayName(walletBrowserType)} Detected
            </span>
          </div>
          <div className="text-xs text-studio-muted space-y-1">
            <p>✅ Mobile-optimized interface active</p>
            <p>✅ Seamless transaction handling</p>
            <p>✅ Enhanced wallet integration</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-studio-muted bg-studio-surface px-2 py-1 rounded border border-studio-border">
          <Wallet size={14} aria-hidden="true" />
          <span>{getWalletDisplayName(walletBrowserType)}</span>
          {isMobile && <Smartphone size={14} className="text-green-400" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
}
