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
        sdkKeys: Object.keys(sdk)
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
        )
      ]);

      logger.info('🎯 Farcaster ready() called successfully with options', {
        disableNativeGestures,
        timeoutMs
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
    userAgent: window.navigator.userAgent.includes('Farcaster') || window.navigator.userAgent.includes('Warpcast'),
    url: window.location.href.includes('farcaster') || window.location.href.includes('warpcast')
  };

  const result = Object.values(checks).some(check => check);

  logger.info('🎯 Simple Farcaster detection', {
    result,
    checks,
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    href: window.location.href
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
    simpleDetection: isFarcasterMiniApp()
  });
}

/**
 * Get the appropriate Ethereum provider - either Farcaster Mini App or window.ethereum
 * This is crucial for score submission to work in Mini Apps
 */
export async function getEthereumProvider(): Promise<unknown> {
  if (typeof window === 'undefined') return null;

  try {
    // First, try to get Farcaster Mini App provider
    const { sdk } = await import('@farcaster/frame-sdk');

    if (sdk.wallet?.ethProvider) {
      logger.info('🎯 Using Farcaster Mini App Ethereum provider');
      return sdk.wallet.ethProvider;
    }
  } catch {
    logger.warn('🎯 Farcaster SDK not available, falling back to window.ethereum');
  }

  // Fallback to window.ethereum
  const windowEthereum = (window as { ethereum?: unknown }).ethereum;
  if (windowEthereum) {
    logger.info('🎯 Using window.ethereum provider');
    return windowEthereum;
  }

  logger.warn('🎯 No Ethereum provider found');
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
        supportedChains
      });
      return false;
    }

    // Use the provider to switch chains
    const provider = sdk.wallet.ethProvider as { request: (args: { method: string; params: unknown[] }) => Promise<unknown> };

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

/**
 * Get optimized transaction timeout settings for Farcaster mini apps
 * Provides more generous timeouts and better user feedback for mini app environments
 */
export function getFarcasterTransactionTimeouts() {
  const isFarcaster = isFarcasterMiniApp();

  return {
    // Wagmi useWaitForTransactionReceipt timeout
    receiptTimeout: isFarcaster ? 60000 : 30000, // 60s for Farcaster, 30s for web

    // Polling interval for transaction status
    pollingInterval: isFarcaster ? 2000 : 4000, // 2s for Farcaster, 4s for web

    // Progressive timeout messages
    firstMessage: isFarcaster ? 8000 : 15000, // Show first message after 8s/15s
    secondMessage: isFarcaster ? 15000 : 30000, // Show second message after 15s/30s
    thirdMessage: isFarcaster ? 30000 : 60000, // Show third message after 30s/60s

    // Final timeout before giving up
    finalTimeout: isFarcaster ? 90000 : 120000, // 90s for Farcaster, 120s for web
  };
}

/**
 * Get user-friendly timeout messages with encouraging one-liners
 */
export function getFarcasterTimeoutMessages() {
  const isFarcaster = isFarcasterMiniApp();

  if (isFarcaster) {
    // Add some variety with random fun messages
    const firstMessages = [
      "Good things take time... ⏳ Your transaction is brewing!",
      "Rome wasn't built in a day... 🏛️ Neither is your score!",
      "Patience, young grasshopper... 🦗 Your transaction is processing!"
    ];

    const secondMessages = [
      "Still cooking your score submission... 🍳 Almost ready!",
      "Your transaction is doing some heavy lifting... 💪 Hang tight!",
      "Quality over speed! 🎯 Your transaction is being extra careful!"
    ];

    const thirdMessages = [
      "Your transaction is taking the scenic route, but it's still on its way! 🚗💨",
      "Slow and steady wins the race! 🐢 Your transaction is almost there!",
      "Your transaction is being a perfectionist... 🎨 It wants to get it just right!"
    ];

    const errorMessages = [
      "Your transaction is playing hard to get, but don't worry - it's probably just being thorough! Check the explorer to see if it made it through.",
      "Looks like your transaction took a coffee break! ☕ Check the explorer to see if it finished the job.",
      "Your transaction might be stuck in traffic, but it's probably still moving! 🚦 Check the explorer for updates."
    ];

    return {
      first: firstMessages[Math.floor(Math.random() * firstMessages.length)],
      second: secondMessages[Math.floor(Math.random() * secondMessages.length)],
      third: thirdMessages[Math.floor(Math.random() * thirdMessages.length)],
      error: errorMessages[Math.floor(Math.random() * errorMessages.length)]
    };
  } else {
    return {
      first: "Patience is a virtue... ⏳ Your transaction is processing!",
      second: "Still working on it... 🔧 Network might be busy!",
      third: "Your transaction is taking its sweet time, but it's still processing in the background.",
      error: "Transaction confirmation is taking longer than expected. Please check the explorer to verify the status."
    };
  }
}