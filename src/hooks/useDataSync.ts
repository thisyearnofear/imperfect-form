/**
 * useDataSync Hook - React integration for DataSyncService
 *
 * Provides components with:
 * - Automatic data fetching with caching
 * - Real-time subscriptions with polling fallback
 * - Optimistic mutations with rollback
 * - Offline-first persistence
 * - Loading and error states
 */

'use client';

import { useEffect, useRef, useCallback, useState, useReducer } from 'react';
import {
  getDataSyncService,
  createDataKey,
  type DataKey,
  type DataSource,
  type SyncOptions,
  type MutationOptions,
  type SubscriptionOptions,
} from '@/services/DataSyncService';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('useDataSync');

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════

interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  isPending: boolean;
  lastUpdated: number | null;
}

type DataAction<T> =
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: T; timestamp: number }
  | { type: 'ERROR'; error: Error }
  | { type: 'STALE' }
  | { type: 'PENDING' }
  | { type: 'CLEAR' };

function createInitialState<T>(): DataState<T> {
  return {
    data: null,
    loading: true,
    error: null,
    isStale: false,
    isPending: false,
    lastUpdated: null,
  };
}

function dataReducer<T>(state: DataState<T>, action: DataAction<T>): DataState<T> {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'SUCCESS':
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
        isStale: false,
        lastUpdated: action.timestamp,
      };
    case 'ERROR':
      return { ...state, error: action.error, loading: false };
    case 'STALE':
      return { ...state, isStale: true };
    case 'PENDING':
      return { ...state, isPending: true };
    case 'CLEAR':
      return createInitialState<T>();
    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// useDataSync HOOK
// ═══════════════════════════════════════════════════════════════════════════

export interface UseDataSyncOptions<T> extends SyncOptions {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseDataSyncReturn<T> extends DataState<T> {
  refetch: () => Promise<void>;
  mutate: <R = any>(payload: any, options?: MutationOptions<any>) => Promise<R>;
  setData: (data: T) => void;
  invalidate: () => void;
}

export function useDataSync<T>(
  keyOrSource: string | DataKey | DataSource<T>,
  options: UseDataSyncOptions<T> = {}
): UseDataSyncReturn<T> {
  const serviceRef = useRef(getDataSyncService());
  const keyRef = useRef<DataKey>(
    typeof keyOrSource === 'string' ? createDataKey(keyOrSource) : (keyOrSource as DataKey)
  );
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isSourceRef = useRef<boolean>(typeof keyOrSource === 'object' && 'fetch' in keyOrSource);
  const [state, dispatch] = useReducer(dataReducer<T>, null, createInitialState<T>);

  const enabled = options.enabled !== false;

  // Register source if provided
  useEffect(() => {
    if (isSourceRef.current && typeof keyOrSource === 'object') {
      serviceRef.current.register(keyRef.current, keyOrSource as DataSource<T>);
      logger.debug('Data source registered', { key: keyRef.current });
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      dispatch({ type: 'LOADING' });
      const data = await serviceRef.current.fetch<T>(keyRef.current, options);
      dispatch({ type: 'SUCCESS', payload: data, timestamp: Date.now() });
      options.onSuccess?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      dispatch({ type: 'ERROR', error: err });
      options.onError?.(err);
      logger.error('Data fetch failed', { key: keyRef.current, error });
    }
  }, [enabled, options]);

  // Subscribe to data changes
  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'CLEAR' });
      return;
    }

    // Initial fetch
    fetchData();

    // Subscribe for real-time updates
    unsubscribeRef.current = serviceRef.current.subscribe<T>(
      keyRef.current,
      (data) => {
        dispatch({ type: 'SUCCESS', payload: data, timestamp: Date.now() });
        options.onSuccess?.(data);
      },
      options as SubscriptionOptions
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [enabled, fetchData, options]);

  // Mutation handler
  const mutate = useCallback(
    async <R = any>(payload: any, mutateOptions?: MutationOptions<any>): Promise<R> => {
      dispatch({ type: 'PENDING' });
      try {
        const result = await serviceRef.current.mutate<any, R>(
          keyRef.current,
          payload,
          mutateOptions
        );
        logger.info('Mutation successful', { key: keyRef.current });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({ type: 'ERROR', error: err });
        options.onError?.(err);
        throw err;
      }
    },
    [options]
  );

  // Manual refetch
  const refetch = useCallback(async () => {
    try {
      dispatch({ type: 'LOADING' });
      const data = await serviceRef.current.fetch<T>(keyRef.current, {
        revalidate: true,
        ...options,
      });
      dispatch({ type: 'SUCCESS', payload: data, timestamp: Date.now() });
      options.onSuccess?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      dispatch({ type: 'ERROR', error: err });
      options.onError?.(err);
    }
  }, [options]);

  // Manual data update
  const setData = useCallback((data: T) => {
    dispatch({ type: 'SUCCESS', payload: data, timestamp: Date.now() });
  }, []);

  // Invalidate cache
  const invalidate = useCallback(() => {
    serviceRef.current.invalidate(keyRef.current);
    refetch();
  }, [refetch]);

  return {
    ...state,
    refetch,
    mutate,
    setData,
    invalidate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * useQuery - Read-only data fetching with caching
 */
export function useQuery<T>(
  key: string | DataKey,
  fetcher: () => Promise<T>,
  options: UseDataSyncOptions<T> = {}
) {
  const source: DataSource<T> = {
    fetch: () => fetcher(),
  };
  return useDataSync(source, { ...options, ttl: options.ttl ?? 5 * 60 * 1000 });
}

/**
 * useMutation - Data mutation with optimistic updates
 */
export function useMutation<T, R = any>(
  key: string | DataKey,
  mutator: (payload: T) => Promise<R>,
  options: UseDataSyncOptions<R> = {}
) {
  const service = getDataSyncService();
  const keyRef = useRef<DataKey>(typeof key === 'string' ? createDataKey(key) : key);
  const [state, dispatch] = useReducer(dataReducer<R>, null, createInitialState<R>());

  // Register mutator source
  useEffect(() => {
    service.register(keyRef.current, {
      fetch: async () => {
        throw new Error('useMutation should not fetch');
      },
      mutate: mutator,
    });
  }, [mutator, service]);

  const mutate = useCallback(
    async (payload: T, mutOptions?: MutationOptions<T>) => {
      try {
        dispatch({ type: 'PENDING' });
        const result = await service.mutate<T, R>(keyRef.current, payload, {
          rollbackOnError: true,
          ...mutOptions,
        });
        dispatch({ type: 'SUCCESS', payload: result, timestamp: Date.now() });
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        dispatch({ type: 'ERROR', error: err });
        options.onError?.(err);
        throw err;
      }
    },
    [service, mutator, options]
  );

  return {
    ...state,
    mutate,
  };
}
