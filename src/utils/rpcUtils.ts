/**
 * Utility functions for RPC URL handling
 */

// Fallback RPC URLs for Polygon Mainnet
export const POLYGON_FALLBACK_RPCS = [
  'https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B',
  'https://polygon-rpc.com',
  'https://rpc-mainnet.matic.network',
];

// Fallback RPC URLs for Base Mainnet
export const BASE_FALLBACK_RPCS = [
  'https://base-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B',
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
];

// Fallback RPC URLs for Monad Testnet
export const MONAD_FALLBACK_RPCS = ['https://testnet-rpc.monad.xyz'];

// Fallback RPC URLs for Celo Mainnet
export const CELO_FALLBACK_RPCS = ['https://forno.celo.org', 'https://rpc.ankr.com/celo'];

/**
 * Gets a random RPC URL from the provided list
 * This helps distribute the load across multiple providers
 * @param rpcUrls List of RPC URLs
 * @returns A randomly selected RPC URL
 */
export function getRandomRpcUrl(rpcUrls: string[]): string {
  if (!rpcUrls || rpcUrls.length === 0) {
    throw new Error('No RPC URLs provided');
  }
  const randomIndex = Math.floor(Math.random() * rpcUrls.length);
  return rpcUrls[randomIndex];
}

/**
 * Checks if an RPC URL is responsive
 * @param rpcUrl The RPC URL to check
 * @returns Promise that resolves to true if responsive, false otherwise
 */
export async function isRpcResponsive(rpcUrl: string): Promise<boolean> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: [],
      }),
    });

    const data = await response.json();
    return !!data.result;
  } catch (error) {
    console.warn(`RPC ${rpcUrl} is not responsive:`, error);
    return false;
  }
}
