/**
 * CONSOLIDATED WEB3 ERROR HANDLING
 * AGGRESSIVE CONSOLIDATION: Single entry point for all Web3 error handling
 * ENHANCEMENT FIRST: Builds on existing error handling patterns
 *
 * This module consolidates all Web3 error handling utilities following DRY principles
 */

// MODULAR: Core error handling modules
export * from './providerConflictResolver';
export * from './robustNetworkManager';
export * from './contractInteractionManager';
export * from './walletConnectCleanup';
export * from './enhancedErrorSystem';

// CLEAN: Simplified re-exports for common use cases
export {
  safelyAccessEthereum as getEthereumProvider,
  getBestProvider,
  initializeProviderSafely,
  resolveProviderConflicts,
} from './providerConflictResolver';

export { createRobustProvider } from './robustNetworkManager';

export {
  executeContractRead,
  executeContractWrite,
  createRobustContract,
  batchExecuteContractCalls,
} from './contractInteractionManager';

export {
  cleanupWalletConnectSessions,
  forceDisconnectWalletConnect,
  preventiveWalletConnectCleanup,
  WalletConnectStabilityMonitor,
} from './walletConnectCleanup';

export { createErrorReport, showUserFeedback } from './enhancedErrorSystem';

// PERFORMANT: Lazy-loaded utilities for heavy operations
export const LazyWeb3Utils = {
  // Lazy load heavy diagnostics
  async getComprehensiveDiagnostics() {
    const [{ getProviderDiagnostics }, { getWalletConnectStorageDiagnostics }] = await Promise.all([
      import('./providerConflictResolver'),
      import('./walletConnectCleanup'),
    ]);

    return {
      provider: getProviderDiagnostics(),
      walletConnect: getWalletConnectStorageDiagnostics(),
    };
  },

  // Lazy load complete reset functionality
  async performEmergencyReset() {
    const [
      { cleanupWalletConnectSessions, forceDisconnectWalletConnect },
      { resolveProviderConflicts },
    ] = await Promise.all([import('./walletConnectCleanup'), import('./providerConflictResolver')]);

    await cleanupWalletConnectSessions();
    await forceDisconnectWalletConnect();
    resolveProviderConflicts();

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
};

// ORGANIZED: Common error handling patterns
export const CommonErrorHandlers = {
  // Handle wallet connection errors
  async handleWalletConnection(error: any, onRetry?: () => void) {
    const { createErrorReport, showUserFeedback } = await import('./enhancedErrorSystem');
    const report = await createErrorReport(error, { functionName: 'wallet-connection' });
    showUserFeedback(report, { includeRetryButton: true, onRetry });
    return report;
  },

  // Handle network switching errors
  async handleNetworkSwitch(error: any, networkId: number, onRetry?: () => void) {
    const { createErrorReport, showUserFeedback } = await import('./enhancedErrorSystem');
    const report = await createErrorReport(error, {
      functionName: 'network-switch',
      networkId,
    });
    showUserFeedback(report, { includeRetryButton: true, onRetry });
    return report;
  },

  // Handle contract interaction errors
  async handleContractInteraction(
    error: any,
    contractAddress: string,
    functionName: string,
    onRetry?: () => void
  ) {
    const { createErrorReport, showUserFeedback } = await import('./enhancedErrorSystem');
    const report = await createErrorReport(error, {
      contractAddress,
      functionName,
    });
    showUserFeedback(report, { includeRetryButton: true, onRetry });
    return report;
  },
};

// SINGLE SOURCE OF TRUTH: Complete Web3 setup flow
export async function initializeWeb3Robustly(chainId: number) {
  try {
    // Step 1: Clean up any existing issues
    const { preventiveWalletConnectCleanup } = await import('./walletConnectCleanup');
    await preventiveWalletConnectCleanup();

    // Step 2: Initialize provider safely
    const { initializeProviderSafely } = await import('./providerConflictResolver');
    const provider = await initializeProviderSafely();

    if (!provider) {
      throw new Error('No provider available after conflict resolution');
    }

    // Step 3: Create robust network provider
    const { createRobustProvider } = await import('./robustNetworkManager');
    const networkProvider = await createRobustProvider(chainId);

    if (!networkProvider) {
      throw new Error('Failed to establish network connection');
    }

    const network = await networkProvider.getNetwork();

    return {
      provider,
      networkProvider,
      network,
      success: true,
    };
  } catch (error) {
    // Use common error handler
    await CommonErrorHandlers.handleWalletConnection(error);
    return { success: false, error };
  }
}
