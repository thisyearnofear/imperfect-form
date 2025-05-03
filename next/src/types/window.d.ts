/**
 * Type declarations for global Window object
 */

interface Window {
  transactionHash?: string;
  selectedNetworkName?: string;
  ethereum?: {
    request: (args: {
      method: string;
      params?: unknown[];
    }) => Promise<unknown>;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    isMetaMask?: boolean;
    isConnected?: () => boolean;
    selectedAddress?: string;
    chainId?: string;
  }; // For MetaMask and other wallet providers
}
