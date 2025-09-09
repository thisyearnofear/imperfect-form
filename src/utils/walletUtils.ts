/**
 * Unified wallet utilities - Single source of truth for wallet state
 * CONSOLIDATION: Replaces multiple wallet checking patterns
 */

import { WalletState } from '@/contexts/PlatformContext';

/**
 * Check if wallet is connected using unified state
 * ENHANCEMENT: Single source of truth for wallet connection status
 */
export function isWalletConnected(wallet: WalletState): boolean {
  return wallet.isConnected && !!wallet.address;
}

/**
 * Get wallet address with validation
 * ENHANCEMENT: Consistent address retrieval
 */
export function getWalletAddress(wallet: WalletState): string | null {
  return wallet.isConnected ? wallet.address : null;
}

/**
 * Get wallet chain ID with validation
 * ENHANCEMENT: Consistent chain ID retrieval
 */
export function getWalletChainId(wallet: WalletState): number | null {
  return wallet.isConnected ? wallet.chainId : null;
}

/**
 * Check if wallet is on correct network
 * ENHANCEMENT: Network validation utility
 */
export function isWalletOnCorrectNetwork(wallet: WalletState, expectedChainId: number): boolean {
  return isWalletConnected(wallet) && wallet.chainId === expectedChainId;
}

/**
 * Get wallet connection status with details
 * ENHANCEMENT: Comprehensive wallet status
 */
export function getWalletStatus(wallet: WalletState): {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: string | null;
  isConnecting: boolean;
} {
  return {
    isConnected: wallet.isConnected,
    address: wallet.address,
    chainId: wallet.chainId,
    provider: wallet.provider,
    isConnecting: wallet.isConnecting,
  };
}

/**
 * Validate wallet for submission
 * ENHANCEMENT: Comprehensive submission validation
 */
export function validateWalletForSubmission(
  wallet: WalletState,
  requiredChainId?: number
): {
  isValid: boolean;
  reason?: string;
  suggestions: string[];
} {
  if (!isWalletConnected(wallet)) {
    return {
      isValid: false,
      reason: 'Wallet not connected',
      suggestions: ['Connect your wallet to continue'],
    };
  }

  if (requiredChainId && !isWalletOnCorrectNetwork(wallet, requiredChainId)) {
    return {
      isValid: false,
      reason: 'Wrong network',
      suggestions: [`Switch to chain ID ${requiredChainId}`],
    };
  }

  return {
    isValid: true,
    suggestions: [],
  };
}
