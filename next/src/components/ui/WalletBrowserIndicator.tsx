"use client";

import React from "react";
import useDeviceDetect from "@/hooks/useDeviceDetect";

interface WalletBrowserIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Component that shows when the user is in a wallet browser context
 * Helps with debugging and user awareness
 */
export default function WalletBrowserIndicator({
  className = "",
  showDetails = false,
}: WalletBrowserIndicatorProps) {
  const { isWalletBrowser, walletBrowserType, isMobile } = useDeviceDetect();

  if (!isWalletBrowser) {
    return null;
  }

  const getWalletDisplayName = (type: string | null) => {
    if (!type) return "Wallet Browser";
    
    const displayNames: Record<string, string> = {
      metamask: "MetaMask",
      coinbase: "Coinbase Wallet",
      trust: "Trust Wallet",
      rainbow: "Rainbow",
      phantom: "Phantom",
      walletconnect: "WalletConnect",
      imtoken: "imToken",
      tokenpocket: "TokenPocket",
      safepal: "SafePal",
      mathwallet: "MathWallet",
      binance: "Binance Wallet",
      okx: "OKX Wallet",
      bitget: "Bitget Wallet",
      unknown_wallet: "Wallet Browser",
    };

    return displayNames[type] || "Wallet Browser";
  };

  const getWalletIcon = (type: string | null) => {
    const icons: Record<string, string> = {
      metamask: "🦊",
      coinbase: "🔵",
      trust: "🛡️",
      rainbow: "🌈",
      phantom: "👻",
      walletconnect: "🔗",
      imtoken: "💎",
      tokenpocket: "🎒",
      safepal: "🔐",
      mathwallet: "🧮",
      binance: "🟡",
      okx: "⭕",
      bitget: "🎯",
      unknown_wallet: "👛",
    };

    return icons[type || "unknown_wallet"] || "👛";
  };

  return (
    <div className={`wallet-browser-indicator ${className}`}>
      {showDetails ? (
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getWalletIcon(walletBrowserType)}</span>
            <span className="text-sm font-bold text-purple-200">
              {getWalletDisplayName(walletBrowserType)} Detected
            </span>
          </div>
          <div className="text-xs text-purple-300 space-y-1">
            <p>✅ Mobile-optimized interface active</p>
            <p>✅ Seamless transaction handling</p>
            <p>✅ Enhanced wallet integration</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/50">
          <span>{getWalletIcon(walletBrowserType)}</span>
          <span>{getWalletDisplayName(walletBrowserType)}</span>
          {isMobile && <span className="text-green-400">📱</span>}
        </div>
      )}
    </div>
  );
}
