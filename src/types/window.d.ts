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
    selectedProvider?: {
      isCoinbaseWallet?: boolean;
      isMetaMask?: boolean;
      isTrust?: boolean;
      isRainbow?: boolean;
    };
    // Additional wallet browser properties
    isTrust?: boolean;
    isRainbow?: boolean;
    isPhantom?: boolean;
    isBinance?: boolean;
    isOKX?: boolean;
    isBitget?: boolean;
  };
  web3?: unknown;
  coinbaseWalletExtension?: unknown;
  // Additional wallet objects
  trustWallet?: unknown;
  phantom?: unknown;
  binance?: unknown;
  okxwallet?: unknown;
  bitget?: unknown;
  process?: {
    env?: {
      NEXT_PUBLIC_DISABLE_BLOCKCHAIN?: string;
    };
  };
}
