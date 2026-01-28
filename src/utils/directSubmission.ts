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

    // Special handling for Farcaster - try to get accounts via eth_requestAccounts if needed
    let accounts = await ethersProvider.listAccounts();

    if (accounts.length === 0) {
      // In Farcaster context, accounts might need explicit request
      try {
        logger.info('🔑 No accounts found, requesting via eth_requestAccounts...');
        await provider.request({ method: 'eth_requestAccounts' });
        accounts = await ethersProvider.listAccounts();
      } catch (requestError) {
        logger.warn('Failed to request accounts:', requestError);
      }
    }

    if (accounts.length === 0) {
      return {
        isValid: false,
        error: 'No wallet accounts found. Please connect your wallet in Farcaster.',
      };
    }

    const currentAddress = accounts[0].address;
    logger.info('✅ Account retrieved:', currentAddress);

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

        // CRITICAL: Recreate ethers provider after network switch (especially for Farcaster)
        // The old provider instance may have stale network state
        const freshEthersProvider = new ethers.BrowserProvider(provider);
        const newNetwork = await freshEthersProvider.getNetwork();
        const newChainId = Number(newNetwork.chainId);

        if (newChainId !== targetChainId) {
          return {
            isValid: false,
            error: `Network switch failed. Expected ${targetChainId}, got ${newChainId}`,
          };
        }

        // Update to use the fresh provider and signer
        const freshSigner = await freshEthersProvider.getSigner();

        logger.info(`✅ Network switched successfully to ${targetChainId}`);

        // Return with fresh instances
        return {
          isValid: true,
          ethersProvider: freshEthersProvider,
          signer: freshSigner,
          currentAddress,
          chainId: targetChainId,
        };
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
): Promise<{ success: boolean; error?: string; transactionHash?: string; chainId?: number }> {
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

    // Validate contract has code at the address
    const code = await ethersProvider!.getCode(contractAddress);
    if (!code || code === '0x' || code.length <= 2) {
      return {
        success: false,
        error: `No contract found at address ${contractAddress} on chain ${chainId}. Please ensure you're on the correct network.`,
      };
    }

    logger.info('✅ Contract validated at address', { contractAddress, codeLength: code.length });

    // Sanitize inputs to ensure they are valid integers
    // Prevents "invalid BigNumberish value" errors if objects/arrays accidental leak in
    const safePushups = Math.floor(Number(pushups) || 0);
    const safeSquats = Math.floor(Number(squats) || 0);

    // Prepare transaction with robust gas estimation
    let tx;
    const txOverrides: any = {};

    // Add value ONLY for fee-based chains (Monad) and ensure it's valid
    if (feeAmount && parseFloat(feeAmount) > 0) {
      txOverrides.value = ethers.parseEther(feeAmount);
    }

    // Attempt gas estimation with fallback
    try {
      if (isVerified) {
        // For verified contracts, estimate based on which score we're submitting
        if (safePushups > 0) {
          const gasEstimate = await contract.submitScore.estimateGas(
            safePushups,
            'pushups',
            txOverrides
          );
          txOverrides.gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer
        } else if (safeSquats > 0) {
          const gasEstimate = await contract.submitScore.estimateGas(
            safeSquats,
            'squats',
            txOverrides
          );
          txOverrides.gasLimit = (gasEstimate * 120n) / 100n;
        }
      } else {
        // For standard contracts
        const gasEstimate = await contract.addScore.estimateGas(
          safePushups,
          safeSquats,
          txOverrides
        );
        txOverrides.gasLimit = (gasEstimate * 120n) / 100n;
      }
      logger.info('✅ Gas estimated successfully', { gasLimit: txOverrides.gasLimit });
    } catch (gasError: any) {
      logger.warn('⚠️ Gas estimation failed, using fallback', gasError);

      // Check if it's a revert with reason
      if (gasError.reason) {
        return {
          success: false,
          error: `Transaction would fail: ${gasError.reason}`,
        };
      }

      // Use fallback gas limits
      txOverrides.gasLimit = isVerified ? 100000n : 150000n;
      logger.info('📝 Using fallback gas limit', { gasLimit: txOverrides.gasLimit });
    }

    // Execute transaction based on contract type
    if (isVerified) {
      // For verified contracts (Celo only), submit each exercise type separately using submitScore
      if (safePushups > 0) {
        tx = await contract.submitScore(safePushups, 'pushups', txOverrides);
      } else if (safeSquats > 0) {
        tx = await contract.submitScore(safeSquats, 'squats', txOverrides);
      } else {
        return { success: false, error: 'At least one exercise must be > 0' };
      }
    } else {
      // For standard contracts (Monad, Polygon, Base), use addScore with both values
      tx = await contract.addScore(safePushups, safeSquats, txOverrides);
    }

    logger.info('📤 Transaction sent', { hash: tx.hash });

    // Wait for confirmation with Farcaster-compatible method
    try {
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        logger.info('✅ Transaction successful', {
          hash: receipt.hash,
        });
        return {
          success: true,
          transactionHash: receipt.hash,
          chainId: validationResult.chainId,
          error: undefined,
        };
      } else {
        logger.error('❌ Transaction failed', { receipt });
        return { success: false, error: 'Transaction failed' };
      }
    } catch (receiptError: any) {
      // Farcaster provider may not support eth_getTransactionReceipt
      if (
        receiptError.code === 'UNSUPPORTED_OPERATION' ||
        receiptError.code === -32601 ||
        receiptError.message?.includes('eth_getTransactionReceipt') ||
        receiptError.message?.includes('does not support')
      ) {
        logger.warn('⚠️ Provider does not support receipt polling, assuming success');
        // Transaction was sent successfully, just can't confirm
        return {
          success: true,
          transactionHash: tx.hash,
          chainId: validationResult.chainId,
          error: undefined,
        };
      }
      // Re-throw other errors
      throw receiptError;
    }
  } catch (error) {
    logger.error('❌ Submission error:', error);

    // Enhanced error handling with detailed logging
    let errorMessage = 'Transaction failed';
    if (error instanceof Error) {
      const fullErrorMessage = error.message;
      errorMessage = fullErrorMessage;

      // Log detailed error information for debugging
      logger.error('Error details:', {
        message: fullErrorMessage,
        code: (error as any).code,
        reason: (error as any).reason,
        data: (error as any).data,
        chainId,
        contractAddress,
        isVerified,
      });

      if (errorMessage.includes('user rejected')) {
        errorMessage = 'Transaction rejected. Please approve the transaction to continue.';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in your wallet.';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (
        errorMessage.includes('missing revert data') ||
        errorMessage.includes('estimateGas')
      ) {
        errorMessage =
          'Contract call failed. Please ensure you are on the correct network and the contract exists.';
      } else if (errorMessage.includes('no contract')) {
        errorMessage = 'Contract not found. Please check your network connection.';
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
    143: {
      chainId: '0x8f',
      chainName: 'Monad',
      nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
      rpcUrls: ['https://rpc.monad.xyz'],
    },
  };

  return configs[chainId];
}

// AGGRESSIVE CONSOLIDATION: Network switching logic moved to validateProviderConnection()
// This eliminates code duplication and provides a single source of truth
