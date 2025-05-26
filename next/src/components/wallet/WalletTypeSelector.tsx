"use client";

import React, { useState } from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import WalletDialog from "@/components/ui/WalletDialog";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import MobileOptimizedWalletSelector from "./MobileOptimizedWalletSelector";

interface WalletTypeSelectorProps {
  onClose?: () => void;
}

/**
 * WalletTypeSelector component that displays a dialog for selecting a wallet type
 * Uses device detection to show appropriate UI for desktop vs mobile
 */
export default function WalletTypeSelector({
  onClose,
}: WalletTypeSelectorProps) {
  const { isMobile, isWalletBrowser } = useDeviceDetect();

  // On mobile OR in wallet browser, use the mobile-optimized version
  // Wallet browsers should always get the mobile experience for better UX
  if (isMobile || isWalletBrowser) {
    return <MobileOptimizedWalletSelector onClose={onClose} />;
  }

  // On desktop (non-wallet browser), use the original desktop version
  return <DesktopWalletSelector onClose={onClose} />;
}

/**
 * Desktop version of the wallet selector - restored from working commit
 */
function DesktopWalletSelector({ onClose }: WalletTypeSelectorProps) {
  const { setWalletProvider } = useWalletProvider();
  const [isSelectingWallet, setIsSelectingWallet] = useState(false);

  // Handle wallet type selection - exact same logic as the working version
  const handleWalletTypeSelected = (walletType: "signature" | "smart") => {
    // Show loading state
    setIsSelectingWallet(true);

    // Log the selection immediately
    console.log(`WalletTypeSelector: Selected ${walletType} wallet type`);

    // Set wallet provider in localStorage directly
    localStorage.setItem("selectedWalletProvider", walletType);

    // Set the wallet provider immediately to avoid race conditions
    setWalletProvider(walletType);

    // Close dialog if callback provided
    if (onClose) onClose();

    // If we're on the dedicated selection page, redirect to home page
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("/select-wallet")
    ) {
      console.log("Redirecting to home page after wallet selection");
      window.location.href = "/";
    } else {
      // On main page, just reload to refresh with the new wallet type
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  return (
    <WalletDialog
      isOpen={true}
      onClose={onClose || (() => {})}
      title=""
      description=""
      maxWidth="450px"
    >
      <div className="bg-black bg-opacity-95 p-5 rounded-lg shadow-xl border-2 border-gray-800 animate-fade-in">
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold text-yellow-400 mb-2 title-animation">
            IMPERFECT FORM
          </h1>
          <h2 className="text-base text-yellow-200 mb-4 subtitle-animation">
            ONCHAIN OLYMPIANS (in training)
          </h2>
        </div>
        <div className="wallet-type-selection-dialog p-3 space-y-4 mx-auto text-center">
          <button
            onClick={() => handleWalletTypeSelected("signature")}
            className="wallet-option wallet-option-signature w-full p-4 relative bg-gradient-to-r from-purple-900 to-indigo-900 border-l-4 border-purple-500 rounded-md transition-all hover:from-purple-800 hover:to-indigo-800 hover:border-purple-400 animate-slide-up delay-100"
            disabled={isSelectingWallet}
          >
            <div className="flex flex-col items-center">
              <div className="font-bold text-lg text-white animate-shimmer">
                Signature Wallet
              </div>
              <div className="flex mt-1 items-center justify-center">
                <span className="text-[10px] bg-purple-800 text-white px-2 py-0.5 rounded">
                  Polygon
                </span>
                <span className="mx-1 text-gray-500">|</span>
                <span className="text-[10px] bg-yellow-800 text-white px-2 py-0.5 rounded">
                  Monad
                </span>
                <span className="mx-1 text-gray-500">|</span>
                <span className="text-[10px] bg-green-800 text-white px-2 py-0.5 rounded">
                  Celo
                </span>
              </div>
            </div>

            {isSelectingWallet && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            )}
          </button>

          <button
            onClick={() => handleWalletTypeSelected("smart")}
            className="wallet-option wallet-option-smart w-full p-4 relative bg-gradient-to-r from-blue-900 to-teal-900 border-l-4 border-blue-500 rounded-md transition-all hover:from-blue-800 hover:to-teal-800 hover:border-blue-400 animate-slide-up delay-300"
            disabled={isSelectingWallet}
          >
            <div className="flex flex-col items-center">
              <div className="font-bold text-lg text-white animate-shimmer">
                Smart Wallet
              </div>
              <div className="flex mt-1 justify-center">
                <span className="text-[10px] bg-blue-800 text-white px-1.5 py-0.5 rounded">
                  Base
                </span>
              </div>
            </div>

            {isSelectingWallet && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </button>
        </div>
      </div>
    </WalletDialog>
  );
}
