/**
 * Self Protocol Configuration - Mainnet Production
 * Simplified configuration for Self Protocol integration on Celo Mainnet
 * Production-ready with real passport verification only
 */

import { VerificationConfig } from '@selfxyz/core';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface SelfProtocolNetwork {
  name: string;
  chainId: number;
  hubAddress: string;
  blockExplorer: string;
  rpcUrl: string;
}

export interface SelfProtocolConfig {
  scope: string;
  scopeName: string;
  configId: string;
  minimumAge: number;
  network: SelfProtocolNetwork;
  verification: VerificationConfig;
}

// =============================================================================
// MAINNET PRODUCTION CONFIGURATION
// =============================================================================

const CELO_MAINNET: SelfProtocolNetwork = {
  name: 'celo',
  chainId: 42220,
  hubAddress: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF',
  blockExplorer: 'https://celoscan.io',
  rpcUrl: 'https://forno.celo.org',
};

// =============================================================================
// CORE CONFIGURATION
// =============================================================================

export const SELF_PROTOCOL_CONFIG: SelfProtocolConfig = {
  // Application scope configuration
  scope: 'imperfect-form-fitness',
  scopeName: 'imperfect-form-fitness',

  // Self Protocol V2 configuration ID
  configId: '0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61',

  // Minimum age requirement for verification
  minimumAge: 16,

  // Production network (Celo Mainnet only)
  network: CELO_MAINNET,

  // Verification requirements - Real passports only
  verification: {
    excludedCountries: [], // No country restrictions for fitness app
    ofac: false, // No OFAC checking needed for fitness app
    minimumAge: 16, // Minimum age for fitness tracking
  },
} as const;

// =============================================================================
// PRODUCTION HELPERS
// =============================================================================

/**
 * Get the production network configuration (always Celo Mainnet)
 */
function getCurrentNetwork(): SelfProtocolNetwork {
  return CELO_MAINNET;
}

/**
 * Get the hub address for production
 */
function getCurrentHubAddress(): string {
  return CELO_MAINNET.hubAddress;
}

/**
 * Get the verification endpoint URL
 */
function getVerificationEndpoint(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/self/verify`;
}

// =============================================================================
// DEPLOYMENT CONFIGURATION
// =============================================================================

export const DEPLOYMENT_CONFIG = {
  // Minimum balance required for deployment (in CELO)
  MIN_BALANCE: '0.1',

  // Number of confirmation blocks to wait
  CONFIRMATION_BLOCKS: 2,

  // Gas configuration
  GAS_LIMIT: 8000000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate Self Protocol configuration for production
 */
function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    errors.push('NEXT_PUBLIC_APP_URL is required');
  }

  // Validate production network configuration
  if (!CELO_MAINNET.hubAddress || CELO_MAINNET.hubAddress === '0x...') {
    errors.push('Invalid hub address for Celo Mainnet');
  }

  // Validate scope configuration
  if (!SELF_PROTOCOL_CONFIG.scope) {
    errors.push('Scope name is required');
  }

  if (!SELF_PROTOCOL_CONFIG.configId || SELF_PROTOCOL_CONFIG.configId.length !== 66) {
    errors.push('Invalid config ID format');
  }

  // Production environment check
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Running Self Protocol in non-production mode');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SELF_PROTOCOL_CONFIG;

// Named exports for specific use cases
export {
  CELO_MAINNET as NETWORK,
  getCurrentNetwork,
  getCurrentHubAddress,
  getVerificationEndpoint,
  validateConfig,
};
