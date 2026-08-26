'use client';

/**
 * Edge Performance A/B Matrix
 *
 * Systematic testing of pose detection configurations across:
 * - Input size: 192×192, 256×256, 640×480 (current)
 * - Model variant: MoveNet Lightning, Thunder, BlazePose lite
 * - Backend: WebGL, WASM, CPU
 * - Quantization: FP32 (baseline), INT8 (if supported)
 *
 * Usage:
 *   window.__IMF_EDGE_MATRIX__.start({ exercise: 'curls' });
 *   // ... run workout ...
 *   window.__IMF_EDGE_MATRIX__.stop();
 *   window.__IMF_EDGE_MATRIX__.exportMatrix();
 */

import { getDeviceInfo, type DeviceInfo } from '@/utils/deviceDetection';
import { startPoseBaseline, stopPoseBaseline, type PoseBaselineReport } from './poseBaseline';

// ─── Configuration Types ───────────────────────────────────────────────────────

export type InputSize = '192x192' | '256x256' | '640x480';
export type ModelVariant = 'SinglePose.Lightning' | 'SinglePose.Thunder' | 'BlazePose-lite';
export type Backend = 'webgl' | 'wasm' | 'cpu' | 'webgpu';
export type Quantization = 'fp32' | 'int8';

export interface EdgePerfConfig {
  inputSize: InputSize;
  model: ModelVariant;
  backend: Backend;
  quantization: Quantization;
}

export interface EdgePerfRun {
  config: EdgePerfConfig;
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
  /** Number of repetitions per configuration (default: 3) */
  repetitions?: number;
  /** Target device description for metadata */
  target?: string;
  /** Camera setup description */
  camera?: string;
  /** Lighting conditions */
  lighting?: string;
}

// ─── Configuration Presets ──────────────────────────────────────────────────────

const INPUT_SIZES: InputSize[] = ['192x192', '256x256', '640x480'];
const MODEL_VARIANTS: ModelVariant[] = [
  'SinglePose.Lightning',
  'SinglePose.Thunder',
  'BlazePose-lite',
];
const BACKENDS: Backend[] = ['webgl', 'wasm', 'cpu'];
const QUANTIZATIONS: Quantization[] = ['fp32', 'int8'];

/**
 * Get all valid configurations for the matrix.
 * Filters out invalid combinations (e.g., BlazePose on WASM).
 */
export function getMatrixConfigurations(
  device: DeviceInfo,
  options: MatrixOptions = {}
): EdgePerfConfig[] {
  const configs: EdgePerfConfig[] = [];

  for (const inputSize of INPUT_SIZES) {
    for (const model of MODEL_VARIANTS) {
      for (const backend of BACKENDS) {
        for (const quantization of QUANTIZATIONS) {
          // Skip invalid combinations
          if (!isValidCombination(model, backend, quantization, device)) {
            continue;
          }
          configs.push({ inputSize, model, backend, quantization });
        }
      }
    }
  }

  return configs;
}

/**
 * Validate that a configuration combination is feasible on the device.
 */
function isValidCombination(
  model: ModelVariant,
  backend: Backend,
  quantization: Quantization,
  device: DeviceInfo
): boolean {
  // INT8 quantization requires WebGL2 or WebGPU
  if (quantization === 'int8') {
    if (!device.webgl2Support && !device.webGPUSupport) {
      return false;
    }
  }

  // BlazePose-lite doesn't support WASM backend well
  if (model === 'BlazePose-lite' && backend === 'wasm') {
    return false;
  }

  // CPU backend is always valid but slow
  // WebGL requires WebGL support
  if (backend === 'webgl' && !device.webglSupport) {
    return false;
  }

  // WebGPU requires WebGPU support
  if (backend === 'webgpu' && !device.webGPUSupport) {
    return false;
  }

  // INT8 on WebGL requires WebGL2
  if (quantization === 'int8' && backend === 'webgl' && !device.webgl2Support) {
    return false;
  }

  // WASM requires WASM support (generally available in modern browsers)
  // We'll skip explicit validation here

  return true;
}

/**
 * Get a human-readable label for a configuration.
 */
export function getConfigLabel(config: EdgePerfConfig): string {
  return `${config.model} / ${config.inputSize} / ${config.backend} / ${config.quantization}`;
}

/**
 * Get a short key for a configuration (for matrix headers).
 */
export function getConfigKey(config: EdgePerfConfig): string {
  const modelShort =
    config.model === 'SinglePose.Lightning'
      ? 'Ltn'
      : config.model === 'SinglePose.Thunder'
        ? 'Thn'
        : 'BP';
  const inputShort = config.inputSize.replace('x', '×');
  const backendShort = config.backend.toUpperCase();
  const quantShort = config.quantization.toUpperCase();
  return `${modelShort} / ${inputShort} / ${backendShort} / ${quantShort}`;
}

// ─── Matrix Runner ──────────────────────────────────────────────────────────────

class EdgePerfMatrixRunner {
  private matrix: EdgePerfMatrix | null = null;
  private currentRunIndex = 0;
  private configs: EdgePerfConfig[] = [];
  private options: MatrixOptions = {};
  private isRunning = false;
  private runStartTime = 0;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Start a matrix run with the given configurations.
   */
  start(options: MatrixOptions = {}): void {
    if (this.isRunning) {
      console.warn('[edgePerfMatrix] Matrix run already in progress');
      return;
    }

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
    // KNOWN LIMITATION: the pose pipeline currently hard-codes
    // SinglePose.Lightning (see poseWorker.ts / usePoseDetection.ts) and this
    // runner only *labels* each baseline run with config metadata — it does not
    // hot-swap the detector model, input size, backend, or quantization. Until
    // config application is wired into the detector, every row measures the same
    // live configuration and the composite-score ranking is NOT a real A/B
    // result. Treat runs as a single-config stability baseline, not a matrix.
    console.warn(
      '[edgePerfMatrix] Config hot-swap is not implemented yet — all rows will ' +
        'measure the live SinglePose.Lightning config under different labels. ' +
        'See docs/EDGE_PERF_MATRIX.md → "Current limitations".'
    );

    // Start the first configuration
    this.startNextConfig();
  }

  /**
   * Stop the current matrix run and return results.
   */
  stop(): EdgePerfMatrix | null {
    if (!this.isRunning || !this.matrix) {
      console.warn('[edgePerfMatrix] No matrix run in progress');
      return null;
    }

    // Clear auto-advance timer
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }

    // Stop the current baseline
    const currentReport = stopPoseBaseline();
    if (currentReport && this.configs[this.currentRunIndex]) {
      this.matrix.runs.push({
        config: this.configs[this.currentRunIndex],
        report: currentReport,
        timestamp: Date.now(),
        durationMs: Date.now() - this.runStartTime,
      });
    } else if (!currentReport) {
      console.warn('[edgePerfMatrix] No baseline report to record for final config');
    }

    this.isRunning = false;
    this.matrix.completedAt = Date.now();

    console.log(`[edgePerfMatrix] Completed matrix with ${this.matrix.runs.length} runs`);

    return this.matrix;
  }

  /**
   * Skip to the next configuration.
   */
  skip(): void {
    if (!this.isRunning) return;

    // Stop current baseline
    const currentReport = stopPoseBaseline();
    if (currentReport && this.configs[this.currentRunIndex]) {
      this.matrix?.runs.push({
        config: this.configs[this.currentRunIndex],
        report: currentReport,
        timestamp: Date.now(),
        durationMs: Date.now() - this.runStartTime,
      });
    } else if (!currentReport) {
      console.warn('[edgePerfMatrix] No baseline report to record for current config');
    }

    this.currentRunIndex++;
    this.startNextConfig();
  }

  /**
   * Start the next configuration in the matrix.
   */
  private startNextConfig(): void {
    if (!this.matrix || this.currentRunIndex >= this.configs.length) {
      console.log('[edgePerfMatrix] All configurations completed');
      this.isRunning = false;
      this.matrix!.completedAt = Date.now();
      return;
    }

    const config = this.configs[this.currentRunIndex];
    this.runStartTime = Date.now();

    console.log(
      `[edgePerfMatrix] Starting config ${this.currentRunIndex + 1}/${this.configs.length}: ${getConfigLabel(config)}`
    );

    // Start baseline with config metadata
    startPoseBaseline({
      matrixId: this.matrix!.matrixId,
      configIndex: this.currentRunIndex,
      inputSize: config.inputSize,
      model: config.model,
      backend: config.backend,
      quantization: config.quantization,
      exercise: this.options.exercise ?? 'curls',
      target: this.options.target ?? 'unknown',
      camera: this.options.camera ?? 'unknown',
      lighting: this.options.lighting ?? 'unknown',
      isMatrixRun: true,
    });

    // Auto-advance after duration
    const durationMs = (this.options.durationPerConfig ?? 30) * 1000;
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }
    this.autoAdvanceTimer = setTimeout(() => {
      if (this.isRunning && this.currentRunIndex < this.configs.length) {
        this.currentRunIndex++;
        this.startNextConfig();
      }
    }, durationMs);
  }

  /**
   * Get current progress.
   */
  getProgress(): { current: number; total: number; currentConfig: EdgePerfConfig | null } {
    return {
      current: this.currentRunIndex + 1,
      total: this.configs.length,
      currentConfig: this.configs[this.currentRunIndex] ?? null,
    };
  }

  /**
   * Get the current matrix state.
   */
  getMatrix(): EdgePerfMatrix | null {
    return this.matrix;
  }
}

// ─── Matrix Analysis ────────────────────────────────────────────────────────────

/**
 * Analyze a completed matrix to find the best configuration.
 */
export function analyzeMatrix(matrix: EdgePerfMatrix): MatrixAnalysis {
  const runs = matrix.runs;

  if (runs.length === 0) {
    return { error: 'No runs completed', bestConfig: null, rankings: [] };
  }

  // Calculate a composite score for each run
  const scoredRuns = runs
    .filter((run) => run.report.summary.frames > 10) // Need minimum frames
    .map((run) => {
      const { summary } = run.report;

      // Composite score: FPS × confidence / detection_time
      // Higher is better
      const fpsScore = summary.medianFps;
      const confidenceScore = (summary.avgKeypointConfidence ?? 0) * 100;
      const latencyPenalty = Math.max(1, summary.medianDetectionTimeMs);

      const compositeScore = (fpsScore * confidenceScore) / latencyPenalty;

      return {
        config: run.config,
        compositeScore,
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
    summary: {
      totalRuns: runs.length,
      validRuns: scoredRuns.length,
      avgFps: scoredRuns.reduce((sum, r) => sum + r.fps, 0) / Math.max(1, scoredRuns.length),
      avgConfidence:
        scoredRuns.reduce((sum, r) => sum + r.confidence, 0) / Math.max(1, scoredRuns.length),
    },
  };
}

export interface MatrixAnalysis {
  error?: string;
  bestConfig: EdgePerfConfig | null;
  rankings: Array<{
    config: EdgePerfConfig;
    compositeScore: number;
    fps: number;
    confidence: number;
    detectionTimeMs: number;
    memoryGrowth: number;
    poseDetectionRate: number;
  }>;
  summary?: {
    totalRuns: number;
    validRuns: number;
    avgFps: number;
    avgConfidence: number;
  };
}

// ─── Export Utilities ───────────────────────────────────────────────────────────

/**
 * Export matrix results as markdown table.
 */
export function exportMatrixMarkdown(matrix: EdgePerfMatrix): string {
  const analysis = analyzeMatrix(matrix);
  const { device } = matrix;

  const lines = [
    '# Edge Performance Matrix',
    '',
    `- **Matrix ID:** \`${matrix.matrixId}\``,
    `- **Device:** ${device.platform} / ${device.browser}`,
    `- **Performance Level:** ${device.performanceLevel}`,
    `- **Memory:** ${device.deviceMemory ?? 'unknown'} GB`,
    `- **Cores:** ${device.hardwareConcurrency}`,
    `- **WebGL:** ${device.webglSupport ? 'yes' : 'no'} (WebGL2: ${device.webgl2Support ? 'yes' : 'no'})`,
    `- **WebGPU:** ${device.webGPUSupport ? 'yes' : 'no'}`,
    `- **Duration:** ${((matrix.completedAt - matrix.startedAt) / 1000).toFixed(1)}s`,
    `- **Runs:** ${matrix.runs.length}`,
    '',
    '## Results',
    '',
    '| Rank | Model | Input | Backend | Quant | FPS | Confidence | Detection (ms) | Composite Score |',
    '| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: |',
  ];

  analysis.rankings.forEach((rank, i) => {
    lines.push(
      `| ${i + 1} | ${rank.config.model} | ${rank.config.inputSize} | ${rank.config.backend} | ${rank.config.quantization} | ${rank.fps.toFixed(1)} | ${(rank.confidence * 100).toFixed(1)}% | ${rank.detectionTimeMs.toFixed(1)} | ${rank.compositeScore.toFixed(2)} |`
    );
  });

  lines.push('');

  if (analysis.bestConfig) {
    lines.push('## Recommendation');
    lines.push('');
    lines.push(`**Best configuration:** ${getConfigLabel(analysis.bestConfig)}`);
    lines.push('');
    lines.push('### Implementation');
    lines.push('');
    lines.push('```typescript');
    lines.push('// src/services/PoseDetectionService.ts');
    lines.push('static getDetectorConfig(isMobile: boolean) {');
    lines.push(`  return {`);
    lines.push(`    modelType: '${analysis.bestConfig.model}',`);
    lines.push(`    // Input size: ${analysis.bestConfig.inputSize}`);
    lines.push(`    // Backend: ${analysis.bestConfig.backend}`);
    lines.push(`    // Quantization: ${analysis.bestConfig.quantization}`);
    lines.push('    enableSmoothing: false,');
    lines.push('    minPoseScore: isMobile ? 0.2 : 0.25,');
    lines.push('    multiPoseMaxDimension: isMobile ? undefined : 512,');
    lines.push('    enableTracking: false,');
    lines.push('  };');
    lines.push('}');
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export matrix results as JSON.
 */
export function exportMatrixJson(matrix: EdgePerfMatrix): string {
  const analysis = analyzeMatrix(matrix);
  return JSON.stringify({ matrix, analysis }, null, 2);
}

// ─── Global API ─────────────────────────────────────────────────────────────────

const runner = new EdgePerfMatrixRunner();

export interface EdgePerfWindowApi {
  start: typeof runner.start;
  stop: typeof runner.stop;
  skip: typeof runner.skip;
  getProgress: typeof runner.getProgress;
  getMatrix: typeof runner.getMatrix;
  exportMarkdown: (matrix: EdgePerfMatrix) => string;
  exportJson: (matrix: EdgePerfMatrix) => string;
  analyzeMatrix: typeof analyzeMatrix;
  getConfigurations: typeof getMatrixConfigurations;
}

/**
 * Expose to window for console use (development only).
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__IMF_EDGE_MATRIX__ = {
    start: (options?: MatrixOptions) => runner.start(options),
    stop: () => runner.stop(),
    skip: () => runner.skip(),
    getProgress: () => runner.getProgress(),
    getMatrix: () => runner.getMatrix(),
    exportMarkdown: (matrix: EdgePerfMatrix) => exportMatrixMarkdown(matrix),
    exportJson: (matrix: EdgePerfMatrix) => exportMatrixJson(matrix),
    analyzeMatrix,
    getConfigurations: getMatrixConfigurations,
  } as EdgePerfWindowApi;
}
