import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

/**
 * Divvi Integration for tracking referrals
 * This integration adds referral metadata to transactions and registers users with Divvi
 * to enable tracking and rewards for driving on-chain activity.
 */

// Constants for Divvi integration
const DIVVI_CONSUMER_ID = '0x55A5705453Ee82c742274154136Fce8149597058' as `0x${string}`;
const DIVVI_PROVIDERS: `0x${string}`[] = []; // Add providers if needed in the future

/**
 * Check if a user is a first-time user (has never submitted a transaction before)
 * @param contractAddress The address of the contract
 * @param userAddress The address of the user
 * @returns Promise resolving to true if the user is a first-time user
 */
export async function isFirstTimeUser(
  contractAddress: string,
  userAddress: string
): Promise<boolean> {
  try {
    if (!window.ethereum) {
      console.error("No Ethereum provider found");
      return false;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Create a contract instance with minimal ABI to check user participation
    const minimalABI = [
      "function getUserScores(address user) view returns (uint256, uint256, uint256)"
    ];
    
    const contract = new ethers.Contract(
      contractAddress,
      minimalABI,
      provider
    );

    // Try to get user scores - if they exist, user has participated before
    const [totalScore, , ] = await contract.getUserScores(userAddress);
    
    // If totalScore is 0, they might be a first-time user (they've never submitted)
    return totalScore.eq(0);
  } catch (error) {
    // If there's an error (like the function doesn't exist), assume it's a first-time user
    console.log("Error checking if first-time user, assuming first time:", error);
    return true;
  }
}

/**
 * Gets the data suffix for Divvi referral tracking
 * @returns The data suffix to append to transaction data
 */
export function getDivviDataSuffix(): string {
  // Generate the data suffix for Divvi referral tracking
  return getDataSuffix({
    consumer: DIVVI_CONSUMER_ID,
    providers: DIVVI_PROVIDERS,
  });
}

/**
 * Registers a completed transaction with Divvi to track the referral
 * @param txHash The hash of the completed transaction
 * @param chainId The chain ID where the transaction was submitted
 */
export async function registerDivviReferral(txHash: string, chainId: number): Promise<void> {
  try {
    console.log("Registering Divvi referral for transaction:", txHash, "on chain:", chainId);
    
    // Submit the referral to Divvi
    // Ensure txHash is prefixed with 0x
    const formattedTxHash = txHash.startsWith('0x') ? txHash as `0x${string}` : `0x${txHash}` as `0x${string}`;
    
    await submitReferral({
      txHash: formattedTxHash,
      chainId,
    });
    
    console.log("Successfully registered Divvi referral");
    toast.success("Enhanced features activated!", { duration: 5000 });
  } catch (error) {
    console.error("Failed to register Divvi referral:", error);
    // Don't show an error toast as this is not critical for the user experience
  }
}

/**
 * Shows a modal or notification to the user explaining the enhanced features
 * they'll get by signing up
 * @returns Promise resolving to true if the user accepts
 */
export function showEnhancedFeaturesPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    // Show a toast notification about the enhanced features
    toast.success(
      "You're about to unlock enhanced features on Imperfect Form! Your first transaction will register you for special features and rewards.",
      {
        duration: 7000,
        position: "top-center",
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          maxWidth: '500px',
        },
      }
    );
    
    // Automatically resolve to true after a short delay
    // In a real implementation, you might want a proper modal with accept/decline buttons
    setTimeout(() => resolve(true), 3000);
  });
}
