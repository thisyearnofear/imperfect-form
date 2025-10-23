/**
 * MINIMAL DIRECT SUBMISSION SYSTEM
 *
 * Following Core Principles:
 * - AGGRESSIVE CONSOLIDATION: Single file, no dependencies
 * - PREVENT BLOAT: Minimal code, focused functionality
 * - DRY: Single source of truth
 * - CLEAN: Clear separation of concerns
 */

import { ethers } from 'ethers';

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
  try {
    // Direct provider access - minimal abstraction
    if (!window.ethereum) {
      return { success: false, error: 'No wallet provider detected' };
    }

    const environment = detectEnvironment();
    const provider = new ethers.BrowserProvider(window.ethereum);
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
      return {
        success: true,
        transactionHash: receipt.hash,
        error: undefined,
      };
    } else {
      return { success: false, error: 'Transaction failed' };
    }
  } catch (error) {
    let errorMessage = 'Submission failed';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Environment-specific error handling
      const env = detectEnvironment();
      if (typeof env !== 'string' && env.isFarcaster) {
        if (errorMessage.includes('user denied')) {
          errorMessage = 'Transaction rejected in Farcaster wallet';
        }
      } else if (typeof env !== 'string' && env.isBrave) {
        if (errorMessage.includes('provider')) {
          errorMessage = 'Brave wallet connection issue - try refreshing';
        }
      }
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Network Switch Helper
 */
export async function switchNetwork(chainId: number): Promise<boolean> {
  try {
    if (!window.ethereum) return false;

    const chainIdHex = `0x${chainId.toString(16)}`;

    try {
      // Try to switch network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      return true;
    } catch (switchError: any) {
      // If network doesn't exist, try to add it
      if (switchError.code === 4902) {
        // Define network config based on chainId
        let networkConfig: any;
        switch (chainId) {
          case 1: // Ethereum
            networkConfig = {
              chainId: chainIdHex,
              chainName: 'Ethereum',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://eth.drpc.org'],
            };
            break;
          case 137: // Polygon
            networkConfig = {
              chainId: chainIdHex,
              chainName: 'Polygon',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com'],
            };
            break;
          case 42220: // Celo
            networkConfig = {
              chainId: chainIdHex,
              chainName: 'Celo',
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: ['https://forno.celo.org'],
            };
            break;
          case 8453: // Base
            networkConfig = {
              chainId: chainIdHex,
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
            };
            break;
          case 10143: // Monad Testnet
            networkConfig = {
              chainId: chainIdHex,
              chainName: 'Monad Testnet',
              nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
            };
            break;
          default:
            return false;
        }

        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
        return true;
      }
      return false;
    }
  } catch (error) {
    return false;
  }
}
