/**
 * Cache Manager for Coach Feedback
 *
 * Handles:
 * - TTL-based response caching (2-3 second window)
 * - Metrics similarity detection (avoid API calls for near-identical metrics)
 * - Per-session cost tracking
 * - Session cleanup
 */

import { CoachResponse } from '@/config/aiProviders';

export interface CachedFeedback {
  response: CoachResponse;
  timestamp: number;
  metricsHash: string;
}

interface SessionStats {
  totalCalls: number;
  cachedResponses: number;
  costUSD: number;
  successCount: number;
  failureCount: number;
}

interface SessionCache {
  feedbackCache: Map<string, CachedFeedback>;
  lastMetricsHash: string;
  stats: SessionStats;
  createdAt: number;
}

// In-memory cache (per-deployment instance)
const sessionCaches = new Map<string, SessionCache>();
const CACHE_TTL_MS = 2500; // 2.5 second cache window
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const METRICS_CHANGE_THRESHOLD = 0.15; // 15% change triggers new call

/**
 * Hash metrics for cache key
 */
export function hashMetrics(metrics: any): string {
  return JSON.stringify({
    trunk: Math.round(metrics.trunkLean * 10),
    knee: Math.round(metrics.kneeValgus * 10),
    depth: Math.round(metrics.depth * 100),
    stable: metrics.isStable,
    warnings: metrics.warnings?.length || 0,
  });
}

/**
 * Calculate similarity between two metric hashes (0-1, where 1 = identical)
 */
export function getMetricsSimilarity(hash1: string, hash2: string): number {
  if (hash1 === hash2) return 1;

  const obj1 = JSON.parse(hash1);
  const obj2 = JSON.parse(hash2);

  const changes = [];
  changes.push(Math.abs(obj1.trunk - obj2.trunk) / 300); // Max ~30deg
  changes.push(Math.abs(obj1.knee - obj2.knee) / 400); // Max ~40px
  changes.push(Math.abs(obj1.depth - obj2.depth) / 100); // 0-1 scale
  changes.push(obj1.stable === obj2.stable ? 0 : 1); // Binary
  changes.push(Math.abs(obj1.warnings - obj2.warnings) / 5); // Normalize

  const avgChange = changes.reduce((a, b) => a + b) / changes.length;
  return Math.max(0, 1 - avgChange);
}

/**
 * Get or create session cache
 */
function getSessionCache(sessionId: string): SessionCache {
  if (!sessionCaches.has(sessionId)) {
    sessionCaches.set(sessionId, {
      feedbackCache: new Map(),
      lastMetricsHash: '',
      stats: {
        totalCalls: 0,
        cachedResponses: 0,
        costUSD: 0,
        successCount: 0,
        failureCount: 0,
      },
      createdAt: Date.now(),
    });
  }

  const cache = sessionCaches.get(sessionId)!;

  // Clean up old sessions
  if (Date.now() - cache.createdAt > SESSION_TIMEOUT_MS) {
    sessionCaches.delete(sessionId);
    return getSessionCache(sessionId);
  }

  return cache;
}

/**
 * Check cache for recent feedback
 * Returns cached response if:
 * - Cache hit (same metrics hash, within TTL)
 * - Metrics are very similar (>85% match within TTL)
 */
export function getCachedFeedback(
  sessionId: string,
  metricsHash: string,
  includeNearMatch: boolean = true
): CachedFeedback | null {
  const cache = getSessionCache(sessionId);
  const now = Date.now();

  // Exact match check
  if (cache.feedbackCache.has(metricsHash)) {
    const cached = cache.feedbackCache.get(metricsHash)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached;
    }
  }

  // Near-match check (similar metrics within TTL)
  if (includeNearMatch && cache.lastMetricsHash) {
    const similarity = getMetricsSimilarity(metricsHash, cache.lastMetricsHash);
    if (similarity > 1 - METRICS_CHANGE_THRESHOLD) {
      const cached = cache.feedbackCache.get(cache.lastMetricsHash);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return cached;
      }
    }
  }

  return null;
}

/**
 * Store feedback in cache
 */
export function cacheFeedback(
  sessionId: string,
  metricsHash: string,
  response: CoachResponse
): void {
  const cache = getSessionCache(sessionId);
  cache.feedbackCache.set(metricsHash, {
    response,
    timestamp: Date.now(),
    metricsHash,
  });
  cache.lastMetricsHash = metricsHash;

  // Cleanup old entries (keep only last 20)
  if (cache.feedbackCache.size > 20) {
    const entries = Array.from(cache.feedbackCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < entries.length - 20; i++) {
      cache.feedbackCache.delete(entries[i][0]);
    }
  }
}

/**
 * Record API call cost
 */
export function recordCost(sessionId: string, costUSD: number, success: boolean): void {
  const cache = getSessionCache(sessionId);
  cache.stats.totalCalls++;
  cache.stats.costUSD += costUSD;
  if (success) {
    cache.stats.successCount++;
  } else {
    cache.stats.failureCount++;
  }
}

/**
 * Get session statistics
 */
export function getSessionStats(sessionId: string): SessionStats {
  const cache = getSessionCache(sessionId);
  return { ...cache.stats };
}

/**
 * Check if should skip API call (near-identical metrics within TTL)
 */
export function shouldSkipAPICall(
  sessionId: string,
  metricsHash: string
): { skip: boolean; reason?: string } {
  const cache = getSessionCache(sessionId);

  if (cache.lastMetricsHash) {
    const similarity = getMetricsSimilarity(metricsHash, cache.lastMetricsHash);
    const timeSinceLast =
      Date.now() - (cache.feedbackCache.get(cache.lastMetricsHash)?.timestamp || 0);

    if (similarity > 1 - METRICS_CHANGE_THRESHOLD && timeSinceLast < CACHE_TTL_MS) {
      return {
        skip: true,
        reason: `Metrics unchanged (${(similarity * 100).toFixed(0)}% match)`,
      };
    }
  }

  return { skip: false };
}

/**
 * Clear session cache (e.g., at end of workout)
 */
export function clearSessionCache(sessionId: string): SessionStats {
  const cache = getSessionCache(sessionId);
  const stats = cache.stats;
  sessionCaches.delete(sessionId);
  return stats;
}

/**
 * Get all active sessions (for monitoring)
 */
export function getActiveSessions(): Record<string, SessionStats> {
  const result: Record<string, SessionStats> = {};
  sessionCaches.forEach((cache, sessionId) => {
    result[sessionId] = cache.stats;
  });
  return result;
}
