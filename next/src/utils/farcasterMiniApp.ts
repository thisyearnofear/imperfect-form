/**
 * Farcaster Mini App utilities
 *
 * IMPORTANT: This file centralizes all Farcaster Mini App initialization logic
 * to prevent duplicate ready() calls and splash screen issues.
 */

import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('FarcasterMiniApp');

/**
 * Calls Farcaster ready() to dismiss the splash screen
 *
 * CRITICAL: This should only be called ONCE per app load, as soon as the basic UI is ready.
 * Multiple calls can cause conflicts and prevent the splash screen from being dismissed.
 *
 * @returns Promise that resolves when ready() is called successfully
 */
export async function callFarcasterReady(): Promise<void> {
  try {
    logger.info('🎯 Attempting to call Farcaster ready()...');

    // Dynamically import the Farcaster SDK
    const { sdk } = await import('@farcaster/frame-sdk');
    logger.info('🎯 Farcaster SDK imported successfully');

    if (sdk.actions?.ready) {
      logger.info('🎯 SDK ready() method available, calling now...');
      await sdk.actions.ready();
      logger.info('🎯 Farcaster ready() called successfully - splash screen dismissed');
    } else {
      logger.warn('🎯 Farcaster SDK ready() not available', {
        hasActions: !!sdk.actions,
        sdkKeys: Object.keys(sdk),
      });
    }
  } catch (error) {
    logger.warn('🎯 Failed to call Farcaster ready():', error);
    // Don't throw - the app should continue even if ready() fails
  }
}

/**
 * Enhanced ready() call with timeout and error handling
 *
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @param disableNativeGestures - Whether to disable native gestures (default: false)
 */
export async function callFarcasterReadyWithOptions(
  timeoutMs: number = 5000,
  disableNativeGestures: boolean = false
): Promise<void> {
  try {
    const { sdk } = await import('@farcaster/frame-sdk');

    if (sdk.actions?.ready) {
      // Add timeout to prevent hanging
      await Promise.race([
        sdk.actions.ready({ disableNativeGestures }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ready() timeout')), timeoutMs)
        ),
      ]);

      logger.info('🎯 Farcaster ready() called successfully with options', {
        disableNativeGestures,
        timeoutMs,
      });
    } else {
      logger.warn('Farcaster SDK ready() not available');
    }
  } catch (error) {
    logger.warn('Failed to call Farcaster ready() with options:', error);
    // Don't throw - the app should continue even if ready() fails
  }
}

/**
 * Check if we're in a Farcaster Mini App context
 * This is a simple check that doesn't require SDK initialization
 */
export function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false;

  const checks = {
    iframe: window.parent !== window,
    differentLocation: window.location !== window.parent.location,
    referrer: document.referrer.includes('farcaster') || document.referrer.includes('warpcast'),
    userAgent:
      window.navigator.userAgent.includes('Farcaster') ||
      window.navigator.userAgent.includes('Warpcast'),
    url: window.location.href.includes('farcaster') || window.location.href.includes('warpcast'),
  };

  const result = Object.values(checks).some((check) => check);

  logger.info('🎯 Simple Farcaster detection', {
    result,
    checks,
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    href: window.location.href,
  });

  return result;
}

/**
 * Debug function to log all detection info
 */
export function debugFarcasterContext(): void {
  if (typeof window === 'undefined') return;

  console.log('🎯 Farcaster Debug Info:', {
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    href: window.location.href,
    search: window.location.search,
    hostname: window.location.hostname,
    isIframe: window.parent !== window,
    hasParentDifference: window.location !== window.parent.location,
    simpleDetection: isFarcasterMiniApp(),
  });
}

/**
 * Get the appropriate Ethereum provider - either Farcaster Mini App or window.ethereum
 * This is crucial for score submission to work in Mini Apps
 * Updated to use the latest Farcaster SDK API with enhanced error handling
 */
export async function getEthereumProvider(): Promise<unknown> {
  if (typeof window === 'undefined') return null;

  // Helper function to validate provider with more thorough checks
  const validateProvider = (provider: any): boolean => {
    try {
      return (
        provider &&
        typeof provider === 'object' &&
        typeof provider.request === 'function' &&
        // Additional checks to ensure provider is functional
        provider.request !== undefined &&
        provider.request !== null &&
        // Check if provider has basic ethereum methods
        (provider.isMetaMask !== undefined ||
          provider.isCoinbaseWallet !== undefined ||
          provider.isCoinbaseBrowser !== undefined ||
          provider.isWalletConnect !== undefined ||
          provider.selectedAddress !== undefined ||
          provider.chainId !== undefined)
      );
    } catch (error) {
      logger.warn('Provider validation error:', error);
      return false;
    }
  };

  // Test provider functionality with multiple checks
  const testProvider = async (provider: any): Promise<boolean> => {
    try {
      // First try a non-intrusive method to check if provider is responsive
      try {
        await Promise.race([
          provider.request({ method: 'eth_chainId' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        return true;
      } catch (chainIdError) {
        // If chainId fails, try accounts (might prompt user)
        try {
          await Promise.race([
            provider.request({ method: 'eth_accounts' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
          ]);
          return true;
        } catch (accountsError) {
          logger.warn('Provider test failed for both chainId and accounts:', {
            chainIdError,
            accountsError,
          });
          return false;
        }
      }
    } catch (error) {
      logger.warn('Provider test failed:', error);
      return false;
    }
  };

  try {
    // First, try to get Farcaster Mini App provider using the new API
    const { sdk } = await import('@farcaster/frame-sdk');

    // Use the new getEthereumProvider() method instead of direct ethProvider access
    if (sdk.wallet?.getEthereumProvider) {
      try {
        const provider = await Promise.race([
          sdk.wallet.getEthereumProvider(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Provider timeout')), 3000)),
        ]);

        if (validateProvider(provider)) {
          logger.info('🎯 Using Farcaster Mini App Ethereum provider (new API)');
          return provider;
        }
      } catch (providerError) {
        logger.warn('🎯 Failed to get provider via new API:', providerError);
      }
    }

    // Fallback to old API for backward compatibility
    if (sdk.wallet?.ethProvider && validateProvider(sdk.wallet.ethProvider)) {
      const provider = sdk.wallet.ethProvider;
      const isWorking = await testProvider(provider);
      if (isWorking) {
        logger.info('🎯 Using Farcaster Mini App Ethereum provider (legacy API)');
        return provider;
      } else {
        logger.warn('🎯 Farcaster provider validation failed, trying alternatives');
      }
    }
  } catch (error) {
    logger.warn('🎯 Farcaster SDK not available, falling back to window.ethereum:', error);
  }

  // Fallback to window.ethereum
  const windowEthereum = (window as { ethereum?: unknown }).ethereum;
  if (validateProvider(windowEthereum)) {
    logger.info('🎯 Using window.ethereum provider');
    return windowEthereum;
  }

  // Additional fallback: check for other common provider names
  const alternativeProviders = [
    (window as any).web3?.currentProvider,
    (window as any).web3Provider,
    (window as any).ethereum,
    (window as any).coinbaseWalletExtension,
    (window as any).walletConnect,
  ];

  for (const provider of alternativeProviders) {
    if (validateProvider(provider)) {
      logger.info('🎯 Using alternative provider:', {
        hasRequest: !!provider.request,
        isMetaMask: provider.isMetaMask,
        isCoinbaseWallet: provider.isCoinbaseWallet,
      });
      return provider;
    }
  }

  logger.warn('🎯 No valid Ethereum provider found - checked all fallbacks');
  return null;
}

/**
 * Get supported chains in Farcaster Mini App
 * Returns CAIP-2 identifiers like "eip155:42220" for Celo
 */
export async function getFarcasterSupportedChains(): Promise<string[]> {
  try {
    const { sdk } = await import('@farcaster/frame-sdk');

    if (sdk.getChains) {
      const chains = await sdk.getChains();
      logger.info('🎯 Farcaster supported chains:', chains);
      return chains;
    }
  } catch (error) {
    logger.warn('🎯 Failed to get Farcaster supported chains:', error);
  }

  return [];
}

/**
 * Switch chain in Farcaster Mini App context
 * Uses the Farcaster wallet's native chain switching
 */
export async function switchFarcasterChain(chainId: number): Promise<boolean> {
  try {
    const { sdk } = await import('@farcaster/frame-sdk');

    if (!sdk.wallet?.ethProvider) {
      logger.warn('🎯 Farcaster wallet provider not available');
      return false;
    }

    // Check if the chain is supported
    const supportedChains = await getFarcasterSupportedChains();
    const caipChainId = `eip155:${chainId}`;

    if (!supportedChains.includes(caipChainId)) {
      logger.warn('🎯 Chain not supported by Farcaster wallet', {
        chainId,
        caipChainId,
        supportedChains,
      });
      return false;
    }

    // Use the provider to switch chains
    const provider = sdk.wallet.ethProvider as {
      request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
    };

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });

    logger.info('🎯 Successfully switched Farcaster wallet to chain:', chainId);
    return true;
  } catch (error) {
    logger.warn('🎯 Failed to switch Farcaster wallet chain:', error);
    return false;
  }
}

// Note: Timeout functions removed since we now treat transaction submission as immediate success
// This simplifies the codebase and provides better user experience
