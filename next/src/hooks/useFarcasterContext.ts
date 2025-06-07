import { useState, useEffect } from 'react';
import { createRemoteLogger } from '@/utils/remoteLogger';

// Initialize logger for Farcaster context
const logger = createRemoteLogger('FarcasterContext');

// Type definitions for the official Mini App SDK
interface MiniAppSDK {
  context: {
    user?: {
      fid: number;
      username: string;
      displayName: string;
      pfpUrl: string;
      bio?: string;
      followerCount?: number;
      followingCount?: number;
      verifications?: string[];
    };
  };
  wallet: {
    ethProvider: {
      request: (params: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  };
  actions: {
    ready: () => Promise<void>;
  };
}

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifications?: string[];
}

interface FarcasterSDKContext {
  user?: FarcasterUser;
}

export interface FarcasterContext {
  isInMiniApp: boolean;
  user: FarcasterUser | null;
  walletAddress: string | null;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<string | null>;
  signMessage: (message: string) => Promise<string | null>;
  sendTransaction: (to: string, value: string, data?: string) => Promise<string | null>;
}

/**
 * Hook to detect Farcaster mini app context and access user data
 */
export function useFarcasterContext(): FarcasterContext {
  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk, setSdk] = useState<unknown>(null);

  // Initialize Farcaster SDK and detect mini app context
  useEffect(() => {
    let mounted = true;
    let initializationAttempted = false;

    const initializeFarcaster = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttempted) return;
      initializationAttempted = true;

      try {
        if (!mounted) return;
        setIsLoading(true);
        setError(null);

        // Check if we're in a Farcaster mini app context
        const isInFrame = await detectFarcasterMiniApp();
        if (!mounted) return;

        setIsInMiniApp(isInFrame);

        if (isInFrame) {
          logger.info('Detected Farcaster mini app context');

          // Dynamically import the Farcaster Mini App SDK
          const { sdk } = await import('@farcaster/frame-sdk');
          if (!mounted) return;

          setSdk(sdk);

          // Store SDK - ready() is called in the main page component
          logger.info('🎯 Farcaster Mini App SDK loaded successfully');

          // Get user context from Mini App SDK with timeout
          try {
            const contextPromise = sdk.context;
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Context timeout')), 5000)
            );

            const context = await Promise.race([contextPromise, timeoutPromise]) as FarcasterSDKContext;
            if (!mounted) return;

            if (context?.user && context.user.fid && context.user.username && context.user.displayName && context.user.pfpUrl) {
              const farcasterUser: FarcasterUser = {
                fid: context.user.fid,
                username: context.user.username,
                displayName: context.user.displayName,
                pfpUrl: context.user.pfpUrl,
                bio: context.user.bio,
                followerCount: context.user.followerCount,
                followingCount: context.user.followingCount,
                verifications: context.user.verifications,
              };
              setUser(farcasterUser);
              logger.info('🎯 Farcaster Mini App user loaded', {
                fid: farcasterUser.fid,
                username: farcasterUser.username
              });
            } else {
              logger.warn('Incomplete user data from Mini App SDK context');
            }
          } catch (contextError) {
            logger.warn('Failed to get user context from Mini App SDK', contextError);
          }

          // Check if wallet is already connected using Mini App SDK (non-blocking)
          try {
            if (sdk.wallet?.ethProvider) {
              const accounts = await sdk.wallet.ethProvider.request({
                method: 'eth_accounts'
              }) as string[];

              if (mounted && accounts && accounts.length > 0) {
                setWalletAddress(accounts[0]);
                logger.info('🎯 Farcaster Mini App wallet already connected', {
                  address: accounts[0]
                });
              }
            }
          } catch (walletError) {
            logger.warn('No wallet connected in Farcaster Mini App context', walletError);
          }
        } else {
          logger.info('Not in Farcaster mini app context');
        }
      } catch (err) {
        if (!mounted) return;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error initializing Farcaster';
        setError(errorMessage);
        logger.error('Error initializing Farcaster context', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeFarcaster();

    return () => {
      mounted = false;
    };
  }, []);



  // Connect wallet function using Mini App SDK
  const connectWallet = async (): Promise<string | null> => {
    if (!sdk || !isInMiniApp) {
      logger.warn('Cannot connect wallet: not in Farcaster mini app context', {
        hasSdk: !!sdk,
        isInMiniApp,
      });
      return null;
    }

    try {
      logger.info('🎯 Requesting wallet connection in Farcaster Mini App');

      const miniAppSdk = sdk as MiniAppSDK;

      if (miniAppSdk.wallet?.ethProvider) {
        console.log('🎯 Requesting accounts via Mini App SDK...');
        const accounts = await miniAppSdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        }) as string[];

        console.log('🎯 Accounts received:', accounts);

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          logger.info('🎯 Farcaster Mini App wallet connected successfully', {
            address: accounts[0]
          });
          return accounts[0];
        } else {
          console.log('🎯 No accounts returned');
        }
      } else {
        console.log('🎯 Mini App wallet provider not available');
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      logger.error('Error connecting Farcaster Mini App wallet', err);
      return null;
    }
  };

  // Sign message function using Mini App SDK
  const signMessage = async (message: string): Promise<string | null> => {
    if (!sdk || !isInMiniApp || !walletAddress) {
      logger.warn('Cannot sign message: wallet not connected');
      return null;
    }

    try {
      const miniAppSdk = sdk as MiniAppSDK;
      if (miniAppSdk.wallet?.ethProvider) {
        const signature = await miniAppSdk.wallet.ethProvider.request({
          method: 'personal_sign',
          params: [message, walletAddress],
        }) as string;

        logger.info('🎯 Message signed successfully via Mini App SDK');
        return signature;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setError(errorMessage);
      logger.error('Error signing message via Mini App SDK', err);
      return null;
    }
  };

  // Send transaction function using Mini App SDK
  const sendTransaction = async (to: string, value: string, data?: string): Promise<string | null> => {
    if (!sdk || !isInMiniApp || !walletAddress) {
      logger.warn('Cannot send transaction: wallet not connected');
      return null;
    }

    try {
      const miniAppSdk = sdk as MiniAppSDK;
      if (miniAppSdk.wallet?.ethProvider) {
        const txHash = await miniAppSdk.wallet.ethProvider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to,
            value,
            data: data || '0x',
          }],
        }) as string;

        logger.info('🎯 Transaction sent successfully via Mini App SDK', { txHash });
        return txHash;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      logger.error('Error sending transaction via Mini App SDK', err);
      return null;
    }
  };

  return {
    isInMiniApp,
    user,
    walletAddress,
    isLoading,
    error,
    connectWallet,
    signMessage,
    sendTransaction,
  };
}

/**
 * Detect if the app is running in a Farcaster mini app context using official SDK
 */
async function detectFarcasterMiniApp(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // First, try the official Mini App SDK detection
    const { sdk } = await import('@farcaster/frame-sdk');

    // Check if we can get context (indicates we're in a mini app)
    const context = await sdk.context;
    if (context && context.user) {
      logger.info('🎯 Detected Farcaster Mini App via official SDK (has context)');
      return true;
    }
  } catch (error) {
    logger.warn('Official Mini App SDK detection failed, falling back to manual detection', error);
  }

  // Fallback: Enhanced detection with comprehensive checks
  const detectionResults = {
    userAgent: false,
    windowProperty: false,
    frameParam: false,
    referrer: false,
    hostname: false,
    warpcastParam: false,
    farcasterParam: false,
    parentOrigin: false,
  };

  // Check user agent for Farcaster/Warpcast
  detectionResults.userAgent = /farcaster|warpcast/i.test(navigator.userAgent);

  // Check for Farcaster-specific window properties
  detectionResults.windowProperty = 'farcaster' in window;

  // Check for frame context in URL parameters
  detectionResults.frameParam = window.location.search.includes('frame=');

  // Check for warpcast or farcaster in URL parameters
  detectionResults.warpcastParam = window.location.search.includes('warpcast');
  detectionResults.farcasterParam = window.location.search.includes('farcaster');

  // Check for Farcaster referrer
  detectionResults.referrer = document.referrer.includes('warpcast.com') ||
                             document.referrer.includes('farcaster.xyz') ||
                             document.referrer.includes('warpcast.xyz');

  // Check hostname for frame or farcaster indicators
  try {
    detectionResults.hostname = window.location.hostname.includes('frame') ||
                               window.location.hostname.includes('farcaster');
  } catch {
    detectionResults.hostname = false;
  }

  // Check if we're in an iframe with Farcaster parent
  try {
    if (window.parent !== window) {
      // We're in an iframe, check if parent origin suggests Farcaster
      detectionResults.parentOrigin = window.location !== window.parent.location;
    }
  } catch {
    // Cross-origin iframe, which is common for Farcaster frames
    detectionResults.parentOrigin = true;
  }

  const detected = Object.values(detectionResults).some(result => result);

  // Enhanced logging with individual detection results
  logger.info('🎭 Farcaster mini app detection (fallback)', {
    detected,
    detectionResults,
    userAgent: navigator.userAgent,
    referrer: document.referrer,
    hostname: window.location.hostname,
    search: window.location.search,
    href: window.location.href,
    isIframe: window.parent !== window,
  });

  // Safe debugging without overrides
  if (process.env.NODE_ENV !== 'production') {
    console.log('🎭 Farcaster Detection Debug (fallback):', {
      detected,
      detectionResults,
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });
  }

  return detected;
}
