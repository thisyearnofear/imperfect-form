import toast from 'react-hot-toast';
import { SUPPORTED_NETWORKS } from '@/config/networks';

// Configuration for each supported chain, now including contract details
export const chainConfigs = Object.fromEntries(
  Object.entries(SUPPORTED_NETWORKS).map(([key, network]) => [
    key,
    {
      id: network.chainId,
      name: network.name,
      fullName: network.name,
      nativeCurrency: {
        name: 'ETH', // Default, will be overridden
        symbol: 'ETH', // Default, will be overridden
        decimals: 18,
      },
      rpcUrls: network.rpcUrls,
      blockExplorerUrls: [network.blockExplorer],
      contractAddress: network.contractAddress,
      abi: network.abi,
    },
  ])
);

// Enum for wallet provider types
export enum WalletProviderType {
  SIGNATURE = 'signature', // ThirdWeb/EOA
  SMART = 'smart', // Coinbase Smart Wallet
}

// Enum for supported chains
export enum SupportedChain {
  POLYGON = 'polygon',
  BASE = 'base',
  MONAD = 'monad',
  CELO = 'celo',
  CELO_ALFAJORES = 'celoAlfajores',
  AVALANCHE = 'avalanche',
}

/**
 * Switch chains using the ThirdWeb SDK (for Signature/EOA wallets)
 */
export async function switchThirdwebChain(chainName: SupportedChain): Promise<boolean> {
  try {
    const toastId = toast.loading(`Switching to ${chainConfigs[chainName].name}...`);

    // Get the chainId
    const chainId = chainConfigs[chainName].id;

    console.log(`Attempting to switch to ${chainName} with chain ID: ${chainId}`);

    // Access ThirdWeb SDK from window if available (for already connected wallet)
    // This is a hack to avoid React hooks rules violations
    if (window.thirdwebSDK) {
      console.log(`Using ThirdWeb SDK to switch chain to ${chainId}`);
      try {
        await window.thirdwebSDK.wallet.switchChain(chainId);
        console.log(`Successfully switched to ${chainConfigs[chainName].name} using ThirdWeb SDK`);
        toast.success(`Switched to ${chainConfigs[chainName].name}`, {
          id: toastId,
        });
        return true;
      } catch (error) {
        console.error(`Error switching to ${chainName} using ThirdWeb SDK:`, error);
        // Continue to try with window.ethereum
      }
    }

    // If we don't have SDK in window, use ethereum provider directly
    if (window.ethereum) {
      try {
        // Ensure the hex chain ID is properly formatted
        let hexChainId = chainId.toString(16);
        // Pad with leading zeros if needed to ensure even length
        if (hexChainId.length % 2 !== 0) {
          hexChainId = '0' + hexChainId;
        }
        hexChainId = `0x${hexChainId}`;

        console.log(`Using window.ethereum to switch chain to ${hexChainId} (decimal: ${chainId})`);

        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
        console.log(
          `Successfully switched to ${chainConfigs[chainName].name} using window.ethereum`
        );
        toast.success(`Switched to ${chainConfigs[chainName].name}`, {
          id: toastId,
        });
        return true;
      } catch (switchError: unknown) {
        // Type assertion for the error
        const error = switchError as { code?: number; message?: string };
        console.error(`Error switching to ${chainName} using window.ethereum:`, error);

        // Chain doesn't exist yet, add it
        if (error.code === 4902) {
          const config = chainConfigs[chainName];
          // Ensure the hex chain ID is properly formatted
          let hexChainId = config.id.toString(16);
          // Pad with leading zeros if needed to ensure even length
          if (hexChainId.length % 2 !== 0) {
            hexChainId = '0' + hexChainId;
          }
          hexChainId = `0x${hexChainId}`;
          console.log(
            `Adding network ${chainName} with chainId ${hexChainId} (decimal: ${config.id}) to wallet`
          );

          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hexChainId,
                  chainName: config.fullName || config.name,
                  nativeCurrency: config.nativeCurrency,
                  rpcUrls: config.rpcUrls,
                  blockExplorerUrls: config.blockExplorerUrls,
                },
              ],
            });
            console.log(`Successfully added and switched to ${config.name}`);
            toast.success(`Added and switched to ${config.name}`, {
              id: toastId,
            });
            return true;
          } catch (addError: unknown) {
            const addErr = addError as { message?: string };
            console.error(`Error adding ${chainName} network:`, addErr);
            toast.error(`Failed to add network: ${addErr.message || 'Unknown error'}`, {
              id: toastId,
            });
            return false;
          }
        }
        toast.error(`Failed to switch network: ${error.message || 'Unknown error'}`, {
          id: toastId,
        });
        return false;
      }
    }

    toast.error('No Ethereum provider found', { id: toastId });
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
    toast.error('Unable to switch chain: Wallet not connected or unsupported');
    return false;
  }
}

// Get the appropriate chain name based on network string
export function getChainFromNetwork(network: string | null): SupportedChain | null {
  if (network === 'polygon') return SupportedChain.POLYGON;
  if (network === 'base') return SupportedChain.BASE;
  if (network === 'monad') return SupportedChain.MONAD;
  if (network === 'celo') return SupportedChain.CELO;
  if (network === 'celoAlfajores') return SupportedChain.CELO_ALFAJORES;
  if (network === 'avalanche') return SupportedChain.AVALANCHE;
  return null;
}

// Get the appropriate network string based on chain
export function getNetworkFromChain(chain: SupportedChain | null): string | null {
  if (chain === SupportedChain.POLYGON) return 'polygon';
  if (chain === SupportedChain.BASE) return 'base';
  if (chain === SupportedChain.MONAD) return 'monad';
  if (chain === SupportedChain.CELO) return 'celo';
  if (chain === SupportedChain.CELO_ALFAJORES) return 'celoAlfajores';
  if (chain === SupportedChain.AVALANCHE) return 'avalanche';
  return null;
}

// Get the appropriate chain for Self Protocol verification
export function getSelfProtocolChain(): SupportedChain {
  // Self Protocol is now on Celo Mainnet
  return SupportedChain.CELO;
}

// Check if current chain supports Self Protocol verification
export function chainSupportsSelfProtocol(chainId: number): boolean {
  return chainId === 42220; // Celo Mainnet
}

// Extend the Window interface to include the thirdwebSDK property
declare global {
  interface Window {
    thirdwebSDK?: {
      wallet: {
        switchChain: (chainId: number) => Promise<void>;
      };
    };
  }
}
