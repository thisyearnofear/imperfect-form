/**
 * Divvi Integration Helper Utilities
 * 
 * Clean, modular utilities for Divvi referral tracking
 * Maintains DRY principles and provides consistent interfaces
 * across the application for referral operations.
 */

import { getDivviReferralTag, prepareDivviTransaction, registerDivviReferral, isFirstTimeDivviUser, showEnhancedFeaturesPrompt } from './divviIntegration';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface DivviTransactionParams {
  userAddress: string;
  originalData: string;
  chainId: number;
}

export interface DivviSubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  isFirstTime?: boolean;
}

// =============================================================================
// CORE DIVVI UTILITIES
// =============================================================================

/**
 * Prepare transaction data with Divvi referral tracking
 * @param params - Transaction parameters
 * @returns Enhanced transaction data with referral tag
 */
export function enhanceTransactionWithDivvi(params: DivviTransactionParams): string {
  const { userAddress, originalData } = params;
  
  try {
    return prepareDivviTransaction(userAddress, originalData);
  } catch (error) {
    console.error('Error enhancing transaction with Divvi:', error);
    return originalData; // Fallback to original data
  }
}

/**
 * Handle post-transaction Divvi registration
 * @param txHash - Transaction hash
 * @param chainId - Chain ID
 * @param userAddress - User address
 * @returns Promise resolving to registration result
 */
export async function handleDivviPostTransaction(
  txHash: string,
  chainId: number,
  userAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await registerDivviReferral(txHash, chainId, userAddress);
    return { success: true };
  } catch (error) {
    console.error('Error registering Divvi referral:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if user needs Divvi onboarding and handle it
 * @param userAddress - User address
 * @param chainId - Chain ID
 * @returns Promise resolving to whether user is first time and accepted onboarding
 */
export async function handleDivviOnboarding(
  userAddress: string,
  chainId: number
): Promise<{ isFirstTime: boolean; accepted: boolean }> {
  try {
    const isFirstTime = await isFirstTimeDivviUser(userAddress, chainId);
    
    if (isFirstTime) {
      const accepted = await showEnhancedFeaturesPrompt();
      return { isFirstTime: true, accepted };
    }
    
    return { isFirstTime: false, accepted: true };
  } catch (error) {
    console.error('Error handling Divvi onboarding:', error);
    return { isFirstTime: false, accepted: true }; // Fallback to proceed
  }
}

/**
 * Complete Divvi workflow for a transaction
 * @param params - Transaction parameters
 * @returns Promise resolving to workflow result
 */
export async function completeDivviWorkflow(
  params: DivviTransactionParams & { txHash: string }
): Promise<DivviSubmissionResult> {
  const { userAddress, chainId, txHash } = params;
  
  try {
    // Handle onboarding if needed
    const onboarding = await handleDivviOnboarding(userAddress, chainId);
    
    if (!onboarding.accepted) {
      return {
        success: false,
        error: 'User declined enhanced features',
        isFirstTime: onboarding.isFirstTime
      };
    }
    
    // Register the referral
    const registration = await handleDivviPostTransaction(txHash, chainId, userAddress);
    
    return {
      success: registration.success,
      transactionHash: txHash,
      error: registration.error,
      isFirstTime: onboarding.isFirstTime
    };
  } catch (error) {
    console.error('Error completing Divvi workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get referral tag for a user (wrapper for consistency)
 * @param userAddress - User address
 * @returns Referral tag string
 */
export function getReferralTag(userAddress: string): string {
  return getDivviReferralTag(userAddress);
}

/**
 * Check if address is valid for Divvi operations
 * @param address - Address to validate
 * @returns Boolean indicating if address is valid
 */
export function isValidDivviAddress(address: string | undefined): address is string {
  return Boolean(address && address.startsWith('0x') && address.length === 42);
}