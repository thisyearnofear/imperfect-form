/**
 * Ethereum Provider Safety Utilities
 * Handles window.ethereum access safely to prevent override errors
 */

interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
  providers?: EthereumProvider[];
  request?: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

/**
 * Safely access window.ethereum without triggering override errors
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Use Object.getOwnPropertyDescriptor to safely check if ethereum exists
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
    if (descriptor && descriptor.get) {
      // If it's a getter, use it safely
      return descriptor.get.call(window) as EthereumProvider;
    }

    // Fallback to direct access
    return (window as any).ethereum || null;
  } catch (error) {
    console.warn('Failed to access window.ethereum safely:', error);
    return null;
  }
}

/**
 * Check if a specific wallet is available without triggering errors
 */
export function isWalletAvailable(
  walletType: 'metamask' | 'coinbase' | 'trust' | 'rainbow'
): boolean {
  const ethereum = getEthereumProvider();
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
    console.warn(`Failed to check ${walletType} availability:`, error);
    return false;
  }
}

/**
 * Get all available providers safely
 */
export function getAvailableProviders(): EthereumProvider[] {
  const ethereum = getEthereumProvider();
  if (!ethereum) return [];

  try {
    // If multiple providers exist
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      return ethereum.providers;
    }

    // Single provider
    return [ethereum];
  } catch (error) {
    console.warn('Failed to get available providers:', error);
    return [];
  }
}

/**
 * Safely make ethereum requests
 */
export async function safeEthereumRequest(method: string, params?: any[]): Promise<any> {
  const ethereum = getEthereumProvider();
  if (!ethereum || !ethereum.request) {
    throw new Error('No Ethereum provider available');
  }

  try {
    return await ethereum.request({ method, params });
  } catch (error) {
    console.error(`Ethereum request failed for method ${method}:`, error);
    throw error;
  }
}

/**
 * Check if we're in a Farcaster Mini App environment
 */
export function isFarcasterMiniApp(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Check for Farcaster SDK
    return Boolean((window as any).farcaster);
  } catch (error) {
    return false;
  }
}

/**
 * Get the best available provider for the current environment
 */
export function getBestProvider(): EthereumProvider | null {
  // In Farcaster Mini App, prefer Farcaster provider
  if (isFarcasterMiniApp()) {
    try {
      const farcasterProvider = (window as any).farcaster?.ethereum;
      if (farcasterProvider) {
        return farcasterProvider;
      }
    } catch (error) {
      console.warn('Failed to get Farcaster provider:', error);
    }
  }

  // Fallback to regular ethereum provider
  return getEthereumProvider();
}
