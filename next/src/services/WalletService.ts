import { ethers } from 'ethers';
import { getEthereumProvider } from '@/utils/farcasterMiniApp';

/**
 * Centralized wallet service for provider and signer management
 */
export class WalletService {
  private static instance: WalletService;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private userAddress: string | null = null;
  private chainId: number | null = null;

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Initialize wallet connection
   */
  async connect(preferredAddress?: string): Promise<{
    success: boolean;
    address?: string;
    chainId?: number;
    error?: string;
  }> {
    try {
      // Reset previous state
      this.reset();

      // Get provider from multiple sources
      const ethereumProvider = await getEthereumProvider();

      if (
        ethereumProvider &&
        typeof ethereumProvider === 'object' &&
        'request' in ethereumProvider
      ) {
        this.provider = new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
      } else if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        throw new Error('No Ethereum provider found. Please install a wallet.');
      }

      // Get network info
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);

      // Get signer and address
      this.signer = await this.provider.getSigner();

      if (preferredAddress) {
        this.userAddress = preferredAddress;
      } else {
        this.userAddress = await this.signer.getAddress();
      }

      console.log('Wallet connected:', {
        address: this.userAddress,
        chainId: this.chainId,
        networkName: network.name,
      });

      return {
        success: true,
        address: this.userAddress,
        chainId: this.chainId,
      };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      this.reset();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown wallet error',
      };
    }
  }

  /**
   * Switch to a specific network
   */
  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      // Request network switch
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${chainId.toString(16)}` },
      ]);

      // Update internal state
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);

      return true;
    } catch (error) {
      console.error('Network switch failed:', error);
      return false;
    }
  }

  /**
   * Get current provider
   */
  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  /**
   * Get current signer
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * Get current user address
   */
  getUserAddress(): string | null {
    return this.userAddress;
  }

  /**
   * Get current chain ID
   */
  getChainId(): number | null {
    return this.chainId;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return !!(this.provider && this.signer && this.userAddress);
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: unknown) => {
        callback(accounts as string[]);
      });
    }
  }

  /**
   * Listen for network changes
   */
  onChainChanged(callback: (chainId: string) => void): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('chainChanged', (chainId: unknown) => {
        callback(chainId as string);
      });
    }
  }

  /**
   * Remove event listeners
   */
  removeListeners(): void {
    // Note: removeAllListeners may not be available on all providers
    // This is a best-effort cleanup
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Try to remove listeners if the method exists
        if ('removeAllListeners' in window.ethereum) {
          (window.ethereum as any).removeAllListeners('accountsChanged');

          (window.ethereum as any).removeAllListeners('chainChanged');
        }
      }
    } catch (error) {
      console.warn('Failed to remove event listeners:', error);
    }
  }

  /**
   * Reset wallet state
   */
  reset(): void {
    this.provider = null;
    this.signer = null;
    this.userAddress = null;
    this.chainId = null;
  }

  /**
   * Disconnect wallet
   */
  disconnect(): void {
    this.removeListeners();
    this.reset();
  }
}

// Export singleton instance
export const walletService = WalletService.getInstance();
