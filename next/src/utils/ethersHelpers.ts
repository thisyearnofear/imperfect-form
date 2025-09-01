/**
 * Ethers v6 Helper Utilities
 *
 * Clean, modular utilities for ethers v6 operations
 * Maintains DRY principles and provides consistent interfaces
 * across the application for blockchain interactions.
 */

import { ethers } from 'ethers';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface NetworkInfo {
  name: string;
  chainId: number;
}

export interface TransactionOptions {
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
}

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
}

// =============================================================================
// PROVIDER UTILITIES
// =============================================================================

/**
 * Create a browser provider from an Ethereum provider
 * @param ethereumProvider - The Ethereum provider (window.ethereum, etc.)
 * @returns Ethers BrowserProvider instance
 */
export function createBrowserProvider(ethereumProvider: EthereumProvider): ethers.BrowserProvider {
  return new ethers.BrowserProvider(ethereumProvider);
}

/**
 * Create a JSON RPC provider
 * @param rpcUrl - The RPC URL
 * @param networkInfo - Optional network information
 * @returns Ethers JsonRpcProvider instance
 */
export function createJsonRpcProvider(
  rpcUrl: string,
  networkInfo?: NetworkInfo
): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl, networkInfo);
}

/**
 * Get network information from a provider
 * @param provider - The ethers provider
 * @returns Network information
 */
export async function getNetworkInfo(provider: ethers.Provider): Promise<ethers.Network> {
  return await provider.getNetwork();
}

// =============================================================================
// TRANSACTION UTILITIES
// =============================================================================

/**
 * Estimate gas for a contract function call with buffer
 * CONSOLIDATION: Single gas estimation utility with optimization
 * @param contract - The contract instance
 * @param functionName - The function name to call
 * @param args - Function arguments
 * @param options - Transaction options
 * @param bufferPercent - Gas buffer percentage (default: 20%)
 * @returns Estimated gas with buffer as bigint
 */
export async function estimateGasWithBuffer(
  contract: ethers.Contract,
  functionName: string,
  args: unknown[],
  options: TransactionOptions = {},
  bufferPercent: number = 20
): Promise<bigint> {
  try {
    const gasEstimate = await contract[functionName].estimateGas(...args, options);
    // Add buffer to prevent out-of-gas errors
    const buffer = BigInt(bufferPercent);
    return (gasEstimate * (100n + buffer)) / 100n;
  } catch (error) {
    console.warn(`Gas estimation failed for ${functionName}:`, error);
    // Return a reasonable default gas limit with buffer
    return 600000n; // 500k + 20% buffer
  }
}

/**
 * Create transaction options with network-specific optimizations
 * @param networkId - The network chain ID
 * @param baseGasLimit - Base gas limit
 * @param gasMultiplier - Gas multiplier for safety margin
 * @returns Optimized transaction options
 */
export function createTransactionOptions(
  networkId: number,
  baseGasLimit: bigint,
  gasMultiplier: number = 1.5
): TransactionOptions {
  const gasLimit = baseGasLimit * BigInt(Math.ceil(gasMultiplier));

  switch (networkId) {
    case 10143: // Monad Testnet
      return {
        gasLimit: gasLimit * 2n,
        gasPrice: ethers.parseUnits('50', 'gwei'),
        value: ethers.parseEther('0.001'), // Submission fee for Monad
      };

    case 42220: // Celo Mainnet
    case 44787: // Celo Alfajores
      return {
        gasLimit: gasLimit * 3n,
        gasPrice: ethers.parseUnits('30', 'gwei'),
      };

    case 137: // Polygon Mainnet
    case 80002: // Polygon Amoy
      return {
        gasLimit: gasLimit * 2n,
        maxPriorityFeePerGas: ethers.parseUnits('30', 'gwei'),
        maxFeePerGas: ethers.parseUnits('100', 'gwei'),
      };

    case 8453: // Base Mainnet
    case 84532: // Base Sepolia
      return {
        gasLimit: gasLimit,
        maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
        maxFeePerGas: ethers.parseUnits('20', 'gwei'),
      };

    default:
      return {
        gasLimit: gasLimit,
        gasPrice: ethers.parseUnits('20', 'gwei'),
      };
  }
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format ether amount to human-readable string
 * @param wei - Amount in wei (bigint or string)
 * @param decimals - Number of decimal places
 * @returns Formatted ether string
 */
export function formatEther(wei: bigint | string, decimals: number = 4): string {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}

/**
 * Parse ether amount to wei
 * @param ether - Ether amount as string
 * @returns Wei amount as bigint
 */
export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether);
}

/**
 * Parse units with specified decimals
 * @param value - Value to parse
 * @param unit - Unit name or decimal places
 * @returns Parsed value as bigint
 */
export function parseUnits(value: string, unit: string | number): bigint {
  return ethers.parseUnits(value, unit);
}

/**
 * Format units with specified decimals
 * @param value - Value to format (bigint)
 * @param unit - Unit name or decimal places
 * @returns Formatted string
 */
export function formatUnits(value: bigint, unit: string | number): string {
  return ethers.formatUnits(value, unit);
}

// =============================================================================
// CONTRACT UTILITIES
// =============================================================================

/**
 * Create a contract instance
 * @param address - Contract address
 * @param abi - Contract ABI
 * @param signerOrProvider - Signer or provider
 * @returns Contract instance
 */
export function createContract(
  address: string,
  abi: ethers.InterfaceAbi,
  signerOrProvider: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Create ethers provider from Ethereum provider
 * CONSOLIDATION: Single provider creation utility
 * @param ethereumProvider - The Ethereum provider (window.ethereum, etc.)
 * @returns BrowserProvider instance
 */
export function createEthersProvider(ethereumProvider: unknown): ethers.BrowserProvider {
  if (
    !ethereumProvider ||
    typeof ethereumProvider !== 'object' ||
    !('request' in ethereumProvider)
  ) {
    throw new Error('Invalid Ethereum provider');
  }
  return new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
}

/**
 * Get a signer from an Ethereum provider
 * CONSOLIDATION: Combined provider creation and signer retrieval
 * @param ethereumProvider - The Ethereum provider
 * @param accountIndex - Account index (default: 0)
 * @returns Signer instance
 */
export async function getSignerFromProvider(
  ethereumProvider: unknown,
  accountIndex: number = 0
): Promise<ethers.Signer> {
  // Validate the provider before using it
  if (
    !ethereumProvider ||
    typeof ethereumProvider !== 'object' ||
    !('request' in ethereumProvider)
  ) {
    throw new Error('Invalid Ethereum provider. Please connect your wallet.');
  }

  try {
    const provider = createEthersProvider(ethereumProvider);

    // First, try to get accounts to verify the provider is working
    try {
      const accounts = await (ethereumProvider as EthereumProvider).request({
        method: 'eth_accounts',
      });

      // If we get an empty response or invalid response, try enabling the provider
      if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
        // Try to request accounts (this might trigger a wallet connection prompt)
        try {
          const requestedAccounts = await (ethereumProvider as EthereumProvider).request({
            method: 'eth_requestAccounts',
          });

          if (
            !requestedAccounts ||
            !Array.isArray(requestedAccounts) ||
            requestedAccounts.length === 0
          ) {
            throw new Error('No accounts available. Please connect your wallet.');
          }
        } catch (requestError: any) {
          // Handle user rejection
          if (
            requestError.message?.includes('user rejected') ||
            requestError.message?.includes('User denied')
          ) {
            throw new Error('Wallet connection was rejected by user.');
          }
          // Re-throw other errors
          throw requestError;
        }
      }
    } catch (accountsError: any) {
      // Handle user rejection
      if (
        accountsError.message?.includes('user rejected') ||
        accountsError.message?.includes('User denied')
      ) {
        throw new Error('Wallet connection was rejected by user.');
      }
      // For other errors, continue as the provider might still work
      console.warn('Account verification failed, but continuing:', accountsError);
    }

    // Add defensive error handling for eth_accounts call
    try {
      return await provider.getSigner(accountIndex);
    } catch (signerError: any) {
      console.error('getSigner error details:', {
        error: signerError,
        message: signerError?.message,
        code: signerError?.code,
        stack: signerError?.stack,
      });

      // Handle the specific "Cannot read properties of undefined (reading 'error')" issue
      if (
        signerError.message &&
        (signerError.message.includes('Cannot read properties of undefined') ||
          signerError.message.includes('undefined is not an object') ||
          signerError.message.includes("reading 'error'"))
      ) {
        // This suggests the provider returned a malformed response
        throw new Error('Failed to access wallet. Please reconnect your wallet and try again.');
      }

      // Handle RPC errors more gracefully
      if (signerError?.code === -32002) {
        throw new Error('Wallet connection request is already pending. Please check your wallet.');
      }

      if (signerError?.code === -32603) {
        throw new Error('Internal wallet error. Please try reconnecting your wallet.');
      }

      if (signerError?.code === 4001) {
        throw new Error('Connection was rejected by user.');
      }

      // Re-throw other signer errors with more context
      throw new Error(`Wallet connection failed: ${signerError?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('getSignerFromProvider error:', error);

    // Provide user-friendly error messages
    if (error.message?.includes('Invalid Ethereum provider')) {
      throw new Error('Wallet provider is not available. Please connect your wallet.');
    }

    if (error.message?.includes('user rejected') || error.message?.includes('User denied')) {
      throw new Error('Connection was rejected by user.');
    }

    if (error.message?.includes('eth_accounts') || error.message?.includes('eth_requestAccounts')) {
      throw new Error(
        'Unable to access wallet accounts. Please reconnect your wallet and try again.'
      );
    }

    // For unknown errors, provide a generic message but preserve the original for debugging
    throw new Error(`Wallet connection failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Get a signer from a provider
 * @param provider - The browser provider
 * @param accountIndex - Account index (default: 0)
 * @returns Signer instance
 */
export async function getSigner(
  provider: ethers.BrowserProvider,
  accountIndex: number = 0
): Promise<ethers.Signer> {
  return await provider.getSigner(accountIndex);
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Check if a string is a valid Ethereum address
 * @param address - Address to validate
 * @returns True if valid address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Check if a value is a valid BigInt
 * @param value - Value to check
 * @returns True if valid BigInt
 */
export function isValidBigInt(value: unknown): value is bigint {
  return typeof value === 'bigint';
}

/**
 * Convert various numeric types to BigInt safely
 * @param value - Value to convert
 * @returns BigInt value or throws error
 */
export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return BigInt(value);
  }
  throw new Error(`Cannot convert ${typeof value} to BigInt`);
}

// =============================================================================
// ERROR HANDLING UTILITIES
// =============================================================================

/**
 * Extract readable error message from ethers error
 * @param error - The error object
 * @returns Human-readable error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for common ethers error patterns
    if (error.message.includes('user rejected')) {
      return 'Transaction was rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    if (error.message.includes('gas')) {
      return 'Transaction failed due to gas issues';
    }
    if (error.message.includes('nonce')) {
      return 'Transaction nonce error - please try again';
    }
    return error.message;
  }
  return 'Unknown error occurred';
}

/**
 * Check if error is a user rejection
 * @param error - The error object
 * @returns True if user rejected the transaction
 */
export function isUserRejection(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('user rejected') ||
      error.message.toLowerCase().includes('user denied')
    );
  }
  return false;
}
