'use client';

import React, { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { SupportedChain, chainConfigs } from '@/utils/chainSwitching';
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
  const { actions, wallet } = usePlatform();
  const { currentTheme } = useEnhancedChainTheme();

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);

    try {
      // Get the chain ID from the target chain
      const chainId = chainConfigs[targetChain].id;
      const success = await actions.switchChain(chainId);

      if (success) {
        toast.success(`Switched to ${chainConfigs[targetChain].name} network!`);
        onNetworkSwitched();
        onClose();
      } else {
        toast.error('Failed to switch network. Please try manually.');
      }
    } catch (error) {
      console.error('Network switch error:', error);
      toast.error('Error switching network. Please try again.');
    } finally {
      setIsSwitching(false);
    }
  };

  const getNetworkDisplayName = (chain: SupportedChain): string => {
    switch (chain) {
      case SupportedChain.CELO_ALFAJORES:
        return 'Celo Alfajores Testnet';
      case SupportedChain.CELO:
        return 'Celo Mainnet';
      case SupportedChain.POLYGON:
        return 'Polygon';
      case SupportedChain.BASE:
        return 'Base';
      case SupportedChain.MONAD:
        return 'Monad Testnet';
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
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: currentTheme.palette.surface + 'E6',
            borderColor: currentTheme.palette.accent + '80',
          }}
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span style={{ color: currentTheme.palette.textSecondary }}>Current Network:</span>
              <span className="font-medium" style={{ color: currentTheme.palette.text }}>
                {wallet.chainId
                  ? (() => {
                      const foundChain = Object.values(SupportedChain).find(
                        (chain) =>
                          (chain === SupportedChain.CELO && wallet.chainId === 42220) ||
                          (chain === SupportedChain.CELO_ALFAJORES && wallet.chainId === 44787) ||
                          (chain === SupportedChain.POLYGON && wallet.chainId === 137) ||
                          (chain === SupportedChain.BASE && wallet.chainId === 8453) ||
                          (chain === SupportedChain.MONAD && wallet.chainId === 10143)
                      );
                      return foundChain ? getNetworkDisplayName(foundChain) : 'Unknown';
                    })()
                  : 'Not Connected'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: currentTheme.palette.textSecondary }}>Required Network:</span>
              <span className="font-medium" style={{ color: currentTheme.palette.accent }}>
                {getNetworkDisplayName(targetChain)}
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-center">
          <p style={{ color: currentTheme.palette.textSecondary }}>
            Self Protocol verification requires Celo mainnet
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg transition-colors"
            style={{
              backgroundColor: currentTheme.palette.surface,
              color: currentTheme.palette.text,
              border: `1px solid ${currentTheme.palette.accent}40`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.palette.surfaceLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.palette.surface;
            }}
            disabled={isSwitching}
          >
            Maybe Later
          </button>
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="flex-1 py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            style={{
              backgroundColor: currentTheme.palette.accent,
              color: currentTheme.palette.background,
              border: `1px solid ${currentTheme.palette.accent}`,
            }}
            onMouseEnter={(e) => {
              if (!isSwitching) {
                e.currentTarget.style.backgroundColor = currentTheme.palette.accentLight;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSwitching) {
                e.currentTarget.style.backgroundColor = currentTheme.palette.accent;
              }
            }}
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

        <div
          className="text-xs pt-3 border-t"
          style={{
            color: currentTheme.palette.textMuted,
            borderColor: currentTheme.palette.accent + '40',
          }}
        >
          <p>
            <strong style={{ color: currentTheme.palette.accent }}>Manual switch:</strong> You can
            also switch to Celo Alfajores manually in your wallet settings.
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default NetworkSwitchPrompt;
