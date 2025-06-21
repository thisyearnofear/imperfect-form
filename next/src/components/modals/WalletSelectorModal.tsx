"use client";

import React from "react";
import { useConnect } from "wagmi";
import { useWallet } from "@/contexts/PlatformContext";
import AccessibleDialog from "@/components/ui/AccessibleDialog";
import { Spinner } from "@/components/ui";

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// A more specific type for the connectors array from useConnect
type Connector = ReturnType<typeof useConnect>["connectors"][number];

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { connectors } = useConnect();
  const { connect, isConnecting } = useWallet();

  const handleConnect = async (connector: Connector) => {
    const success = await connect(connector.id);
    if (success) {
      onClose(); // Close modal on successful connection
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
      onClose={onClose}
      title="Connect Wallet"
      description="Choose your preferred wallet provider to continue"
    >
      <div className="flex flex-col space-y-4">
        {availableConnectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector)}
            disabled={isConnecting}
            className="flex items-center justify-center w-full px-4 py-3 text-lg font-bold text-black bg-[#fcb131] rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
