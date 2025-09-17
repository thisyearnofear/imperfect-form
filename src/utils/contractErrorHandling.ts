/**
 * Smart Contract Error Handling Utilities
 * Handles common contract interaction errors gracefully
 */

export interface ContractError extends Error {
  code?: string;
  data?: any;
  reason?: string;
}

/**
 * Check if an error is a "missing revert data" error
 */
export function isMissingRevertDataError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  return (
    errorMessage.includes('missing revert data') ||
    errorMessage.includes('CALL_EXCEPTION') ||
    error.code === 'CALL_EXCEPTION'
  );
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message || error.toString();
  return (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('fetch')
  );
}

/**
 * Handle contract verification errors gracefully
 */
export async function safeContractCall<T>(
  contractCall: () => Promise<T>,
  options: {
    retries?: number;
    retryDelay?: number;
    fallbackValue?: T;
    onError?: (error: ContractError) => void;
  } = {}
): Promise<T | null> {
  const { retries = 2, retryDelay = 1000, fallbackValue, onError } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await contractCall();
    } catch (error: any) {
      const contractError = error as ContractError;

      // Log the error for debugging
      console.warn(`Contract call attempt ${attempt + 1} failed:`, {
        message: contractError.message,
        code: contractError.code,
        reason: contractError.reason,
      });

      // Handle specific error types
      if (isMissingRevertDataError(contractError)) {
        console.warn(
          'Missing revert data - contract may not exist or function may not be available'
        );

        // Don't retry for missing revert data errors - they usually won't resolve
        if (onError) onError(contractError);
        return fallbackValue || null;
      }

      if (isNetworkError(contractError)) {
        console.warn('Network error detected - will retry if attempts remaining');

        // Retry network errors
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      // If this is the last attempt, handle the error
      if (attempt === retries) {
        if (onError) onError(contractError);
        return fallbackValue || null;
      }
    }
  }

  return fallbackValue || null;
}

/**
 * Batch contract calls with error handling
 */
export async function batchContractCalls<T>(
  calls: Array<() => Promise<T>>,
  options: {
    maxConcurrent?: number;
    continueOnError?: boolean;
    onError?: (error: ContractError, index: number) => void;
  } = {}
): Promise<Array<T | null>> {
  const { maxConcurrent = 5, continueOnError = true, onError } = options;
  const results: Array<T | null> = [];

  // Process calls in batches to avoid overwhelming the network
  for (let i = 0; i < calls.length; i += maxConcurrent) {
    const batch = calls.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(async (call, batchIndex) => {
      const globalIndex = i + batchIndex;

      return safeContractCall(call, {
        onError: (error) => {
          if (onError) onError(error, globalIndex);
        },
      });
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      if (continueOnError) {
        // Fill with nulls for failed batch
        results.push(...new Array(batch.length).fill(null));
      } else {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Create a contract call with automatic retry and error handling
 */
export function createResilientContractCall<T>(
  contractCall: () => Promise<T>,
  defaultOptions: {
    retries?: number;
    retryDelay?: number;
    fallbackValue?: T;
  } = {}
) {
  return async (overrideOptions: typeof defaultOptions = {}): Promise<T | null> => {
    const options = { ...defaultOptions, ...overrideOptions };
    return safeContractCall(contractCall, options);
  };
}

/**
 * Log contract errors in a structured way
 */
export function logContractError(
  error: ContractError,
  context: {
    contractAddress?: string;
    functionName?: string;
    userAddress?: string;
    chainId?: number;
  }
): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.code,
      reason: error.reason,
    },
    context,
    isMissingRevertData: isMissingRevertDataError(error),
    isNetworkError: isNetworkError(error),
  };

  console.error('Contract Error:', errorInfo);

  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, { extra: errorInfo });
  }
}
