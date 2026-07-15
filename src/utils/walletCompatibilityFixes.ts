/**
 * Wallet Compatibility Fixes
 * Enhanced error handling and validation for common wallet issues
 */

import { getEthereumProvider } from '@/utils/farcasterMiniApp';
import { getNetworkByChainId } from '@/config/networks';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

export interface WalletCompatibilityCheck {
  isCompatible: boolean;
  issues: string[];
  solutions: string[];
  networkInfo?: {
    currentChain: number;
    requiredChain: number;
    networkName: string;
  };
}

/**
 * Comprehensive wallet compatibility check
 */
export async function checkWalletCompatibility(
  requiredChainId: number,
  contractAddress: string
): Promise<WalletCompatibilityCheck> {
  const issues: string[] = [];
  const solutions: string[] = [];

  try {
    // 1. Check if provider is available
    const provider = await getEthereumProvider();
    if (!provider) {
      issues.push('No wallet provider detected');
      solutions.push('Connect your wallet and refresh the page');
      return { isCompatible: false, issues, solutions };
    }

    // 2. Check if provider has required methods
    if (!provider || typeof provider !== 'object' || !('request' in provider)) {
      issues.push('Wallet provider is not compatible');
      solutions.push('Try using a different wallet (MetaMask, Coinbase Wallet, etc.)');
      return { isCompatible: false, issues, solutions };
    }

    // 3. Get current chain ID
    let currentChainId: number;
    try {
      const chainIdHex = await (provider as any).request({ method: 'eth_chainId' });
      currentChainId = parseInt(chainIdHex, 16);
    } catch (error) {
      issues.push('Unable to detect current network');
      solutions.push('Check your wallet connection and try again');
      return { isCompatible: false, issues, solutions };
    }

    const networkConfig = getNetworkByChainId(requiredChainId);
    if (!networkConfig) {
      issues.push(`Unsupported network (Chain ID: ${requiredChainId})`);
      return { isCompatible: false, issues, solutions };
    }

    // 4. Check if on correct network
    if (currentChainId !== requiredChainId) {
      issues.push(
        `Wrong network detected (Current: ${currentChainId}, Required: ${requiredChainId})`
      );
      solutions.push(`Switch to ${networkConfig.name} network`);

      return {
        isCompatible: false,
        issues,
        solutions,
        networkInfo: {
          currentChain: currentChainId,
          requiredChain: requiredChainId,
          networkName: networkConfig.name,
        },
      };
    }

    // 5. Check wallet balance for Monad Mainnet
    if (requiredChainId === 143) {
      try {
        const accounts = await (provider as any).request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          issues.push('No wallet accounts detected');
          solutions.push('Connect your wallet and try again');
          return { isCompatible: false, issues, solutions };
        }

        const balance = await (provider as any).request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });

        const balanceInMON = parseFloat(ethers.formatEther(balance));
        const requiredMON = 0.01; // Small amount for gas

        if (balanceInMON < requiredMON) {
          issues.push(`Insufficient MON balance (${balanceInMON.toFixed(4)} MON)`);
          solutions.push(`You need at least ${requiredMON} MON for gas fees`);
          solutions.push('Get MON from a supported exchange or bridge');
          return { isCompatible: false, issues, solutions };
        }
      } catch (error) {
        issues.push('Unable to check wallet balance');
        solutions.push('Ensure your wallet is properly connected to Monad');
      }
    }

    // 6. Farcaster-specific checks
    if (
      typeof window !== 'undefined' &&
      (window.location.href.includes('farcaster') || document.referrer.includes('warpcast'))
    ) {
      // Check if Farcaster SDK is available
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (!sdk.wallet) {
          issues.push('Farcaster wallet not available');
          solutions.push('Make sure you have a wallet connected in the Farcaster app');
          return { isCompatible: false, issues, solutions };
        }
      } catch (error) {
        issues.push('Farcaster SDK not available');
        solutions.push('Try refreshing the mini app');
      }
    }

    // 7. Base network specific recommendations
    if (requiredChainId === 8453) {
      // Base mainnet
      const isUsingCoinbaseWallet = (provider as any).isCoinbaseWallet;
      if (!isUsingCoinbaseWallet) {
        solutions.push('For optimal Base experience, consider using Coinbase Wallet');
      }
    }

    return {
      isCompatible: true,
      issues: [],
      solutions: solutions.length > 0 ? solutions : ['Wallet is compatible'],
    };
  } catch (error) {
    issues.push(
      `Compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    solutions.push('Try disconnecting and reconnecting your wallet');
    return { isCompatible: false, issues, solutions };
  }
}

/**
 * Auto-fix common wallet issues
 */
export async function autoFixWalletIssues(requiredChainId: number): Promise<boolean> {
  try {
    const provider = await getEthereumProvider();
    if (!provider) {
      toast.error('No wallet provider found. Please connect your wallet.');
      return false;
    }

    // Get current chain
    const chainIdHex = await (provider as any).request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex, 16);

    // Auto-switch network if needed
    if (currentChainId !== requiredChainId) {
      const networkConfig = getNetworkByChainId(requiredChainId);
      if (!networkConfig) {
        toast.error(`Unsupported network: ${requiredChainId}`);
        return false;
      }

      toast.loading(`Switching to ${networkConfig.name}...`);

      try {
        // Try to switch to the network
        await (provider as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
        });

        toast.success(`Switched to ${networkConfig.name}`);
        return true;
      } catch (switchError: any) {
        // If network doesn't exist, try to add it
        if (switchError.code === 4902) {
          try {
            await (provider as any).request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${requiredChainId.toString(16)}`,
                  chainName: networkConfig.name,
                  nativeCurrency: {
                    name:
                      requiredChainId === 143
                        ? 'MON'
                        : requiredChainId === 42220
                          ? 'CELO'
                          : requiredChainId === 137
                            ? 'MATIC'
                            : 'ETH',
                    symbol:
                      requiredChainId === 143
                        ? 'MON'
                        : requiredChainId === 42220
                          ? 'CELO'
                          : requiredChainId === 137
                            ? 'MATIC'
                            : 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: networkConfig.rpcUrls,
                  blockExplorerUrls: [networkConfig.blockExplorer],
                },
              ],
            });

            toast.success(`Added and switched to ${networkConfig.name}`);
            return true;
          } catch (addError) {
            toast.error(`Failed to add ${networkConfig.name} network`);
            return false;
          }
        } else {
          toast.error(`Failed to switch to ${networkConfig.name}`);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    toast.error(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

/**
 * Get user-friendly error message for wallet issues
 */
export function getWalletErrorMessage(chainId: number, error: string): string {
  const networkConfig = getNetworkByChainId(chainId);
  const networkName = networkConfig?.name || `Chain ${chainId}`;

  if (error.includes('user rejected') || error.includes('User denied')) {
    return 'Transaction was rejected. Please confirm the transaction in your wallet.';
  }

  if (error.includes('insufficient funds')) {
    if (chainId === 143) {
      return 'Insufficient MON balance. You need MON for gas fees.';
    }
    return 'Insufficient funds for transaction. Please check your wallet balance.';
  }

  if (error.includes('network') || error.includes('chain')) {
    return `Please switch to ${networkName} network and try again.`;
  }

  if (error.includes('provider not available') || error.includes('wallet not connected')) {
    if (typeof window !== 'undefined' && window.location.href.includes('farcaster')) {
      return 'Wallet not detected in Farcaster app. Please connect your wallet and try again.';
    }
    return 'Wallet not connected. Please connect your wallet and try again.';
  }

  return error;
}

/**
 * Validate Farcaster wallet connection
 */
export async function validateFarcasterWallet(): Promise<{ isValid: boolean; message: string }> {
  try {
    // Check if we're in Farcaster context
    const isFarcaster =
      typeof window !== 'undefined' &&
      (window.location.href.includes('farcaster') ||
        document.referrer.includes('warpcast') ||
        document.referrer.includes('farcaster'));

    if (!isFarcaster) {
      return { isValid: true, message: 'Not in Farcaster context' };
    }

    // Try to get Farcaster SDK
    const { sdk } = await import('@farcaster/miniapp-sdk');

    // Check if wallet is available
    if (!sdk.wallet) {
      return {
        isValid: false,
        message: 'Farcaster wallet not available. Please connect your wallet in the Farcaster app.',
      };
    }

    // Try to get provider
    let provider = null;
    if (sdk.wallet.getEthereumProvider) {
      try {
        provider = await sdk.wallet.getEthereumProvider();
      } catch (error) {
        // Try legacy API
        provider = sdk.wallet.ethProvider;
      }
    } else {
      provider = sdk.wallet.ethProvider;
    }

    if (!provider) {
      return {
        isValid: false,
        message: 'Farcaster wallet provider not available. Please ensure your wallet is connected.',
      };
    }

    // Test provider functionality
    try {
      await provider.request({ method: 'eth_chainId' });
      return { isValid: true, message: 'Farcaster wallet is ready' };
    } catch (error) {
      return {
        isValid: false,
        message: 'Farcaster wallet provider is not responding. Please try refreshing the app.',
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `Farcaster validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
