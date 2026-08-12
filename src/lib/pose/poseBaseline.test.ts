import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  exportPoseBaselineJson,
  exportPoseBaselineMarkdown,
  recordPoseBaselineCaptureFailure,
  recordPoseBaselineFrame,
  startPoseBaseline,
  stopPoseBaseline,
} from './poseBaseline';

describe('pose baseline evidence metadata', () => {
  beforeEach(() => {
    let stored: string | null = null;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => stored,
        setItem: (_key: string, value: string) => {
          stored = value;
        },
      } as unknown as Storage,
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { innerWidth: 1280, innerHeight: 720 } as Window,
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 Chrome/1.0',
        hardwareConcurrency: 8,
        mediaDevices: {} as MediaDevices,
      } as Navigator,
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => ({ getContext: () => null }) } as unknown as Document,
    });
  });

  afterEach(() => {
    stopPoseBaseline();
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { navigator?: unknown }).navigator;
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('keeps run configuration metadata in the JSON report', () => {
    startPoseBaseline({
      target: 'Apple Silicon arm64',
      model: 'SinglePose.Lightning',
      backend: 'webgl',
    });

    recordPoseBaselineFrame({
      detectionTimeMs: 12,
      preprocessTimeMs: 2,
      keypointConfidence: 0.9,
      keypointCount: 17,
      memoryUsed: 100,
      memoryTotal: 200,
      mode: 'curls',
      path: 'main',
    });

    const report = stopPoseBaseline();
    expect(report?.metadata).toEqual({
      target: 'Apple Silicon arm64',
      model: 'SinglePose.Lightning',
      backend: 'webgl',
    });

    const exported = JSON.parse(exportPoseBaselineJson());
    expect(exported.metadata.model).toBe('SinglePose.Lightning');
    expect(exported.summary.frames).toBe(1);
  });

  it('summarizes coalesced frames, capture failures, and pipeline latency', () => {
    startPoseBaseline({ path: 'worker' });

    recordPoseBaselineFrame({
      detectionTimeMs: 10,
      keypointConfidence: 0.8,
      keypointCount: 17,
      mode: 'curls',
      path: 'worker',
      coalescedFrames: 2,
      pipelineLatencyMs: 24,
    });
    recordPoseBaselineFrame({
      detectionTimeMs: 12,
      keypointConfidence: 0.9,
      keypointCount: 17,
      mode: 'curls',
      path: 'worker',
      coalescedFrames: 1,
      pipelineLatencyMs: 36,
    });
    recordPoseBaselineCaptureFailure();

    const report = stopPoseBaseline();
    expect(report?.summary.totalCoalescedFrames).toBe(3);
    expect(report?.summary.totalCaptureFailures).toBe(1);
    expect(report?.summary.medianPipelineLatencyMs).toBe(30);
    expect(report?.summary.p95PipelineLatencyMs).toBe(36);
    expect(report?.summary.estimatedCaptureFps).toBeGreaterThanOrEqual(0);
  });

  it('exports legacy reports without metadata', () => {
    const storage = globalThis.localStorage;
    storage.setItem(
      'imf_poseBaseline_lastRun',
      JSON.stringify({
        runId: 'legacy',
        startedAt: Date.now(),
        device: {
          platform: 'desktop',
          browser: 'chrome',
          performanceLevel: 'high',
          deviceMemory: 8,
          hardwareConcurrency: 8,
          webglSupport: true,
          webGPUSupport: false,
          offscreenCanvasSupport: true,
          viewport: { width: 1280, height: 720 },
        },
        summary: {
          durationMs: 1000,
          frames: 1,
          avgFps: 15,
          medianFps: 15,
          p95DetectionTimeMs: 12,
          medianDetectionTimeMs: 12,
          p95PreprocessTimeMs: 2,
          medianPreprocessTimeMs: 2,
          avgKeypointConfidence: 0.9,
          poseDetectedFrames: 1,
          memoryGrowthBytes: 0,
        },
        frames: [],
      })
    );

    expect(exportPoseBaselineMarkdown()).toContain('## Configuration');
  });
});
