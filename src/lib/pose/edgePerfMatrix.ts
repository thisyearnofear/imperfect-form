'use client';

/**
 * Edge Performance Matrix
 *
 * A/B benchmark of pose detection configurations across tracker, input size and
 * backend. Unlike the previous version, every ranked row here is a config that
 * was actually applied to the detector: the runner posts a `configure` message
 * to the pose worker and the row records the config the worker confirmed.
 *
 * Usage:
 *   const worker = getPoseWorkerHandle();
 *   window.__IMF_EDGE_MATRIX__.start({ exercise: 'curls' }, worker);
 *   // ... run workout ...
 *   const matrix = window.__IMF_EDGE_MATRIX__.stop();
 *   window.__IMF_EDGE_MATRIX__.exportMarkdown(matrix);
 *
 * A row that could not be applied is marked `applied: false` and excluded from
 * the ranking — reporting a composite score for a config the detector never ran
 * would be a fabricated A/B result.
 */

import { getDeviceInfo, type DeviceInfo } from '@/utils/deviceDetection';
import { startPoseBaseline, stopPoseBaseline, type PoseBaselineReport } from './poseBaseline';
import {
  DEFAULT_POSE_CONFIG,
  TRACKERS,
  isConfigSupported,
  resolvePoseConfig,
} from './trackerRegistry';
import type { PoseBackendId, PoseDetectorConfig, PoseTrackerId } from '@/types/mediapipe';

// ─── Configuration Types ───────────────────────────────────────────────────────

export interface EdgePerfConfig {
  tracker: PoseTrackerId;
  inputSize: number;
  backend: PoseBackendId;
}

export interface EdgePerfRun {
  config: EdgePerfConfig;
  /**
   * Whether the detector was actually rebuilt with this config. False means the
   * numbers below describe a different config and must not be ranked.
   */
  applied: boolean;
  /** The config the worker confirmed, when it reported back. */
  appliedConfig?: PoseDetectorConfig;
  report: PoseBaselineReport;
  timestamp: number;
  durationMs: number;
}

export interface EdgePerfMatrix {
  runs: EdgePerfRun[];
  device: DeviceInfo;
  startedAt: number;
  completedAt: number;
  matrixId: string;
}

export interface MatrixOptions {
  /** Exercise mode for the test (default: 'curls') */
  exercise?: string;
  /** Duration per configuration in seconds (default: 30) */
  durationPerConfig?: number;
  /** Target device description for metadata */
  target?: string;
  /** Camera setup description */
  camera?: string;
  /** Lighting conditions */
  lighting?: string;
}

// ─── Configuration Presets ──────────────────────────────────────────────────────

const TRACKER_IDS: PoseTrackerId[] = ['movenet-lightning', 'movenet-thunder', 'blazepose'];
const INPUT_SIZES = [192, 256, 640];
const BACKENDS: PoseBackendId[] = ['webgl', 'wasm', 'cpu', 'webgpu'];

/** Full detector config for a matrix cell. */
export function toDetectorConfig(config: EdgePerfConfig): PoseDetectorConfig {
  return resolvePoseConfig({
    ...DEFAULT_POSE_CONFIG,
    tracker: config.tracker,
    inputSize: config.inputSize,
    backend: config.backend,
  });
}

/**
 * Configs worth testing on this device. Filters out pairs the registry knows
 * cannot be constructed, so the matrix does not waste runs on impossible rows.
 */
export function getMatrixConfigurations(
  device: DeviceInfo,
  _options: MatrixOptions = {}
): EdgePerfConfig[] {
  const configs: EdgePerfConfig[] = [];

  for (const tracker of TRACKER_IDS) {
    for (const inputSize of INPUT_SIZES) {
      for (const backend of BACKENDS) {
        const config = { tracker, inputSize, backend };
        if (!isConfigSupported(toDetectorConfig(config), device)) continue;
        configs.push(config);
      }
    }
  }

  return configs;
}

export function getConfigLabel(config: EdgePerfConfig): string {
  return `${TRACKERS[config.tracker].label} / ${config.inputSize}px / ${config.backend}`;
}

// ─── Matrix Runner ──────────────────────────────────────────────────────────────

/** Handle to the live pose worker, so the runner can hot-swap the detector. */
export interface PoseWorkerHandle {
  post(message: unknown): void;
}

class EdgePerfMatrixRunner {
  private matrix: EdgePerfMatrix | null = null;
  private currentRunIndex = 0;
  private configs: EdgePerfConfig[] = [];
  private options: MatrixOptions = {};
  private isRunning = false;
  private runStartTime = 0;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private worker: PoseWorkerHandle | null = null;
  /** Config the worker confirmed for the row currently being measured. */
  private confirmedConfig: PoseDetectorConfig | null = null;

  /**
   * Start a matrix run.
   *
   * @param worker the live pose worker. Required — without it no config can be
   *   applied and the whole matrix degrades to a labelled stability baseline.
   */
  start(options: MatrixOptions = {}, worker?: PoseWorkerHandle | null): void {
    if (this.isRunning) {
      console.warn('[edgePerfMatrix] Matrix run already in progress');
      return;
    }

    if (!worker) {
      console.warn(
        '[edgePerfMatrix] No pose worker supplied — configs cannot be applied. ' +
          'Runs will be recorded as unapplied and excluded from the ranking.'
      );
    }
    this.worker = worker ?? null;

    const device = getDeviceInfo();
    this.configs = getMatrixConfigurations(device, options);
    this.options = options;
    this.currentRunIndex = 0;

    this.matrix = {
      runs: [],
      device,
      startedAt: Date.now(),
      completedAt: 0,
      matrixId: `matrix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    this.isRunning = true;
    console.log(`[edgePerfMatrix] Started matrix ${this.matrix.matrixId}`);
    console.log(`[edgePerfMatrix] ${this.configs.length} configurations to test`);
    this.startNextConfig();
  }

  /** Report the config the worker actually applied, called from the worker hook. */
  confirmApplied(appliedConfig: PoseDetectorConfig): void {
    this.confirmedConfig = appliedConfig;
  }

  /** Stop the current matrix run and return results. */
  stop(): EdgePerfMatrix | null {
    if (!this.isRunning || !this.matrix) {
      console.warn('[edgePerfMatrix] No matrix run in progress');
      return null;
    }

    this.recordCurrentRun();

    this.isRunning = false;
    this.matrix.completedAt = Date.now();
    console.log(`[edgePerfMatrix] Completed matrix with ${this.matrix.runs.length} runs`);

    return this.matrix;
  }

  /** Skip to the next configuration. */
  skip(): void {
    if (!this.isRunning) return;
    this.recordCurrentRun();
    this.currentRunIndex++;
    this.startNextConfig();
  }

  private recordCurrentRun(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }

    const config = this.configs[this.currentRunIndex];
    if (!config || !this.matrix) return;

    const currentReport = stopPoseBaseline();
    if (!currentReport) {
      console.warn('[edgePerfMatrix] No baseline report to record');
      return;
    }

    const expected = toDetectorConfig(config);
    const confirmed = this.confirmedConfig;
    const applied =
      !!this.worker &&
      !!confirmed &&
      confirmed.tracker === expected.tracker &&
      confirmed.backend === expected.backend &&
      confirmed.inputSize === expected.inputSize;

    this.matrix.runs.push({
      config,
      applied,
      appliedConfig: confirmed ?? undefined,
      report: currentReport,
      timestamp: Date.now(),
      durationMs: Date.now() - this.runStartTime,
    });

    this.confirmedConfig = null;
  }

  private startNextConfig(): void {
    if (!this.matrix) return;

    if (this.currentRunIndex >= this.configs.length) {
      console.log('[edgePerfMatrix] All configurations completed');
      this.isRunning = false;
      this.matrix.completedAt = Date.now();
      return;
    }

    const config = this.configs[this.currentRunIndex];
    this.runStartTime = Date.now();
    this.confirmedConfig = null;

    console.log(
      `[edgePerfMatrix] Starting config ${this.currentRunIndex + 1}/${this.configs.length}: ${getConfigLabel(config)}`
    );

    // Actually apply the config before measuring.
    if (this.worker) {
      this.worker.post({ type: 'configure', config: toDetectorConfig(config) });
    }

    startPoseBaseline({
      matrixId: this.matrix.matrixId,
      configIndex: this.currentRunIndex,
      tracker: config.tracker,
      inputSize: String(config.inputSize),
      backend: config.backend,
      exercise: this.options.exercise ?? 'curls',
      target: this.options.target ?? 'unknown',
      camera: this.options.camera ?? 'unknown',
      lighting: this.options.lighting ?? 'unknown',
      isMatrixRun: true,
    });

    const durationMs = (this.options.durationPerConfig ?? 30) * 1000;
    if (this.autoAdvanceTimer) clearTimeout(this.autoAdvanceTimer);
    this.autoAdvanceTimer = setTimeout(() => {
      if (this.isRunning && this.currentRunIndex < this.configs.length) {
        this.currentRunIndex++;
        this.startNextConfig();
      }
    }, durationMs);
  }

  getProgress(): { current: number; total: number; currentConfig: EdgePerfConfig | null } {
    return {
      current: this.currentRunIndex + 1,
      total: this.configs.length,
      currentConfig: this.configs[this.currentRunIndex] ?? null,
    };
  }

  getMatrix(): EdgePerfMatrix | null {
    return this.matrix;
  }
}

// ─── Matrix Analysis ────────────────────────────────────────────────────────────

export interface MatrixRanking {
  config: EdgePerfConfig;
  compositeScore: number;
  fps: number;
  confidence: number;
  detectionTimeMs: number;
  memoryGrowth: number;
  poseDetectionRate: number;
}

export interface MatrixAnalysis {
  error?: string;
  bestConfig: EdgePerfConfig | null;
  rankings: MatrixRanking[];
  /** Rows dropped from the ranking because the config was never applied. */
  unapplied: number;
  summary?: {
    totalRuns: number;
    validRuns: number;
    avgFps: number;
    avgConfidence: number;
  };
}

/**
 * Analyze a completed matrix.
 *
 * Only runs whose config was confirmed applied are ranked. If nothing was
 * applied, the result is an explicit error rather than a ranking of labels.
 */
export function analyzeMatrix(matrix: EdgePerfMatrix): MatrixAnalysis {
  const runs = matrix.runs;
  if (runs.length === 0) {
    return { error: 'No runs completed', bestConfig: null, rankings: [], unapplied: 0 };
  }

  const applied = runs.filter((run) => run.applied);
  const unapplied = runs.length - applied.length;

  if (unapplied > 0) {
    console.warn(
      `[edgePerfMatrix] ${unapplied}/${runs.length} rows were not applied to the detector ` +
        'and are excluded from the ranking.'
    );
  }

  if (applied.length === 0) {
    return {
      error:
        'No run had its config applied to the detector — this is a stability baseline, not an A/B result.',
      bestConfig: null,
      rankings: [],
      unapplied,
    };
  }

  const scoredRuns: MatrixRanking[] = applied
    .filter((run) => run.report.summary.frames > 10)
    .map((run) => {
      const { summary } = run.report;
      const fpsScore = summary.medianFps;
      const confidenceScore = (summary.avgKeypointConfidence ?? 0) * 100;
      const latencyPenalty = Math.max(1, summary.medianDetectionTimeMs);

      return {
        config: run.config,
        compositeScore: (fpsScore * confidenceScore) / latencyPenalty,
        fps: summary.medianFps,
        confidence: summary.avgKeypointConfidence ?? 0,
        detectionTimeMs: summary.medianDetectionTimeMs,
        memoryGrowth: summary.memoryGrowthBytes ?? 0,
        poseDetectionRate: summary.frames > 0 ? summary.poseDetectedFrames / summary.frames : 0,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    bestConfig: scoredRuns[0]?.config ?? null,
    rankings: scoredRuns,
    unapplied,
    summary: {
      totalRuns: runs.length,
      validRuns: scoredRuns.length,
      avgFps: scoredRuns.reduce((sum, r) => sum + r.fps, 0) / Math.max(1, scoredRuns.length),
      avgConfidence:
        scoredRuns.reduce((sum, r) => sum + r.confidence, 0) / Math.max(1, scoredRuns.length),
    },
  };
}

// ─── Export Utilities ───────────────────────────────────────────────────────────

export function exportMatrixMarkdown(matrix: EdgePerfMatrix): string {
  const analysis = analyzeMatrix(matrix);
  const { device } = matrix;

  const lines = [
    '# Edge Performance Matrix',
    '',
    `- **Matrix ID:** \`${matrix.matrixId}\``,
    `- **Device:** ${device.platform} / ${device.browser}`,
    `- **Performance Level:** ${device.performanceLevel}`,
    `- **Duration:** ${((matrix.completedAt - matrix.startedAt) / 1000).toFixed(1)}s`,
    `- **Runs:** ${matrix.runs.length}`,
    `- **Applied configs:** ${matrix.runs.length - analysis.unapplied}`,
    `- **Unapplied (excluded):** ${analysis.unapplied}`,
    '',
  ];

  if (analysis.error) {
    lines.push(`> **${analysis.error}**`, '');
  }

  lines.push(
    '## Results',
    '',
    '| Rank | Tracker | Input | Backend | FPS | Confidence | Detection (ms) | Score |',
    '| ---: | --- | ---: | --- | ---: | ---: | ---: | ---: |'
  );

  analysis.rankings.forEach((rank, i) => {
    lines.push(
      `| ${i + 1} | ${TRACKERS[rank.config.tracker].label} | ${rank.config.inputSize} | ${rank.config.backend} | ${rank.fps.toFixed(1)} | ${(rank.confidence * 100).toFixed(1)}% | ${rank.detectionTimeMs.toFixed(1)} | ${rank.compositeScore.toFixed(2)} |`
    );
  });

  lines.push('');

  // List every unapplied row so it is visible rather than silently dropped.
  const unappliedRuns = matrix.runs.filter((run) => !run.applied);
  if (unappliedRuns.length > 0) {
    lines.push('## Excluded rows', '', 'These configs were not applied to the detector:', '');
    for (const run of unappliedRuns) {
      lines.push(`- ${getConfigLabel(run.config)}`);
    }
    lines.push('');
  }

  if (analysis.bestConfig) {
    lines.push(
      '## Recommendation',
      '',
      `**Best configuration:** ${getConfigLabel(analysis.bestConfig)}`,
      '',
      'This is measured, not generated. To adopt it, change `DEFAULT_POSE_CONFIG` in',
      '`src/lib/pose/trackerRegistry.ts`.',
      ''
    );
  }

  lines.push(
    '## Caveats',
    '',
    "- BlazePose reports 33 landmarks against MoveNet's 17, so keypoint confidence is",
    '  not directly comparable between tracker families. The composite score weights',
    '  confidence heavily; compare within a family before comparing across.',
    '- Jitter and absence-detection behaviour have not been measured across these',
    '  trackers. Do not carry a keypoint-confidence threshold from one family to',
    '  another without measuring it.',
    ''
  );

  return lines.join('\n');
}

export function exportMatrixJson(matrix: EdgePerfMatrix): string {
  return JSON.stringify({ matrix, analysis: analyzeMatrix(matrix) }, null, 2);
}

// ─── Global API ─────────────────────────────────────────────────────────────────

const runner = new EdgePerfMatrixRunner();

/**
 * Expose to window for console use. Available in development, or in a build when
 * NEXT_PUBLIC_POSE_BENCH=1, so a matrix can be captured from a built app.
 */
if (
  typeof window !== 'undefined' &&
  (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_POSE_BENCH === '1')
) {
  (window as any).__IMF_EDGE_MATRIX__ = {
    start: (options?: MatrixOptions, worker?: PoseWorkerHandle | null) =>
      runner.start(options, worker),
    confirmApplied: (config: PoseDetectorConfig) => runner.confirmApplied(config),
    stop: () => runner.stop(),
    skip: () => runner.skip(),
    getProgress: () => runner.getProgress(),
    getMatrix: () => runner.getMatrix(),
    exportMarkdown: (matrix: EdgePerfMatrix) => exportMatrixMarkdown(matrix),
    exportJson: (matrix: EdgePerfMatrix) => exportMatrixJson(matrix),
    analyzeMatrix,
    getConfigurations: getMatrixConfigurations,
  };
}
