/**
 * Builder Code Transaction Validator
 *
 * Validates that transactions include proper Builder Code attribution
 * for rewards tracking on base.dev
 */

import { createRemoteLogger } from './remoteLogger';
import { decodeBuilderCodeSuffix, isValidBuilderCodeSuffix, BUILDER_CODE } from './builderCodes';

const logger = createRemoteLogger('BuilderCodeValidator');

/**
 * Validates a transaction hash for Builder Code attribution
 * Fetches transaction data and checks for ERC-8021 suffix
 */
export async function validateTransactionAttribution(
  txHash: string,
  rpcUrl: string
): Promise<{
  isValid: boolean;
  builderCode: string | null;
  hasDataSuffix: boolean;
  error?: string;
}> {
  try {
    // Fetch transaction data
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const tx = data.result;

    if (!tx) {
      return {
        isValid: false,
        builderCode: null,
        hasDataSuffix: false,
        error: 'Transaction not found',
      };
    }

    // Check input data for Builder Code suffix
    const inputData = tx.input || tx.data || '';

    if (!inputData || inputData.length < 34) {
      // 0x + 16 bytes minimum
      return {
        isValid: false,
        builderCode: null,
        hasDataSuffix: false,
        error: 'Transaction data too short for ERC-8021 suffix',
      };
    }

    // The suffix should be at the end of the input data
    // ERC-8021 suffix is 16 bytes = 32 hex chars
    const suffix = '0x' + inputData.slice(-32);

    if (isValidBuilderCodeSuffix(suffix)) {
      const builderCode = decodeBuilderCodeSuffix(suffix);
      logger.info('✅ Valid Builder Code attribution found', {
        txHash,
        builderCode,
        suffix,
      });

      return {
        isValid: true,
        builderCode: builderCode || null,
        hasDataSuffix: true,
      };
    } else {
      logger.warn('⚠️ No valid Builder Code suffix found', {
        txHash,
        suffix,
        inputDataLength: inputData.length,
      });

      return {
        isValid: false,
        builderCode: null,
        hasDataSuffix: false,
      };
    }
  } catch (error) {
    logger.error('Failed to validate transaction attribution', error);
    return {
      isValid: false,
      builderCode: null,
      hasDataSuffix: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validates attribution for multiple transactions
 */
export async function validateMultipleTransactions(
  transactions: Array<{ hash: string; rpcUrl: string; chainName?: string }>
): Promise<
  Array<{
    hash: string;
    chainName?: string;
    isValid: boolean;
    builderCode: string | null;
    hasDataSuffix: boolean;
    error?: string;
  }>
> {
  const results = await Promise.all(
    transactions.map(async (tx) => {
      const validation = await validateTransactionAttribution(tx.hash, tx.rpcUrl);
      return {
        hash: tx.hash,
        chainName: tx.chainName,
        ...validation,
      };
    })
  );

  return results;
}

/**
 * Gets the expected Builder Code suffix for validation
 */
export function getExpectedSuffix(): `0x${string}` {
  const { encodeBuilderCodeSuffix } = require('./builderCodes');
  return encodeBuilderCodeSuffix(BUILDER_CODE);
}

/**
 * Checks if a Builder Code is properly configured
 */
export function isBuilderCodeConfigured(): boolean {
  const configured = process.env.NEXT_PUBLIC_BUILDER_CODE;
  return !!configured && configured.startsWith('bc_');
}

/**
 * Gets attribution statistics from localStorage
 */
export function getAttributionStats(): {
  totalTransactions: number;
  attributedTransactions: number;
  lastAttributedTx?: string;
} {
  if (typeof window === 'undefined') {
    return {
      totalTransactions: 0,
      attributedTransactions: 0,
    };
  }

  try {
    const key = 'builder_code_transactions';
    const existing = localStorage.getItem(key);
    const transactions = existing ? JSON.parse(existing) : [];

    return {
      totalTransactions: transactions.length,
      attributedTransactions: transactions.filter((tx: any) => tx.builderCode).length,
      lastAttributedTx:
        transactions.length > 0 ? transactions[transactions.length - 1].hash : undefined,
    };
  } catch (error) {
    logger.warn('Failed to get attribution stats', error);
    return {
      totalTransactions: 0,
      attributedTransactions: 0,
    };
  }
}
