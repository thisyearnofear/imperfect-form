interface Window {
  transactionHash?: string;
  selectedNetworkName?: string;
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, callback: (...args: unknown[]) => void) => void;
    removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    isMetaMask?: boolean;
    isConnected?: () => boolean;
    chainId?: string;
    providers?: Array<{
      isCoinbaseWallet?: boolean;
    }>;
    isCoinbaseWallet?: boolean;
  };
  coinbaseWalletExtension?: unknown;
}