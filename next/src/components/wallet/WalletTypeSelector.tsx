"use client";

import React, { useEffect } from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useDisconnect } from "wagmi";
import Dialog from "@/components/ui/Dialog";
import Image from "next/image";

interface WalletTypeSelectorProps {
  onClose?: () => void;
}

/**
 * WalletTypeSelector component that displays a dialog for selecting a wallet type
 * This replaces the previous NetworkSelector which confused wallet types with networks
 */
export default function WalletTypeSelector({ onClose }: WalletTypeSelectorProps) {
  const { setWalletProvider, resetAll } = useWalletProvider();
  const { disconnect } = useDisconnect();

  // Ensure clean state before selection
  useEffect(() => {
    // Clean up any existing wallet connections
    disconnect();
    
    // Wait for disconnect to take effect
    const timer = setTimeout(() => {
      console.log("WalletTypeSelector: Disconnected wallet, ready for selection");
    }, 500);
    
    return () => clearTimeout(timer);
  }, [disconnect]);

  // Handle wallet type selection
  const handleWalletTypeSelected = (walletType: "signature" | "smart") => {
    // Disconnect current connections but don't force reload
    disconnect();
    
    // Clear localStorage but don't trigger a page reload
    resetAll(false);
    
    // Then set the new wallet provider immediately
    setWalletProvider(walletType);
    
    // Close dialog if callback provided
    if (onClose) onClose();
    
    console.log(`WalletTypeSelector: Selected ${walletType} wallet type`);
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose || (() => {})}
      title="Select Wallet Type"
      description="Choose how you want to connect to the blockchain"
      maxWidth="450px"
    >
      <div
        className="olympic-rings mb-4 justify-center"
        aria-label="Olympic Rings"
      >
        <div className="ring blue" />
        <div className="ring black" />
        <div className="ring red" />
        <div className="ring yellow" />
        <div className="ring green" />
      </div>

      <div className="wallet-type-selection-dialog p-4">
        <button
          onClick={() => handleWalletTypeSelected("signature")}
          className="wallet-option wallet-option-signature w-full mb-4"
        >
          <span className="flex items-center">
            <Image
              src="/wallet-icon.svg"
              alt="Signature Wallet"
              width={24}
              height={24}
              className="mr-2"
              onError={() => {
                // Next/Image handles errors differently, we'll use a fallback prop
                return true; // This tells Next.js to use the fallback image
              }}
              // Fallback image
              unoptimized
            />
            Signature Wallet
          </span>
          <span className="text-xs bg-white text-purple-700 px-2 py-1 rounded font-bold">
            Sign with Key
          </span>
        </button>

        <button
          onClick={() => handleWalletTypeSelected("smart")}
          className="wallet-option wallet-option-smart w-full"
        >
          <span className="flex items-center">
            <Image
              src="/smart-wallet-icon.svg"
              alt="Smart Wallet"
              width={24}
              height={24}
              className="mr-2"
              onError={() => {
                // Next/Image handles errors differently, we'll use a fallback prop
                return true; // This tells Next.js to use the fallback image
              }}
              // Fallback image
              unoptimized
            />
            Smart Wallet
          </span>
          <span className="text-xs bg-white text-blue-700 px-2 py-1 rounded font-bold">
            No Signature
          </span>
        </button>
      </div>
    </Dialog>
  );
}