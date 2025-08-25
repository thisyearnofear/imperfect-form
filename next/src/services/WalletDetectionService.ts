import { ethers } from 'ethers';

/**
 * Consolidated wallet detection and provider utilities
 * ENHANCEMENT: Consolidates wallet detection logic from legacy directContractInteraction
 */
export class WalletDetectionService {
  private static instance: WalletDetectionService;

  private constructor() {}

  static getInstance(): WalletDetectionService {
    if (!WalletDetectionService.instance) {
      WalletDetectionService.instance = new WalletDetectionService();
    }
    return WalletDetectionService.instance;
  }

  /**
   * Check if the current provider is Coinbase Wallet
   * CONSOLIDATION: Moved from directContractInteraction.ts
   */
  isCoinbaseWalletActive(): boolean {
    // Check if we have the Coinbase Wallet extension directly

    if ((window as any).coinbaseWalletExtension) {
      return true;
    }

    // Check if window.ethereum is Coinbase Wallet

    if (window.ethereum && (window.ethereum as any).isCoinbaseWallet) {
      return true;
    }

    // Check if we have Coinbase Wallet in the providers array

    if (window.ethereum && (window.ethereum as any).providers) {
      const providers = (window.ethereum as any).providers as Array<{
        isCoinbaseWallet?: boolean;
      }>;
      return providers.some((p) => p.isCoinbaseWallet);
    }

    return false;
  }

  /**
   * Get suggestion message for switching to Coinbase Wallet
   * CONSOLIDATION: Moved from directContractInteraction.ts
   */
  getCoinbaseWalletSuggestion(): string {
    return 'For the best experience on Base network, consider using Coinbase Wallet which supports Smart Wallet features including subaccounts and spend limits.';
  }

  /**
   * Detect wallet type and capabilities
   * ENHANCEMENT: New consolidated detection logic
   */
  detectWalletCapabilities(): {
    type: 'coinbase' | 'metamask' | 'walletconnect' | 'unknown';
    supportsSmartWallet: boolean;
    supportsSubAccounts: boolean;
    isInjected: boolean;
  } {
    if (typeof window === 'undefined' || !window.ethereum) {
      return {
        type: 'unknown',
        supportsSmartWallet: false,
        supportsSubAccounts: false,
        isInjected: false,
      };
    }

    const ethereum = window.ethereum as any;

    // Coinbase Wallet detection
    if (this.isCoinbaseWalletActive()) {
      return {
        type: 'coinbase',
        supportsSmartWallet: true,
        supportsSubAccounts: true,
        isInjected: true,
      };
    }

    // MetaMask detection
    if (ethereum.isMetaMask) {
      return {
        type: 'metamask',
        supportsSmartWallet: false,
        supportsSubAccounts: false,
        isInjected: true,
      };
    }

    // WalletConnect detection
    if (ethereum.isWalletConnect) {
      return {
        type: 'walletconnect',
        supportsSmartWallet: false,
        supportsSubAccounts: false,
        isInjected: false,
      };
    }

    return {
      type: 'unknown',
      supportsSmartWallet: false,
      supportsSubAccounts: false,
      isInjected: true,
    };
  }

  /**
   * Create optimized provider based on wallet capabilities
   * ENHANCEMENT: Intelligent provider creation
   */
  async createOptimizedProvider(ethereumProvider?: unknown): Promise<ethers.BrowserProvider> {
    const capabilities = this.detectWalletCapabilities();

    console.log('Creating optimized provider:', {
      walletType: capabilities.type,
      supportsSmartWallet: capabilities.supportsSmartWallet,
      hasProvidedProvider: !!ethereumProvider,
    });

    // Use provided provider if available and valid
    if (ethereumProvider && typeof ethereumProvider === 'object' && 'request' in ethereumProvider) {
      return new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
    }

    // Use window.ethereum as fallback
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }

    throw new Error('No Ethereum provider found. Please install a wallet.');
  }

  /**
   * Check if current setup supports Base Smart Wallet features
   * ENHANCEMENT: Consolidated Base network logic
   */
  supportsBaseSmartWallet(): boolean {
    const capabilities = this.detectWalletCapabilities();
    return capabilities.type === 'coinbase' && capabilities.supportsSmartWallet;
  }
}

// Export singleton instance
export const walletDetectionService = WalletDetectionService.getInstance();
