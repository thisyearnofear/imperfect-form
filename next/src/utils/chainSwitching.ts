// No need to import ThirdwebSDK anymore as we're using a custom interface
import toast from "react-hot-toast";

// Configuration for each supported chain
export const chainConfigs = {
  polygon: {
    id: 80002,
    name: "Polygon Amoy",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: [
      "https://polygon-amoy.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
      "https://rpc-amoy.polygon.technology",
    ],
    blockExplorerUrls: ["https://amoy.polygonscan.com/"],
  },
  base: {
    id: 84532,
    name: "Base Sepolia",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: [
      "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
      "https://sepolia.base.org",
    ],
    blockExplorerUrls: ["https://sepolia-explorer.base.org/"],
  },
  monad: {
    id: 10143,
    name: "Monad Testnet",
    nativeCurrency: {
      name: "MON",
      symbol: "MON",
      decimals: 18,
    },
    rpcUrls: [
      "https://testnet-rpc.monad.xyz",
    ],
    blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
  },
  celo: {
    id: 42220,
    name: "Celo Mainnet",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
    rpcUrls: [
      "https://forno.celo.org",
      "https://rpc.ankr.com/celo",
    ],
    blockExplorerUrls: ["https://explorer.celo.org/"],
  },
};

// Enum for wallet provider types
export enum WalletProviderType {
  SIGNATURE = "signature", // ThirdWeb/EOA
  SMART = "smart", // Coinbase Smart Wallet
}

// Enum for supported chains
export enum SupportedChain {
  POLYGON = "polygon",
  BASE = "base",
  MONAD = "monad",
  CELO = "celo",
}

/**
 * Switch chains using the ThirdWeb SDK (for Signature/EOA wallets)
 */
export async function switchThirdwebChain(
  chainName: SupportedChain
): Promise<boolean> {
  try {
    const toastId = toast.loading(`Switching to ${chainConfigs[chainName].name}...`);

    // Get the chainId
    const chainId = chainConfigs[chainName].id;

    // Access ThirdWeb SDK from window if available (for already connected wallet)
    // This is a hack to avoid React hooks rules violations
    if (window.thirdwebSDK) {
      await window.thirdwebSDK.wallet.switchChain(chainId);
      toast.success(`Switched to ${chainConfigs[chainName].name}`, {
        id: toastId,
      });
      return true;
    }

    // If we don't have SDK in window, use ethereum provider directly
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        toast.success(`Switched to ${chainConfigs[chainName].name}`, {
          id: toastId,
        });
        return true;
      } catch (switchError: unknown) {
        // Type assertion for the error
        const error = switchError as { code?: number; message?: string };
        // Chain doesn't exist yet, add it
        if (error.code === 4902) {
          const config = chainConfigs[chainName];
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${config.id.toString(16)}`,
                chainName: config.name,
                nativeCurrency: config.nativeCurrency,
                rpcUrls: config.rpcUrls,
                blockExplorerUrls: config.blockExplorerUrls,
              },
            ],
          });
          toast.success(`Added and switched to ${config.name}`, {
            id: toastId,
          });
          return true;
        }
        toast.error(`Failed to switch network: ${error.message || 'Unknown error'}`, {
          id: toastId,
        });
        return false;
      }
    }

    toast.error("No Ethereum provider found", { id: toastId });
    return false;
  } catch (err: unknown) {
    const error = err as { message?: string };
    toast.error(`Error switching chain: ${error.message || 'Unknown error'}`);
    return false;
  }
}

/**
 * Switch chains using Wagmi (for Smart/Coinbase wallets)
 * This function should be used with the switchChain hook from Wagmi
 */
export function prepareWagmiChainSwitch(
  chainName: SupportedChain,
  switchChainFn: (chainId: number) => Promise<void>
) {
  return async function executeSwitchChain(): Promise<boolean> {
    try {
      const toastId = toast.loading(`Switching to ${chainConfigs[chainName].name}...`);

      await switchChainFn(chainConfigs[chainName].id);

      toast.success(`Switched to ${chainConfigs[chainName].name}`, {
        id: toastId,
      });
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(`Error switching chain: ${error.message || 'Unknown error'}`);
      return false;
    }
  };
}

/**
 * Generic function to switch chains based on wallet provider type
 * This is the main function that should be used in components
 */
export async function switchChain(
  chainName: SupportedChain,
  walletType: WalletProviderType,
  wagmiSwitchChain?: (chainId: number) => Promise<void>
): Promise<boolean> {
  if (walletType === WalletProviderType.SIGNATURE) {
    return switchThirdwebChain(chainName);
  } else if (walletType === WalletProviderType.SMART && wagmiSwitchChain) {
    const switchFn = prepareWagmiChainSwitch(chainName, wagmiSwitchChain);
    return switchFn();
  } else {
    toast.error("Unable to switch chain: Wallet not connected or unsupported");
    return false;
  }
}

// Get the appropriate chain name based on network string
export function getChainFromNetwork(network: string | null): SupportedChain | null {
  if (network === "polygon") return SupportedChain.POLYGON;
  if (network === "base") return SupportedChain.BASE;
  if (network === "monad") return SupportedChain.MONAD;
  if (network === "celo") return SupportedChain.CELO;
  return null;
}

// Get the appropriate network string based on chain
export function getNetworkFromChain(chain: SupportedChain | null): string | null {
  if (chain === SupportedChain.POLYGON) return "polygon";
  if (chain === SupportedChain.BASE) return "base";
  if (chain === SupportedChain.MONAD) return "monad";
  if (chain === SupportedChain.CELO) return "celo";
  return null;
}

// Extend the Window interface to include the thirdwebSDK property
declare global {
  interface Window {
    thirdwebSDK?: {
      wallet: {
        switchChain: (chainId: number) => Promise<void>;
      };
    };
    // Note: ethereum is already defined in src/types/window.d.ts
  }
}