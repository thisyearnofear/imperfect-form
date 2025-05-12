"use client";

import React, { useState } from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useDisconnect } from "wagmi";
import { useDisconnect as useThirdwebDisconnect } from "@thirdweb-dev/react";
import Dialog from "@/components/ui/Dialog";

interface WalletSwitcherProps {
  className?: string;
  triggerLabel?: string;
  onClose?: () => void;
}

export default function WalletSwitcher({
  className = "",
  triggerLabel = "Switch Wallet",
  onClose,
}: WalletSwitcherProps) {
  const [showModal, setShowModal] = useState(false);
  const { network } = useNetwork();
  const { resetAll } = useWalletProvider();
  const { disconnect } = useDisconnect();
  const thirdwebDisconnect = useThirdwebDisconnect();
  
  const handleSwitchWallet = () => {
    // Completely reset all wallet state
    resetAll();
    
    // Also disconnect from both wallet types
    disconnect();
    thirdwebDisconnect();
    
    // Close the modal
    setShowModal(false);
    
    // Call onClose callback if provided
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <button
        className={`wallet-switcher-button ${className}`}
        onClick={() => setShowModal(true)}
      >
        {triggerLabel}
      </button>

      <Dialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Switch Wallet Type"
        description="Would you like to select a different wallet experience?"
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

        <div className="wallet-selection-dialog p-4">
          <div className="mb-4 text-center">
            <p className="text-sm mb-2">
              Current wallet experience: <span className="font-bold">{network === "polygon" ? "Signature Wallet (ThirdWeb)" : "Smart Wallet (Coinbase)"}</span>
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Switching will take you back to the wallet selection screen.
            </p>
            
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleSwitchWallet}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors w-full"
              >
                Go to Wallet Selection
              </button>
              
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}