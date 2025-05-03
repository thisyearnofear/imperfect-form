import { ethers } from 'ethers';
import { fitnessLeaderboardABI } from '@/constants/contracts';
import toast from 'react-hot-toast';

/**
 * Submit a score directly using ethers.js instead of ThirdWeb
 * This provides more control over the transaction and better error handling
 */
export async function submitScoreDirectly(
  contractAddress: string,
  pushups: number,
  squats: number
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  if (!window.ethereum) {
    return {
      success: false,
      error: 'No Ethereum provider found. Please install a wallet extension.'
    };
  }

  try {
    // Create a provider without custom options first
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Set the polling interval and timeout separately
    provider.pollingInterval = 15000; // 15 seconds

    // Request the user to switch to the correct network if needed
    const network = await provider.getNetwork();
    console.log('Current network:', network);

    // Get the signer
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      fitnessLeaderboardABI,
      signer
    );

    // Log the contract and parameters
    console.log('Contract address:', contractAddress);
    console.log('User address:', userAddress);
    console.log('Pushups:', pushups);
    console.log('Squats:', squats);

    // Show toast for user to confirm transaction
    toast.loading('Preparing transaction...', { id: 'submit-score' });

    // Estimate gas with a higher gas limit to avoid failures
    let gasEstimate;
    try {
      gasEstimate = await contract.estimateGas.addScore(pushups, squats, {
        from: userAddress,
      });
      console.log('Gas estimation successful:', gasEstimate.toString());
    } catch (error) {
      console.error('Gas estimation failed:', error);
      // If gas estimation fails, use a default high gas limit
      gasEstimate = ethers.BigNumber.from(500000);
      console.log('Using default gas limit:', gasEstimate.toString());
    }

    // Add 50% buffer to gas estimate for testnet transactions
    const gasLimit = gasEstimate.mul(150).div(100);
    console.log('Gas limit with buffer:', gasLimit.toString());

    // Show toast for user to confirm transaction
    toast.loading('Please confirm the transaction in your wallet...', { id: 'submit-score' });

    // Send transaction with explicit gas limit
    // Try with EIP-1559 parameters first, but fall back to legacy if needed
    let tx;
    try {
      // Try EIP-1559 transaction (supported by most modern wallets)
      tx = await contract.addScore(pushups, squats, {
        gasLimit: gasLimit,
        maxPriorityFeePerGas: ethers.utils.parseUnits('2', 'gwei'), // Higher priority fee
        maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'), // Higher max fee
      });
    } catch (error) {
      console.log('EIP-1559 transaction failed, falling back to legacy:', error);

      // Fall back to legacy transaction format
      tx = await contract.addScore(pushups, squats, {
        gasLimit: gasLimit,
        gasPrice: ethers.utils.parseUnits('30', 'gwei'), // Higher gas price for legacy transactions
      });
    }

    // Show pending transaction toast
    toast.loading(`Transaction submitted. Waiting for confirmation...`, { id: 'submit-score' });
    console.log('Transaction hash:', tx.hash);

    // Wait for transaction to be mined
    let receipt;
    try {
      // First, set a shorter timeout for UI feedback
      const receiptPromise = tx.wait();

      // Show a message after 15 seconds to let the user know it's still processing
      const timeoutId = setTimeout(() => {
        toast.loading(
          'Transaction submitted but taking longer than expected to confirm. It will continue processing in the background.',
          { id: 'submit-score', duration: 10000 }
        );
      }, 15000);

      // Wait for the transaction with a longer timeout
      receipt = await receiptPromise;

      // Clear the timeout if we got the receipt
      clearTimeout(timeoutId);
    } catch (error) {
      console.error('Error waiting for transaction receipt:', error);
      // Even if waiting for receipt fails, the transaction might still be processing
      throw new Error('Transaction was submitted but confirmation timed out. It may still complete in the background. Transaction hash: ' + tx.hash);
    }

    console.log('Transaction receipt:', receipt);

    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error: Error | unknown) {
    const err = error as {
      code?: string;
      reason?: string;
      message?: string;
    };
    console.error('Error submitting score:', error);

    // Handle specific error types with user-friendly messages
    if (err.code === 'ACTION_REJECTED') {
      return {
        success: false,
        error: 'Transaction rejected by user'
      };
    } else if (err.code === 'INSUFFICIENT_FUNDS') {
      return {
        success: false,
        error: 'Insufficient funds for transaction'
      };
    } else if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        success: false,
        error: 'Contract error: The transaction may revert. Check if you have already submitted recently.'
      };
    } else if (err.message && err.message.includes('execution reverted')) {
      return {
        success: false,
        error: 'Contract execution reverted. You may have already submitted recently or the contract has restrictions.'
      };
    } else if (err.message && err.message.includes('timeout')) {
      return {
        success: false,
        error: 'Network is slow or unresponsive. Please try again later or switch to a different network.'
      };
    } else if (err.message && err.message.includes('Transaction confirmation timeout')) {
      return {
        success: false,
        error: 'Transaction is taking too long to confirm. It may still complete in the background.'
      };
    } else if (err.message && err.message.includes('the tx doesn\'t have the correct nonce')) {
      return {
        success: false,
        error: 'Transaction nonce issue. Please reset your wallet connection and try again.'
      };
    }

    // For other errors, provide a simplified message
    return {
      success: false,
      error: 'Transaction failed: ' + (err.reason || err.message || 'Unknown error')
    };
  }
}

/**
 * Check if a user can submit a score (based on cooldown period)
 */
export async function canUserSubmit(
  contractAddress: string,
  userAddress: string
): Promise<{ canSubmit: boolean; timeRemaining?: number }> {
  if (!window.ethereum) {
    return { canSubmit: false };
  }

  try {
    // Create a provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Get the current network to check if we're on Polygon Amoy
    const network = await provider.getNetwork();
    console.log('Checking submission eligibility on network:', network);

    // For Polygon Amoy, bypass the cooldown check due to contract issues
    if (network.chainId === 80002) {
      console.log('On Polygon Amoy, bypassing cooldown check due to contract issues');
      return { canSubmit: true };
    }

    // Create contract instance (read-only)
    const contract = new ethers.Contract(
      contractAddress,
      fitnessLeaderboardABI,
      provider
    );

    try {
      // Call the getTimeUntilNextSubmission function
      const timeRemaining = await contract.getTimeUntilNextSubmission(userAddress);

      return {
        canSubmit: timeRemaining.eq(0),
        timeRemaining: timeRemaining.toNumber()
      };
    } catch (contractError) {
      console.error('Error calling getTimeUntilNextSubmission:', contractError);

      // If there's a specific contract error, we'll still allow submission
      // This is a fallback for contract issues
      return { canSubmit: true };
    }
  } catch (error) {
    console.error('Error checking if user can submit:', error);
    // Default to allowing submission if we can't check
    return { canSubmit: true };
  }
}
