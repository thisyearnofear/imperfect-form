import { NetworkConfig } from '@/types/contracts';

/**
 * Centralized network configuration for better maintainability
 */
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  polygon: {
    chainId: 137,
    name: 'Polygon',
    contractAddress: '0x28FE19798fe0A0276CF474f2DCC3749313f1aC0A',
    rpcUrls: [
      'https://polygon-rpc.com/',
      'https://polygon-mainnet.g.alchemy.com/public',
      'https://polygon-bor-rpc.publicnode.com',
    ],
    blockExplorer: 'https://polygonscan.com',
  },
  base: {
    chainId: 8453,
    name: 'Base',
    contractAddress: '0x58DC4867f87473BF9874892dE8e62C48958c8d96',
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base-rpc.publicnode.com',
      'https://base.drpc.org',
    ],
    blockExplorer: 'https://basescan.org',
  },
  celo: {
    chainId: 42220,
    name: 'Celo',
    contractAddress: '0xB0cbC7325EbC744CcB14211CA74C5a764928F273',
    rpcUrls: [
      'https://forno.celo.org',
      'https://rpc.celo-community.org',
      'https://rpc.ankr.com/celo',
    ],
    blockExplorer: 'https://celoscan.io',
  },
  celoVerified: {
    chainId: 42220,
    name: 'Celo (Verified)',
    contractAddress:
      process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT ||
      '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
    rpcUrls: [
      'https://forno.celo.org',
      'https://rpc.celo-community.org',
      'https://rpc.ankr.com/celo',
    ],
    blockExplorer: 'https://celoscan.io',
  },
  monad: {
    chainId: 143,
    name: 'Monad',
    contractAddress: process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS || '',
    rpcUrls: ['https://rpc.monad.xyz', 'https://rpc1.monad.xyz', 'https://rpc3.monad.xyz'],
    blockExplorer: 'https://monadvision.com',
  },
  // Theme + wallet switching ready; leaderboard contract lands with Avalanche deploy.
  avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    contractAddress: process.env.NEXT_PUBLIC_AVALANCHE_CONTRACT_ADDRESS || '',
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche-c-chain-rpc.publicnode.com',
      'https://avax.meowrpc.com',
    ],
    blockExplorer: 'https://snowtrace.io',
  },
};

/**
 * Get network config by contract address
 */
export function getNetworkByContractAddress(contractAddress: string): NetworkConfig | null {
  return (
    Object.values(SUPPORTED_NETWORKS).find(
      (network) => network.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    ) || null
  );
}

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  return Object.values(SUPPORTED_NETWORKS).find((network) => network.chainId === chainId) || null;
}

/**
 * Get network config by name
 */
export function getNetworkByName(name: string): NetworkConfig | null {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  return (
    Object.values(SUPPORTED_NETWORKS).find((network) =>
      network.name.toLowerCase().replace(/\s+/g, '').includes(normalizedName)
    ) || null
  );
}

/**
 * Check if a network is supported
 */
export function isNetworkSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_NETWORKS).some((network) => network.chainId === chainId);
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.values(SUPPORTED_NETWORKS).map((network) => network.chainId);
}
