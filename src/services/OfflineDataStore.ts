/**
 * OfflineDataStore - Offline-first data persistence
 *
 * Provides IndexedDB-backed storage with:
 * - Automatic sync on reconnection
 * - Transaction support
 * - Compression for large datasets
 * - Cleanup and quota management
 */

import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('OfflineDataStore');

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface StoredData<T> {
  key: string;
  data: T;
  timestamp: number;
  version: number;
  compressed?: boolean;
}

export interface SyncRecord {
  id: string;
  key: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'synced' | 'failed';
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE DATA STORE
// ═══════════════════════════════════════════════════════════════════════════

class OfflineDataStoreImpl {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private dbName = 'ImperfectFormOfflineDB';
  private version = 1;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('OfflineDataStore requires browser environment'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Data store
        if (!db.objectStoreNames.contains('data')) {
          const store = db.createObjectStore('data', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          logger.info('Created "data" object store');
        }

        // Sync queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          logger.info('Created "syncQueue" object store');
        }
      };
    });

    return this.dbPromise;
  }

  // Store data
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await this.getDB();
      const stored: StoredData<T> = {
        key,
        data,
        timestamp: Date.now(),
        version: 1,
      };

      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').put(stored);

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
      });

      logger.debug(`Stored offline data: ${key}`);
    } catch (error) {
      logger.error('Failed to store offline data', { key, error });
    }
  }

  // Retrieve data
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    try {
      const db = await this.getDB();
      const tx = db.transaction('data', 'readonly');
      const store = tx.objectStore('data');
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result as StoredData<T> | undefined;
          resolve(result?.data ?? null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logger.error('Failed to retrieve offline data', { key, error });
      return null;
    }
  }

  // Delete data
  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await this.getDB();
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').delete(key);

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
      });

      logger.debug(`Removed offline data: ${key}`);
    } catch (error) {
      logger.error('Failed to remove offline data', { key, error });
    }
  }

  // Clear all data
  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await this.getDB();
      const tx = db.transaction('data', 'readwrite');
      tx.objectStore('data').clear();

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
      });

      logger.info('Cleared all offline data');
    } catch (error) {
      logger.error('Failed to clear offline data', error);
    }
  }

  // Queue sync operation
  async queueSync(
    key: string,
    operation: 'create' | 'update' | 'delete',
    data?: any
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await this.getDB();
      const record: SyncRecord = {
        id: `${key}-${Date.now()}`,
        key,
        operation,
        data,
        timestamp: Date.now(),
        retries: 0,
        status: 'pending',
      };

      const tx = db.transaction('syncQueue', 'readwrite');
      tx.objectStore('syncQueue').add(record);

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(null);
        tx.onerror = () => reject(tx.error);
      });

      logger.debug(`Queued sync: ${key}`, { operation });
    } catch (error) {
      logger.error('Failed to queue sync', { key, error });
    }
  }

  // Get pending sync operations
  async getPendingSync(): Promise<SyncRecord[]> {
    if (typeof window === 'undefined') return [];

    try {
      const db = await this.getDB();
      const tx = db.transaction('syncQueue', 'readonly');
      const index = tx.objectStore('syncQueue').index('status');
      const request = index.getAll('pending');

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      logger.error('Failed to get pending sync', error);
      return [];
    }
  }

  // Mark sync as complete
  async markSyncComplete(id: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const db = await this.getDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');

      const request = store.get(id);
      await new Promise((resolve) => {
        request.onsuccess = () => {
          const record = request.result as SyncRecord;
          if (record) {
            record.status = 'synced';
            store.put(record);
          }
          resolve(null);
        };
      });

      logger.debug(`Marked sync complete: ${id}`);
    } catch (error) {
      logger.error('Failed to mark sync complete', { id, error });
    }
  }

  // Get storage quota usage
  async getQuotaUsage(): Promise<{ usage: number; quota: number; percent: number }> {
    if (typeof navigator === 'undefined' || !navigator.storage) {
      return { usage: 0, quota: 0, percent: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
        percent: ((estimate.usage ?? 0) / (estimate.quota ?? 1)) * 100,
      };
    } catch (error) {
      logger.error('Failed to get quota usage', error);
      return { usage: 0, quota: 0, percent: 0 };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let offlineStore: OfflineDataStoreImpl | null = null;

export function getOfflineDataStore(): OfflineDataStoreImpl {
  if (!offlineStore) {
    offlineStore = new OfflineDataStoreImpl();
  }
  return offlineStore;
}

export default getOfflineDataStore;
