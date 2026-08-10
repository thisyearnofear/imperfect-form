'use client';

import React, { useState } from 'react';
import { avalanche, polygon, base, celo } from 'wagmi/chains';
import { AccessibleDialog } from '@/components/ui';
import Image from 'next/image';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { usePlatform } from '@/contexts/PlatformContext';
import type { ChainId } from '@/types/theme';

// Custom Monad Mainnet chain object
const monad = {
  id: 143,
  name: 'Monad',
  network: 'monad',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } },
} as const;

interface ChainSelectorProps {
  onClose?: () => void;
}

/**
 * ChainSelector component that displays a dialog for selecting a blockchain network
 * This is different from WalletTypeSelector which chooses the wallet connection type
 */
export default function ChainSelector({ onClose }: ChainSelectorProps) {
  const {
    actions: { switchChain },
  } = usePlatform();
  const { setTheme } = useEnhancedChainTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Handle chain selection
  const handleChainSelected = async (selectedNetwork: ChainId) => {
    setIsLoading(true);

    try {
      // Update local storage (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedNetwork', selectedNetwork);
        localStorage.setItem('selectedChain', selectedNetwork);
      }

      // Update theme context immediately
      setTheme(selectedNetwork);

      // Switch chain using platform context which handles Farcaster and other environments properly
      const chainIdByNetwork: Record<ChainId, number> = {
        polygon: polygon.id,
        base: base.id,
        celo: celo.id,
        monad: monad.id,
        avalanche: avalanche.id,
      };

      const targetChainId = chainIdByNetwork[selectedNetwork];
      if (!targetChainId) {
        console.error('Unknown network selected:', selectedNetwork);
        return;
      }

      const success = await switchChain(targetChainId);

      if (!success) {
        console.error('Failed to switch chain to', selectedNetwork);
      }

      // Close dialog
      if (onClose) onClose();
    } catch (error) {
      console.error('Error selecting chain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AccessibleDialog
      isOpen={true}
      onClose={onClose || (() => {})}
      title="Select Network"
      description=""
      maxWidth="380px"
    >
      <div className="mb-4 text-center" aria-hidden="true">
        <div
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--studio-muted)' }}
        >
          <span className="w-6 h-px" style={{ background: 'var(--studio-border)' }} />
          <span>Studio networks</span>
          <span className="w-6 h-px" style={{ background: 'var(--studio-border)' }} />
        </div>
      </div>

      <div className="network-selection-dialog p-3">
        <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <button
            onClick={() => handleChainSelected('polygon')}
            className="network-option network-option-polygon px-4 py-3 rounded-lg min-w-[100px]"
            disabled={isLoading}
          >
            <div className="flex flex-col items-center gap-1">
              <Image
                src="/polygon-logo.svg"
                alt="Polygon"
                width={20}
                height={20}
                onError={() => true}
                unoptimized
              />
              <span className="text-sm">Polygon</span>
            </div>
          </button>

          <button
            onClick={() => handleChainSelected('base')}
            className="network-option network-option-base px-4 py-3 rounded-lg min-w-[100px]"
            disabled={isLoading}
          >
            <div className="flex flex-col items-center gap-1">
              <Image
                src="/base-logo.svg"
                alt="Base"
                width={20}
                height={20}
                onError={() => true}
                unoptimized
              />
              <span className="text-sm">Base</span>
            </div>
          </button>

          <button
            onClick={() => handleChainSelected('celo')}
            className="network-option network-option-celo px-4 py-3 rounded-lg min-w-[100px]"
            disabled={isLoading}
          >
            <div className="flex flex-col items-center gap-1">
              <Image
                src="/celo-logo.svg"
                alt="Celo"
                width={20}
                height={20}
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                unoptimized
              />
              <span className="text-sm">Celo</span>
            </div>
          </button>

          <button
            onClick={() => handleChainSelected('monad')}
            className="network-option network-option-monad px-4 py-3 rounded-lg min-w-[100px]"
            disabled={isLoading}
          >
            <div className="flex flex-col items-center gap-1">
              <Image
                src="/monad-logo.svg"
                alt="Monad"
                width={20}
                height={20}
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                unoptimized
              />
              <span className="text-sm">Monad</span>
            </div>
          </button>

          <button
            onClick={() => handleChainSelected('avalanche')}
            className="network-option network-option-avalanche px-4 py-3 rounded-lg min-w-[100px] col-span-2"
            disabled={isLoading}
          >
            <div className="flex flex-col items-center gap-1">
              <Image
                src="/avalanche-logo.svg"
                alt="Avalanche"
                width={20}
                height={20}
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                unoptimized
              />
              <span className="text-sm">Avalanche</span>
            </div>
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
