/**
 * SessionLogger
 *
 * Lightweight utility to buffer biomechanical telemetry during a workout.
 * It uses a "Sparse Capture" strategy to keep memory usage low while
 * preserving high-value data for AI analysis.
 */

import { BiomechanicalState, Keypoint } from '../types/mediapipe';
import { SessionSnapshot } from '../types/workout';

export interface SessionSummary {
  startTime: number;
  endTime: number;
  duration: number;
  mode: string;
  repCount: number;
  avgDepth: number;
  maxTrunkLean: number;
  maxKneeValgus: number;
  warningCount: number;
  anomalies: SessionSnapshot[];
  trace: SessionSnapshot[]; // Downsampled trace
  bestPose?: SessionSnapshot;
}

export class SessionLogger {
  private buffer: SessionSnapshot[] = [];
  private anomalies: SessionSnapshot[] = [];
  private bestPose: SessionSnapshot | null = null;
  private startTime: number = 0;
  private mode: string = '';
  private lastCaptureTime: number = 0;
  private captureInterval: number = 200; // ms (5fps for the trace)

  constructor(mode: string) {
    this.mode = mode;
    this.startTime = Date.now();
  }

  /**
   * Log a frame of biomechanical data
   */
  public logFrame(metrics: BiomechanicalState, keypoints: Keypoint[]) {
    const now = Date.now();

    // 1. High-Value Capture: Store anomalies (warnings) immediately
    if (metrics.warnings.length > 0) {
      if (this.anomalies.length < 50) {
        // Limit anomaly count to prevent bloat
        this.anomalies.push({
          timestamp: now - this.startTime,
          metrics: { ...metrics },
          keypoints: [...keypoints],
        });
      }
    }

    // 2. Sparse Trace: Capture regular snapshots at defined intervals
    if (now - this.lastCaptureTime >= this.captureInterval) {
      const snapshot = {
        timestamp: now - this.startTime,
        metrics: { ...metrics },
        keypoints: [...keypoints],
      };
      this.buffer.push(snapshot);
      this.lastCaptureTime = now;

      // 3. Best Pose: Track max depth
      if (!this.bestPose || metrics.depth > this.bestPose.metrics.depth) {
        this.bestPose = snapshot;
      }

      // Keep buffer manageable (max ~10 mins at 5fps = 3000 snapshots)
      if (this.buffer.length > 3000) {
        this.buffer.shift();
      }
    }
  }

  /**
   * Generate a summary for AI analysis
   */
  public getSummary(repCount: number): SessionSummary {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    // Calculate aggregates
    let totalDepth = 0;
    let maxTrunkLean = 0;
    let maxKneeValgus = 0;
    let warningCount = 0;

    this.buffer.forEach((s) => {
      totalDepth += s.metrics.depth;
      maxTrunkLean = Math.max(maxTrunkLean, s.metrics.trunkLean);
      maxKneeValgus = Math.max(maxKneeValgus, s.metrics.kneeValgus);
    });

    this.anomalies.forEach(() => warningCount++);

    return {
      startTime: this.startTime,
      endTime,
      duration,
      mode: this.mode,
      repCount,
      avgDepth: this.buffer.length > 0 ? totalDepth / this.buffer.length : 0,
      maxTrunkLean,
      maxKneeValgus,
      warningCount,
      anomalies: this.anomalies,
      trace: [...this.buffer], // Return the full 5fps trace
      bestPose: this.bestPose || undefined,
    };
  }

  public clear() {
    this.buffer = [];
    this.anomalies = [];
    this.bestPose = null;
  }
}
