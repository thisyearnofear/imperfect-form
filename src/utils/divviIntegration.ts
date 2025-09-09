import { getReferralTag, submitReferral } from '@divvi/referral-sdk';

/**
 * Divvi Integration for tracking referrals and rewards
 * Follows Divvi v2 SDK documentation exactly
 * Implements the official 3-step process: generate tag, add to calldata, register transaction
 */

// Your unique Divvi consumer identifier
const DIVVI_CONSUMER_ID = '0x55A5705453Ee82c742274154136Fce8149597058' as `0x${string}`;

/**
 * Step 1: Generate a referral tag for the user
 * @param userAddress The address of the user making the transaction
 * @returns The referral tag string
 */
export function getDivviReferralTag(userAddress: string): string {
  try {
    return getReferralTag({
      user: userAddress as `0x${string}`,
      consumer: DIVVI_CONSUMER_ID,
    });
  } catch (error) {
    console.error('Error getting Divvi referral tag:', error);
    return '';
  }
}

/**
 * Step 2: Add the referral tag to transaction calldata
 * @param userAddress The address of the user making the transaction
 * @param originalData The original transaction data
 * @returns The transaction data with referral tag appended
 */
export function addReferralTagToCalldata(userAddress: string, originalData: string): string {
  try {
    const referralTag = getDivviReferralTag(userAddress);
    return originalData + referralTag;
  } catch (error) {
    console.error('Error adding referral tag to calldata:', error);
    // Return original data if there's an error to avoid breaking the transaction
    return originalData;
  }
}

/**
 * Step 3: Register the transaction with Divvi after it is confirmed
 * @param txHash The hash of the completed transaction
 * @param chainId The chain ID where the transaction was submitted
 */
export async function registerDivviReferral(txHash: string, chainId: number): Promise<void> {
  try {
    // Ensure txHash is properly formatted
    const formattedTxHash = txHash.startsWith('0x')
      ? (txHash as `0x${string}`)
      : (`0x${txHash}` as `0x${string}`);

    await submitReferral({
      txHash: formattedTxHash,
      chainId,
    });

    console.log('Successfully registered Divvi referral for transaction:', txHash);
  } catch (error) {
    console.error('Failed to register Divvi referral:', error);
    // Don't throw error as this is not critical for the user experience
  }
}
