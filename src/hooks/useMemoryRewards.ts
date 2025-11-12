'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getMemoryClient, type EarningsData } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('useMemoryRewards');

export interface MemoryRewardsState {
  active: boolean;
  loading: boolean;
  metrics: EarningsData | null;
}

/**
 * Minimal, centralized rewards fetcher.
 * - Respects `NEXT_PUBLIC_ENABLE_MEMORY_REWARDS_UI` feature flag
 * - Silent failures; no user-facing errors
 * - Single-source-of-truth for earnings metrics
 */
export function useMemoryRewards(
  walletAddress?: string,
  enabledOverride?: boolean
): MemoryRewardsState {
  const flagEnabled = (process.env.NEXT_PUBLIC_ENABLE_MEMORY_REWARDS_UI || 'false') === 'true';
  const enabled = enabledOverride ?? flagEnabled;
  const [metrics, setMetrics] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  const active = useMemo(() => Boolean(enabled && walletAddress), [enabled, walletAddress]);

  useEffect(() => {
    if (!active) return;
    if (!walletAddress) return;
    if (hasFetchedRef.current) return; // Avoid duplicate fetches within same mount

    let cancelled = false;
    const fetchRewards = async () => {
      try {
        setLoading(true);
        const client = getMemoryClient();
        if (!client) {
          logger.warn('Memory client unavailable; skipping rewards fetch');
          return;
        }
        const data = await client.getEarnings(walletAddress);
        if (!cancelled) {
          setMetrics(data);
          hasFetchedRef.current = true;
          logger.info('Rewards metrics fetched', { walletAddress, data });
        }
      } catch (error) {
        // Silent failure by design; keep UI minimal and non-blocking
        logger.warn('Failed to fetch rewards metrics', { error, walletAddress });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRewards();

    return () => {
      cancelled = true;
    };
  }, [active, walletAddress]);

  return { active, loading, metrics };
}
