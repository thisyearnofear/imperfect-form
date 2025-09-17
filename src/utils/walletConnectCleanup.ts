/**
 * WalletConnect Session Cleanup and Connection Stability Utilities
 *
 * Addresses WalletConnect session conflicts and connection instability by implementing
 * comprehensive session management, cleanup strategies, and connection monitoring.
 */

import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('WalletConnectManager');

interface WalletConnectSession {
  topic: string;
  expiry: number;
  relay: any;
  namespaces: any;
  acknowledged: boolean;
  controller: string;
  self: any;
  peer: any;
}

interface StorageCleanupResult {
  keysRemoved: number;
  errors: string[];
  timeStamp: string;
}

// WalletConnect storage key patterns to clean up
const WALLETCONNECT_STORAGE_PATTERNS = [
  'wc@2:', // WalletConnect v2
  'walletconnect', // Legacy WalletConnect
  'reown:', // Reown (WalletConnect rebrand)
  'w3m:', // Web3Modal
  'wcm:', // WalletConnect Modal
  '@w3m/', // Web3Modal namespaced
  'wagmi.', // Wagmi cache that might include WC data
  'wc_', // WalletConnect prefixed
  'WEB3_CONNECT_CACHED_PROVIDER', // Web3Connect
  'ethereum-provider', // Generic provider cache
  'walletconnect-bridge', // Bridge connections
  'walletconnect-deeplink', // Deep link data
];

// IndexedDB databases used by WalletConnect
const WALLETCONNECT_INDEXEDDB_NAMES = [
  'walletconnect',
  'wc@2:core',
  'wc@2:engine',
  'reown',
  'w3m',
  'wagmi',
];

/**
 * Comprehensive cleanup of all WalletConnect related storage
 */
export async function cleanupWalletConnectSessions(): Promise<StorageCleanupResult> {
  const result: StorageCleanupResult = {
    keysRemoved: 0,
    errors: [],
    timeStamp: new Date().toISOString(),
  };

  logger.info('Starting comprehensive WalletConnect cleanup...');

  // Step 1: Clean localStorage
  try {
    const localStorageResult = cleanupLocalStorage();
    result.keysRemoved += localStorageResult.keysRemoved;
    result.errors.push(...localStorageResult.errors);
  } catch (error) {
    const errorMsg = `localStorage cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  // Step 2: Clean sessionStorage
  try {
    const sessionStorageResult = cleanupSessionStorage();
    result.keysRemoved += sessionStorageResult.keysRemoved;
    result.errors.push(...sessionStorageResult.errors);
  } catch (error) {
    const errorMsg = `sessionStorage cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  // Step 3: Clean IndexedDB
  try {
    const indexedDBResult = await cleanupIndexedDB();
    result.keysRemoved += indexedDBResult.keysRemoved;
    result.errors.push(...indexedDBResult.errors);
  } catch (error) {
    const errorMsg = `IndexedDB cleanup failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  logger.info(`WalletConnect cleanup completed:`, result);
  return result;
}

/**
 * Clean WalletConnect data from localStorage
 */
function cleanupLocalStorage(): { keysRemoved: number; errors: string[] } {
  const result = { keysRemoved: 0, errors: [] as string[] };

  if (typeof window === 'undefined' || !window.localStorage) {
    return result;
  }

  try {
    const keysToRemove: string[] = [];

    // Collect all matching keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isWalletConnectKey(key)) {
        keysToRemove.push(key);
      }
    }

    // Remove the keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        result.keysRemoved++;
        logger.debug(`Removed localStorage key: ${key}`);
      } catch (error) {
        const errorMsg = `Failed to remove localStorage key ${key}: ${error}`;
        result.errors.push(errorMsg);
        logger.warn(errorMsg);
      }
    });

    logger.info(`Cleaned ${result.keysRemoved} localStorage keys`);
  } catch (error) {
    const errorMsg = `localStorage iteration failed: ${error}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  return result;
}

/**
 * Clean WalletConnect data from sessionStorage
 */
function cleanupSessionStorage(): { keysRemoved: number; errors: string[] } {
  const result = { keysRemoved: 0, errors: [] as string[] };

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return result;
  }

  try {
    const keysToRemove: string[] = [];

    // Collect all matching keys
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && isWalletConnectKey(key)) {
        keysToRemove.push(key);
      }
    }

    // Remove the keys
    keysToRemove.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
        result.keysRemoved++;
        logger.debug(`Removed sessionStorage key: ${key}`);
      } catch (error) {
        const errorMsg = `Failed to remove sessionStorage key ${key}: ${error}`;
        result.errors.push(errorMsg);
        logger.warn(errorMsg);
      }
    });

    logger.info(`Cleaned ${result.keysRemoved} sessionStorage keys`);
  } catch (error) {
    const errorMsg = `sessionStorage iteration failed: ${error}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  return result;
}

/**
 * Clean WalletConnect data from IndexedDB
 */
async function cleanupIndexedDB(): Promise<{ keysRemoved: number; errors: string[] }> {
  const result = { keysRemoved: 0, errors: [] as string[] };

  if (typeof window === 'undefined' || !window.indexedDB) {
    return result;
  }

  try {
    // Get list of all databases
    const databases = await indexedDB.databases();

    for (const db of databases) {
      if (db.name && isWalletConnectDatabase(db.name)) {
        try {
          await deleteIndexedDBDatabase(db.name);
          result.keysRemoved++;
          logger.debug(`Deleted IndexedDB database: ${db.name}`);
        } catch (error) {
          const errorMsg = `Failed to delete IndexedDB database ${db.name}: ${error}`;
          result.errors.push(errorMsg);
          logger.warn(errorMsg);
        }
      }
    }

    logger.info(`Cleaned ${result.keysRemoved} IndexedDB databases`);
  } catch (error) {
    const errorMsg = `IndexedDB cleanup failed: ${error}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg);
  }

  return result;
}

/**
 * Check if a storage key is related to WalletConnect
 */
function isWalletConnectKey(key: string): boolean {
  return WALLETCONNECT_STORAGE_PATTERNS.some((pattern) => key.includes(pattern));
}

/**
 * Check if an IndexedDB database is related to WalletConnect
 */
function isWalletConnectDatabase(dbName: string): boolean {
  return WALLETCONNECT_INDEXEDDB_NAMES.some(
    (name) => dbName.includes(name) || dbName.startsWith(name)
  );
}

/**
 * Delete an IndexedDB database with error handling
 */
function deleteIndexedDBDatabase(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      logger.debug(`Successfully deleted IndexedDB database: ${dbName}`);
      resolve();
    };

    deleteRequest.onerror = () => {
      reject(new Error(`Failed to delete database ${dbName}: ${deleteRequest.error?.message}`));
    };

    deleteRequest.onblocked = () => {
      logger.warn(`Delete blocked for database ${dbName}, forcing close...`);
      // Try to resolve anyway after a delay
      setTimeout(resolve, 1000);
    };
  });
}

/**
 * Get diagnostic information about WalletConnect storage usage
 */
export function getWalletConnectStorageDiagnostics(): any {
  const diagnostics = {
    localStorage: { keys: [] as Array<{ key: string; size: number }>, totalSize: 0 },
    sessionStorage: { keys: [] as Array<{ key: string; size: number }>, totalSize: 0 },
    timestamp: new Date().toISOString(),
  };

  if (typeof window === 'undefined') {
    return { ...diagnostics, error: 'Not in browser environment' };
  }

  try {
    // Check localStorage
    if (window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isWalletConnectKey(key)) {
          try {
            const value = localStorage.getItem(key);
            const size = value ? new Blob([value]).size : 0;
            diagnostics.localStorage.keys.push({ key, size });
            diagnostics.localStorage.totalSize += size;
          } catch (error) {
            logger.warn(`Failed to read localStorage key ${key}:`, error);
          }
        }
      }
    }

    // Check sessionStorage
    if (window.sessionStorage) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && isWalletConnectKey(key)) {
          try {
            const value = sessionStorage.getItem(key);
            const size = value ? new Blob([value]).size : 0;
            diagnostics.sessionStorage.keys.push({ key, size });
            diagnostics.sessionStorage.totalSize += size;
          } catch (error) {
            logger.warn(`Failed to read sessionStorage key ${key}:`, error);
          }
        }
      }
    }
  } catch (error) {
    return { ...diagnostics, error: error instanceof Error ? error.message : String(error) };
  }

  return diagnostics;
}

/**
 * Monitor WalletConnect connection stability
 */
export class WalletConnectStabilityMonitor {
  private isMonitoring = false;
  private connectionChecks = 0;
  private failures = 0;
  private onConnectionIssue?: (issue: string) => void;
  private monitorInterval?: NodeJS.Timeout;

  constructor(onConnectionIssue?: (issue: string) => void) {
    this.onConnectionIssue = onConnectionIssue;
  }

  startMonitoring(intervalMs: number = 10000): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.isMonitoring = true;
    this.connectionChecks = 0;
    this.failures = 0;

    logger.info('Starting WalletConnect stability monitoring...');

    this.monitorInterval = setInterval(() => {
      this.performStabilityCheck();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('Stopped WalletConnect stability monitoring');
  }

  private async performStabilityCheck(): Promise<void> {
    this.connectionChecks++;

    try {
      // Check for common signs of WalletConnect issues
      const issues = [];

      // Check storage growth (possible memory leak)
      const diagnostics = getWalletConnectStorageDiagnostics();
      if (diagnostics.localStorage.totalSize > 1024 * 1024) {
        // 1MB
        issues.push('Excessive WalletConnect localStorage usage detected');
      }

      // Check for stale sessions in storage
      if (typeof window !== 'undefined' && window.localStorage) {
        const wcKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('wc@2:core:0:')) {
            wcKeys.push(key);
          }
        }

        if (wcKeys.length > 5) {
          issues.push(`Too many WalletConnect sessions detected: ${wcKeys.length}`);
        }
      }

      // Check for connection timeouts or errors in console
      // This would require additional monitoring setup

      if (issues.length > 0) {
        this.failures++;
        const issueMessage = issues.join('; ');
        logger.warn(`WalletConnect stability issue detected: ${issueMessage}`);

        if (this.onConnectionIssue) {
          this.onConnectionIssue(issueMessage);
        }

        // Auto-cleanup if too many failures
        if (this.failures >= 3) {
          logger.warn('Multiple stability issues detected, performing automatic cleanup...');
          await cleanupWalletConnectSessions();
          this.failures = 0; // Reset after cleanup
        }
      }
    } catch (error) {
      logger.error('Stability check failed:', error);
    }
  }

  getStats(): { checks: number; failures: number; isMonitoring: boolean } {
    return {
      checks: this.connectionChecks,
      failures: this.failures,
      isMonitoring: this.isMonitoring,
    };
  }
}

/**
 * Force disconnect all WalletConnect sessions
 */
export async function forceDisconnectWalletConnect(): Promise<boolean> {
  try {
    logger.info('Force disconnecting all WalletConnect sessions...');

    // Step 1: Clean up storage
    await cleanupWalletConnectSessions();

    // Step 2: Try to gracefully disconnect any active connections
    if (typeof window !== 'undefined') {
      // Try to access any global WalletConnect instances
      const globalObjects = [
        (window as any).walletConnectProvider,
        (window as any).wcProvider,
        (window as any).connector,
        (window as any).ethereum?.walletConnect,
      ];

      for (const obj of globalObjects) {
        if (obj && typeof obj.disconnect === 'function') {
          try {
            await obj.disconnect();
            logger.debug('Disconnected a WalletConnect instance');
          } catch (error) {
            logger.warn('Failed to disconnect WalletConnect instance:', error);
          }
        }
      }
    }

    // Step 3: Dispatch a custom event for any listening components
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('walletconnect:force-disconnect', {
        detail: { timestamp: Date.now() },
      });
      window.dispatchEvent(event);
    }

    logger.info('Force disconnect completed');
    return true;
  } catch (error) {
    logger.error('Force disconnect failed:', error);
    return false;
  }
}

/**
 * Preventive cleanup to run before establishing new connections
 */
export async function preventiveWalletConnectCleanup(): Promise<void> {
  try {
    logger.info('Running preventive WalletConnect cleanup...');

    // Clean up only stale or corrupted sessions, not active ones
    const diagnostics = getWalletConnectStorageDiagnostics();

    // If storage usage is reasonable, do a lighter cleanup
    if (diagnostics.localStorage.totalSize < 512 * 1024) {
      // Less than 512KB
      logger.debug('Storage usage normal, skipping aggressive cleanup');
      return;
    }

    // Otherwise, perform full cleanup
    await cleanupWalletConnectSessions();

    logger.info('Preventive cleanup completed');
  } catch (error) {
    logger.error('Preventive cleanup failed:', error);
  }
}

/**
 * Check if WalletConnect is currently causing issues
 */
export function isWalletConnectCausingIssues(): boolean {
  try {
    const diagnostics = getWalletConnectStorageDiagnostics();

    // Check for excessive storage usage
    if (diagnostics.localStorage.totalSize > 2 * 1024 * 1024) {
      // 2MB
      return true;
    }

    // Check for too many stored keys
    if (diagnostics.localStorage.keys.length > 20) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check WalletConnect issues:', error);
    return false;
  }
}
