/**
 * Base Builder Codes Integration (ERC-8021)
 *
 * Builder Codes allow Base to attribute onchain activity back to your app.
 * Your Builder Code: bc_ozh43mmg
 *
 * The dataSuffix is appended to transaction calldata and ignored by smart contracts.
 * Offchain indexers extract it for attribution and rewards tracking.
 *
 * @see https://base.dev/builder-codes
 */

import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('BuilderCodes');

// Your Builder Code
export const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE || 'bc_ozh43mmg';

// ERC-8021 magic bytes (8 bytes): 0x8021802180218021
const ERC8021_MAGIC_BYTES = '8021802180218021';

// Prefix for Base app attribution (8 bytes): "baseapp" + null terminator
const BASEAPP_PREFIX = '6261736561707000'; // "baseapp" in hex + 0x00

/**
 * Encodes a Builder Code into the ERC-8021 dataSuffix format
 *
 * Format: 0x[7 bytes "baseapp" prefix][1 byte null][8 bytes code][8 bytes ERC-8021 magic]
 * Total: 16 bytes (32 hex chars) + 0x prefix = 34 chars
 *
 * @param builderCode - Your Builder Code (e.g., "bc_ozh43mmg")
 * @returns Hex string for dataSuffix capability
 */
export function encodeBuilderCodeSuffix(builderCode: string = BUILDER_CODE): `0x${string}` {
  // Extract the code part (remove "bc_" prefix if present)
  const code = builderCode.replace(/^bc_/, '');

  // Convert code to hex (ASCII encoding)
  let codeHex = '';
  for (let i = 0; i < code.length; i++) {
    codeHex += code.charCodeAt(i).toString(16).padStart(2, '0');
  }

  // Pad code to 8 bytes (16 hex chars)
  const codePadded = codeHex.padEnd(16, '0');

  // Construct the full suffix: prefix + code + magic bytes
  const suffix = `${BASEAPP_PREFIX}${codePadded}${ERC8021_MAGIC_BYTES}`;

  logger.info('Encoded Builder Code suffix', {
    builderCode,
    code,
    codeHex,
    codePadded,
    suffix,
  });

  return `0x${suffix}` as `0x${string}`;
}

/**
 * Decodes an ERC-8021 dataSuffix back to a Builder Code
 *
 * @param dataSuffix - Hex string from transaction calldata
 * @returns Builder Code if valid, null otherwise
 */
export function decodeBuilderCodeSuffix(dataSuffix: string): string | null {
  try {
    // Remove 0x prefix if present
    const hex = dataSuffix.startsWith('0x') ? dataSuffix.slice(2) : dataSuffix;

    // Validate minimum length (32 hex chars = 16 bytes)
    if (hex.length < 32) {
      logger.warn('DataSuffix too short to be valid ERC-8021', { hex });
      return null;
    }

    // Extract parts
    const prefix = hex.slice(0, 16); // First 8 bytes
    const codeHex = hex.slice(16, 24); // Next 4 bytes (code portion)
    const magicBytes = hex.slice(24, 40); // Last 8 bytes

    // Validate magic bytes
    if (magicBytes !== ERC8021_MAGIC_BYTES) {
      logger.warn('Invalid ERC-8021 magic bytes', { magicBytes, expected: ERC8021_MAGIC_BYTES });
      return null;
    }

    // Validate prefix
    if (prefix !== BASEAPP_PREFIX) {
      logger.warn('Invalid Base app prefix', { prefix, expected: BASEAPP_PREFIX });
      return null;
    }

    // Decode code from hex to ASCII
    let code = '';
    for (let i = 0; i < codeHex.length; i += 2) {
      const charCode = parseInt(codeHex.slice(i, i + 2), 16);
      if (charCode === 0) break; // Stop at null terminator
      code += String.fromCharCode(charCode);
    }

    const builderCode = `bc_${code}`;
    logger.info('Decoded Builder Code', { dataSuffix, builderCode });

    return builderCode;
  } catch (error) {
    logger.error('Failed to decode Builder Code suffix', error);
    return null;
  }
}

/**
 * Validates if a dataSuffix contains a valid Builder Code attribution
 */
export function isValidBuilderCodeSuffix(dataSuffix: string): boolean {
  return decodeBuilderCodeSuffix(dataSuffix) !== null;
}

/**
 * Gets the dataSuffix capability object for wallet_sendCalls
 *
 * @param builderCode - Optional custom Builder Code (defaults to env var)
 * @returns Capability object for wallet_sendCalls
 */
export function getBuilderCodeCapability(builderCode: string = BUILDER_CODE): {
  dataSuffix: { value: `0x${string}`; optional: boolean };
} {
  const suffix = encodeBuilderCodeSuffix(builderCode);

  return {
    dataSuffix: {
      value: suffix,
      optional: true, // Make it optional so transactions still work if wallet doesn't support it
    },
  };
}

/**
 * Appends Builder Code suffix to existing calldata
 * Use this when you need to manually append to transaction data
 *
 * @param existingData - Existing calldata (with or without 0x prefix)
 * @param builderCode - Builder Code to append
 * @returns Combined calldata with Builder Code suffix
 */
export function appendBuilderCodeToCalldata(
  existingData: string,
  builderCode: string = BUILDER_CODE
): `0x${string}` {
  const suffix = encodeBuilderCodeSuffix(builderCode);

  // Remove 0x prefix from existing data if present
  const dataWithoutPrefix = existingData.startsWith('0x') ? existingData.slice(2) : existingData;

  // Remove 0x prefix from suffix
  const suffixWithoutPrefix = suffix.slice(2);

  // Combine
  const combined = `0x${dataWithoutPrefix}${suffixWithoutPrefix}`;

  logger.info('Appended Builder Code to calldata', {
    originalData: existingData,
    suffix,
    combined,
  });

  return combined as `0x${string}`;
}

/**
 * Checks if the current environment supports ERC-8021 dataSuffix
 */
export async function checkDataSuffixSupport(): Promise<boolean> {
  try {
    // In browser context, check for ethereum provider
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const provider = (window as any).ethereum;

      // Try to get capabilities
      try {
        const capabilities = await provider.request({
          method: 'wallet_getCapabilities',
        });

        // If capabilities exist, dataSuffix is likely supported
        return !!capabilities;
      } catch (error) {
        // wallet_getCapabilities not supported, but dataSuffix might still work
        logger.info('wallet_getCapabilities not available, assuming basic dataSuffix support');
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.warn('Failed to check dataSuffix support', error);
    return false;
  }
}

/**
 * Logs Builder Code attribution info for debugging
 */
export function logBuilderCodeAttribution(): void {
  const suffix = encodeBuilderCodeSuffix();
  const isSupported = checkDataSuffixSupport();

  logger.info('🏷️ Builder Code Attribution', {
    builderCode: BUILDER_CODE,
    dataSuffix: suffix,
    dataSuffixLength: suffix.length,
    gasCostEstimate: `${((suffix.length - 2) / 2) * 16} gas`, // 16 gas per non-zero byte
    supported: isSupported,
  });
}

/**
 * Builder Code transaction tracker
 * Track attributed transactions for analytics
 */
export interface AttributedTransaction {
  hash: string;
  builderCode: string;
  timestamp: number;
  chainId: number;
  method: string;
}

/**
 * Stores attributed transaction in localStorage for analytics
 */
export function trackAttributedTransaction(tx: AttributedTransaction): void {
  if (typeof window === 'undefined') return;

  try {
    const key = 'builder_code_transactions';
    const existing = localStorage.getItem(key);
    const transactions: AttributedTransaction[] = existing ? JSON.parse(existing) : [];

    transactions.push(tx);

    // Keep last 100 transactions
    const trimmed = transactions.slice(-100);
    localStorage.setItem(key, JSON.stringify(trimmed));

    logger.info('Tracked attributed transaction', tx);
  } catch (error) {
    logger.warn('Failed to track attributed transaction', error);
  }
}

/**
 * Gets all tracked attributed transactions
 */
export function getAttributedTransactions(): AttributedTransaction[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = 'builder_code_transactions';
    const existing = localStorage.getItem(key);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    logger.warn('Failed to get attributed transactions', error);
    return [];
  }
}

/**
 * Clears tracked attributed transactions
 */
export function clearAttributedTransactions(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('builder_code_transactions');
    logger.info('Cleared attributed transactions');
  } catch (error) {
    logger.warn('Failed to clear attributed transactions', error);
  }
}
