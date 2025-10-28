/**
 * Enhanced Wallet Connection Hook
 *
 * Provides robust wallet connection handling with automatic fallbacks
 * specifically designed for Farcaster auto-connection scenarios.
 *
 * Key Features:
 * - Auto-detects best available provider (Farcaster -> Injected -> WalletConnect)
 * - Handles connection failures gracefully with fallback options
 * - Provides transaction-ready validation
 * - Enhanced error handling with recovery suggestions
 * - React-friendly with proper state management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTransactionReadyProvider,
  handleProviderError,
  validateProviderForTransaction,
  switchProviderNetwork,
  cleanupProviderConnections,
  type WalletProvider,
  type ProviderError,
} from '@/utils/enhancedWalletProvider';
import { createRemoteLogger } from '@/utils/remoteLogger';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('EnhancedWalletConnection');

export interface WalletConnectionState {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  isReady: boolean; // Ready for transactions

  // Provider info
  provider: WalletProvider | null;
  address: string | null;
  chainId: number | null;
  source: 'farcaster' | 'injected' | 'walletconnect' | 'fallback' | null;

  // Error handling
  error: ProviderError | null;
  lastConnectionAttempt: Date | null;

  // Capabilities
  canSwitchChain: boolean;
  supportsWalletConnect: boolean;
}

export interface WalletConnectionActions {
  // Connection management
  connect: (forceWalletConnect?: boolean) => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;

  // Network management
  switchChain: (chainId: number) => Promise<boolean>;

  // Transaction preparation
  ensureReady: () => Promise<boolean>;
  validateForTransaction: () => Promise<boolean>;

  // Error recovery
  clearError: () => void;
  cleanup: () => Promise<void>;
}

const initialState: WalletConnectionState = {
  isConnected: false,
  isConnecting: false,
  isReady: false,
  provider: null,
  address: null,
  chainId: null,
  source: null,
  error: null,
  lastConnectionAttempt: null,
  canSwitchChain: false,
  supportsWalletConnect: !!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
};

/**
 * Enhanced wallet connection hook with automatic fallbacks
 */
export function useEnhancedWalletConnection(): [WalletConnectionState, WalletConnectionActions] {
  const [state, setState] = useState<WalletConnectionState>(initialState);

  // Update state helper
  const updateState = useCallback((updates: Partial<WalletConnectionState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Auto-connection effect (runs once on mount)
  useEffect(() => {
    let mounted = true;

    const attemptAutoConnection = async () => {
      // Only attempt auto-connection if not already connecting/connected
      if (state.isConnecting || state.isConnected) return;

      logger.info('🔄 Attempting auto-connection...');
      updateState({ isConnecting: true, error: null });

      try {
        const walletProvider = await getTransactionReadyProvider();

        if (!mounted) return;

        if (walletProvider && walletProvider.isReady) {
          logger.info('✅ Auto-connection successful', {
            source: walletProvider.source,
            address: walletProvider.address,
          });

          updateState({
            isConnected: true,
            isConnecting: false,
            isReady: true,
            provider: walletProvider,
            address: walletProvider.address || null,
            chainId: walletProvider.chainId || null,
            source: walletProvider.source,
            canSwitchChain: true,
            lastConnectionAttempt: new Date(),
          });

          // Show success message for WalletConnect connections
          if (walletProvider.source === 'walletconnect') {
            toast.success('Connected via WalletConnect');
          }
        } else {
          logger.info('⚠️ Auto-connection not possible - manual connection required');
          updateState({
            isConnecting: false,
            lastConnectionAttempt: new Date(),
          });
        }
      } catch (error) {
        if (!mounted) return;

        logger.error('❌ Auto-connection failed:', error);
        const providerError = handleProviderError(error, 'auto-connection');

        updateState({
          isConnecting: false,
          error: providerError,
          lastConnectionAttempt: new Date(),
        });

        // Only show error toast if it's not a recoverable issue
        if (!providerError.recoverable) {
          toast.error(providerError.message);
        }
      }
    };

    attemptAutoConnection();

    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Manual connection function
  const connect = useCallback(
    async (forceWalletConnect = false): Promise<boolean> => {
      logger.info('🔗 Manual connection requested', { forceWalletConnect });

      updateState({ isConnecting: true, error: null });

      try {
        let walletProvider: WalletProvider | null = null;

        if (forceWalletConnect) {
          // Force WalletConnect connection
          logger.info('🔗 Forcing WalletConnect connection...');

          // Clean up any existing sessions first
          await cleanupProviderConnections();

          // Get provider with WalletConnect preference
          walletProvider = await getTransactionReadyProvider();

          // If we didn't get WalletConnect, the fallback logic in getTransactionReadyProvider
          // will handle other providers
        } else {
          walletProvider = await getTransactionReadyProvider();
        }

        if (walletProvider) {
          // Validate the provider
          let isReady = walletProvider.isReady;

          if (!isReady) {
            logger.info('🔍 Validating provider for transactions...');
            const validation = await validateProviderForTransaction(walletProvider.provider);
            isReady = validation.valid;

            if (!isReady) {
              throw new Error(`Provider validation failed: ${validation.error}`);
            }
          }

          logger.info('✅ Manual connection successful', {
            source: walletProvider.source,
            address: walletProvider.address,
            isReady,
          });

          updateState({
            isConnected: true,
            isConnecting: false,
            isReady,
            provider: walletProvider,
            address: walletProvider.address || null,
            chainId: walletProvider.chainId || null,
            source: walletProvider.source,
            canSwitchChain: true,
            lastConnectionAttempt: new Date(),
          });

          // Show appropriate success message
          const sourceMessages = {
            farcaster: 'Connected to Farcaster wallet',
            injected: 'Connected to browser wallet',
            walletconnect: 'Connected via WalletConnect',
            fallback: 'Wallet connected',
          };

          toast.success(sourceMessages[walletProvider.source] || 'Wallet connected');
          return true;
        } else {
          throw new Error('No wallet provider available');
        }
      } catch (error) {
        logger.error('❌ Manual connection failed:', error);
        const providerError = handleProviderError(error, 'manual-connection');

        updateState({
          isConnecting: false,
          error: providerError,
          lastConnectionAttempt: new Date(),
        });

        // Show error with recovery suggestion
        let errorMessage = providerError.message;
        if (providerError.recoverable && !forceWalletConnect) {
          errorMessage += ' Try using WalletConnect instead.';
        }

        toast.error(errorMessage);
        return false;
      }
    },
    [updateState]
  );

  // Disconnect function
  const disconnect = useCallback(async (): Promise<void> => {
    logger.info('🔌 Disconnecting wallet...');

    try {
      // Clean up provider connections
      await cleanupProviderConnections();

      updateState({
        isConnected: false,
        isConnecting: false,
        isReady: false,
        provider: null,
        address: null,
        chainId: null,
        source: null,
        error: null,
        canSwitchChain: false,
      });

      toast.success('Wallet disconnected');
    } catch (error) {
      logger.error('Disconnect error:', error);
      toast.error('Error disconnecting wallet');
    }
  }, [updateState]);

  // Reconnect function
  const reconnect = useCallback(async (): Promise<boolean> => {
    logger.info('🔄 Reconnecting wallet...');
    await disconnect();
    return await connect();
  }, [disconnect, connect]);

  // Switch chain function
  const switchChain = useCallback(
    async (chainId: number): Promise<boolean> => {
      if (!state.provider) {
        toast.error('No wallet connected');
        return false;
      }

      logger.info('🔄 Switching network', { chainId, currentChain: state.chainId });

      try {
        const result = await switchProviderNetwork(state.provider.provider, chainId);

        if (result.success) {
          updateState({ chainId });
          toast.success('Network switched successfully');
          return true;
        } else {
          throw new Error(result.error || 'Network switch failed');
        }
      } catch (error) {
        logger.error('Network switch failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Network switch failed';
        toast.error(errorMessage);
        return false;
      }
    },
    [state.provider, state.chainId, updateState]
  );

  // Ensure provider is ready for transactions
  const ensureReady = useCallback(async (): Promise<boolean> => {
    if (!state.provider) {
      return await connect();
    }

    if (state.isReady) {
      return true;
    }

    logger.info('🔍 Ensuring provider is ready for transactions...');

    try {
      const validation = await validateProviderForTransaction(state.provider.provider);

      if (validation.valid) {
        updateState({ isReady: true });
        return true;
      } else {
        logger.warn('Provider not ready:', validation.error);
        return await reconnect();
      }
    } catch (error) {
      logger.error('Provider readiness check failed:', error);
      return false;
    }
  }, [state.provider, state.isReady, connect, reconnect, updateState]);

  // Validate provider for transaction
  const validateForTransaction = useCallback(async (): Promise<boolean> => {
    if (!state.provider) {
      return false;
    }

    try {
      const validation = await validateProviderForTransaction(state.provider.provider);
      return validation.valid;
    } catch (error) {
      logger.error('Transaction validation failed:', error);
      return false;
    }
  }, [state.provider]);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Cleanup function
  const cleanup = useCallback(async (): Promise<void> => {
    await cleanupProviderConnections();
  }, []);

  const actions: WalletConnectionActions = {
    connect,
    disconnect,
    reconnect,
    switchChain,
    ensureReady,
    validateForTransaction,
    clearError,
    cleanup,
  };

  return [state, actions];
}

/**
 * Simplified hook for components that just need connection status
 */
export function useWalletConnectionStatus() {
  const [state] = useEnhancedWalletConnection();

  return {
    isConnected: state.isConnected,
    isReady: state.isReady,
    address: state.address,
    chainId: state.chainId,
    source: state.source,
    error: state.error,
  };
}

/**
 * Hook for transaction-related operations
 */
export function useWalletForTransactions() {
  const [state, actions] = useEnhancedWalletConnection();

  return {
    provider: state.provider?.provider || null,
    isReady: state.isReady,
    ensureReady: actions.ensureReady,
    switchChain: actions.switchChain,
    validateForTransaction: actions.validateForTransaction,
  };
}
