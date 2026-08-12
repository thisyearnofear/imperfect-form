'use client';

/**
 * Pose baseline measurement utility
 *
 * Records per-frame performance and quality metrics from the pose detection
 * pipeline. Designed to be started/stopped from the browser console or a
 * debug page. Keeps a rolling buffer to avoid unbounded memory growth.
 *
 * Usage:
 *   window.__IMF_BASELINE__.start();
 *   // ... run a workout ...
 *   window.__IMF_BASELINE__.stop();
 *   window.__IMF_BASELINE__.exportMarkdown();
 *   window.__IMF_BASELINE__.exportJson();
 */

import { getDeviceInfo } from '@/utils/deviceDetection';

export interface PoseBaselineFrame {
  /** Timestamp in ms */
  t: number;
  /** Time spent inside estimatePoses (ms) */
  detectionTimeMs: number;
  /** Time spent in image preprocessing before detection (ms) */
  preprocessTimeMs?: number;
  /** Total time between the start of this frame and the previous one (ms) */
  frameDeltaMs: number;
  /** Inferred FPS from the last rolling window */
  fps: number;
  /** Average keypoint score, 0–1, or null if no pose detected */
  keypointConfidence: number | null;
  /** Number of keypoints detected above the score threshold */
  keypointCount: number;
  /** JavaScript heap used (bytes) if available */
  memoryUsed?: number;
  /** JavaScript heap total (bytes) if available */
  memoryTotal?: number;
  /** Exercise mode at the time of the frame */
  mode: string;
  /** Whether the frame was processed on the worker or main thread */
  path: 'worker' | 'main';
  /** Number of newer/stale frames coalesced before this processed frame. */
  coalescedFrames?: number;
  /** Time from camera-frame capture to baseline recording (ms), when available. */
  pipelineLatencyMs?: number;
}

export type PoseBaselineMetadata = Record<string, string | number | boolean | null>;

export interface PoseBaselineReport {
  /** Unique run id */
  runId: string;
  /** When the baseline was started */
  startedAt: number;
  /** When the baseline was stopped */
  endedAt: number;
  /** Device / browser snapshot */
  device: ReturnType<typeof getDeviceInfo>;
  /** Configuration labels captured with the run for reproducibility. */
  metadata: PoseBaselineMetadata;
  /** Aggregated statistics */
  summary: {
    durationMs: number;
    frames: number;
    avgFps: number;
    medianFps: number;
    p95DetectionTimeMs: number;
    medianDetectionTimeMs: number;
    p95PreprocessTimeMs: number;
    medianPreprocessTimeMs: number;
    avgKeypointConfidence: number | null;
    poseDetectedFrames: number;
    memoryGrowthBytes: number | null;
    totalCoalescedFrames: number;
    estimatedCaptureFps: number;
    totalCaptureFailures: number;
    medianPipelineLatencyMs: number;
    p95PipelineLatencyMs: number;
  };
  /** Per-frame samples (may be downsampled) */
  frames: PoseBaselineFrame[];
}

interface PoseBaselineOptions {
  /** Max number of frames to keep in memory. Older frames are dropped. */
  maxFrames?: number;
  /** Rolling window size for FPS calculation. */
  fpsWindowSize?: number;
}

const DEFAULT_MAX_FRAMES = 4_000;
const DEFAULT_FPS_WINDOW_SIZE = 30;
const STORAGE_KEY = 'imf_poseBaseline_lastRun';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx] ?? 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

class PoseBaselineRecorder {
  private options: Required<PoseBaselineOptions>;
  private frames: PoseBaselineFrame[] = [];
  private lastFrameTime = 0;
  private isRunning = false;
  private runId = '';
  private startedAt = 0;
  private fpsWindow: number[] = [];
  private metadata: PoseBaselineMetadata = {};
  private captureFailures = 0;

  constructor(options: PoseBaselineOptions = {}) {
    this.options = {
      maxFrames: options.maxFrames ?? DEFAULT_MAX_FRAMES,
      fpsWindowSize: options.fpsWindowSize ?? DEFAULT_FPS_WINDOW_SIZE,
    };
  }

  /**
   * Start a new baseline run.
   */
  start(metadata: PoseBaselineMetadata = {}): void {
    this.frames = [];
    this.fpsWindow = [];
    this.lastFrameTime = 0;
    this.metadata = { ...metadata };
    this.captureFailures = 0;
    this.isRunning = true;
    this.runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // Use wall-clock time so the markdown report dates and durations are correct.
    this.startedAt = Date.now();
  }

  /**
   * Stop the current baseline run and return the report.
   */
  stop(): PoseBaselineReport | null {
    if (!this.isRunning) return null;
    this.isRunning = false;

    const report = this.buildReport();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    } catch {
      // localStorage may be unavailable or full; ignore.
    }
    return report;
  }

  /**
   * Record a single frame. Safe to call on every detection tick.
   */
  record(frame: Omit<PoseBaselineFrame, 't' | 'fps' | 'frameDeltaMs'>): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = this.lastFrameTime ? now - this.lastFrameTime : 0;
    this.lastFrameTime = now;

    this.fpsWindow.unshift(delta);
    if (this.fpsWindow.length > this.options.fpsWindowSize) {
      this.fpsWindow.pop();
    }

    const avgDelta = this.fpsWindow.reduce((a, b) => a + b, 0) / Math.max(1, this.fpsWindow.length);
    const fps = avgDelta > 0 ? Math.round(1000 / avgDelta) : 0;

    this.frames.push({
      ...frame,
      t: now,
      frameDeltaMs: delta,
      fps,
    });

    if (this.frames.length > this.options.maxFrames) {
      this.frames.shift();
    }
  }

  /** Record a camera-frame capture failure without fabricating a frame sample. */
  recordCaptureFailure(count = 1): void {
    if (!this.isRunning || !Number.isFinite(count) || count <= 0) return;
    this.captureFailures += Math.floor(count);
  }

  /**
   * Build a report from the current frames even while running.
   */
  buildReport(): PoseBaselineReport {
    const endedAt = Date.now();
    const durationMs = this.startedAt ? endedAt - this.startedAt : 0;
    const samples = this.frames;

    const detectionTimes = samples.map((f) => f.detectionTimeMs).sort((a, b) => a - b);
    const preprocessTimes = samples
      .map((f) => f.preprocessTimeMs ?? 0)
      .filter((t) => t > 0)
      .sort((a, b) => a - b);
    const fpsValues = samples.map((f) => f.fps);
    const pipelineLatencies = samples
      .map((f) => f.pipelineLatencyMs)
      .filter((latency): latency is number => latency !== undefined && latency >= 0)
      .sort((a, b) => a - b);
    const totalCoalescedFrames = samples.reduce(
      (total, frame) => total + Math.max(0, frame.coalescedFrames ?? 0),
      0
    );
    const confidences = samples
      .map((f) => f.keypointConfidence)
      .filter((c): c is number => c !== null && c !== undefined);
    const withPose = samples.filter((f) => f.keypointConfidence !== null).length;

    const firstMemory = samples[0]?.memoryUsed ?? null;
    const lastMemory = samples[samples.length - 1]?.memoryUsed ?? null;
    const memoryGrowthBytes =
      firstMemory !== null && lastMemory !== null ? lastMemory - firstMemory : null;

    return {
      runId: this.runId,
      startedAt: this.startedAt,
      endedAt,
      device: getDeviceInfo(),
      metadata: { ...this.metadata },
      summary: {
        durationMs,
        frames: samples.length,
        avgFps: samples.length
          ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / samples.length)
          : 0,
        medianFps: median(fpsValues),
        p95DetectionTimeMs: percentile(detectionTimes, 95),
        medianDetectionTimeMs: median(detectionTimes),
        p95PreprocessTimeMs: preprocessTimes.length > 0 ? percentile(preprocessTimes, 95) : 0,
        medianPreprocessTimeMs: preprocessTimes.length > 0 ? median(preprocessTimes) : 0,
        avgKeypointConfidence: confidences.length
          ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000) / 1000
          : null,
        poseDetectedFrames: withPose,
        memoryGrowthBytes,
        totalCoalescedFrames,
        estimatedCaptureFps:
          durationMs > 0
            ? Math.round(((samples.length + totalCoalescedFrames) / (durationMs / 1000)) * 100) /
              100
            : 0,
        totalCaptureFailures: this.captureFailures,
        medianPipelineLatencyMs: median(pipelineLatencies),
        p95PipelineLatencyMs: percentile(pipelineLatencies, 95),
      },
      frames: samples,
    };
  }

  /**
   * Load the last stored report from localStorage.
   */
  loadLastReport(): PoseBaselineReport | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PoseBaselineReport;
    } catch {
      return null;
    }
  }
}

let recorder: PoseBaselineRecorder | null = null;

function getRecorder(): PoseBaselineRecorder {
  if (!recorder) {
    recorder = new PoseBaselineRecorder();
  }
  return recorder;
}

/** Start recording a baseline run with optional model/backend labels. */
export function startPoseBaseline(metadata: PoseBaselineMetadata = {}): void {
  getRecorder().start(metadata);
  console.log('[poseBaseline] started run:', getRecorder().buildReport().runId);
}

/** Stop recording and return the report. */
export function stopPoseBaseline(): PoseBaselineReport | null {
  const report = getRecorder().stop();
  console.log('[poseBaseline] stopped. frames:', report?.summary.frames ?? 0);
  return report;
}

/** Record a frame (used by the pose pipeline). */
export function recordPoseBaselineFrame(
  frame: Omit<PoseBaselineFrame, 't' | 'fps' | 'frameDeltaMs'>
): void {
  getRecorder().record(frame);
}

/** Record a failed camera-frame capture for the active baseline run. */
export function recordPoseBaselineCaptureFailure(count = 1): void {
  getRecorder().recordCaptureFailure(count);
}

/** Export the last stored report as a markdown table. */
export function exportPoseBaselineMarkdown(): string {
  const report = getRecorder().loadLastReport();
  if (!report) {
    return '# Pose baseline\n\nNo baseline recorded yet. Run `window.__IMF_BASELINE__.start()` ... workout ... `window.__IMF_BASELINE__.stop()`.\n';
  }

  const { device, summary, startedAt, runId } = report;
  const date = new Date(startedAt).toISOString();

  return `# Pose Detection Baseline

- **Run ID:** \`${runId}\`
- **Date:** ${date}
- **Duration:** ${(summary.durationMs / 1000).toFixed(1)}s
- **Frames:** ${summary.frames}

## Device

| Property | Value |
|----------|-------|
| Platform | ${device.platform} |
| Browser | ${device.browser} |
| Performance level | ${device.performanceLevel} |
| Memory (GB) | ${device.deviceMemory ?? 'unknown'} |
| Cores | ${device.hardwareConcurrency} |
| WebGL | ${device.webglSupport ? 'yes' : 'no'} |
| WebGPU | ${device.webGPUSupport ? 'yes' : 'no'} |
| OffscreenCanvas | ${device.offscreenCanvasSupport ? 'yes' : 'no'} |
| Viewport | ${device.viewport.width}x${device.viewport.height} |

## Configuration

| Property | Value |
|----------|-------|
${
  Object.entries(report.metadata ?? {})
    .map(([key, value]) => {
      const safeKey = String(key).replace(/[|\\n]/g, ' ');
      const safeValue = String(value ?? 'unknown').replace(/[|\\n]/g, ' ');
      return `| ${safeKey} | ${safeValue} |`;
    })
    .join('\\n') || '| none | not supplied |'
}

## Summary

| Metric | Value |
|--------|-------|
| Avg FPS | ${summary.avgFps} |
| Median FPS | ${summary.medianFps} |
| Median detection time (ms) | ${summary.medianDetectionTimeMs.toFixed(2)} |
| p95 detection time (ms) | ${summary.p95DetectionTimeMs.toFixed(2)} |
| Median preprocess time (ms) | ${summary.medianPreprocessTimeMs.toFixed(2)} |
| p95 preprocess time (ms) | ${summary.p95PreprocessTimeMs.toFixed(2)} |
| Avg keypoint confidence | ${summary.avgKeypointConfidence ?? 'N/A'} |
| Pose detected frames | ${summary.poseDetectedFrames} / ${summary.frames} |
| Memory growth (bytes) | ${summary.memoryGrowthBytes ?? 'N/A'} |
| Total coalesced frames | ${summary.totalCoalescedFrames ?? 'N/A'} |
| Estimated capture FPS | ${summary.estimatedCaptureFps ?? 'N/A'} |
| Total capture failures | ${summary.totalCaptureFailures ?? 'N/A'} |
| Median pipeline latency (ms) | ${summary.medianPipelineLatencyMs ?? 'N/A'} |
| p95 pipeline latency (ms) | ${summary.p95PipelineLatencyMs ?? 'N/A'} |

## Notes

<!-- Add your own observations here: lighting, angle, occlusion, model config, etc. -->
`;
}

/** Export the last stored report as JSON for reproducible comparisons. */
export function exportPoseBaselineJson(): string {
  const report = getRecorder().loadLastReport();
  return report ? `${JSON.stringify(report, null, 2)}\n` : '{"error":"No baseline recorded yet"}\n';
}

/** Copy the markdown report to the clipboard. */
export async function copyPoseBaselineMarkdown(): Promise<void> {
  const markdown = exportPoseBaselineMarkdown();
  try {
    await navigator.clipboard.writeText(markdown);
    console.log('[poseBaseline] markdown copied to clipboard');
  } catch {
    console.log(exportPoseBaselineMarkdown());
  }
}

/** Global API exposed for console use. */
export interface PoseBaselineWindowApi {
  start: typeof startPoseBaseline;
  stop: typeof stopPoseBaseline;
  exportMarkdown: typeof exportPoseBaselineMarkdown;
  exportJson: typeof exportPoseBaselineJson;
  copyMarkdown: typeof copyPoseBaselineMarkdown;
  getReport: () => PoseBaselineReport | null;
}

/** Expose to window for manual console use (development only). */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__IMF_BASELINE__ = {
    start: startPoseBaseline,
    stop: stopPoseBaseline,
    exportMarkdown: exportPoseBaselineMarkdown,
    exportJson: exportPoseBaselineJson,
    copyMarkdown: copyPoseBaselineMarkdown,
    getReport: () => getRecorder().loadLastReport(),
  } as PoseBaselineWindowApi;
}
