/**
 * Network-aware degradation.
 *
 * The app already reads `navigator.connection.effectiveType` for logging but
 * never adapts to it. This module turns that signal into a small set of
 * capability decisions so constrained connections get a lighter experience:
 *
 * - `save-data` or `2g`/`slow-2g` → browser-only TTS (skip cloud round-trips),
 *   defer non-critical analytics, skip remote images where callers opt in.
 *
 * Fail-open: when the Network Information API is unavailable (Safari, older
 * browsers) everything reports the full experience. Nothing here may ever
 * block coaching.
 */

export type NetworkClass = 'constrained' | 'normal';

export interface NetworkCapabilities {
  /** Cloud TTS (ElevenLabs/Polly) is worth attempting. */
  allowCloudTts: boolean;
  /** Non-critical analytics may be sent immediately. */
  allowAnalytics: boolean;
  /** Remote (non-local) images should be deferred/skipped. */
  allowRemoteImages: boolean;
}

const CONSTRAINED_TYPES = new Set(['slow-2g', '2g']);

function readConnection(): { effectiveType?: string; saveData?: boolean } | null {
  if (typeof navigator === 'undefined') return null;
  const connection = (navigator as Navigator & { connection?: unknown }).connection;
  if (!connection || typeof connection !== 'object') return null;
  return connection as { effectiveType?: string; saveData?: boolean };
}

/** Classify the current connection. Fail-open to 'normal'. */
export function getNetworkClass(): NetworkClass {
  const connection = readConnection();
  if (!connection) return 'normal';
  if (connection.saveData === true) return 'constrained';
  if (connection.effectiveType && CONSTRAINED_TYPES.has(connection.effectiveType)) {
    return 'constrained';
  }
  return 'normal';
}

export function isConstrainedNetwork(): boolean {
  return getNetworkClass() === 'constrained';
}

/** Capability decisions for the current connection. */
export function getNetworkCapabilities(): NetworkCapabilities {
  const constrained = isConstrainedNetwork();
  return {
    allowCloudTts: !constrained,
    allowAnalytics: !constrained,
    allowRemoteImages: !constrained,
  };
}
