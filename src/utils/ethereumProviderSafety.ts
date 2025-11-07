/**
 * Ethereum Provider Safety Utilities
 * CONSOLIDATED: Now uses providerConflictResolver as single source of truth
 * AGGRESSIVE CONSOLIDATION: Removes duplicate provider access logic
 */

// Re-export core functions from the consolidated provider resolver
export {
  safelyAccessEthereum as getEthereumProvider,
  getBestProvider,
  testProviderFunctionality,
  getProviderDiagnostics,
} from './providerConflictResolver';

// ENHANCEMENT: Add missing functions that should be available
export async function safeEthereumRequest(method: string, params?: any[]): Promise<any> {
  const { safelyAccessEthereum } = await import('./providerConflictResolver');
  const ethereum = safelyAccessEthereum();
  if (!ethereum || !ethereum.request) {
    throw new Error('No Ethereum provider available');
  }
  return await ethereum.request({ method, params });
}

export function getAvailableProviders() {
  const { detectAllProviders } = require('./providerConflictResolver');
  return detectAllProviders().map((p: any) => p.provider);
}

// DEPRECATED: Legacy functions - use providerConflictResolver directly
// These are kept only for backward compatibility but will show warnings
export function isWalletAvailable(
  walletType: 'metamask' | 'coinbase' | 'trust' | 'rainbow'
): boolean {
  // Only show warning in development to avoid console spam
  if (process.env.NODE_ENV === 'development') {
    console.warn('isWalletAvailable is deprecated, use getAvailableProviders() instead');
  }

  const { safelyAccessEthereum } = require('./providerConflictResolver');
  const ethereum = safelyAccessEthereum();
  if (!ethereum) return false;

  try {
    switch (walletType) {
      case 'metamask':
        return Boolean(ethereum.isMetaMask);
      case 'coinbase':
        return Boolean(ethereum.isCoinbaseWallet);
      case 'trust':
        return Boolean(ethereum.isTrust);
      case 'rainbow':
        return Boolean(ethereum.isRainbow);
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

export function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean((window as any).farcaster);
  } catch (error) {
    return false;
  }
}

export async function getBestProviderSafe() {
  const { getBestProvider } = await import('./providerConflictResolver');
  return await getBestProvider();
}
