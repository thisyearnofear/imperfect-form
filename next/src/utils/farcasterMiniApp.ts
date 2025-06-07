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