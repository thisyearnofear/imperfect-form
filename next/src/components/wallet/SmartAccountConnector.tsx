"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useSmartAccount } from "@/contexts/SmartAccountContext";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";

const SmartAccountConnector: React.FC = () => {
  const { isConnected } = useAccount();
  const { isSmartWallet, walletVersion } = useSmartAccount();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Connect Wallet</h2>
        {isConnected && (
          <div className="text-sm text-gray-600">
            {walletVersion && `Wallet Version: ${walletVersion}`}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <ConnectWallet />
        {isConnected && isSmartWallet !== null && (
          <div
            className={`text-sm ${
              isSmartWallet ? "text-green-600" : "text-red-600"
            }`}
          >
            {isSmartWallet ? "✅ Smart Account Ready" : "❌ No Smart Account"}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartAccountConnector;
