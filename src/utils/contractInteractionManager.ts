/**
 * Comprehensive Contract Interaction Error Handling with Retry Mechanisms
 *
 * Addresses "missing revert data" and other contract interaction failures by implementing
 * intelligent retry strategies, proper error decoding, and contract validation.
 */

import { ethers } from 'ethers';
import { createRemoteLogger } from './remoteLogger';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('ContractInteractionManager');

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
  gasUsed?: bigint;
  blockNumber?: number;
  retryAttempts: number;
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'network error',
    'timeout',
    'connection error',
    'server error',
    'rate limit',
    'temporary failure',
    'nonce too low',
    'replacement transaction underpriced',
    'already known',
    'insufficient funds for gas',
  ],
};

// Error classifications for better handling
enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  USER_REJECTION = 'USER_REJECTION',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GAS_ERROR = 'GAS_ERROR',
  NONCE_ERROR = 'NONCE_ERROR',
  REVERT_ERROR = 'REVERT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Classify an error to determine retry strategy
 */
function classifyError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN_ERROR;

  const errorMessage = (error.message || error.toString()).toLowerCase();
  const errorCode = error.code;

  // User rejection - don't retry
  if (
    errorCode === 4001 ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('user denied')
  ) {
    return ErrorType.USER_REJECTION;
  }

  // Network errors - retry with backoff
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('enotfound') ||
    errorCode === 'NETWORK_ERROR' ||
    errorCode === 'TIMEOUT'
  ) {
    return ErrorType.NETWORK_ERROR;
  }

  // Gas related errors
  if (
    errorMessage.includes('gas') ||
    errorMessage.includes('out of gas') ||
    errorMessage.includes('intrinsic gas too low') ||
    errorCode === -32000
  ) {
    return ErrorType.GAS_ERROR;
  }

  // Insufficient funds
  if (
    errorMessage.includes('insufficient funds') ||
    errorMessage.includes('insufficient balance')
  ) {
    return ErrorType.INSUFFICIENT_FUNDS;
  }

  // Nonce errors - can often retry
  if (
    errorMessage.includes('nonce') ||
    errorMessage.includes('replacement transaction underpriced') ||
    errorMessage.includes('already known')
  ) {
    return ErrorType.NONCE_ERROR;
  }

  // Contract revert errors
  if (
    errorMessage.includes('revert') ||
    errorMessage.includes('execution reverted') ||
    errorMessage.includes('missing revert data') ||
    errorCode === 'CALL_EXCEPTION'
  ) {
    return ErrorType.REVERT_ERROR;
  }

  // Generic contract errors
  if (
    errorMessage.includes('contract') ||
    errorMessage.includes('function') ||
    errorCode === 'INVALID_ARGUMENT'
  ) {
    return ErrorType.CONTRACT_ERROR;
  }

  return ErrorType.UNKNOWN_ERROR;
}

/**
 * Determine if an error is retryable based on its classification
 */
function isRetryableError(errorType: ErrorType): boolean {
  switch (errorType) {
    case ErrorType.NETWORK_ERROR:
    case ErrorType.NONCE_ERROR:
    case ErrorType.GAS_ERROR:
      return true;
    case ErrorType.USER_REJECTION:
    case ErrorType.INSUFFICIENT_FUNDS:
      return false;
    case ErrorType.REVERT_ERROR:
    case ErrorType.CONTRACT_ERROR:
      return true; // Sometimes retryable if due to network issues
    case ErrorType.UNKNOWN_ERROR:
      return true; // Conservative approach - try once more
    default:
      return false;
  }
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate contract exists and has code at the given address
 */
async function validateContract(
  contractAddress: string,
  provider: ethers.Provider
): Promise<boolean> {
  try {
    const code = await provider.getCode(contractAddress);
    const hasCode = code && code !== '0x' && code.length > 2;

    if (!hasCode) {
      logger.warn(`No contract code found at address: ${contractAddress}`);
      return false;
    }

    logger.debug(`Contract validated at address: ${contractAddress} (${code.length} bytes)`);
    return true;
  } catch (error) {
    logger.warn(`Contract validation failed for ${contractAddress}:`, error);
    return false;
  }
}

/**
 * Estimate gas with buffer and validation
 */
async function estimateGasRobustly(
  contract: ethers.Contract,
  methodName: string,
  args: any[],
  overrides: any = {}
): Promise<bigint> {
  try {
    // First, try direct estimation
    const estimatedGas = await contract[methodName].estimateGas(...args, overrides);

    // Add 20% buffer for safety
    const gasWithBuffer = (estimatedGas * 120n) / 100n;

    logger.debug(
      `Gas estimated for ${methodName}: ${estimatedGas} (with buffer: ${gasWithBuffer})`
    );
    return gasWithBuffer;
  } catch (estimationError) {
    logger.warn(`Gas estimation failed for ${methodName}, using fallback:`, estimationError);

    // Fallback gas limits based on method complexity
    const fallbackGasLimits: Record<string, bigint> = {
      addScore: 150000n,
      submitScore: 100000n,
      approve: 50000n,
      transfer: 50000n,
      mint: 100000n,
      burn: 50000n,
      default: 200000n,
    };

    return fallbackGasLimits[methodName] || fallbackGasLimits.default;
  }
}

/**
 * Decode revert reason from error
 */
function decodeRevertReason(error: any): string | null {
  try {
    // Check for explicit revert reason
    if (error.reason) {
      return error.reason;
    }

    // Check for revert data in error
    if (error.data && typeof error.data === 'string') {
      try {
        // Try to decode as standard revert string
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['string'], error.data);
        if (decoded && decoded[0]) {
          return decoded[0];
        }
      } catch (decodeError) {
        logger.debug('Failed to decode revert data:', decodeError);
      }
    }

    // Check for nested error information
    if (error.error && error.error.message) {
      return error.error.message;
    }

    return null;
  } catch (error) {
    logger.debug('Failed to decode revert reason:', error);
    return null;
  }
}

/**
 * Execute a contract read operation with retry logic
 */
export async function executeContractRead<T>(
  contract: ethers.Contract,
  methodName: string,
  args: any[] = [],
  config: Partial<RetryConfig> = {}
): Promise<ContractCallResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      logger.debug(
        `Executing read ${methodName} (attempt ${attempt + 1}/${finalConfig.maxRetries + 1})`
      );

      // Validate contract before calling
      const isValidContract = await validateContract(
        await contract.getAddress(),
        contract.runner?.provider!
      );
      if (!isValidContract) {
        return {
          success: false,
          error: 'Contract not found at the specified address',
          retryAttempts: attempt,
        };
      }

      // Execute the read operation with timeout
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Contract read timeout')), 10000)
      );

      const result = await Promise.race([contract[methodName](...args), timeout]);

      logger.info(`Read operation ${methodName} completed successfully`);
      return {
        success: true,
        data: result,
        retryAttempts: attempt,
      };
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);
      const revertReason = decodeRevertReason(error);

      logger.warn(`Read operation ${methodName} failed (attempt ${attempt + 1}):`, {
        error: error instanceof Error ? error.message : String(error),
        type: errorType,
        revertReason,
      });

      // Don't retry on final attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(errorType)) {
        logger.info(`Error type ${errorType} is not retryable, stopping attempts`);
        break;
      }

      // Wait before retry with exponential backoff
      const delay = calculateBackoffDelay(attempt, finalConfig);
      logger.debug(`Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  // All retries failed
  const revertReason = decodeRevertReason(lastError);
  const _errorType = classifyError(lastError);

  return {
    success: false,
    error: revertReason || lastError?.message || 'Contract read failed',
    retryAttempts: finalConfig.maxRetries,
  };
}

/**
 * Execute a contract write operation with retry logic and comprehensive error handling
 */
export async function executeContractWrite(
  contract: ethers.Contract,
  methodName: string,
  args: any[] = [],
  overrides: any = {},
  config: Partial<RetryConfig> = {}
): Promise<ContractCallResult> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      logger.debug(
        `Executing write ${methodName} (attempt ${attempt + 1}/${finalConfig.maxRetries + 1})`
      );

      // Validate contract before calling
      const contractAddress = await contract.getAddress();
      const isValidContract = await validateContract(contractAddress, contract.runner?.provider!);
      if (!isValidContract) {
        return {
          success: false,
          error: 'Contract not found at the specified address',
          retryAttempts: attempt,
        };
      }

      // Estimate gas with buffer
      const gasLimit = await estimateGasRobustly(contract, methodName, args, overrides);
      const txOverrides = { ...overrides, gasLimit };

      // Execute the transaction
      logger.debug(`Sending transaction ${methodName} with gas limit: ${gasLimit}`);
      const tx = await contract[methodName](...args, txOverrides);

      logger.info(`Transaction sent: ${tx.hash}`);
      toast.loading(`Transaction submitted: ${tx.hash.slice(0, 10)}...`, { id: tx.hash });

      // Wait for confirmation with timeout
      const timeout = new Promise(
        (_, reject) =>
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 120000) // 2 minutes
      );

      const receipt = await Promise.race([tx.wait(), timeout]);

      if (receipt && receipt.status === 1) {
        toast.success(`Transaction confirmed!`, { id: tx.hash });
        logger.info(`Transaction ${tx.hash} confirmed in block ${receipt.blockNumber}`);

        return {
          success: true,
          transactionHash: tx.hash,
          gasUsed: receipt.gasUsed,
          blockNumber: receipt.blockNumber,
          retryAttempts: attempt,
        };
      } else {
        throw new Error('Transaction failed or reverted');
      }
    } catch (error) {
      lastError = error;
      const errorType = classifyError(error);
      const revertReason = decodeRevertReason(error);

      logger.warn(`Write operation ${methodName} failed (attempt ${attempt + 1}):`, {
        error: error instanceof Error ? error.message : String(error),
        type: errorType,
        revertReason,
      });

      // Show user-friendly error message
      const userMessage = getUserFriendlyErrorMessage(error, methodName);
      toast.error(userMessage, { id: `error-${attempt}` });

      // Don't retry on final attempt
      if (attempt === finalConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(errorType)) {
        logger.info(`Error type ${errorType} is not retryable, stopping attempts`);
        break;
      }

      // Special handling for nonce errors - refresh provider
      if (errorType === ErrorType.NONCE_ERROR && contract.runner?.provider) {
        try {
          logger.debug('Refreshing provider due to nonce error...');
          // Force refresh of provider state
          if (
            contract.runner &&
            'getAddress' in contract.runner &&
            typeof contract.runner.getAddress === 'function'
          ) {
            const address = await contract.runner.getAddress();
            await contract.runner.provider.getTransactionCount(address, 'pending');
          }
        } catch (refreshError) {
          logger.warn('Failed to refresh provider state:', refreshError);
        }
      }

      // Wait before retry with exponential backoff
      const delay = calculateBackoffDelay(attempt, finalConfig);
      logger.debug(`Waiting ${delay}ms before retry...`);
      await sleep(delay);
    }
  }

  // All retries failed
  const revertReason = decodeRevertReason(lastError);
  const _errorType = classifyError(lastError);
  const userMessage = getUserFriendlyErrorMessage(lastError, methodName);

  toast.error(userMessage, { id: 'final-error' });

  return {
    success: false,
    error: revertReason || lastError?.message || 'Contract write failed',
    retryAttempts: finalConfig.maxRetries,
  };
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyErrorMessage(error: any, _methodName: string): string {
  const errorType = classifyError(error);
  const revertReason = decodeRevertReason(error);

  switch (errorType) {
    case ErrorType.USER_REJECTION:
      return 'Transaction was cancelled. Please try again if you want to proceed.';

    case ErrorType.INSUFFICIENT_FUNDS:
      return 'Insufficient funds to complete the transaction. Please check your wallet balance.';

    case ErrorType.GAS_ERROR:
      return 'Transaction failed due to gas issues. Please try again with a higher gas limit.';

    case ErrorType.NETWORK_ERROR:
      return 'Network connection issue. Please check your internet connection and try again.';

    case ErrorType.NONCE_ERROR:
      return 'Transaction ordering issue. Please wait a moment and try again.';

    case ErrorType.REVERT_ERROR:
      if (revertReason) {
        return `Transaction reverted: ${revertReason}`;
      }
      return 'Transaction was rejected by the smart contract. Please check your inputs and try again.';

    case ErrorType.CONTRACT_ERROR:
      return 'Smart contract error. The contract may not exist or the function may be unavailable.';

    default:
      return `Transaction failed: ${error?.message || 'Unknown error'}. Please try again.`;
  }
}

/**
 * Batch execute multiple contract calls with error handling
 */
export async function batchExecuteContractCalls(
  calls: Array<{
    contract: ethers.Contract;
    methodName: string;
    args: any[];
    isWrite: boolean;
    overrides?: any;
  }>,
  config: Partial<RetryConfig> = {}
): Promise<ContractCallResult[]> {
  const results: ContractCallResult[] = [];

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    logger.info(`Executing batch call ${i + 1}/${calls.length}: ${call.methodName}`);

    let result: ContractCallResult;
    if (call.isWrite) {
      result = await executeContractWrite(
        call.contract,
        call.methodName,
        call.args,
        call.overrides || {},
        config
      );
    } else {
      result = await executeContractRead(call.contract, call.methodName, call.args, config);
    }

    results.push(result);

    // If a critical write operation fails, consider stopping the batch
    if (!result.success && call.isWrite) {
      logger.warn(`Batch execution stopped at call ${i + 1} due to write failure`);
      break;
    }

    // Small delay between calls to avoid rate limiting
    if (i < calls.length - 1) {
      await sleep(500);
    }
  }

  const successCount = results.filter((r) => r.success).length;
  logger.info(`Batch execution completed: ${successCount}/${results.length} successful`);

  return results;
}

/**
 * Create a contract with enhanced error handling
 */
export async function createRobustContract(
  contractAddress: string,
  abi: any[],
  signerOrProvider: ethers.Signer | ethers.Provider,
  _chainId: number
): Promise<ethers.Contract | null> {
  try {
    // Validate the contract address format
    if (!ethers.isAddress(contractAddress)) {
      logger.error(`Invalid contract address: ${contractAddress}`);
      return null;
    }

    // Ensure we have a valid provider
    let provider = signerOrProvider;
    if ('provider' in signerOrProvider && signerOrProvider.provider) {
      provider = signerOrProvider.provider;
    }

    // Validate the contract exists
    const isValid = await validateContract(contractAddress, provider as ethers.Provider);
    if (!isValid) {
      logger.error(`Contract validation failed for ${contractAddress}`);
      return null;
    }

    // Create the contract
    const contract = new ethers.Contract(contractAddress, abi, signerOrProvider);

    logger.info(`Created robust contract instance for ${contractAddress}`);
    return contract;
  } catch (error) {
    logger.error(`Failed to create robust contract for ${contractAddress}:`, error);
    return null;
  }
}
