"use client";

import React from "react";
import { useConnect } from "wagmi";
import { useWallet, useWalletSelector } from "@/contexts/PlatformContext";
import AccessibleDialog from "@/components/ui/AccessibleDialog";
import { Spinner } from "@/components/ui";

// A more specific type for the connectors array from useConnect
type Connector = ReturnType<typeof useConnect>["connectors"][number];

const WalletSelectorModal: React.FC = () => {
  const { connectors } = useConnect();
  const { connect, isConnecting } = useWallet();
  const { isOpen, setOpen } = useWalletSelector();

  const handleConnect = async (connector: Connector) => {
    const success = await connect(connector.id);
    if (success) {
      setOpen(false); // Close modal on successful connection
    }
    // Errors are handled and toasted within the PlatformContext
  };

  // Filter out the Farcaster connector for the general web UI
  const availableConnectors = connectors.filter(
    (c) => c.id !== "farcasterFrame" && c.id !== "farcaster"
  );

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={() => setOpen(false)}
      title="Connect Wallet"
      description="Choose your preferred wallet provider to continue"
    >
      <div className="flex flex-col space-y-4">
        {/* Promote passkey onboarding without new UI surfaces */}
        <p className="text-xs text-gray-300 text-center">
          Tip: Coinbase Smart Wallet supports passkeys (no seed phrase).
        </p>
        {availableConnectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector)}
            disabled={isConnecting}
            className="flex items-center justify-center w-full px-4 py-3 text-lg font-bold text-black bg-[#fcb131] rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              connector.id.includes("coinbase")
                ? "Supports passkeys via Smart Wallet"
                : undefined
            }
          >
            {isConnecting ? (
              <>
                <Spinner />
                <span className="ml-2">Connecting...</span>
              </>
            ) : (
              connector.name
            )}
          </button>
        ))}
      </div>
    </AccessibleDialog>
  );
};

export default WalletSelectorModal;
