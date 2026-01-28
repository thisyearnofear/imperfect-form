/**
 * Contract Addresses Configuration
 *
 * Updated with deployed StandardFitnessLeaderboard contracts
 */

export const CONTRACT_ADDRESSES = {
  // Celo Mainnet - Verification enabled (Self Protocol)
  celo: {
    standard: '0xB0cbC7325EbC744CcB14211CA74C5a764928F273', // Current standard Celo contract
    verified:
      process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT ||
      '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03', // Self Protocol integrated
  },

  // Standard contracts (no verification) - DEPLOYED!
  polygon: {
    standard: '0x28FE19798fe0A0276CF474f2DCC3749313f1aC0A', // StandardFitnessLeaderboard deployed
  },

  base: {
    standard: '0x58DC4867f87473BF9874892dE8e62C48958c8d96', // StandardFitnessLeaderboard deployed
  },

  monad: {
    standard: process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS || '', // Deployed on Monad Mainnet
  },
} as const;

/**
 * Helper to get contract address by chain ID and type
 */
export function getContractAddress(
  chainId: number,
  type: 'standard' | 'verified' = 'standard'
): string | null {
  switch (chainId) {
    case 42220: // Celo
      return type === 'verified'
        ? CONTRACT_ADDRESSES.celo.verified
        : CONTRACT_ADDRESSES.celo.standard;
    case 137: // Polygon
      return CONTRACT_ADDRESSES.polygon.standard;
    case 8453: // Base
      return CONTRACT_ADDRESSES.base.standard;
    case 143: // Monad Mainnet
      return CONTRACT_ADDRESSES.monad.standard;
    default:
      return null;
  }
}

/**
 * Check if a chain supports verification (Self Protocol)
 */
export function supportsVerification(chainId: number): boolean {
  return chainId === 42220; // Only Celo supports verification
}

/**
 * Get the appropriate ABI import name for a chain
 */
export function getABIName(chainId: number, isVerified: boolean = false): string {
  if (chainId === 42220 && isVerified) {
    return 'verifiedFitnessLeaderboardABI';
  }

  // All other chains use the standard ABI
  switch (chainId) {
    case 137: // Polygon
      return 'polygonLeaderboardABI';
    case 8453: // Base
      return 'baseLeaderboardABI';
    case 143: // Monad
      return 'monadLeaderboardABI';
    case 42220: // Celo (standard)
      return 'fitnessLeaderboardABI';
    default:
      return 'standardFitnessLeaderboardABI';
  }
}
