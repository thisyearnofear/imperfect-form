import { ethers } from "ethers";

/**
 * Transaction verification utility for robust transaction status checking
 * Provides multiple fallback mechanisms for transaction verification
 */

export interface TransactionStatus {
  status: 'pending' | 'success' | 'failed' | 'not_found';
  blockNumber?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  confirmations?: number;
  timestamp?: number;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  explorerApiUrl?: string;
  explorerApiKey?: string;
  rpcUrl?: string;
  nativeCurrency: string;
}

// Network configurations for transaction verification
export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  celo: {
    name: "Celo Mainnet",
    chainId: 42220,
    explorerApiUrl: "https://api.celoscan.io/api",
    rpcUrl: "https://forno.celo.org",
    nativeCurrency: "CELO"
  },
  polygon: {
    name: "Polygon Amoy",
    chainId: 137,
    explorerApiUrl: "https://api.polygonscan.com/api",
    rpcUrl: "https://polygon-rpc.com",
    nativeCurrency: "MATIC"
  },
  base: {
    name: "Base Sepolia",
    chainId: 84532,
    explorerApiUrl: "https://api-sepolia.basescan.org/api",
    rpcUrl: "https://sepolia.base.org",
    nativeCurrency: "ETH"
  },
  monad: {
    name: "Monad Testnet",
    chainId: 10143,
    explorerApiUrl: "https://testnet-explorer-api.monad.xyz/api", // Placeholder - update with actual API
    rpcUrl: "https://testnet-rpc.monad.xyz", // Placeholder - update with actual RPC
    nativeCurrency: "MON"
  }
};

/**
 * Verify transaction status using blockchain explorer API
 */
export async function verifyTransactionWithExplorer(
  txHash: string,
  networkKey: string,
  apiKey?: string
): Promise<TransactionStatus> {
  const config = NETWORK_CONFIGS[networkKey];
  if (!config?.explorerApiUrl) {
    throw new Error(`Explorer API not configured for network: ${networkKey}`);
  }

  try {
    const url = new URL(config.explorerApiUrl);
    url.searchParams.set('module', 'transaction');
    url.searchParams.set('action', 'gettxreceiptstatus');
    url.searchParams.set('txhash', txHash);
    
    if (apiKey) {
      url.searchParams.set('apikey', apiKey);
    }

    console.log(`🔍 Checking transaction ${txHash} on ${config.name} explorer...`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Explorer API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      // Transaction found and successful
      return {
        status: data.result.status === '1' ? 'success' : 'failed',
        blockNumber: parseInt(data.result.blockNumber || '0'),
        gasUsed: data.result.gasUsed,
        effectiveGasPrice: data.result.effectiveGasPrice,
      };
    } else if (data.status === '0' && data.message === 'No transactions found') {
      return { status: 'not_found' };
    } else {
      return { status: 'pending' };
    }
  } catch (error) {
    console.warn(`Explorer API verification failed for ${networkKey}:`, error);
    throw error;
  }
}

/**
 * Verify transaction status using direct RPC call
 */
export async function verifyTransactionWithRPC(
  txHash: string,
  networkKey: string,
  customRpcUrl?: string
): Promise<TransactionStatus> {
  const config = NETWORK_CONFIGS[networkKey];
  const rpcUrl = customRpcUrl || config.rpcUrl;
  
  if (!rpcUrl) {
    throw new Error(`RPC URL not configured for network: ${networkKey}`);
  }

  try {
    console.log(`🔗 Checking transaction ${txHash} via RPC on ${config.name}...`);
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (receipt) {
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;
      
      return {
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        confirmations,
      };
    } else {
      // Check if transaction exists but is pending
      const tx = await provider.getTransaction(txHash);
      if (tx) {
        return { status: 'pending' };
      } else {
        return { status: 'not_found' };
      }
    }
  } catch (error) {
    console.warn(`RPC verification failed for ${networkKey}:`, error);
    throw error;
  }
}

/**
 * Get API key from environment variables
 */
function getApiKeyForNetwork(networkKey: string): string | undefined {
  switch (networkKey) {
    case 'celo':
      return process.env.CELOSCAN_API_KEY;
    case 'polygon':
      return process.env.POLYGONSCAN_API_KEY;
    case 'base':
      return process.env.BASESCAN_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Comprehensive transaction verification with multiple fallbacks
 */
export async function verifyTransaction(
  txHash: string,
  networkKey: string,
  options: {
    explorerApiKey?: string;
    customRpcUrl?: string;
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): Promise<TransactionStatus> {
  const {
    explorerApiKey = getApiKeyForNetwork(networkKey),
    customRpcUrl,
    maxRetries = 3,
    retryDelay = 2000
  } = options;
  
  let lastError: Error | null = null;
  
  // Try explorer API first (usually more reliable)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await verifyTransactionWithExplorer(txHash, networkKey, explorerApiKey);
      if (result.status !== 'not_found') {
        return result;
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`Explorer verification attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  // Fallback to RPC verification
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await verifyTransactionWithRPC(txHash, networkKey, customRpcUrl);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`RPC verification attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  // If all methods fail, throw the last error
  throw new Error(`All verification methods failed. Last error: ${lastError?.message}`);
}

/**
 * Get the appropriate network key from chain ID
 */
export function getNetworkKeyFromChainId(chainId: number): string {
  switch (chainId) {
    case 42220:
      return 'celo';
    case 137:
      return 'polygon';
    case 84532:
      return 'base';
    case 10143:
      return 'monad';
    default:
      return 'base'; // Default fallback
  }
}

/**
 * Enhanced transaction monitoring with progressive feedback
 */
export async function monitorTransaction(
  txHash: string,
  networkKey: string,
  options: {
    explorerApiKey?: string;
    customRpcUrl?: string;
    onStatusUpdate?: (status: TransactionStatus, message: string) => void;
    maxWaitTime?: number;
    checkInterval?: number;
  } = {}
): Promise<TransactionStatus> {
  const {
    explorerApiKey,
    customRpcUrl,
    onStatusUpdate,
    maxWaitTime = 120000, // 2 minutes default
    checkInterval = 3000, // 3 seconds default
  } = options;

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;

    try {
      const status = await verifyTransaction(txHash, networkKey, {
        explorerApiKey,
        customRpcUrl,
        maxRetries: 1, // Single retry per check to avoid long delays
      });

      if (status.status === 'success') {
        onStatusUpdate?.(status, '✅ Transaction confirmed successfully!');
        return status;
      } else if (status.status === 'failed') {
        onStatusUpdate?.(status, '❌ Transaction failed on-chain');
        return status;
      } else if (status.status === 'pending') {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        onStatusUpdate?.(status, `⏳ Transaction pending... (${elapsed}s elapsed)`);
      }
    } catch (error) {
      console.warn(`Transaction check attempt ${attempts} failed:`, error);

      // Only report errors to user after several failed attempts
      if (attempts > 3) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        onStatusUpdate?.({ status: 'pending' }, `🔄 Still checking... (${elapsed}s elapsed)`);
      }
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  // Timeout reached
  return { status: 'pending' };
}
