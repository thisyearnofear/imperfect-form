'use client';

/**
 * Device Detection Utility
 *
 * Provides standardized device detection capabilities for pose detection
 * including performance profiling and feature detection
 */

export type Platform = 'desktop' | 'mobile' | 'ios' | 'android' | 'farcaster';

export type Browser = 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';

export interface DeviceInfo {
  platform: Platform;
  browser: Browser;
  isMobile: boolean;
  isTablet: boolean;
  viewport: {
    width: number;
    height: number;
  };
  deviceMemory?: number;
  hardwareConcurrency: number;
  networkType?: string;
  gpuInfo?: {
    vendor?: string;
    renderer?: string;
  };
  webglSupport: boolean;
  webgl2Support: boolean;
  webGPUSupport: boolean;
  offscreenCanvasSupport: boolean;
  workersSupport: boolean;
  cameraSupport: boolean;
  performanceLevel: 'low' | 'medium' | 'high';
}

export interface PerformanceMetrics {
  memoryUsage?: number;
  memoryQuota?: number;
  fps: number;
  detectionTime: number;
  frameProcessingTime: number;
  modelLoadTime: number;
  cpuUsage: number;
}

/**
 * Get device information
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  const platform = detectPlatform(ua);
  const browser = detectBrowser(ua);
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/.test(ua);

  return {
    platform,
    browser,
    isMobile,
    isTablet,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    networkType: getNetworkType(),
    gpuInfo: getGPUInfo(),
    webglSupport: checkWebGLSupport(),
    webgl2Support: checkWebGL2Support(),
    webGPUSupport: checkWebGPUSupport(),
    offscreenCanvasSupport: checkOffscreenCanvasSupport(),
    workersSupport: typeof Worker !== 'undefined',
    cameraSupport: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    performanceLevel: calculatePerformanceLevel(),
  };
}

/**
 * Detect platform
 */
function detectPlatform(ua: string): Platform {
  // Check for Farcaster first (most specific)
  if (typeof window !== 'undefined' && (window as any).farcaster) {
    return 'farcaster';
  }

  // iOS detection
  if (/iPhone|iPad|iPod/.test(ua)) {
    return 'ios';
  }

  // Android detection
  if (/Android/.test(ua)) {
    return 'android';
  }

  // Mobile detection (general)
  if (/Mobile/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Detect browser
 */
function detectBrowser(ua: string): Browser {
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return 'chrome';
  if (/Firefox/.test(ua)) return 'firefox';
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'safari';
  if (/Edg/.test(ua)) return 'edge';
  return 'unknown';
}

/**
 * Get network type
 */
function getNetworkType(): string | undefined {
  if ('connection' in navigator && (navigator as any).connection) {
    return (navigator as any).connection.effectiveType;
  }
  return undefined;
}

/**
 * Get GPU information
 */
function getGPUInfo(): { vendor?: string; renderer?: string } | undefined {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return undefined;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return undefined;

    return {
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    };
  } catch {
    return undefined;
  }
}

/**
 * Check WebGL support
 */
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl');
  } catch {
    return false;
  }
}

/**
 * Check WebGL2 support
 */
function checkWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Check WebGPU support
 */
function checkWebGPUSupport(): boolean {
  return 'gpu' in navigator;
}

/**
 * Check OffscreenCanvas support
 */
function checkOffscreenCanvasSupport(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Calculate performance level based on device capabilities
 */
function calculatePerformanceLevel(): 'low' | 'medium' | 'high' {
  let score = 0;

  // Memory scoring
  const memory = (navigator as any).deviceMemory;
  if (memory) {
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;
  }

  // CPU scoring
  const cores = navigator.hardwareConcurrency || 4;
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 1;

  // GPU scoring
  if (checkWebGL2Support()) score += 2;
  else if (checkWebGLSupport()) score += 1;

  // Platform scoring
  const platform = detectPlatform(navigator.userAgent);
  if (platform === 'desktop') score += 1;
  else if (platform === 'ios') score += 0.5;
  else score += 0;

  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  const memory = (performance as any).memory;

  return {
    memoryUsage: memory?.usedJSHeapSize,
    memoryQuota: memory?.totalJSHeapSize,
    fps: 0, // Will be updated by monitoring
    detectionTime: 0, // Will be updated by monitoring
    frameProcessingTime: 0, // Will be updated by monitoring
    modelLoadTime: 0, // Will be updated by monitoring
    cpuUsage: 0, // Will be calculated
  };
}

/**
 * Check if device supports specific pose detection features
 */
export function checkPoseDetectionSupport(device?: DeviceInfo): {
  supported: boolean;
  features: {
    camera: boolean;
    tensorflow: boolean;
    webgl: boolean;
    workers: boolean;
    offscreenCanvas: boolean;
  };
  limitations: string[];
  recommendedSettings: {
    modelComplexity: 'lite' | 'standard' | 'full';
    detectionFrequency: number;
    resolution: 'low' | 'medium' | 'high';
  };
} {
  const info = device || getDeviceInfo();
  const limitations: string[] = [];

  // Check basic requirements
  const features = {
    camera: info.cameraSupport,
    tensorflow: checkWebGLSupport(), // TensorFlow.js requires WebGL
    webgl: info.webglSupport,
    workers: info.workersSupport,
    offscreenCanvas: info.offscreenCanvasSupport,
  };

  // Identify limitations
  if (!features.camera) limitations.push('Camera access not available');
  if (!features.webgl) limitations.push('WebGL not supported');
  if (!features.workers) limitations.push('Web Workers not supported');
  if (info.performanceLevel === 'low') limitations.push('Low-end device detected');
  if (info.isMobile && info.viewport.width < 360) limitations.push('Small screen size');

  // Recommend settings based on device
  let modelComplexity: 'lite' | 'standard' | 'full' = 'standard';
  let detectionFrequency = 30;
  let resolution: 'low' | 'medium' | 'high' = 'medium';

  if (info.performanceLevel === 'low') {
    modelComplexity = 'lite';
    detectionFrequency = 15;
    resolution = 'low';
  } else if (info.platform === 'mobile') {
    modelComplexity = 'lite';
    detectionFrequency = 20;
    resolution = 'medium';
  } else if (info.performanceLevel === 'high') {
    modelComplexity = 'full';
    detectionFrequency = 30;
    resolution = 'high';
  }

  return {
    supported: Object.values(features).every((f) => f),
    features,
    limitations,
    recommendedSettings: {
      modelComplexity,
      detectionFrequency,
      resolution,
    },
  };
}

/**
 * Monitor performance in real-time
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private detectionTimes: number[] = [];
  private maxSamples = 60;

  constructor() {
    this.metrics = getPerformanceMetrics();
  }

  /**
   * Record a frame
   */
  recordFrame(detectionTime: number, processingTime: number): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;

    // Update FPS
    this.frameCount++;
    if (this.frameCount >= 10) {
      this.metrics.fps = Math.round(1000 / (deltaTime / this.frameCount));
      this.frameCount = 0;
    }

    // Update detection times
    this.detectionTimes.push(detectionTime);
    this.metrics.detectionTime = detectionTime;
    this.metrics.frameProcessingTime = processingTime;

    // Keep only recent samples
    if (this.detectionTimes.length > this.maxSamples) {
      this.detectionTimes.shift();
    }

    this.lastFrameTime = now;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    // Update memory usage
    const memory = (performance as any).memory;
    if (memory) {
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      this.metrics.memoryQuota = memory.totalJSHeapSize;
    }

    // Calculate average detection time
    if (this.detectionTimes.length > 0) {
      const sum = this.detectionTimes.reduce((a, b) => a + b, 0);
      this.metrics.detectionTime = sum / this.detectionTimes.length;
    }

    return { ...this.metrics };
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    return (
      this.metrics.fps < 15 ||
      this.metrics.detectionTime > 200 ||
      (this.metrics.memoryUsage && this.metrics.memoryQuota
        ? this.metrics.memoryUsage / this.metrics.memoryQuota > 0.8
        : false)
    );
  }
}
