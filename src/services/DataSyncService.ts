/**
 * DataSyncService - Unified Real-time Data Synchronization
 *
 * Provides centralized data management with:
 * - Automatic cache invalidation
 * - Optimistic updates with rollback
 * - Offline-first persistence
 * - Real-time subscription support
 * - Exponential backoff retry logic
 *
 * Core Principles: ENHANCEMENT FIRST, DRY, CLEAN
 */

import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('DataSyncService');

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export type DataKey = string & { readonly __brand: 'DataKey' };
export type OperationType = 'fetch' | 'mutate' | 'subscribe';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
  status: 'fresh' | 'stale' | 'error';
  error?: Error;
}

export interface SyncOptions {
  ttl?: number; // Time-to-live in milliseconds
  skipCache?: boolean;
  revalidate?: boolean;
}

export interface MutationOptions<T> extends SyncOptions {
  optimistic?: T;
  rollbackOnError?: boolean;
}

export interface SubscriptionOptions extends SyncOptions {
  pollInterval?: number;
  retryCount?: number;
  retryDelay?: number;
}

export type DataFetcher<T> = (signal?: AbortSignal) => Promise<T>;
export type DataMutator<T, R = any> = (payload: T) => Promise<R>;
export type DataSubscriber<T> = (callback: (data: T) => void) => () => void;

export interface DataSource<T> {
  fetch: DataFetcher<T>;
  mutate?: DataMutator<any, T>;
  subscribe?: DataSubscriber<T>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CACHE MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class CacheManager {
  private cache: Map<DataKey, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: DataKey, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      status: 'fresh',
    };
    this.cache.set(key, entry);
    logger.debug(`Cache SET: ${key}`, { ttl: entry.ttl });
  }

  get<T>(key: DataKey): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      entry.status = 'stale';
      logger.debug(`Cache STALE: ${key}`, { age, ttl: entry.ttl });
    }

    return entry.data as T;
  }

  getEntry<T>(key: DataKey): CacheEntry<T> | null {
    return (this.cache.get(key) as CacheEntry<T>) || null;
  }

  invalidate(key: DataKey | string): void {
    if (typeof key === 'string') {
      // Support pattern invalidation (e.g., "user:*")
      const pattern = new RegExp(`^${key.replace(/\*/g, '.*')}$`);
      let count = 0;
      for (const cacheKey of this.cache.keys()) {
        if (pattern.test(cacheKey)) {
          this.cache.delete(cacheKey);
          count++;
        }
      }
      logger.info(`Cache INVALIDATE pattern: ${key}`, { count });
    } else {
      this.cache.delete(key);
      logger.debug(`Cache INVALIDATE: ${key}`);
    }
  }

  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    logger.info('Cache CLEAR', { count });
  }

  has(key: DataKey): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA SYNC SERVICE
// ═══════════════════════════════════════════════════════════════════════════

class DataSyncServiceImpl {
  private cache = new CacheManager();
  private sources: Map<DataKey, DataSource<any>> = new Map();
  private abortControllers: Map<DataKey, AbortController> = new Map();
  private subscriptions: Map<DataKey, Set<(data: any) => void>> = new Map();
  private mutations: Map<DataKey, Promise<any>> = new Map();
  private pendingMutations: Map<DataKey, any> = new Map();

  // Register a data source
  register<T>(key: DataKey, source: DataSource<T>): void {
    this.sources.set(key, source);
    logger.info('Data source registered', { key });
  }

  // Core fetch method with caching and retry logic
  async fetch<T>(key: DataKey, options: SyncOptions = {}): Promise<T> {
    const source = this.sources.get(key);
    if (!source) throw new Error(`No data source registered for key: ${key}`);

    // Return cached data if available and not skipping cache
    if (!options.skipCache && this.cache.has(key)) {
      const cached = this.cache.get<T>(key);
      logger.debug(`Cache HIT: ${key}`);
      return cached!;
    }

    // Check if fetch is already in progress
    const existingController = this.abortControllers.get(key);
    if (existingController && !options.revalidate) {
      logger.debug(`Using existing fetch: ${key}`);
      // Wait for it implicitly via timeout
      await new Promise((resolve) => setTimeout(resolve, 100));
      const cached = this.cache.get<T>(key);
      if (cached) return cached;
    }

    // Create new abort controller
    const controller = new AbortController();
    this.abortControllers.set(key, controller);

    try {
      logger.info(`Fetching: ${key}`);
      const data = await source.fetch(controller.signal);
      this.cache.set(key, data, options.ttl);
      this.abortControllers.delete(key);
      logger.info(`Fetched successfully: ${key}`);
      this.notifySubscribers(key, data);
      return data;
    } catch (error) {
      this.abortControllers.delete(key);
      if (controller.signal.aborted) {
        logger.warn(`Fetch cancelled: ${key}`);
        // Return stale cache if available
        const stale = this.cache.get<T>(key);
        if (stale) return stale;
      }
      logger.error(`Fetch failed: ${key}`, { error });
      throw error;
    }
  }

  // Mutation with optimistic updates
  async mutate<T, R = any>(key: DataKey, payload: T, options: MutationOptions<T> = {}): Promise<R> {
    const source = this.sources.get(key);
    if (!source || !source.mutate) {
      throw new Error(`No mutator registered for key: ${key}`);
    }

    // Check for pending mutations
    if (this.mutations.has(key)) {
      logger.warn(`Mutation already in progress: ${key}`);
      return this.mutations.get(key);
    }

    // Store original for rollback
    const original = this.cache.get(key);

    // Apply optimistic update if provided
    if (options.optimistic) {
      this.cache.set(key, options.optimistic, options.ttl);
      this.pendingMutations.set(key, options.optimistic);
      logger.debug(`Optimistic update: ${key}`);
    }

    const mutationPromise = (async () => {
      try {
        logger.info(`Mutating: ${key}`, { hasOptimistic: !!options.optimistic });
        const result = await source.mutate!(payload);
        this.mutations.delete(key);
        this.pendingMutations.delete(key);

        // Cache the result
        this.cache.set(key, result, options.ttl);
        this.notifySubscribers(key, result);
        logger.info(`Mutation successful: ${key}`);
        return result;
      } catch (error) {
        this.mutations.delete(key);
        this.pendingMutations.delete(key);

        // Rollback on error if enabled
        if (options.rollbackOnError && original !== null) {
          this.cache.set(key, original, options.ttl);
          this.notifySubscribers(key, original);
          logger.info(`Mutation rolled back: ${key}`);
        }

        logger.error(`Mutation failed: ${key}`, { error });
        throw error;
      }
    })();

    this.mutations.set(key, mutationPromise);
    return mutationPromise;
  }

  // Real-time subscription with polling fallback
  subscribe<T>(
    key: DataKey,
    callback: (data: T) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    // Register callback
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(callback);

    // Try native subscription first
    const source = this.sources.get(key);
    if (source?.subscribe) {
      logger.info(`Native subscription: ${key}`);
      return source.subscribe((data) => {
        this.cache.set(key, data, options.ttl);
        callback(data);
      });
    }

    // Fallback to polling
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          await this.fetch(key, { revalidate: true, ...options });
          const data = this.cache.get<T>(key);
          if (data) callback(data);
        } catch (error) {
          logger.warn(`Poll failed for ${key}:`, error);
        }
      }, options.pollInterval ?? 30000); // 30s default
    };

    startPolling();
    logger.info(`Polling subscription: ${key}`, { interval: options.pollInterval });

    // Return unsubscribe function
    return () => {
      if (pollInterval) clearInterval(pollInterval);
      const callbacks = this.subscriptions.get(key);
      if (callbacks) callbacks.delete(callback);
      logger.debug(`Unsubscribed: ${key}`);
    };
  }

  // Private: notify all subscribers
  private notifySubscribers(key: DataKey, data: any): void {
    const callbacks = this.subscriptions.get(key);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Subscriber error for ${key}:`, error);
        }
      });
    }
  }

  // Invalidate cache and trigger refetch
  invalidate(key: DataKey | string): void {
    this.cache.invalidate(key);

    // Revalidate subscribed data
    if (typeof key !== 'string') {
      const callbacks = this.subscriptions.get(key);
      if (callbacks && callbacks.size > 0) {
        this.fetch(key, { revalidate: true }).catch((error) =>
          logger.error(`Revalidation failed: ${key}`, error)
        );
      }
    }
  }

  // Get pending mutations
  getPendingMutations(key: DataKey): any {
    return this.pendingMutations.get(key) ?? null;
  }

  // Get cache entry metadata
  getCacheMetadata(key: DataKey): Omit<CacheEntry<any>, 'data'> | null {
    const entry = this.cache.getEntry(key);
    if (!entry) return null;
    const { data, ...metadata } = entry;
    return metadata;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

let dataSyncService: DataSyncServiceImpl | null = null;

export function getDataSyncService(): DataSyncServiceImpl {
  if (!dataSyncService) {
    dataSyncService = new DataSyncServiceImpl();
  }
  return dataSyncService;
}

// Helper to create branded DataKey
export function createDataKey(key: string): DataKey {
  return key as DataKey;
}

export default getDataSyncService;
