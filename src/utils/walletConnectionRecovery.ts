/**
 * Wallet Connection Recovery System
 *
 * Provides comprehensive error handling, retry logic, and recovery mechanisms
 * for wallet connection issues during transaction submission.
 */

import { createRemoteLogger } from './remoteLogger';
import { getEthereumProvider } from './farcasterMiniApp';
import {
  safelyAccessEthereum,
  getBestProvider,
  initializeProviderSafely,
} from './providerConflictResolver';
import {
  cleanupWalletConnectSessions,
  preventiveWalletConnectCleanup,
} from './walletConnectCleanup';
import { validateFarcasterWallet } from './walletCompatibilityFixes';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('WalletConnectionRecovery');

export interface ConnectionRecoveryResult {
  success: boolean;
  provider?: any;
  error?: string;
  retryCount: number;
  recoveryMethod?: string;
  suggestions: string[];
}

export interface RecoveryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  enableCleanup?: boolean;
  enableFarcasterValidation?: boolean;
  showToasts?: boolean;
}

/**
 * Comprehensive wallet connection recovery with multiple strategies
 */
export async function recoverWalletConnection(
  options: RecoveryOptions = {}
): Promise<ConnectionRecoveryResult> {
  const {
    maxRetries = 3,
    retryDelayMs = 1000,
    enableCleanup = true,
    enableFarcasterValidation = true,
    showToasts = true,
  } = options;

  let retryCount = 0;
  let lastError: string = '';
  const suggestions: string[] = [];

  logger.info('Starting wallet connection recovery', { options });

  // Recovery strategies in order of preference
  const recoveryStrategies = [
    { name: 'direct-provider', method: tryDirectProviderAccess },
    { name: 'farcaster-validation', method: tryFarcasterValidation },
    { name: 'provider-cleanup', method: tryProviderCleanup },
    { name: 'provider-reinitialization', method: tryProviderReinitialization },
    { name: 'walletconnect-cleanup', method: tryWalletConnectCleanup },
  ];

  for (const strategy of recoveryStrategies) {
    if (retryCount >= maxRetries) {
      break;
    }

    try {
      logger.info(`Attempting recovery strategy: ${strategy.name}`, { retryCount });

      if (showToasts) {
        toast.loading(`Attempting to reconnect wallet... (${retryCount + 1}/${maxRetries})`);
      }

      const result = await strategy.method({
        enableCleanup,
        enableFarcasterValidation,
        retryCount,
      });

      if (result.success) {
        if (showToasts) {
          toast.dismiss();
          toast.success('Wallet reconnected successfully!');
        }

        logger.info(`Recovery successful with strategy: ${strategy.name}`, { retryCount });

        return {
          success: true,
          provider: result.provider,
          retryCount,
          recoveryMethod: strategy.name,
          suggestions: result.suggestions || [],
        };
      }

      lastError = result.error || `Strategy ${strategy.name} failed`;
      suggestions.push(...(result.suggestions || []));
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Recovery strategy ${strategy.name} threw error:`, error);
    }

    retryCount++;

    // Wait before next retry
    if (retryCount < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * retryCount));
    }
  }

  if (showToasts) {
    toast.dismiss();
    toast.error('Failed to reconnect wallet. Please try manually reconnecting.');
  }

  // Add general suggestions if no specific ones were provided
  if (suggestions.length === 0) {
    suggestions.push(
      'Refresh the page and try again',
      'Make sure your wallet extension is installed and unlocked',
      'Try using a different browser or disabling other wallet extensions',
      'Clear your browser cache and cookies'
    );
  }

  return {
    success: false,
    error: lastError,
    retryCount,
    suggestions: [...new Set(suggestions)], // Remove duplicates
  };
}

/**
 * Strategy 1: Try direct provider access
 */
async function tryDirectProviderAccess(context: any): Promise<ConnectionRecoveryResult> {
  try {
    // Try multiple provider access methods
    const providers = [
      await getEthereumProvider(),
      safelyAccessEthereum(),
      await getBestProvider(),
    ].filter(Boolean);

    for (const provider of providers) {
      if (await testProviderConnection(provider)) {
        return {
          success: true,
          provider,
          retryCount: context.retryCount,
          suggestions: ['Provider connection restored'],
        };
      }
    }

    return {
      success: false,
      error: 'No working provider found',
      retryCount: context.retryCount,
      suggestions: ['Try refreshing the page', 'Check if wallet extension is enabled'],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Provider access failed',
      retryCount: context.retryCount,
      suggestions: ['Wallet extension may not be properly installed'],
    };
  }
}

/**
 * Strategy 2: Validate Farcaster wallet if in Farcaster context
 */
async function tryFarcasterValidation(context: any): Promise<ConnectionRecoveryResult> {
  if (!context.enableFarcasterValidation) {
    return {
      success: false,
      error: 'Farcaster validation disabled',
      retryCount: context.retryCount,
      suggestions: [],
    };
  }

  try {
    const isFarcaster =
      typeof window !== 'undefined' &&
      (window.location.href.includes('farcaster') ||
        document.referrer.includes('warpcast') ||
        document.referrer.includes('farcaster'));

    if (!isFarcaster) {
      return {
        success: false,
        error: 'Not in Farcaster context',
        retryCount: context.retryCount,
        suggestions: [],
      };
    }

    const validation = await validateFarcasterWallet();

    if (validation.isValid) {
      const provider = await getEthereumProvider();
      if (provider && (await testProviderConnection(provider))) {
        return {
          success: true,
          provider,
          retryCount: context.retryCount,
          suggestions: ['Farcaster wallet validated successfully'],
        };
      }
    }

    return {
      success: false,
      error: validation.message,
      retryCount: context.retryCount,
      suggestions: [
        'Make sure you have a wallet connected in the Farcaster app',
        'Try refreshing the mini app',
      ],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Farcaster validation failed',
      retryCount: context.retryCount,
      suggestions: ['Try opening the app in a regular browser'],
    };
  }
}

/**
 * Strategy 3: Clean up provider conflicts
 */
async function tryProviderCleanup(context: any): Promise<ConnectionRecoveryResult> {
  if (!context.enableCleanup) {
    return {
      success: false,
      error: 'Cleanup disabled',
      retryCount: context.retryCount,
      suggestions: [],
    };
  }

  try {
    // Clear any cached provider state
    if (typeof window !== 'undefined') {
      // Clear common provider caches
      const cacheKeys = ['ethereum-provider-cache', 'wallet-provider-cache', 'last-used-provider'];

      cacheKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          // Ignore storage errors
        }
      });
    }

    // Wait a moment for cleanup to take effect
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Try to get a fresh provider
    const provider = await initializeProviderSafely();

    if (provider && (await testProviderConnection(provider))) {
      return {
        success: true,
        provider,
        retryCount: context.retryCount,
        suggestions: ['Provider cache cleared successfully'],
      };
    }

    return {
      success: false,
      error: 'Provider cleanup did not resolve the issue',
      retryCount: context.retryCount,
      suggestions: ['Try disabling other wallet extensions'],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Provider cleanup failed',
      retryCount: context.retryCount,
      suggestions: ['Manual browser cache clearing may be needed'],
    };
  }
}

/**
 * Strategy 4: Reinitialize provider safely
 */
async function tryProviderReinitialization(context: any): Promise<ConnectionRecoveryResult> {
  try {
    // Force provider reinitialization
    const provider = await initializeProviderSafely();

    if (provider) {
      // Give the provider time to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (await testProviderConnection(provider)) {
        return {
          success: true,
          provider,
          retryCount: context.retryCount,
          suggestions: ['Provider reinitialized successfully'],
        };
      }
    }

    return {
      success: false,
      error: 'Provider reinitialization failed',
      retryCount: context.retryCount,
      suggestions: ['Wallet may need to be manually reconnected'],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Reinitialization failed',
      retryCount: context.retryCount,
      suggestions: ['Try refreshing the entire page'],
    };
  }
}

/**
 * Strategy 5: Clean up WalletConnect sessions
 */
async function tryWalletConnectCleanup(context: any): Promise<ConnectionRecoveryResult> {
  if (!context.enableCleanup) {
    return {
      success: false,
      error: 'WalletConnect cleanup disabled',
      retryCount: context.retryCount,
      suggestions: [],
    };
  }

  try {
    // Perform preventive cleanup
    await preventiveWalletConnectCleanup();

    // Clean up existing sessions
    const cleanupResult = await cleanupWalletConnectSessions();

    if (cleanupResult.keysRemoved > 0) {
      logger.info('WalletConnect cleanup removed keys:', cleanupResult.keysRemoved);

      // Wait for cleanup to take effect
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to get provider after cleanup
      const provider = await getEthereumProvider();

      if (provider && (await testProviderConnection(provider))) {
        return {
          success: true,
          provider,
          retryCount: context.retryCount,
          suggestions: [`Cleaned up ${cleanupResult.keysRemoved} WalletConnect sessions`],
        };
      }
    }

    return {
      success: false,
      error: 'WalletConnect cleanup did not resolve the issue',
      retryCount: context.retryCount,
      suggestions: ['Try disconnecting and reconnecting your wallet'],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'WalletConnect cleanup failed',
      retryCount: context.retryCount,
      suggestions: ['Manual wallet disconnection may be needed'],
    };
  }
}

/**
 * Test if a provider is working properly
 */
async function testProviderConnection(provider: any): Promise<boolean> {
  if (!provider || typeof provider.request !== 'function') {
    return false;
  }

  try {
    // Test with a simple, non-intrusive method
    await Promise.race([
      provider.request({ method: 'eth_chainId' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);

    return true;
  } catch (error) {
    logger.warn('Provider connection test failed:', error);
    return false;
  }
}

/**
 * Quick wallet connection check with auto-recovery
 */
export async function ensureWalletConnection(options?: RecoveryOptions): Promise<{
  isConnected: boolean;
  provider?: any;
  error?: string;
  suggestions: string[];
}> {
  try {
    // First, try to get the current provider
    const provider = await getEthereumProvider();

    if (provider && (await testProviderConnection(provider))) {
      return {
        isConnected: true,
        provider,
        suggestions: [],
      };
    }

    // If no provider or connection failed, attempt recovery
    logger.info('Wallet connection check failed, attempting recovery');

    const recovery = await recoverWalletConnection({
      maxRetries: 2,
      showToasts: false,
      ...options,
    });

    return {
      isConnected: recovery.success,
      provider: recovery.provider,
      error: recovery.error,
      suggestions: recovery.suggestions,
    };
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Connection check failed',
      suggestions: [
        'Refresh the page and try again',
        'Make sure your wallet extension is installed and unlocked',
      ],
    };
  }
}
