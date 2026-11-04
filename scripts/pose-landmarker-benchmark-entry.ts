/**
 * PoseLandmarker benchmark — browser entry.
 *
 * Bundled by scripts/pose-landmarker-benchmark.mjs into a single ESM file and
 * executed inside a Playwright page. It exercises the REAL registry code path
 * (`resolvePoseConfig` + `createPoseDetector` from trackerRegistry) so the
 * numbers describe the same code the worker and main-thread loop run — not a
 * re-implementation.
 *
 * The page calls `window.__POSE_BENCH__.run(imageUrls)`; results are returned
 * as a JSON-serializable object.
 */

import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import { createPoseDetector, resolvePoseConfig } from '../src/lib/pose/trackerRegistry';
import type { PoseBackendId, PoseDetectorConfig, PoseTrackerId } from '../src/types/mediapipe';

interface BenchRowSpec {
  tracker: PoseTrackerId;
  backend: PoseBackendId;
  label: string;
}

/**
 * The comparison that matters: the protocol-reading default (thunder/webgl)
 * against the new tracker on both its delegates, with lightning and a CPU row
 * for context. 'wasm' is intentionally absent — the tfjs wasm backend fetches
 * binaries from a CDN, which this local-first benchmark does not do.
 */
const ROWS: BenchRowSpec[] = [
  { tracker: 'movenet-thunder', backend: 'webgl', label: 'movenet-thunder/webgl' },
  { tracker: 'movenet-lightning', backend: 'webgl', label: 'movenet-lightning/webgl' },
  { tracker: 'movenet-thunder', backend: 'cpu', label: 'movenet-thunder/cpu' },
  { tracker: 'poselandmarker-full', backend: 'webgl', label: 'poselandmarker-full/gpu-delegate' },
  { tracker: 'poselandmarker-full', backend: 'cpu', label: 'poselandmarker-full/cpu-delegate' },
];

const WARMUP = 3;
const LATENCY_ITERS = 15;
const STABILITY_REPEATS = 8;

/** COCO-17 names — the fair cross-family comparison subset. */
const COCO_17 = new Set([
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
]);

/** Arm chain + hips: the keypoints the reach/curl readings actually consume. */
const ARM_CHAIN = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
];

interface Kp {
  name?: string;
  x: number;
  y: number;
  score?: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1));
}

async function initBackend(backend: PoseBackendId): Promise<void> {
  await tf.setBackend(backend);
  await tf.ready();
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const blob = await (await fetch(url)).blob();
  return createImageBitmap(blob);
}

function firstPoseKeypoints(poses: Array<{ keypoints?: unknown }>): Kp[] {
  const pose = poses[0] as { keypoints?: Kp[] } | undefined;
  return (pose?.keypoints ?? []) as Kp[];
}

function avgScore(keypoints: Kp[], onlyCoco: boolean): number | null {
  const pool = onlyCoco ? keypoints.filter((k) => k.name && COCO_17.has(k.name)) : keypoints;
  const scored = pool.filter((k) => typeof k.score === 'number');
  if (scored.length === 0) return null;
  return scored.reduce((sum, k) => sum + (k.score ?? 0), 0) / scored.length;
}

export interface BenchImageResult {
  image: string;
  poseDetected: boolean;
  keypointCount: number;
  /** Mean score over the COCO-17 subset — comparable across families. */
  coco17Confidence: number | null;
  /** Mean score over every reported keypoint (33 vs 17 — not cross-comparable). */
  allKeypointConfidence: number | null;
}

async function run(): Promise<unknown> {
  const imageUrls: string[] = (window as any).__POSE_BENCH_IMAGES__;
  const bitmaps = await Promise.all(imageUrls.map(loadBitmap));

  const rows: unknown[] = [];

  for (const row of ROWS) {
    const config: PoseDetectorConfig = resolvePoseConfig({
      tracker: row.tracker,
      backend: row.backend,
    });

    // Mirror the worker: tfjs trackers need a tf backend; tasks-vision
    // trackers own their stack (backend selects the delegate inside the
    // adapter).
    const usesTf = row.tracker.startsWith('movenet') || row.tracker === 'blazepose';
    if (usesTf) await initBackend(row.backend);

    const initStart = performance.now();
    const detector = await createPoseDetector(config);
    const initMs = Math.round(performance.now() - initStart);
    const resolvedDelegate =
      'resolvedDelegate' in detector
        ? (detector as { resolvedDelegate: string }).resolvedDelegate
        : null;

    // Warmup — first inference includes graph compilation on both runtimes.
    for (let i = 0; i < WARMUP; i++) {
      await detector.estimatePoses(bitmaps[0] as never);
    }

    // Latency: cycle through the frames so no row sees a single easy image.
    const latencies: number[] = [];
    for (let i = 0; i < LATENCY_ITERS; i++) {
      const bmp = bitmaps[i % bitmaps.length];
      const t0 = performance.now();
      await detector.estimatePoses(bmp as never);
      latencies.push(performance.now() - t0);
    }

    // Confidence + detection rate per image.
    const perImage: BenchImageResult[] = [];
    for (let i = 0; i < bitmaps.length; i++) {
      const poses = await detector.estimatePoses(bitmaps[i] as never);
      const keypoints = firstPoseKeypoints(poses);
      const coco = avgScore(keypoints, true);
      perImage.push({
        image: imageUrls[i],
        poseDetected: keypoints.length > 0 && (coco ?? 0) > 0.1,
        keypointCount: keypoints.length,
        coco17Confidence: coco,
        allKeypointConfidence: avgScore(keypoints, false),
      });
    }

    // Stability: the same frame, repeatedly. Per-keypoint position jitter on
    // the arm chain — the number the reach reading cares about.
    const jitterSamples: Record<string, { xs: number[]; ys: number[] }> = {};
    for (const name of ARM_CHAIN) jitterSamples[name] = { xs: [], ys: [] };
    const stabilityBitmap = bitmaps[0];
    for (let i = 0; i < STABILITY_REPEATS; i++) {
      const poses = await detector.estimatePoses(stabilityBitmap as never);
      const keypoints = firstPoseKeypoints(poses);
      for (const name of ARM_CHAIN) {
        const kp = keypoints.find((k) => k.name === name);
        if (kp) {
          jitterSamples[name].xs.push(kp.x / stabilityBitmap.width);
          jitterSamples[name].ys.push(kp.y / stabilityBitmap.height);
        }
      }
    }
    const jitters: number[] = [];
    for (const name of ARM_CHAIN) {
      const { xs, ys } = jitterSamples[name];
      if (xs.length >= 2) jitters.push(Math.hypot(stddev(xs), stddev(ys)));
    }
    // Normalized jitter: fraction of frame dims. ×100 for readability.
    const meanJitterPct = jitters.length
      ? (jitters.reduce((a, b) => a + b, 0) / jitters.length) * 100
      : null;

    try {
      (detector as { dispose?: () => void }).dispose?.();
    } catch {
      // best-effort
    }

    rows.push({
      label: row.label,
      tracker: row.tracker,
      backend: row.backend,
      resolvedDelegate,
      initMs,
      medianMs: Math.round(median(latencies) * 100) / 100,
      p95Ms: Math.round(percentile(latencies, 95) * 100) / 100,
      minMs: Math.round(Math.min(...latencies) * 100) / 100,
      maxMs: Math.round(Math.max(...latencies) * 100) / 100,
      framesPerSecond: Math.round((1000 / median(latencies)) * 10) / 10,
      perImage,
      detectedFrames: perImage.filter((r) => r.poseDetected).length,
      meanCoco17Confidence:
        perImage.reduce((sum, r) => sum + (r.coco17Confidence ?? 0), 0) / perImage.length,
      meanArmChainJitterPct: meanJitterPct,
    });
  }

  return {
    capturedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    images: imageUrls,
    warmupIters: WARMUP,
    latencyIters: LATENCY_ITERS,
    stabilityRepeats: STABILITY_REPEATS,
    rows,
  };
}

(window as any).__POSE_BENCH__ = { run };
