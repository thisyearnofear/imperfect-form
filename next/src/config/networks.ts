import {
  fitnessLeaderboardABI,
  monadLeaderboardABI,
  polygonLeaderboardABI,
  baseLeaderboardABI
} from "@/constants/contracts";
import { NetworkConfig } from "@/types/contracts";

/**
 * Centralized network configuration for better maintainability
 */
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  polygon: {
    chainId: 137,
    name: "Polygon Mainnet",
    contractAddress: "0xc783d6E12560dc251F5067A62426A5f3b45b6888",
    abi: polygonLeaderboardABI,
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com"
  },
  base: {
    chainId: 8453,
    name: "Base Mainnet", 
    contractAddress: "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B",
    abi: baseLeaderboardABI,
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org"
  },
  celo: {
    chainId: 42220,
    name: "Celo Mainnet",
    contractAddress: "0xB0cbC7325EbC744CcB14211CA74C5a764928F273", 
    abi: fitnessLeaderboardABI,
    rpcUrl: "https://forno.celo.org",
    blockExplorer: "https://celoscan.io"
  },
  monad: {
    chainId: 10143,
    name: "Monad Testnet",
    contractAddress: "0x653d41Fba630381aA44d8598a4b35Ce257924d65",
    abi: monadLeaderboardABI,
    rpcUrl: "https://testnet-rpc.monad.xyz",
    blockExplorer: "https://testnet-explorer.monad.xyz"
  }
};

/**
 * Get network config by contract address
 */
export function getNetworkByContractAddress(contractAddress: string): NetworkConfig | null {
  return Object.values(SUPPORTED_NETWORKS).find(
    network => network.contractAddress.toLowerCase() === contractAddress.toLowerCase()
  ) || null;
}

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  return Object.values(SUPPORTED_NETWORKS).find(
    network => network.chainId === chainId
  ) || null;
}

/**
 * Get network config by name
 */
export function getNetworkByName(name: string): NetworkConfig | null {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  return Object.values(SUPPORTED_NETWORKS).find(
    network => network.name.toLowerCase().replace(/\s+/g, '').includes(normalizedName)
  ) || null;
}

/**
 * Check if a network is supported
 */
export function isNetworkSupported(chainId: number): boolean {
  return Object.values(SUPPORTED_NETWORKS).some(network => network.chainId === chainId);
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.values(SUPPORTED_NETWORKS).map(network => network.chainId);
}