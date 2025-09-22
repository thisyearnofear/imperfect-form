import { ethers } from 'ethers';
import { createRemoteLogger } from './remoteLogger';
import { SUPPORTED_NETWORKS } from '@/config/networks';

const logger = createRemoteLogger('RobustNetworkManager');

/**
 * Create a robust JsonRpcProvider for a given chain ID.
 *
 * This function looks up the network configuration from the centralized
 * `SUPPORTED_NETWORKS` object and creates a static, non-polling JsonRpcProvider.
 * It includes a timeout for the initial network detection to prevent long hangs.
 */
export async function createRobustProvider(
  chainId: number
): Promise<ethers.JsonRpcProvider | null> {
  const networkConfig = Object.values(SUPPORTED_NETWORKS).find(
    (network) => network.chainId === chainId
  );

  if (!networkConfig || !networkConfig.rpcUrls || networkConfig.rpcUrls.length === 0) {
    logger.error(`No network configuration or RPC URLs found for chain ID: ${chainId}`);
    return null;
  }

  for (const rpcUrl of networkConfig.rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(
        rpcUrl,
        {
          chainId: chainId,
          name: networkConfig.name,
        },
        {
          staticNetwork: true, // Prevents automatic network detection
          polling: false, // Disables polling for events
          batchMaxCount: 1, // Disables batching for broader compatibility
        }
      );

      // Test the provider immediately with a timeout
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Provider initialization timeout')), 10000)
        ),
      ]);

      logger.info(`Successfully created robust provider for ${networkConfig.name} at ${rpcUrl}`);
      return provider;
    } catch (initError) {
      logger.warn(
        `Provider initialization failed for ${networkConfig.name} at ${rpcUrl}`,
        initError
      );
      // Continue to the next RPC URL
    }
  }

  logger.error(
    `Failed to create robust provider for chain ID ${chainId} after trying all RPC URLs`
  );
  return null;
}
