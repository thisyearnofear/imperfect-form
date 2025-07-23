import * as DivviSDK from '@divvi/referral-sdk';
import { createWalletClient, custom, WalletClient } from 'viem';
import { mainnet, polygon, base, celo } from 'viem/chains';

/**
 * Divvi Integration for tracking referrals and rewards
 * Follows Divvi v2 SDK documentation for referral tracking and rewards
 * Added features: localStorage persistence, first-time user detection
 */

// Your unique Divvi consumer identifier
const DIVVI_CONSUMER_ID = '0x55A5705453Ee82c742274154136Fce8149597058' as `0x${string}`;

/**
 * Check if a user has already been registered with Divvi
 * @param userAddress The address of the user
 * @param chainId The chain ID to check (137: Polygon, 42220: Celo, 8453: Base)
 * @returns Promise resolving to true if the user has NOT been registered with Divvi yet
 */
/**
 * Creates a viem wallet client for the given chain
 * @param chainId The chain ID to create the wallet client for
 * @returns A configured viem WalletClient
 */
function getWalletClient(chainId: number): WalletClient {
  // Map chain IDs to viem chain configurations
  const chainConfig = {
    137: polygon,
    42220: celo,
    8453: base,
    1: mainnet, // fallback
  }[chainId] || mainnet;

  return createWalletClient({
    chain: chainConfig,
    transport: custom(window.ethereum!),
  });
}

/**
 * Check if a user has already been registered with Divvi
 * @param userAddress The address of the user
 * @param chainId The chain ID to check (137: Polygon, 42220: Celo, 8453: Base)
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
 * Gets the Divvi referral tag for a user
 * @param userAddress The address of the user
 * @returns The referral tag string
 */
export function getDivviReferralTag(userAddress: string): string {
  try {
    return DivviSDK.getReferralTag({
      user: userAddress as `0x${string}`,
      consumer: DIVVI_CONSUMER_ID,
    });
  } catch (error) {
    console.error("Error getting Divvi referral tag:", error);
    return '';
  }
}

/**
 * Gets the referral tag and prepares transaction data for Divvi referral tracking
 * @param userAddress The address of the user making the transaction
 * @param originalData The original transaction data to append the referral tag to
 * @returns The complete transaction data with referral tag appended
 */
export function prepareDivviTransaction(userAddress: string, originalData: string): string {
  try {
    // Generate the referral tag for Divvi tracking
    const referralTag = getDivviReferralTag(userAddress);
    
    // Append referral tag to transaction data as per Divvi docs
    const completeData = originalData + referralTag;
    console.log("Prepared transaction data with Divvi referral tag");
    return completeData;
  } catch (error) {
    console.error("Error preparing Divvi transaction data:", error);
    // Return original data if there's an error to avoid breaking the transaction
    return originalData;
  }
}

/**
 * Sends a transaction with Divvi referral tracking
 * @param params Transaction parameters including to, data, and value
 * @param chainId The chain ID where the transaction should be sent
 * @returns Promise resolving to the transaction hash
 */
export async function sendDivviTransaction(
  params: {
    to: `0x${string}`,
    data: string,
    value?: bigint,
    account?: `0x${string}`,
  },
  chainId: number
): Promise<`0x${string}`> {
  const walletClient = getWalletClient(chainId);
  
  // Get the sender's address if not provided
  const [account] = !params.account ? await walletClient.getAddresses() : [params.account];
  
  // Add Divvi referral tag to transaction data
  const dataWithReferral = prepareDivviTransaction(account, params.data);
  
  // Send transaction with referral metadata
  const txHash = await walletClient.sendTransaction({
    account,
    to: params.to,
    data: dataWithReferral as `0x${string}`,
    value: params.value,
    chain: walletClient.chain,
  });

  return txHash;
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

    // Ensure txHash is prefixed with 0x
    const formattedTxHash = txHash.startsWith('0x') ? txHash as `0x${string}` : `0x${txHash}` as `0x${string}`;

    // Submit the referral to Divvi
    await DivviSDK.submitReferral({
      txHash: formattedTxHash,
      chainId,
    });

    // Mark this user as registered with Divvi so we don't register them again
    markUserAsRegisteredWithDivvi(userAddress, chainId);

    console.log("Successfully registered Divvi referral");
    // Note: Success message handled by calling function to avoid duplicate toasts
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
    // Silent onboarding - no toast spam
    console.log("First-time user onboarding (silent)");
    
    // Automatically resolve to true after a short delay
    setTimeout(() => resolve(true), 100);
  });
}
