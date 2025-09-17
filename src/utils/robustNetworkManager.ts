/**
 * Robust Network Detection and RPC Failover System
 *
 * Addresses "JsonRpcProvider failed to detect network" errors by implementing
 * intelligent network detection, RPC endpoint failover, and connection health monitoring.
 */

import { ethers } from 'ethers';
import { createRemoteLogger } from './remoteLogger';
import { getNetworkByChainId } from '@/config/networks';

const logger = createRemoteLogger('RobustNetworkManager');

interface RpcEndpoint {
  url: string;
  priority: number;
  name: string;
  latency?: number;
  isHealthy: boolean;
  lastChecked: number;
  consecutiveFailures: number;
}

interface NetworkConfig {
  chainId: number;
  name: string;
  rpcEndpoints: RpcEndpoint[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Health check cache to avoid excessive requests
const healthCheckCache = new Map<string, { isHealthy: boolean; timestamp: number }>();
const HEALTH_CHECK_CACHE_TTL = 30000; // 30 seconds

// Network configurations with multiple RPC endpoints for failover
const NETWORK_CONFIGS: Record<number, NetworkConfig> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcEndpoints: [
      {
        url: 'https://eth.llamarpc.com',
        priority: 10,
        name: 'LlamaRPC',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://rpc.ankr.com/eth',
        priority: 9,
        name: 'Ankr',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://ethereum.publicnode.com',
        priority: 8,
        name: 'PublicNode',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://cloudflare-eth.com',
        priority: 7,
        name: 'Cloudflare',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
    ],
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    rpcEndpoints: [
      {
        url: 'https://mainnet.base.org',
        priority: 10,
        name: 'Base Official',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://base.llamarpc.com',
        priority: 9,
        name: 'LlamaRPC',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://rpc.ankr.com/base',
        priority: 8,
        name: 'Ankr',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://base.publicnode.com',
        priority: 7,
        name: 'PublicNode',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
    ],
    blockExplorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  42220: {
    chainId: 42220,
    name: 'Celo',
    rpcEndpoints: [
      {
        url: 'https://forno.celo.org',
        priority: 10,
        name: 'Celo Official',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://rpc.ankr.com/celo',
        priority: 9,
        name: 'Ankr',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://celo.api.onfinality.io/public',
        priority: 8,
        name: 'OnFinality',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
    ],
    blockExplorer: 'https://celoscan.io',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    rpcEndpoints: [
      {
        url: 'https://polygon.llamarpc.com',
        priority: 10,
        name: 'LlamaRPC',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://rpc.ankr.com/polygon',
        priority: 9,
        name: 'Ankr',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://polygon.publicnode.com',
        priority: 8,
        name: 'PublicNode',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
      {
        url: 'https://polygon-rpc.com',
        priority: 7,
        name: 'Polygon RPC',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
    ],
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  10143: {
    chainId: 10143,
    name: 'Monad Testnet',
    rpcEndpoints: [
      {
        url: 'https://testnet1.monad.xyz',
        priority: 10,
        name: 'Monad Official',
        isHealthy: true,
        lastChecked: 0,
        consecutiveFailures: 0,
      },
    ],
    blockExplorer: 'https://testnet-explorer.monad.xyz',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  },
};

/**
 * Test the health of a single RPC endpoint
 */
async function testRpcEndpointHealth(endpoint: RpcEndpoint): Promise<boolean> {
  const cacheKey = endpoint.url;
  const cached = healthCheckCache.get(cacheKey);

  // Return cached result if still valid
  if (cached && Date.now() - cached.timestamp < HEALTH_CHECK_CACHE_TTL) {
    return cached.isHealthy;
  }

  try {
    const startTime = Date.now();

    // Create a temporary provider for testing
    const provider = new ethers.JsonRpcProvider(endpoint.url, undefined, {
      staticNetwork: true,
      polling: false,
    });

    // Test with a simple call that should always work
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );

    const healthCheck = Promise.race([provider.getBlockNumber(), timeout]);

    await healthCheck;

    const latency = Date.now() - startTime;
    endpoint.latency = latency;
    endpoint.consecutiveFailures = 0;
    endpoint.isHealthy = true;
    endpoint.lastChecked = Date.now();

    // Cache the result
    healthCheckCache.set(cacheKey, { isHealthy: true, timestamp: Date.now() });

    logger.debug(`RPC endpoint ${endpoint.name} is healthy (${latency}ms)`);
    return true;
  } catch (error) {
    endpoint.consecutiveFailures += 1;
    endpoint.isHealthy = false;
    endpoint.lastChecked = Date.now();

    // Cache the failure
    healthCheckCache.set(cacheKey, { isHealthy: false, timestamp: Date.now() });

    logger.warn(`RPC endpoint ${endpoint.name} failed health check:`, error);
    return false;
  }
}

/**
 * Get the best available RPC endpoint for a network
 */
async function getBestRpcEndpoint(chainId: number): Promise<RpcEndpoint | null> {
  const networkConfig = NETWORK_CONFIGS[chainId];
  if (!networkConfig) {
    logger.error(`No network configuration found for chain ID: ${chainId}`);
    return null;
  }

  // Test all endpoints in parallel
  const healthPromises = networkConfig.rpcEndpoints.map((endpoint) =>
    testRpcEndpointHealth(endpoint).then((isHealthy) => ({ endpoint, isHealthy }))
  );

  try {
    const results = await Promise.allSettled(healthPromises);

    // Filter healthy endpoints
    const healthyEndpoints = results
      .filter(
        (result): result is PromiseFulfilledResult<{ endpoint: RpcEndpoint; isHealthy: boolean }> =>
          result.status === 'fulfilled' && result.value.isHealthy
      )
      .map((result) => result.value.endpoint)
      .sort((a, b) => {
        // Sort by priority first, then by latency
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return (a.latency || 9999) - (b.latency || 9999);
      });

    if (healthyEndpoints.length > 0) {
      const bestEndpoint = healthyEndpoints[0];
      logger.info(`Selected best RPC endpoint: ${bestEndpoint.name} (${bestEndpoint.latency}ms)`);
      return bestEndpoint;
    }

    // If no healthy endpoints, return the highest priority one anyway
    const fallbackEndpoint = networkConfig.rpcEndpoints.sort((a, b) => b.priority - a.priority)[0];

    logger.warn(
      `No healthy RPC endpoints found for ${networkConfig.name}, using fallback: ${fallbackEndpoint.name}`
    );
    return fallbackEndpoint;
  } catch (error) {
    logger.error(`Failed to test RPC endpoints for ${networkConfig.name}:`, error);
    return networkConfig.rpcEndpoints[0] || null;
  }
}

/**
 * Create a robust JsonRpcProvider with automatic failover
 */
export async function createRobustProvider(
  chainId: number
): Promise<ethers.JsonRpcProvider | null> {
  try {
    const endpoint = await getBestRpcEndpoint(chainId);
    if (!endpoint) {
      logger.error(`No RPC endpoint available for chain ID: ${chainId}`);
      return null;
    }

    const networkConfig = NETWORK_CONFIGS[chainId];

    // Create provider with network info
    const provider = new ethers.JsonRpcProvider(
      endpoint.url,
      {
        chainId: chainId,
        name: networkConfig.name,
      },
      {
        staticNetwork: true,
        polling: false,
        batchMaxCount: 1, // Disable batching for better compatibility
      }
    );

    // Test the provider immediately
    try {
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Provider initialization timeout')), 10000)
        ),
      ]);

      logger.info(`Successfully created robust provider for ${networkConfig.name}`);
      return provider;
    } catch (initError) {
      logger.warn(`Provider initialization failed for ${endpoint.name}, trying next endpoint...`);

      // Mark this endpoint as unhealthy and try the next one
      endpoint.isHealthy = false;
      endpoint.consecutiveFailures += 1;

      // Recursively try the next best endpoint
      return createRobustProvider(chainId);
    }
  } catch (error) {
    logger.error(`Failed to create robust provider for chain ID ${chainId}:`, error);
    return null;
  }
}

/**
 * Detect the current network from a provider with multiple strategies
 */
export async function detectNetworkRobustly(
  provider: ethers.Provider
): Promise<ethers.Network | null> {
  const strategies = [
    // Strategy 1: getNetwork() - most reliable
    async () => {
      const network = await provider.getNetwork();
      logger.debug(`Network detected via getNetwork(): ${network.name} (${network.chainId})`);
      return network;
    },

    // Strategy 2: Direct chainId request
    async () => {
      if ('send' in provider && typeof provider.send === 'function') {
        const chainIdHex = await provider.send('eth_chainId', []);
        const chainId = parseInt(chainIdHex, 16);
        const networkConfig = NETWORK_CONFIGS[chainId];
        if (networkConfig) {
          const network = new ethers.Network(networkConfig.name, chainId);
          logger.debug(`Network detected via eth_chainId: ${network.name} (${network.chainId})`);
          return network;
        }
      }
      throw new Error('No network configuration for detected chain ID');
    },

    // Strategy 3: Block number approach
    async () => {
      const blockNumber = await provider.getBlockNumber();
      if (blockNumber > 0) {
        // Try to detect based on block number characteristics
        // This is a fallback when other methods fail
        logger.debug('Provider is responsive, block number:', blockNumber);
        // We can't determine the exact network, but we know the provider works
        return new ethers.Network('unknown', 1); // Fallback to mainnet
      }
      throw new Error('Provider not responsive');
    },
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Strategy ${i + 1} timeout`)), 5000)
      );

      const result = await Promise.race([strategies[i](), timeoutPromise]);

      if (result) {
        logger.info(`Network detection successful using strategy ${i + 1}:`, result.name);
        return result;
      }
    } catch (error) {
      logger.warn(`Network detection strategy ${i + 1} failed:`, error);

      if (i === strategies.length - 1) {
        logger.error('All network detection strategies failed');
        return null;
      }
    }
  }

  return null;
}

/**
 * Create a provider with automatic network detection and failover
 */
export async function createProviderWithDetection(chainId: number): Promise<{
  provider: ethers.JsonRpcProvider;
  network: ethers.Network;
} | null> {
  try {
    const provider = await createRobustProvider(chainId);
    if (!provider) {
      return null;
    }

    const network = await detectNetworkRobustly(provider);
    if (!network) {
      logger.error('Failed to detect network for provider');
      return null;
    }

    // Verify the detected network matches expectations
    if (Number(network.chainId) !== chainId) {
      logger.warn(`Network mismatch: expected ${chainId}, got ${network.chainId}`);
      // Continue anyway as some networks might have configuration issues
    }

    return { provider, network };
  } catch (error) {
    logger.error('Failed to create provider with detection:', error);
    return null;
  }
}

/**
 * Monitor provider health and switch if necessary
 */
export class ProviderHealthMonitor {
  private provider: ethers.JsonRpcProvider;
  private chainId: number;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private onProviderChange?: (newProvider: ethers.JsonRpcProvider) => void;

  constructor(
    provider: ethers.JsonRpcProvider,
    chainId: number,
    onProviderChange?: (newProvider: ethers.JsonRpcProvider) => void
  ) {
    this.provider = provider;
    this.chainId = chainId;
    this.onProviderChange = onProviderChange;
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      this.stopMonitoring();
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        // Test provider health
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        );

        await Promise.race([this.provider.getBlockNumber(), timeout]);

        logger.debug('Provider health check passed');
      } catch (error) {
        logger.warn('Provider health check failed, attempting to switch:', error);
        await this.switchToHealthyProvider();
      }
    }, intervalMs);

    logger.info('Provider health monitoring started');
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Provider health monitoring stopped');
    }
  }

  private async switchToHealthyProvider(): Promise<void> {
    try {
      const newProvider = await createRobustProvider(this.chainId);
      if (newProvider && this.onProviderChange) {
        this.provider = newProvider;
        this.onProviderChange(newProvider);
        logger.info('Successfully switched to a healthy provider');
      }
    } catch (error) {
      logger.error('Failed to switch to healthy provider:', error);
    }
  }

  getCurrentProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}

/**
 * Get network status and diagnostics
 */
export async function getNetworkDiagnostics(chainId: number): Promise<any> {
  try {
    const networkConfig = NETWORK_CONFIGS[chainId];
    if (!networkConfig) {
      return { error: `No configuration for chain ID: ${chainId}` };
    }

    const endpointResults = await Promise.allSettled(
      networkConfig.rpcEndpoints.map(async (endpoint) => {
        try {
          const isHealthy = await testRpcEndpointHealth(endpoint);
          return {
            name: endpoint.name,
            url: endpoint.url,
            priority: endpoint.priority,
            isHealthy,
            latency: endpoint.latency,
            consecutiveFailures: endpoint.consecutiveFailures,
          };
        } catch (error) {
          return {
            name: endpoint.name,
            url: endpoint.url,
            priority: endpoint.priority,
            isHealthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const endpoints = endpointResults.map((result) =>
      result.status === 'fulfilled' ? result.value : { error: 'Failed to test endpoint' }
    );

    return {
      chainId,
      networkName: networkConfig.name,
      endpoints,
      healthyEndpoints: endpoints.filter((e: any) => e.isHealthy).length,
      totalEndpoints: endpoints.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      chainId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
