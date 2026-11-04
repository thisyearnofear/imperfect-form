'use client';

/**
 * Prewarmed pose-detector cache — one module-level slot.
 *
 * A reading session's tracker build (WASM fileset + `.task` bundle for
 * tasks-vision) is the long pole between CTA press and 'ready'. The foyer
 * warms the pending session's resolved config on idle; the press reuses the
 * in-flight promise instead of starting cold.
 *
 * Ownership rules:
 * - `warmPoseDetector` caches a promise keyed by the resolved config JSON.
 * - `adoptWarmPoseDetector` transfers ownership to the caller (the session
 *   cleanup disposes it exactly like a cold build). The key MUST match — a
 *   warm build for config X is never adopted for config Y.
 * - `discardWarmPoseDetector` disposes a warm build no session can use
 *   (e.g. a session that routed to the worker, which builds its own
 *   detector inside the worker — a main-thread detector can't cross that
 *   boundary).
 *
 * Only main-thread sessions can adopt; warming is reserved for the
 * reading-session config (the tracker that can't run in a worker anyway).
 */

import { getDeviceInfo } from '@/utils/deviceDetection';
import type { PoseDetectorConfig } from '@/types/mediapipe';
import { createPoseDetector, resolvePoseConfig, type SessionPoseDetector } from './trackerRegistry';

type WarmPoseEntry = {
  key: string;
  promise: Promise<SessionPoseDetector>;
};

let warmEntry: WarmPoseEntry | null = null;

const keyFor = (config: PoseDetectorConfig): string => JSON.stringify(config);

/**
 * Build (or return the in-flight build for) `config` and keep it cached for
 * adoption. A second call with the same key returns the same promise; a call
 * with a different key disposes the stale build first. A rejected build is
 * evicted so the session's own attempt — or a later warm — starts fresh.
 */
export function warmPoseDetector(config: PoseDetectorConfig): Promise<SessionPoseDetector> {
  const key = keyFor(config);
  if (warmEntry?.key === key) return warmEntry.promise;
  discardWarmPoseDetector();
  const promise = createPoseDetector(config);
  promise.catch(() => {
    if (warmEntry?.promise === promise) warmEntry = null;
  });
  warmEntry = { key, promise };
  return promise;
}

/**
 * Take the cached build for `config`, or null when nothing matching exists.
 * Adoption clears the slot — the session's normal cleanup owns disposal from
 * here on, including the cancelled-before-resolve case.
 */
export function adoptWarmPoseDetector(
  config: PoseDetectorConfig
): Promise<SessionPoseDetector> | null {
  if (!warmEntry || warmEntry.key !== keyFor(config)) return null;
  const entry = warmEntry;
  warmEntry = null;
  return entry.promise;
}

/** Dispose whatever warm build is cached, if any. Safe to call unconditionally. */
export function discardWarmPoseDetector(): void {
  const entry = warmEntry;
  warmEntry = null;
  entry?.promise
    .then((detector) => {
      try {
        detector.dispose?.();
      } catch (e) {
        console.warn('Error disposing unadopted warm detector:', e);
      }
    })
    .catch(() => {});
}

/**
 * The isMobileDevice check the session effect runs (usePoseDetection),
 * reproduced so a warm build resolves — and therefore keys — to the same
 * config the session will ask for. The hook's `isMobile` prop is only ever
 * OR'd in, so passing the same hint keeps the key identical.
 */
function sessionIsMobile(isMobileHint: boolean): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return isMobileHint;
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    navigator.userAgent
  );
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileHint || uaMobile || (window.innerWidth < 768 && touch);
}

/** The exact config a reading session resolves in usePoseDetection. */
export function resolveReadingPoseConfig(isMobileHint = false): PoseDetectorConfig {
  return resolvePoseConfig(undefined, sessionIsMobile(isMobileHint), {
    forReading: true,
    performanceLevel: getDeviceInfo().performanceLevel,
  });
}

/**
 * Warm the pending reading session's detector. Best-effort: a failed warm
 * leaves the cache empty and the session builds cold, exactly as before.
 * Readings only — other sessions resolve to lightning, which is cheap and
 * (on production desktop) lives in the worker where a warm build can't go.
 */
export function warmReadingPoseDetector(isMobileHint = false): void {
  try {
    void warmPoseDetector(resolveReadingPoseConfig(isMobileHint));
  } catch {
    /* warm is best-effort — the session's own build is the fallback */
  }
}
