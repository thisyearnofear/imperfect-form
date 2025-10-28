/**
 * ENHANCED DIRECT SUBMISSION SYSTEM
 *
 * Following Core Principles:
 * - ROBUST WALLET CONNECTION: Enhanced provider detection with fallbacks
 * - FARCASTER-FIRST: Optimized for auto-connection scenarios
 * - WALLETCONNECT FALLBACK: Graceful degradation for failed connections
 * - CLEAN: Clear separation of concerns
 */

import { ethers } from 'ethers';
import {
  getTransactionReadyProvider,
  handleProviderError,
  validateProviderForTransaction,
  switchProviderNetwork,
  type WalletProvider,
} from './enhancedWalletProvider';

// STANDARDIZED ABI for Normal Contracts (Updated for StandardFitnessLeaderboard)
const NORMAL_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'pushups', type: 'uint256' },
      { internalType: 'uint256', name: 'squats', type: 'uint256' },
    ],
    name: 'addScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'baseScore', type: 'uint256' },
      { internalType: 'string', name: 'exerciseType', type: 'string' },
    ],
    name: 'submitScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserScore',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'uint256', name: 'totalScore', type: 'uint256' },
        ],
        internalType: 'struct StandardFitnessLeaderboard.Score',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

// STANDARDIZED ABI for Verified Contracts
const VERIFIED_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'baseScore', type: 'uint256' },
      { internalType: 'string', name: 'exerciseType', type: 'string' },
    ],
    name: 'submitScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserScore', // Changed to match our unified contract
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'bool', name: 'isVerified', type: 'bool' },
        ],
        internalType: 'struct Score',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

import { isFarcasterMiniApp, isBraveBrowser } from '@/utils/farcasterMiniApp';
import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('DirectSubmission');

/**
 * Minimal Environment Detection
 */
export function detectEnvironment() {
  if (typeof window === 'undefined') return 'unknown';

  const isFarcaster = isFarcasterMiniApp();
  const isBrave = isBraveBrowser();

  return { isFarcaster, isBrave, userAgent: navigator.userAgent };
}

/**
 * Direct Contract Submission
 *
 * AGGRESSIVE CONSOLIDATION: Single function handles all submission logic
 */
/**
 * Determine if a contract is a verified contract based on chain ID and contract address
 */
export function isVerifiedContract(chainId: number, contractAddress: string): boolean {
  // Only Celo has verified contracts (Self Protocol integration)
  if (chainId === 42220) {
    // Check if it's the verified Celo contract address
    const verifiedCeloAddress =
      process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT ||
      '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03';
    return contractAddress.toLowerCase() === verifiedCeloAddress.toLowerCase();
  }
  return false;
}

export async function submitScoreDirect(
  pushups: number,
  squats: number,
  contractAddress: string,
  chainId: number,
  isVerified = false, // Whether this is a verified fitness contract
  feeAmount: string | null = null // Optional fee for chains that require it
): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
  let walletProvider: WalletProvider | null = null;

  try {
    logger.info('🚀 Starting enhanced score submission', {
      pushups,
      squats,
      contractAddress,
      chainId,
      isVerified,
      feeAmount,
    });

    // Enhanced provider detection with fallbacks
    walletProvider = await getTransactionReadyProvider();
    if (!walletProvider) {
      return {
        success: false,
        error: 'No wallet provider available. Please connect your wallet or try WalletConnect.',
      };
    }

    logger.info('✅ Wallet provider obtained', {
      source: walletProvider.source,
      isReady: walletProvider.isReady,
      address: walletProvider.address,
    });

    // Validate provider is ready for transactions
    if (walletProvider.isReady) {
      const validation = await validateProviderForTransaction(walletProvider.provider);
      if (!validation.valid) {
        logger.warn('Provider validation failed:', validation.error);
        return {
          success: false,
          error: `Wallet not ready: ${validation.error}. Please try reconnecting.`,
        };
      }
    }

    // Switch network if needed
    if (walletProvider.chainId && walletProvider.chainId !== chainId) {
      logger.info(`🔄 Switching network from ${walletProvider.chainId} to ${chainId}`);
      const switchResult = await switchProviderNetwork(walletProvider.provider, chainId);
      if (!switchResult.success) {
        return {
          success: false,
          error: `Please switch to the correct network. ${switchResult.error || ''}`,
        };
      }
    }

    const provider = walletProvider.provider;
    const signer = await provider.getSigner();

    // Auto-detect contract type if not specified
    const shouldVerify = isVerified || isVerifiedContract(chainId, contractAddress);

    // Select appropriate ABI based on contract type
    const abi = shouldVerify ? VERIFIED_ABI : NORMAL_ABI;
    const contract = new ethers.Contract(contractAddress, abi, signer);

    // Prepare transaction based on contract type
    let tx;
    if (isVerified) {
      // For verified contracts (Celo only), submit each exercise type separately using submitScore
      if (pushups > 0) {
        if (feeAmount) {
          tx = await contract.submitScore(pushups, 'pushups', {
            value: ethers.parseEther(feeAmount),
          });
        } else {
          tx = await contract.submitScore(pushups, 'pushups');
        }
      } else if (squats > 0) {
        if (feeAmount) {
          tx = await contract.submitScore(squats, 'squats', {
            value: ethers.parseEther(feeAmount),
          });
        } else {
          tx = await contract.submitScore(squats, 'squats');
        }
      } else {
        return { success: false, error: 'At least one exercise must be > 0' };
      }
    } else {
      // For standard contracts (Monad, Polygon, Base), use addScore with both values
      if (feeAmount) {
        // For chains requiring fees (like Monad)
        tx = await contract.addScore(pushups, squats, { value: ethers.parseEther(feeAmount) });
      } else {
        // Standard transaction
        tx = await contract.addScore(pushups, squats);
      }
    }

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt && receipt.status === 1) {
      logger.info('✅ Transaction successful', {
        hash: receipt.hash,
        source: walletProvider.source,
      });
      return {
        success: true,
        transactionHash: receipt.hash,
        error: undefined,
      };
    } else {
      logger.error('❌ Transaction failed', { receipt });
      return { success: false, error: 'Transaction failed' };
    }
  } catch (error) {
    logger.error('❌ Submission error:', error);

    // Use enhanced error handling
    const providerError = handleProviderError(error, walletProvider?.source || 'unknown');

    // Enhanced error messages with recovery suggestions
    let errorMessage = providerError.message;
    if (providerError.recoverable) {
      switch (providerError.code) {
        case 'PROVIDER_NOT_READY':
          errorMessage += ' Try using WalletConnect as an alternative.';
          break;
        case 'USER_REJECTED':
          errorMessage += ' Please approve the transaction to continue.';
          break;
        case 'SESSION_ERROR':
          errorMessage += ' Please disconnect and reconnect your wallet.';
          break;
        case 'NETWORK_ERROR':
          errorMessage += ' Please check your internet connection and try again.';
          break;
      }
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Network Switch Helper - Enhanced version
 * Now uses the enhanced provider system
 */
export async function switchNetwork(chainId: number): Promise<boolean> {
  try {
    logger.info('🔄 Attempting network switch', { chainId });

    const walletProvider = await getTransactionReadyProvider();
    if (!walletProvider) {
      logger.warn('No wallet provider available for network switch');
      return false;
    }

    const result = await switchProviderNetwork(walletProvider.provider, chainId);
    if (result.success) {
      logger.info('✅ Network switch successful', { chainId });
    } else {
      logger.error('❌ Network switch failed', { chainId, error: result.error });
    }

    return result.success;
  } catch (error) {
    logger.error('Network switch error:', error);
    return false;
  }
}
