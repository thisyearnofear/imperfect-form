/**
 * Enhanced Wallet Provider Utility
 *
 * Provides robust wallet connection handling with WalletConnect fallback
 * specifically designed for Farcaster auto-connection scenarios.
 *
 * Key Features:
 * - Farcaster-first provider detection
 * - WalletConnect fallback for failed connections
 * - Enhanced error handling and recovery
 * - Provider validation without aggressive testing
 * - Transaction-ready provider guarantees
 */

import { ethers } from 'ethers';
import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('EnhancedWalletProvider');

export interface WalletProvider {
  provider: ethers.BrowserProvider;
  source: 'farcaster' | 'injected' | 'walletconnect' | 'fallback';
  isReady: boolean;
  address?: string;
  chainId?: number;
}

export interface ProviderError {
  code: string;
  message: string;
  source: string;
  recoverable: boolean;
}

/**
 * Enhanced provider detection with minimal testing
 * Aligns with latest Farcaster SDK patterns (Dec 2024)
 */
async function detectFarcasterProvider(): Promise<ethers.BrowserProvider | null> {
  try {
    // Try to import Farcaster SDK
    const { sdk } = await import('@farcaster/frame-sdk');

    let rawProvider = null;

    // Use current recommended API: sdk.wallet.getEthereumProvider()
    if (sdk.wallet?.getEthereumProvider) {
      try {
        rawProvider = await Promise.race([
          sdk.wallet.getEthereumProvider(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Provider timeout')), 5000)),
        ]);
        logger.info('✅ Farcaster provider obtained via getEthereumProvider()');
      } catch (error) {
        logger.warn('Farcaster getEthereumProvider() failed:', error);
      }
    }

    // Fallback to legacy API for backward compatibility
    if (!rawProvider && sdk.wallet?.ethProvider) {
      rawProvider = sdk.wallet.ethProvider;
      logger.info('✅ Farcaster provider obtained via legacy ethProvider');
    }

    // Basic EIP-1193 validation without aggressive testing
    if (
      rawProvider &&
      typeof rawProvider === 'object' &&
      'request' in rawProvider &&
      typeof rawProvider.request === 'function'
    ) {
      return new ethers.BrowserProvider(rawProvider as any);
    }

    return null;
  } catch (error) {
    logger.warn('Farcaster SDK not available:', error);
    return null;
  }
}

/**
 * Detect injected wallet providers (MetaMask, Coinbase, etc.)
 */
async function detectInjectedProvider(): Promise<ethers.BrowserProvider | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  try {
    // Basic validation
    if (typeof window.ethereum.request !== 'function') {
      return null;
    }

    logger.info('✅ Injected wallet provider detected');
    return new ethers.BrowserProvider(window.ethereum);
  } catch (error) {
    logger.warn('Injected provider validation failed:', error);
    return null;
  }
}

/**
 * Initialize WalletConnect as fallback
 * This is crucial for cases where Farcaster auto-connection fails
 */
async function initializeWalletConnectFallback(): Promise<ethers.BrowserProvider | null> {
  try {
    // Only initialize WalletConnect if we have a project ID
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId || projectId === '2b1d8e5a5c1e4c8a9b1e3d4a5b6c7d8e') {
      logger.warn('WalletConnect project ID not configured');
      return null;
    }

    // Dynamic import to avoid SSR issues
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

    const walletConnectProvider = await EthereumProvider.init({
      projectId,
      chains: [42220, 137, 8453, 10143], // Celo, Polygon, Base, Monad
      showQrModal: true,
      metadata: {
        name: 'Imperfect Form',
        description: 'Onchain fitness challenges',
        url: window.location.origin,
        icons: [`${window.location.origin}/icon-192x192.png`],
      },
    });

    // Connect the provider
    await walletConnectProvider.connect();

    logger.info('✅ WalletConnect provider initialized');
    return new ethers.BrowserProvider(walletConnectProvider);
  } catch (error) {
    logger.warn('WalletConnect initialization failed:', error);
    return null;
  }
}

/**
 * Get transaction-ready wallet provider
 * This is the main function to use when submitting transactions
 */
export async function getTransactionReadyProvider(): Promise<WalletProvider | null> {
  logger.info('🔍 Getting transaction-ready provider...');

  // Strategy 1: Try Farcaster provider first (for auto-connected users)
  const farcasterProvider = await detectFarcasterProvider();
  if (farcasterProvider) {
    try {
      // Minimal validation - check for accounts without aggressive testing
      const accounts = (await Promise.race([
        farcasterProvider.listAccounts(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ])) as any[];

      if (Array.isArray(accounts) && accounts.length > 0) {
        const network = await farcasterProvider.getNetwork();
        logger.info('✅ Farcaster provider ready for transactions', {
          address: accounts[0]?.address,
          chainId: Number(network.chainId),
        });
        return {
          provider: farcasterProvider,
          source: 'farcaster',
          isReady: true,
          address: accounts[0]?.address,
          chainId: Number(network.chainId),
        };
      } else {
        // Provider exists but no connected accounts - still return it for manual connection
        logger.info('⚠️ Farcaster provider available but no connected accounts');
        return {
          provider: farcasterProvider,
          source: 'farcaster',
          isReady: false,
        };
      }
    } catch (error) {
      logger.warn('Farcaster provider validation failed:', error);
      // Still return provider if it exists - user might need to connect manually
      return {
        provider: farcasterProvider,
        source: 'farcaster',
        isReady: false,
      };
    }
  }

  // Strategy 2: Try injected provider
  const injectedProvider = await detectInjectedProvider();
  if (injectedProvider) {
    try {
      const accounts = await injectedProvider.listAccounts();
      if (accounts.length > 0) {
        const network = await injectedProvider.getNetwork();
        logger.info('✅ Injected provider ready for transactions');
        return {
          provider: injectedProvider,
          source: 'injected',
          isReady: true,
          address: accounts[0].address,
          chainId: Number(network.chainId),
        };
      }
    } catch (error) {
      logger.warn('Injected provider not ready for transactions:', error);
    }
  }

  // Strategy 3: Initialize WalletConnect as fallback
  logger.info('🔗 Attempting WalletConnect fallback...');
  const walletConnectProvider = await initializeWalletConnectFallback();
  if (walletConnectProvider) {
    try {
      const accounts = await walletConnectProvider.listAccounts();
      if (accounts.length > 0) {
        const network = await walletConnectProvider.getNetwork();
        logger.info('✅ WalletConnect provider ready for transactions');
        return {
          provider: walletConnectProvider,
          source: 'walletconnect',
          isReady: true,
          address: accounts[0].address,
          chainId: Number(network.chainId),
        };
      }
    } catch (error) {
      logger.warn('WalletConnect provider failed:', error);
    }
  }

  // Strategy 4: Return basic injected provider even if not ready (for manual connection)
  if (injectedProvider) {
    logger.info('⚠️ Returning unready injected provider for manual connection');
    return {
      provider: injectedProvider,
      source: 'fallback',
      isReady: false,
    };
  }

  logger.error('❌ No wallet provider available');
  return null;
}

/**
 * Enhanced error handling for wallet provider issues
 */
export function handleProviderError(error: unknown, source: string): ProviderError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Farcaster-specific errors
  if (source === 'farcaster') {
    if (lowerMessage.includes('user denied') || lowerMessage.includes('user rejected')) {
      return {
        code: 'USER_REJECTED',
        message: 'Transaction rejected in Farcaster wallet. Please approve the transaction.',
        source: 'farcaster',
        recoverable: true,
      };
    }

    if (lowerMessage.includes('provider') || lowerMessage.includes('not available')) {
      return {
        code: 'PROVIDER_NOT_READY',
        message: 'Farcaster wallet not ready. Try refreshing the app or connecting manually.',
        source: 'farcaster',
        recoverable: true,
      };
    }
  }

  // WalletConnect errors
  if (source === 'walletconnect') {
    if (lowerMessage.includes('session') || lowerMessage.includes('proposal')) {
      return {
        code: 'SESSION_ERROR',
        message: 'WalletConnect session issue. Please try connecting again.',
        source: 'walletconnect',
        recoverable: true,
      };
    }
  }

  // Generic errors
  if (lowerMessage.includes('insufficient funds')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient funds in your wallet.',
      source,
      recoverable: false,
    };
  }

  if (lowerMessage.includes('network') || lowerMessage.includes('chain')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection issue. Please check your connection.',
      source,
      recoverable: true,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage,
    source,
    recoverable: true,
  };
}

/**
 * Validate if a provider is ready for transaction submission
 * Uses gentle validation to avoid false negatives in Farcaster contexts
 */
export async function validateProviderForTransaction(
  provider: ethers.BrowserProvider
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Timeout all operations to prevent hanging
    const timeout = 5000; // 5 seconds

    // Check if provider can access accounts
    const accounts = (await Promise.race([
      provider.listAccounts(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Account access timeout')), timeout)
      ),
    ])) as any[];

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return { valid: false, error: 'No accounts available - please connect wallet' };
    }

    // Check if provider can access network
    const network = (await Promise.race([
      provider.getNetwork(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network access timeout')), timeout)
      ),
    ])) as any;

    if (!network.chainId) {
      return { valid: false, error: 'Cannot determine network' };
    }

    // Light RPC connectivity check - don't fail if balance check fails
    try {
      await Promise.race([
        provider.getBalance(accounts[0]?.address || '0x0'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Balance timeout')), 2000)),
      ]);
    } catch (balanceError) {
      logger.warn('Balance check failed but continuing:', balanceError);
      // Don't fail validation for balance issues - the provider might still work for transactions
    }

    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Provider validation failed:', errorMessage);
    return { valid: false, error: errorMessage };
  }
}

/**
 * Switch network for a provider with enhanced error handling
 */
export async function switchProviderNetwork(
  provider: ethers.BrowserProvider,
  chainId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentNetwork = await provider.getNetwork();
    if (Number(currentNetwork.chainId) === chainId) {
      return { success: true };
    }

    // Get the underlying ethereum provider
    const ethProvider = (provider as any).provider;

    // Try to switch network
    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      return { success: true };
    } catch (switchError: any) {
      // If network doesn't exist, try to add it
      if (switchError.code === 4902) {
        const networkConfig = getNetworkConfig(chainId);
        if (networkConfig) {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });
          return { success: true };
        }
      }
      throw switchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get network configuration for adding chains
 */
function getNetworkConfig(chainId: number) {
  const configs: Record<number, any> = {
    1: {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://eth.drpc.org'],
    },
    137: {
      chainId: '0x89',
      chainName: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrls: ['https://polygon-rpc.com'],
    },
    42220: {
      chainId: '0xa4ec',
      chainName: 'Celo',
      nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
      rpcUrls: ['https://forno.celo.org'],
    },
    8453: {
      chainId: '0x2105',
      chainName: 'Base',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.base.org'],
    },
    10143: {
      chainId: '0x279f',
      chainName: 'Monad Testnet',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: ['https://testnet-rpc.monad.xyz'],
    },
  };

  return configs[chainId];
}

/**
 * Clean up provider connections (useful for WalletConnect)
 */
export async function cleanupProviderConnections(): Promise<void> {
  try {
    // Clean up WalletConnect sessions
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(
        (key) => key.startsWith('wc@2:') || key.includes('walletconnect') || key.includes('reown')
      );
      keys.forEach((key) => localStorage.removeItem(key));
      logger.info(`🧹 Cleaned up ${keys.length} WalletConnect sessions`);
    }
  } catch (error) {
    logger.warn('Provider cleanup failed:', error);
  }
}
