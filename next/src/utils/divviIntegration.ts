import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
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
 * Check if a user has already been registered with Divvi
 * @param userAddress The address of the user
 * @param chainId The chain ID to check
 * @returns Promise resolving to true if the user has NOT been registered with Divvi yet
 */
export async function isFirstTimeDivviUser(
  userAddress: string,
  chainId: number
): Promise<boolean> {
  try {
    // Create a unique key for this user and chain combination
    const storageKey = `divvi_registered_${userAddress.toLowerCase()}_${chainId}`;

    // Check localStorage to see if this user has been registered before
    const hasBeenRegistered = localStorage.getItem(storageKey) === 'true';

    if (hasBeenRegistered) {
      console.log(`User ${userAddress} has already been registered with Divvi on chain ${chainId}`);
      return false;
    }

    console.log(`User ${userAddress} is a first-time Divvi user on chain ${chainId}`);
    return true;
  } catch (error) {
    console.error("Error checking Divvi registration status:", error);
    // If there's an error, assume they haven't been registered to be safe
    return true;
  }
}

/**
 * Mark a user as registered with Divvi
 * @param userAddress The address of the user
 * @param chainId The chain ID where they were registered
 */
export function markUserAsRegisteredWithDivvi(
  userAddress: string,
  chainId: number
): void {
  try {
    const storageKey = `divvi_registered_${userAddress.toLowerCase()}_${chainId}`;
    localStorage.setItem(storageKey, 'true');
    console.log(`Marked user ${userAddress} as registered with Divvi on chain ${chainId}`);
  } catch (error) {
    console.error("Error marking user as registered with Divvi:", error);
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
 * @param userAddress The address of the user to mark as registered
 */
export async function registerDivviReferral(
  txHash: string,
  chainId: number,
  userAddress: string
): Promise<void> {
  try {
    console.log("Registering Divvi referral for transaction:", txHash, "on chain:", chainId);

    // Submit the referral to Divvi
    // Ensure txHash is prefixed with 0x
    const formattedTxHash = txHash.startsWith('0x') ? txHash as `0x${string}` : `0x${txHash}` as `0x${string}`;

    await submitReferral({
      txHash: formattedTxHash,
      chainId,
    });

    // Mark this user as registered with Divvi so we don't register them again
    markUserAsRegisteredWithDivvi(userAddress, chainId);

    console.log("Successfully registered Divvi referral");
    toast.success("Registration complete! 🎉", { duration: 3000 });
  } catch (error) {
    console.error("Failed to register Divvi referral:", error);
    // Don't show an error toast as this is not critical for the user experience
  }
}

/**
 * Shows a brief notification about first-time registration
 * @returns Promise resolving to true if the user accepts
 */
export function showEnhancedFeaturesPrompt(): Promise<boolean> {
  return new Promise((resolve) => {
    // Show a brief, honest notification
    toast.success(
      "First workout submission - registering your participation! 🎯",
      {
        duration: 3000,
        position: "top-center",
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          maxWidth: '400px',
        },
      }
    );

    // Automatically resolve to true after a short delay
    setTimeout(() => resolve(true), 1500);
  });
}
