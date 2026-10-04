import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POSE_CONFIG,
  TRACKERS,
  getDefaultPoseConfig,
  getTracker,
  isConfigSupported,
  resolvePoseConfig,
  supportedOptions,
} from '@/lib/pose/trackerRegistry';
import {
  analyzeMatrix,
  getConfigLabel,
  getMatrixConfigurations,
  toDetectorConfig,
  type EdgePerfConfig,
  type EdgePerfMatrix,
  type EdgePerfRun,
} from '@/lib/pose/edgePerfMatrix';
import { mobileTFUtils } from '@/utils/tfUtils';
import { PoseDetectionService } from '@/services/PoseDetectionService';
import type { DeviceInfo } from '@/utils/deviceDetection';
import type { PoseDetectorConfig, PoseTrackerId } from '@/types/mediapipe';

const device = (overrides: Partial<DeviceInfo> = {}): DeviceInfo =>
  ({
    platform: 'macOS',
    browser: 'Chrome',
    performanceLevel: 'high',
    webglSupport: true,
    webgl2Support: true,
    webGPUSupport: false,
    offscreenCanvasSupport: true,
    ...overrides,
  }) as DeviceInfo;

describe('pose config resolution', () => {
  it('defaults to MoveNet Lightning on webgl', () => {
    expect(DEFAULT_POSE_CONFIG.tracker).toBe('movenet-lightning');
    expect(DEFAULT_POSE_CONFIG.backend).toBe('webgl');
  });

  it('keeps smoothing and the legacy tracker off for MoveNet', () => {
    // MoveNet's smoothed tracker can dereference a missing bounding box on
    // transient frames (`null.yMin`), so these must stay false.
    expect(DEFAULT_POSE_CONFIG.enableSmoothing).toBe(false);
    expect(DEFAULT_POSE_CONFIG.enableTracking).toBe(false);
  });

  it('lowers the score floor on mobile and drops the multi-pose cap', () => {
    const mobile = getDefaultPoseConfig(true);
    expect(mobile.minPoseScore).toBe(0.2);
    expect(mobile.multiPoseMaxDimension).toBeUndefined();
    expect(getDefaultPoseConfig(false).minPoseScore).toBe(0.25);
  });

  it('fills partial configs from the defaults without mutating them', () => {
    const resolved = resolvePoseConfig({ tracker: 'movenet-thunder' });
    expect(resolved.tracker).toBe('movenet-thunder');
    expect(resolved.minPoseScore).toBe(DEFAULT_POSE_CONFIG.minPoseScore);
    expect(DEFAULT_POSE_CONFIG.tracker).toBe('movenet-lightning');
  });

  it('returns the mobile default when given nothing', () => {
    expect(resolvePoseConfig(undefined, true)).toEqual(getDefaultPoseConfig(true));
  });

  it('keeps an explicit multiPoseMaxDimension on mobile', () => {
    expect(resolvePoseConfig({ multiPoseMaxDimension: 256 }, true).multiPoseMaxDimension).toBe(256);
  });
});

describe('tracker registry', () => {
  const ids: PoseTrackerId[] = ['movenet-lightning', 'movenet-thunder', 'blazepose'];

  it('registers all three trackers with a keypoint shape', () => {
    for (const id of ids) {
      const spec = getTracker(id);
      expect(spec.id).toBe(id);
      expect(spec.label.length).toBeGreaterThan(0);
      expect(['movenet-17', 'blazepose-33']).toContain(spec.keypointShape);
    }
  });

  it('reports that BlazePose cannot use the wasm backend', () => {
    expect(
      isConfigSupported(
        toDetectorConfig({ tracker: 'blazepose', inputSize: 256, backend: 'wasm' }),
        device()
      )
    ).toBe(false);
  });

  it('rejects webgpu when the device lacks it', () => {
    const config: PoseDetectorConfig = {
      ...DEFAULT_POSE_CONFIG,
      backend: 'webgpu',
    };
    expect(isConfigSupported(config, device({ webGPUSupport: false }))).toBe(false);
    expect(isConfigSupported(config, device({ webGPUSupport: true }))).toBe(true);
  });

  it('rejects webgl when the device lacks it', () => {
    const config: PoseDetectorConfig = { ...DEFAULT_POSE_CONFIG, backend: 'webgl' };
    expect(isConfigSupported(config, device({ webglSupport: false }))).toBe(false);
  });

  it('documents that BlazePose ignores the MoveNet-only knobs', () => {
    expect(supportedOptions('blazepose')).not.toContain('minPoseScore');
    expect(supportedOptions('movenet-lightning')).toContain('minPoseScore');
  });
});

describe('config drift', () => {
  it('has one detector config across every call site', () => {
    // These three used to carry independent copies that drifted apart.
    const fromRegistry = getDefaultPoseConfig(false);
    const fromService = PoseDetectionService.getDetectorConfig(false);
    const fromTfUtils = mobileTFUtils.getDetectorConfig(false);

    expect(fromService).toEqual(fromRegistry);
    expect(fromTfUtils).toEqual(fromRegistry);
  });

  it('resolves the same mobile config everywhere', () => {
    expect(PoseDetectionService.getDetectorConfig(true)).toEqual(getDefaultPoseConfig(true));
    expect(mobileTFUtils.getDetectorConfig(true)).toEqual(getDefaultPoseConfig(true));
  });

  it('never hard-codes a model string outside the registry', () => {
    for (const spec of Object.values(TRACKERS)) {
      expect(['SinglePose.Lightning', 'SinglePose.Thunder', 'full', 'lite', 'heavy']).toContain(
        spec.modelType
      );
    }
  });
});

describe('edge perf matrix', () => {
  const config: EdgePerfConfig = { tracker: 'movenet-lightning', inputSize: 256, backend: 'webgl' };

  it('converts a cell into a full detector config', () => {
    const resolved = toDetectorConfig(config);
    expect(resolved.tracker).toBe('movenet-lightning');
    expect(resolved.inputSize).toBe(256);
    expect(resolved.backend).toBe('webgl');
  });

  it('only proposes configs the device can build', () => {
    const configs = getMatrixConfigurations(device({ webGPUSupport: false }));
    expect(configs.length).toBeGreaterThan(0);
    expect(configs.every((c) => c.backend !== 'webgpu')).toBe(true);
    // No BlazePose/wasm pair.
    expect(configs.some((c) => c.tracker === 'blazepose' && c.backend === 'wasm')).toBe(false);
  });

  it('includes BlazePose rows now that it is constructible', () => {
    const configs = getMatrixConfigurations(device());
    expect(configs.some((c) => c.tracker === 'blazepose')).toBe(true);
  });

  it('labels a config readably', () => {
    expect(getConfigLabel(config)).toBe('MoveNet Lightning / 256px / webgl');
  });
});

describe('matrix analysis honesty', () => {
  const report = {
    runId: 'r',
    startedAt: 0,
    endedAt: 1,
    device: device(),
    metadata: {},
    summary: {
      durationMs: 1000,
      frames: 100,
      avgFps: 30,
      medianFps: 30,
      p95DetectionTimeMs: 10,
      medianDetectionTimeMs: 10,
      p95PreprocessTimeMs: 1,
      medianPreprocessTimeMs: 1,
      avgKeypointConfidence: 0.8,
      poseDetectedFrames: 90,
      memoryGrowthBytes: 0,
      totalCoalescedFrames: 0,
      estimatedCaptureFps: 30,
      totalCaptureFailures: 0,
      medianPipelineLatencyMs: 10,
      p95PipelineLatencyMs: 12,
    },
    frames: [],
  };

  function run(overrides: Partial<EdgePerfRun>): EdgePerfRun {
    return {
      config: { tracker: 'movenet-lightning', inputSize: 256, backend: 'webgl' },
      applied: true,
      report: report as never,
      timestamp: 0,
      durationMs: 1000,
      ...overrides,
    };
  }

  function matrix(runs: EdgePerfRun[]): EdgePerfMatrix {
    return {
      runs,
      device: device(),
      startedAt: 0,
      completedAt: 1000,
      matrixId: 'm1',
    };
  }

  it('ranks only rows whose config was actually applied', () => {
    const analysis = analyzeMatrix(
      matrix([
        run({ applied: true }),
        run({
          applied: false,
          config: { tracker: 'movenet-thunder', inputSize: 640, backend: 'cpu' },
        }),
      ])
    );
    expect(analysis.rankings).toHaveLength(1);
    expect(analysis.rankings[0].config.tracker).toBe('movenet-lightning');
    expect(analysis.unapplied).toBe(1);
    expect(analysis.bestConfig?.tracker).toBe('movenet-lightning');
  });

  it('refuses to rank when nothing was applied', () => {
    const analysis = analyzeMatrix(matrix([run({ applied: false }), run({ applied: false })]));
    expect(analysis.rankings).toEqual([]);
    expect(analysis.bestConfig).toBeNull();
    expect(analysis.error).toMatch(/stability baseline/i);
  });

  it('reports no runs without claiming a winner', () => {
    const analysis = analyzeMatrix(matrix([]));
    expect(analysis.error).toBe('No runs completed');
    expect(analysis.bestConfig).toBeNull();
  });
});
