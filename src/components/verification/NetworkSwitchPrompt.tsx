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
        return 'Celo';
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
      <div className="space-y-3">
        <p className="text-sm" style={{ color: currentTheme.palette.textSecondary }}>
          Switch to{' '}
          <strong style={{ color: currentTheme.palette.text }}>
            {getNetworkDisplayName(targetChain)}
          </strong>{' '}
          to verify.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: currentTheme.palette.surface,
              color: currentTheme.palette.text,
              border: `1px solid ${currentTheme.palette.accent}40`,
            }}
            disabled={isSwitching}
          >
            Skip
          </button>
          <button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            className="flex-1 py-2 px-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            style={{
              backgroundColor: currentTheme.palette.accent,
              color: currentTheme.palette.background,
              border: `1px solid ${currentTheme.palette.accent}`,
            }}
          >
            {isSwitching ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Switching...</span>
              </>
            ) : (
              <span>Switch Network</span>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default NetworkSwitchPrompt;
