import { useState, useEffect } from 'react';
import { createRemoteLogger } from '@/utils/remoteLogger';

// Initialize logger for Farcaster context
const logger = createRemoteLogger('FarcasterContext');

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
    const initializeFarcaster = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if we're in a Farcaster mini app context
        const isInFrame = detectFarcasterMiniApp();
        setIsInMiniApp(isInFrame);

        if (isInFrame) {
          logger.info('Detected Farcaster mini app context');

          // Dynamically import the Farcaster SDK
          const farcasterSdkModule = await import('@farcaster/frame-sdk');
          const farcasterSdk = farcasterSdkModule.sdk || farcasterSdkModule.default || farcasterSdkModule;
          setSdk(farcasterSdk);

          // Initialize the SDK
          const sdkObj = farcasterSdk as Record<string, unknown>;
          if (sdkObj.actions && typeof sdkObj.actions === 'object') {
            const actions = sdkObj.actions as Record<string, unknown>;
            if (typeof actions.ready === 'function') {
              await (actions.ready as () => Promise<void>)();
            }
          }
          logger.info('Farcaster SDK initialized');

          // Get user context
          const context = await (farcasterSdk as Record<string, unknown>).context;
          if (context && typeof context === 'object' && 'user' in context) {
            const contextUser = (context as Record<string, unknown>).user;
            if (contextUser && typeof contextUser === 'object') {
              const userObj = contextUser as Record<string, unknown>;
              const farcasterUser: FarcasterUser = {
                fid: userObj.fid as number,
                username: userObj.username as string,
                displayName: userObj.displayName as string,
                pfpUrl: userObj.pfpUrl as string,
                bio: userObj.bio as string | undefined,
                followerCount: userObj.followerCount as number | undefined,
                followingCount: userObj.followingCount as number | undefined,
                verifications: userObj.verifications as string[] | undefined,
              };
              setUser(farcasterUser);
              logger.info('Farcaster user loaded', { fid: farcasterUser.fid, username: farcasterUser.username });
            }
          }

          // Check if wallet is already connected
          try {
            const walletProvider = (farcasterSdk as Record<string, unknown>).wallet;
            if (walletProvider && typeof walletProvider === 'object' && 'ethProvider' in walletProvider) {
              const ethProvider = (walletProvider as Record<string, unknown>).ethProvider;
              if (ethProvider && typeof ethProvider === 'object' && 'request' in ethProvider) {
                const requestFn = (ethProvider as Record<string, unknown>).request as (params: Record<string, unknown>) => Promise<string[]>;
                const accounts = await requestFn({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                  setWalletAddress(accounts[0]);
                  logger.info('Farcaster wallet already connected', { address: accounts[0] });
                }
              }
            }
          } catch (walletError) {
            logger.warn('No wallet connected in Farcaster context', walletError);
          }
        } else {
          logger.info('Not in Farcaster mini app context');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error initializing Farcaster';
        setError(errorMessage);
        logger.error('Error initializing Farcaster context', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

  // Connect wallet function
  const connectWallet = async (): Promise<string | null> => {
    if (!sdk || !isInMiniApp) {
      logger.warn('Cannot connect wallet: not in Farcaster mini app context', {
        hasSdk: !!sdk,
        isInMiniApp,
      });
      return null;
    }

    try {
      logger.info('Requesting wallet connection in Farcaster mini app');

      // Add detailed debugging
      console.log('🎭 Farcaster SDK object:', sdk);

      const walletProvider = (sdk as Record<string, unknown>).wallet;
      console.log('🎭 Wallet provider:', walletProvider);

      if (walletProvider && typeof walletProvider === 'object' && 'ethProvider' in walletProvider) {
        const ethProvider = (walletProvider as Record<string, unknown>).ethProvider;
        console.log('🎭 ETH provider:', ethProvider);

        if (ethProvider && typeof ethProvider === 'object' && 'request' in ethProvider) {
          const requestFn = (ethProvider as Record<string, unknown>).request as (params: Record<string, unknown>) => Promise<string[]>;

          console.log('🎭 Requesting accounts...');
          const accounts = await requestFn({ method: 'eth_requestAccounts' });
          console.log('🎭 Accounts received:', accounts);

          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            logger.info('Farcaster wallet connected successfully', { address: accounts[0] });
            return accounts[0];
          } else {
            console.log('🎭 No accounts returned');
          }
        } else {
          console.log('🎭 ETH provider missing request method');
        }
      } else {
        console.log('🎭 Wallet provider missing or invalid');
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      logger.error('Error connecting Farcaster wallet', err);
      return null;
    }
  };

  // Sign message function
  const signMessage = async (message: string): Promise<string | null> => {
    if (!sdk || !isInMiniApp || !walletAddress) {
      logger.warn('Cannot sign message: wallet not connected');
      return null;
    }

    try {
      const walletProvider = (sdk as Record<string, unknown>).wallet;
      if (walletProvider && typeof walletProvider === 'object' && 'ethProvider' in walletProvider) {
        const ethProvider = (walletProvider as Record<string, unknown>).ethProvider;
        if (ethProvider && typeof ethProvider === 'object' && 'request' in ethProvider) {
          const requestFn = (ethProvider as Record<string, unknown>).request as (params: Record<string, unknown>) => Promise<string>;
          const signature = await requestFn({
            method: 'personal_sign',
            params: [message, walletAddress],
          });
          logger.info('Message signed successfully');
          return signature;
        }
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setError(errorMessage);
      logger.error('Error signing message', err);
      return null;
    }
  };

  // Send transaction function
  const sendTransaction = async (to: string, value: string, data?: string): Promise<string | null> => {
    if (!sdk || !isInMiniApp || !walletAddress) {
      logger.warn('Cannot send transaction: wallet not connected');
      return null;
    }

    try {
      const walletProvider = (sdk as Record<string, unknown>).wallet;
      if (walletProvider && typeof walletProvider === 'object' && 'ethProvider' in walletProvider) {
        const ethProvider = (walletProvider as Record<string, unknown>).ethProvider;
        if (ethProvider && typeof ethProvider === 'object' && 'request' in ethProvider) {
          const requestFn = (ethProvider as Record<string, unknown>).request as (params: Record<string, unknown>) => Promise<string>;
          const txHash = await requestFn({
            method: 'eth_sendTransaction',
            params: [{
              from: walletAddress,
              to,
              value,
              data: data || '0x',
            }],
          });
          logger.info('Transaction sent successfully', { txHash });
          return txHash;
        }
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      logger.error('Error sending transaction', err);
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
 * Detect if the app is running in a Farcaster mini app context
 */
function detectFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Enhanced detection with more comprehensive checks
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
  logger.info('Farcaster mini app detection (enhanced)', {
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
    console.log('🎭 Farcaster Detection Debug:', {
      detected,
      detectionResults,
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });
  }

  return detected;
}
