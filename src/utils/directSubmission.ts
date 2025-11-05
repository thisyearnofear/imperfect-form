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
// Removed: Enhanced wallet provider imports - using direct ethers approach

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
 * CONSOLIDATION: Unified Provider Validation
 * Single source of truth for provider connection validation
 */
interface ProviderValidationResult {
  isValid: boolean;
  error?: string;
  ethersProvider?: ethers.BrowserProvider;
  signer?: ethers.JsonRpcSigner;
  currentAddress?: string;
  chainId?: number;
}

async function validateProviderConnection(
  provider: any,
  targetChainId: number
): Promise<ProviderValidationResult> {
  try {
    // Step 1: Provider availability check
    if (!provider) {
      return {
        isValid: false,
        error: 'No wallet provider available. Please connect your wallet.',
      };
    }

    // Step 2: Create ethers provider and validate connection
    const ethersProvider = new ethers.BrowserProvider(provider);
    const accounts = await ethersProvider.listAccounts();

    if (accounts.length === 0) {
      return {
        isValid: false,
        error: 'No wallet accounts found. Please connect your wallet.',
      };
    }

    const currentAddress = accounts[0].address;

    // Step 3: Get network info and signer
    const network = await ethersProvider.getNetwork();
    const currentChainId = Number(network.chainId);
    const signer = await ethersProvider.getSigner();

    // Step 4: Network validation and switching
    if (currentChainId !== targetChainId) {
      logger.info(`🔄 Network switch required: ${currentChainId} → ${targetChainId}`);

      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });

        // Re-validate after network switch
        const newNetwork = await ethersProvider.getNetwork();
        const newChainId = Number(newNetwork.chainId);

        if (newChainId !== targetChainId) {
          return {
            isValid: false,
            error: `Network switch failed. Expected ${targetChainId}, got ${newChainId}`,
          };
        }

        logger.info(`✅ Network switched successfully to ${targetChainId}`);
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Network not added, try to add it
          const networkConfig = getNetworkConfig(targetChainId);
          if (networkConfig) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [networkConfig],
              });
              logger.info(`✅ Network added and switched to ${targetChainId}`);
            } catch (addError) {
              return {
                isValid: false,
                error: `Failed to add network ${targetChainId}. Please add it manually in your wallet.`,
              };
            }
          } else {
            return {
              isValid: false,
              error: `Unsupported network ${targetChainId}. Please switch manually.`,
            };
          }
        } else if (switchError.code === 4001) {
          return {
            isValid: false,
            error: 'Network switch was rejected. Please switch to the correct network manually.',
          };
        } else {
          return {
            isValid: false,
            error: `Network switch failed: ${switchError.message || 'Unknown error'}`,
          };
        }
      }
    }

    // Step 5: Final validation - ensure signer is ready
    try {
      await signer.getAddress(); // Validate signer is accessible
    } catch (signerError) {
      return {
        isValid: false,
        error: 'Wallet signer not available. Please reconnect your wallet.',
      };
    }

    return {
      isValid: true,
      ethersProvider,
      signer,
      currentAddress,
      chainId: targetChainId,
    };
  } catch (error) {
    logger.error('Provider validation failed:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Provider validation failed',
    };
  }
}

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
  provider: any, // EIP-1193 provider
  pushups: number,
  squats: number,
  contractAddress: string,
  chainId: number,
  isVerified = false, // Whether this is a verified fitness contract
  feeAmount: string | null = null // Optional fee for chains that require it
): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
  try {
    logger.info('🚀 Starting unified score submission', {
      pushups,
      squats,
      contractAddress,
      chainId,
      isVerified,
      feeAmount,
    });

    // ENHANCEMENT: Comprehensive provider validation
    const validationResult = await validateProviderConnection(provider, chainId);
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
      };
    }

    const { ethersProvider, signer, currentAddress } = validationResult;

    logger.info('✅ Wallet provider validated', {
      address: currentAddress,
      chainId: validationResult.chainId,
    });

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

    // Simplified error handling
    let errorMessage = 'Transaction failed';
    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes('user rejected')) {
        errorMessage = 'Transaction rejected. Please approve the transaction to continue.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in your wallet.';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Network configuration for adding chains
 */
function getNetworkConfig(chainId: number) {
  const configs: Record<number, any> = {
    1: {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://eth.drpc.org'],
    },
    137: {
      chainId: '0x89',
      chainName: 'Polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrls: ['https://polygon-rpc.com'],
    },
    42220: {
      chainId: '0xa4ec',
      chainName: 'Celo',
      nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
      rpcUrls: ['https://forno.celo.org'],
    },
    8453: {
      chainId: '0x2105',
      chainName: 'Base',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.base.org'],
    },
    10143: {
      chainId: '0x279f',
      chainName: 'Monad Testnet',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: ['https://testnet-rpc.monad.xyz'],
    },
  };

  return configs[chainId];
}

// AGGRESSIVE CONSOLIDATION: Network switching logic moved to validateProviderConnection()
// This eliminates code duplication and provides a single source of truth
