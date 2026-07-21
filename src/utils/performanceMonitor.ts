'use client';

/**
 * Performance Monitoring System
 *
 * Tracks pose detection performance metrics and sends them to remote logging
 * for analysis and optimization
 */

import { createRemoteLogger } from './remoteLogger';
import { getDeviceInfo, PerformanceMetrics, PerformanceMonitor } from './deviceDetection';

const logger = createRemoteLogger('PerformanceMonitor');

export interface PerformanceReport {
  sessionId: string;
  deviceInfo: ReturnType<typeof getDeviceInfo>;
  metrics: PerformanceMetrics;
  timestamp: number;
  sessionDuration: number;
  errorCount: number;
  detectionAccuracy?: number;
  userExperience: {
    lagDetected: boolean;
    crashes: number;
    fallbacksTriggered: number;
  };
}

export interface AggregatedMetrics {
  avgFPS: number;
  avgDetectionTime: number;
  avgMemoryUsage: number;
  errorRate: number;
  successRate: number;
  devicePerformanceScore: number;
}

class PerformanceMonitoringSystem {
  private static instance: PerformanceMonitoringSystem;
  private sessionId: string;
  private startTime: number;
  private monitor: PerformanceMonitor;
  private reportInterval: NodeJS.Timeout | null = null;
  private errorCount = 0;
  private fallbacksTriggered = 0;
  private crashes = 0;
  private lastReportTime: number = 0;
  private metricsBuffer: PerformanceMetrics[] = [];
  private reportingThreshold = 30000; // Report every 30 seconds

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.monitor = new PerformanceMonitor();
    this.initializeErrorTracking();
    this.startPeriodicReporting();
  }

  static getInstance(): PerformanceMonitoringSystem {
    if (!PerformanceMonitoringSystem.instance) {
      PerformanceMonitoringSystem.instance = new PerformanceMonitoringSystem();
    }
    return PerformanceMonitoringSystem.instance;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Track pose detection errors
    window.addEventListener('poseDetectionError', (event: any) => {
      this.errorCount++;
      this.logError(event.detail.error);
    });

    // Track fallbacks
    window.addEventListener('poseDetectionFallback', (event: any) => {
      this.fallbacksTriggered++;
      logger.info('Fallback triggered', {
        action: event.detail.action,
        totalFallbacks: this.fallbacksTriggered,
      });
    });

    // Track crashes
    window.addEventListener('unhandledrejection', () => {
      this.crashes++;
    });

    window.addEventListener('error', () => {
      this.crashes++;
    });
  }

  /**
   * Log error details
   */
  private logError(error: any): void {
    logger.error('Pose detection error', {
      type: error.type,
      message: error.message,
      severity: error.severity,
      timestamp: Date.now(),
      context: error.context,
    });
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    this.reportInterval = setInterval(() => {
      this.generateAndSendReport();
    }, this.reportingThreshold);
  }

  /**
   * Record a detection frame
   */
  recordDetection(detectionTime: number, processingTime: number, _poseCount: number): void {
    this.monitor.recordFrame(detectionTime, processingTime);

    // Store metrics for aggregation
    const metrics = this.monitor.getMetrics();
    this.metricsBuffer.push({ ...metrics });

    // Check for performance issues
    if (this.monitor.isPerformanceDegraded()) {
      this.handlePerformanceDegradation();
    }
  }

  /**
   * Handle performance degradation
   */
  private handlePerformanceDegradation(): void {
    const metrics = this.monitor.getMetrics();

    logger.warn('Performance degradation detected', {
      fps: metrics.fps,
      detectionTime: metrics.detectionTime,
      memoryUsage: metrics.memoryUsage,
      memoryQuota: metrics.memoryQuota,
    });

    // Trigger performance optimization
    window.dispatchEvent(
      new CustomEvent('performanceDegradation', {
        detail: {
          metrics,
          suggestions: this.getOptimizationSuggestions(metrics),
        },
      })
    );
  }

  /**
   * Get optimization suggestions based on metrics
   */
  private getOptimizationSuggestions(metrics: PerformanceMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.fps < 15) {
      suggestions.push('Reduce detection frequency');
      suggestions.push('Use lighter model');
    }

    if (metrics.detectionTime > 200) {
      suggestions.push('Enable web workers');
      suggestions.push('Optimize model complexity');
    }

    if (metrics.memoryUsage && metrics.memoryQuota) {
      const usage = (metrics.memoryUsage / metrics.memoryQuota) * 100;
      if (usage > 80) {
        suggestions.push('Clear unused resources');
        suggestions.push('Reduce model size');
      }
    }

    return suggestions;
  }

  /**
   * Generate and send performance report
   */
  private generateAndSendReport(): void {
    const now = Date.now();
    const report: PerformanceReport = {
      sessionId: this.sessionId,
      deviceInfo: getDeviceInfo(),
      metrics: this.monitor.getMetrics(),
      timestamp: now,
      sessionDuration: now - this.startTime,
      errorCount: this.errorCount,
      userExperience: {
        lagDetected: this.monitor.isPerformanceDegraded(),
        crashes: this.crashes,
        fallbacksTriggered: this.fallbacksTriggered,
      },
    };

    // Calculate aggregated metrics
    report.metrics = {
      ...report.metrics,
      ...this.calculateAggregatedMetrics(),
    };

    // Send to remote logging
    logger.info('Performance report', report);

    // Clear buffer
    this.metricsBuffer = [];
    this.lastReportTime = now;
  }

  /**
   * Calculate aggregated metrics from buffer
   */
  private calculateAggregatedMetrics(): Partial<PerformanceMetrics> {
    if (this.metricsBuffer.length === 0) return {};

    const validMetrics = this.metricsBuffer.filter((m) => m.fps > 0);

    return {
      fps: Math.round(validMetrics.reduce((sum, m) => sum + m.fps, 0) / validMetrics.length),
      detectionTime:
        validMetrics.reduce((sum, m) => sum + (m.detectionTime || 0), 0) / validMetrics.length,
      frameProcessingTime:
        validMetrics.reduce((sum, m) => sum + (m.frameProcessingTime || 0), 0) /
        validMetrics.length,
    };
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    currentFPS: number;
    avgDetectionTime: number;
    memoryUsage: number;
    errorRate: number;
    healthScore: number;
  } {
    const metrics = this.monitor.getMetrics();
    const sessionDuration = Date.now() - this.startTime;
    const errorRate = sessionDuration > 0 ? this.errorCount / (sessionDuration / 60000) : 0;

    // Calculate health score (0-100)
    let healthScore = 100;
    if (metrics.fps < 15) healthScore -= 30;
    else if (metrics.fps < 20) healthScore -= 15;

    if (metrics.detectionTime > 200) healthScore -= 25;
    else if (metrics.detectionTime > 100) healthScore -= 10;

    if (errorRate > 1) healthScore -= 20;
    else if (errorRate > 0.5) healthScore -= 10;

    if (metrics.memoryUsage && metrics.memoryQuota) {
      const usagePercent = (metrics.memoryUsage / metrics.memoryQuota) * 100;
      if (usagePercent > 80) healthScore -= 15;
      else if (usagePercent > 60) healthScore -= 5;
    }

    return {
      currentFPS: metrics.fps,
      avgDetectionTime: metrics.detectionTime,
      memoryUsage: metrics.memoryUsage || 0,
      errorRate,
      healthScore: Math.max(0, healthScore),
    };
  }

  /**
   * Force immediate report
   */
  sendReportNow(): void {
    this.generateAndSendReport();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }

    // Send final report
    this.generateAndSendReport();
  }

  /**
   * Reset session
   */
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.errorCount = 0;
    this.fallbacksTriggered = 0;
    this.crashes = 0;
    this.metricsBuffer = [];
  }
}

// Export singleton
export const performanceMonitor = PerformanceMonitoringSystem.getInstance();

// Convenience functions
export function startPerformanceMonitoring(): void {
  // Already started in constructor
  logger.info('Performance monitoring started');
}

export function recordPoseDetection(
  detectionTime: number,
  processingTime: number,
  poseCount: number
): void {
  performanceMonitor.recordDetection(detectionTime, processingTime, poseCount);
}

export function getPerformanceSummary() {
  return performanceMonitor.getPerformanceSummary();
}

export function sendPerformanceReport(): void {
  performanceMonitor.sendReportNow();
}

// Auto-start when module loads
if (typeof window !== 'undefined') {
  startPerformanceMonitoring();
}
