"use client";

import React, { useState } from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { FarcasterAwareWalletButton } from "./FarcasterAwareWalletButton";
import { WalletBrowserIndicator } from "@/components/ui";
import useDeviceDetect from "@/hooks/useDeviceDetect";

interface MobileOptimizedWalletSelectorProps {
  onClose?: () => void;
}

/**
 * Mobile-optimized wallet selector that provides better UX on mobile
 * Uses responsive design and works with conditional leaderboard rendering
 * Now includes Farcaster mini app detection and integration
 */
export default function MobileOptimizedWalletSelector({
  onClose,
}: MobileOptimizedWalletSelectorProps) {
  const { setWalletProvider } = useWalletProvider();
  const [isSelectingWallet, setIsSelectingWallet] = useState(false);
  const { isInMiniApp, user: farcasterUser } = useFarcasterContext();
  const { isWalletBrowser } = useDeviceDetect();

  // Handle wallet type selection
  const handleWalletTypeSelected = (walletType: "signature" | "smart") => {
    setIsSelectingWallet(true);

    console.log(
      `MobileOptimizedWalletSelector: Selected ${walletType} wallet type`
    );

    // Set wallet provider in localStorage directly
    localStorage.setItem("selectedWalletProvider", walletType);
    setWalletProvider(walletType);

    // Close dialog if callback provided
    if (onClose) onClose();

    // Handle navigation
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("/select-wallet")
    ) {
      console.log("Redirecting to home page after wallet selection");
      window.location.href = "/";
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header - responsive sizing */}
      <div className="flex-shrink-0 p-4 md:p-6 border-b border-gray-800">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold text-yellow-400 mb-1 md:mb-2">
            IMPERFECT FORM
          </h1>
          <p className="text-sm md:text-base text-yellow-200">
            ONCHAIN OLYMPIANS (in training)
          </p>

          {/* Show wallet browser detection */}
          {isWalletBrowser && (
            <div className="mt-2">
              <WalletBrowserIndicator showDetails={true} />
            </div>
          )}

          {/* Show Farcaster context if detected */}
          {isInMiniApp && farcasterUser && (
            <div className="mt-2 p-2 bg-purple-900/50 border border-purple-500 rounded-lg">
              <p className="text-xs text-purple-200">
                🎭 Welcome {farcasterUser.displayName || farcasterUser.username}
                !
              </p>
              <p className="text-xs text-purple-300">Playing via Farcaster</p>
            </div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content - responsive layout */}
      <div className="flex-1 flex flex-col justify-center px-4 md:px-6 pb-8">
        <div className="space-y-4 max-w-sm md:max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-2">
              {isInMiniApp
                ? "Connect Your Farcaster Wallet"
                : "Choose Your Wallet Type"}
            </h2>
            <p className="text-sm md:text-base text-gray-400">
              {isInMiniApp
                ? "Use your connected Farcaster wallet or choose another option"
                : "Select how you'd like to connect and play"}
            </p>
          </div>

          {/* Farcaster Wallet Option - Only show if in Farcaster context */}
          {isInMiniApp && (
            <div className="mb-4">
              <FarcasterAwareWalletButton
                onWalletConnected={() => {
                  if (onClose) onClose();
                  // Handle navigation similar to other wallet types
                  if (
                    typeof window !== "undefined" &&
                    window.location.pathname.includes("/select-wallet")
                  ) {
                    console.log(
                      "Redirecting to home page after Farcaster wallet connection"
                    );
                    window.location.href = "/";
                  } else {
                    setTimeout(() => {
                      window.location.reload();
                    }, 300);
                  }
                }}
                className="w-full p-4 md:p-6 bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-400 rounded-lg transition-all hover:from-purple-800 hover:to-pink-800 hover:border-purple-300 relative touch-manipulation"
              />

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t border-gray-600"></div>
                <span className="px-3 text-sm text-gray-400">
                  or choose another wallet
                </span>
                <div className="flex-1 border-t border-gray-600"></div>
              </div>
            </div>
          )}

          {/* Signature Wallet Option */}
          <button
            onClick={() => handleWalletTypeSelected("signature")}
            className="w-full p-4 md:p-6 bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500 rounded-lg transition-all hover:from-purple-800 hover:to-indigo-800 hover:border-purple-400 relative touch-manipulation"
            disabled={isSelectingWallet}
          >
            <div className="flex flex-col items-center text-center">
              <div className="font-bold text-lg md:text-xl text-white mb-2">
                Signature Wallet
              </div>
              <div className="text-xs md:text-sm text-gray-300 mb-3">
                Connect your existing wallet
              </div>
              <div className="flex flex-wrap gap-1 md:gap-2 justify-center">
                <span className="text-xs bg-purple-800 text-white px-2 py-1 rounded">
                  Polygon
                </span>
                <span className="text-xs bg-yellow-800 text-white px-2 py-1 rounded">
                  Monad
                </span>
                <span className="text-xs bg-green-800 text-white px-2 py-1 rounded">
                  Celo
                </span>
              </div>
            </div>

            {isSelectingWallet && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            )}
          </button>

          {/* Smart Wallet Option */}
          <button
            onClick={() => handleWalletTypeSelected("smart")}
            className="w-full p-4 md:p-6 bg-gradient-to-r from-blue-900 to-teal-900 border border-blue-500 rounded-lg transition-all hover:from-blue-800 hover:to-teal-800 hover:border-blue-400 relative touch-manipulation"
            disabled={isSelectingWallet}
          >
            <div className="flex flex-col items-center text-center">
              <div className="font-bold text-lg md:text-xl text-white mb-2">
                Smart Wallet
              </div>
              <div className="text-xs md:text-sm text-gray-300 mb-3">
                Create a new smart wallet
              </div>
              <div className="flex justify-center">
                <span className="text-xs bg-blue-800 text-white px-2 py-1 rounded">
                  Base
                </span>
              </div>
            </div>

            {isSelectingWallet && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 md:p-6 border-t border-gray-800">
        <p className="text-xs md:text-sm text-gray-500 text-center">
          Built by{" "}
          <a
            href="https://warpcast.com/papa"
            target="_blank"
            className="text-yellow-400 hover:text-yellow-300"
          >
            PAPA
          </a>
        </p>
      </div>
    </div>
  );
}
