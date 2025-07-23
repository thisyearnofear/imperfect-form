"use client";

import React, { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { switchChain, SupportedChain } from '@/utils/chainSwitching';
import { Dialog } from '@/components/ui';
import toast from 'react-hot-toast';

interface NetworkSwitchPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onNetworkSwitched: () => void;
  targetChain: SupportedChain;
  reason: string;
}

const NetworkSwitchPrompt: React.FC<NetworkSwitchPromptProps> = ({
  isOpen,
  onClose,
  onNetworkSwitched,
  targetChain,
  reason,
}) => {
  const [isSwitching, setIsSwitching] = useState(false);
  const { wallet } = usePlatform();

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    
    try {
      const success = await switchChain(targetChain);
      
      if (success) {
        toast.success(`Switched to ${targetChain} network!`);
        onNetworkSwitched();
        onClose();
      } else {
        toast.error("Failed to switch network. Please try manually.");
      }
    } catch (error) {
      console.error("Network switch error:", error);
      toast.error("Error switching network. Please try again.");
    } finally {
      setIsSwitching(false);
    }
  };

  const getNetworkDisplayName = (chain: SupportedChain): string => {
    switch (chain) {
      case SupportedChain.CELO_ALFAJORES:
        return "Celo Alfajores Testnet";
      case SupportedChain.CELO:
        return "Celo Mainnet";
      case SupportedChain.POLYGON:
        return "Polygon";
      case SupportedChain.BASE:
        return "Base";
      case SupportedChain.MONAD:
        return "Monad Testnet";
      default:
        return chain;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Network Switch Required"
      description={reason}
      preventClose={false}
    >
      <div className="space-y-6">
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Network:</span>
              <span className="text-white font-medium">
                {wallet.chainId ? getNetworkDisplayName(
                  Object.values(SupportedChain).find(chain => 
                    chain === SupportedChain.CELO && wallet.chainId === 42220 ||
                    chain === SupportedChain.CELO_ALFAJORES && wallet.chainId === 44787 ||
                    chain === SupportedChain.POLYGON && wallet.chainId === 137 ||
                    chain === SupportedChain.BASE && wallet.chainId === 8453 ||
                    chain === SupportedChain.MONAD && wallet.chainId === 10143
                  ) || "Unknown"
                ) : "Not Connected"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Required Network:</span>
              <span className="text-green-400 font-medium">
                {getNetworkDisplayName(targetChain)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-300">
          <p className="mb-2">
            <strong>Why switch networks?</strong>
          </p>
          <p>
            Self Protocol verification is currently available on Celo Alfajores testnet. 
            This allows you to test the verification feature with mock documents before 
            the mainnet deployment.
          </p>
        </div>

        <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
          <p className="text-sm text-blue-200">
            Benefits of verification:
          </p>
          <ul className="text-xs text-blue-300 mt-1 space-y-1">
            <li>Get a verified badge on the leaderboard</li>
            <li>Prove you&apos;re a real human</li>
            <li>One-time setup, works forever</li>
            <li>Privacy-first (only age verification)</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors"
            disabled={isSwitching}
          >
            Maybe Later
          </button>
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSwitching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Switching...</span>
              </>
            ) : (
              <span>Switch Network</span>
            )}
          </button>
        </div>

        <div className="text-xs text-gray-400 border-t border-gray-700 pt-3">
          <p>
            <strong>Manual switch:</strong> You can also switch to Celo Alfajores manually in your wallet settings.
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default NetworkSwitchPrompt;