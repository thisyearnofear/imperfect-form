/**
 * Lightweight real-time image pre-processor for MoveNet frames.
 *
 * Runs in both the main thread and the Web Worker. When disabled it is a
 * pass-through, so the fast path (pass video/bitmap straight to the detector)
 * is preserved.
 *
 * Phase 1 ships with a single classical mode:
 *   - Auto exposure / white-balance correction using a gray-world heuristic.
 *   - Optionally applies a mild contrast stretch.
 *
 * The operations are intentionally simple: one full-image pass over a down-scaled
 * histogram so we keep the per-frame pixel loop small and branch-free.
 */

/** Maximum number of pixels we will run expensive CPU filters on in real time.
 *  Frames above this limit skip the filter to protect frame rate. */
export const CPU_FILTER_MAX_PIXELS = 640 * 480;

/**
 * Phase 2 CV filters (lens-distortion fix and generative low-light cleanup)
 * are experimental and gated. They are not enabled by default in main; keep
 * this flag false until real-world baselines prove they meet the latency and
 * confidence targets in docs/PERFORMANCE_BASELINE.md. Auto-exposure/white
 * balance remains the only shipped Phase 1 filter.
 */
export const PHASE2_CV_FILTERS_ENABLED = false;

/** Map a device performance level to the maximum pixel count we will subject
 *  to expensive CPU filters. Lower thresholds on low-end devices keep the
 *  frame rate healthy. */
export function getCpuFilterMaxPixels(performanceLevel: 'low' | 'medium' | 'high'): number {
  switch (performanceLevel) {
    case 'low':
      return 320 * 240;
    case 'medium':
      return 640 * 480;
    case 'high':
      return 1280 * 720;
    default:
      return CPU_FILTER_MAX_PIXELS;
  }
}

export interface PosePreprocessorSettings {
  enabled: boolean;
  /** 'auto' is the only shipped Phase 1 mode. 'none' is the same as enabled:false. */
  mode: 'auto' | 'none';
  /** Phase 1: target mean luminance in [0,1]. Default 0.5. */
  targetMean: number;
  /** Phase 1: blend strength in [0,1]. 0 = no effect, 1 = full correction. Default 0.75. */
  strength: number;
  /** Phase 1/2: alias for auto-exposure mode. */
  autoExposure: boolean;
  /** Phase 2: correct radial lens distortion (barrel/pincushion). */
  cameraCalibration: boolean;
  /** Phase 2: radial distortion coefficient. Negative corrects barrel distortion. */
  distortionFactor: number;
  /** Phase 2: enable lightweight generative low-light cleanup. */
  generativeCleanup: boolean;
  /** Phase 2: optional URL/path to a TensorFlow.js GraphModel for generative cleanup.
   *  TODO: currently a placeholder; the tone-curve fallback above runs while we
   *  evaluate whether a real tiny generative model is worth the battery/latency cost. */
  generativeModelUrl: string | null;
  /** Runtime guard: maximum number of pixels allowed for expensive CPU filters.
   *  Set based on device performance level; falls back to CPU_FILTER_MAX_PIXELS. */
  cpuFilterMaxPixels: number;
}

const DEFAULT_SETTINGS: PosePreprocessorSettings = {
  enabled: false,
  mode: 'none',
  targetMean: 0.5,
  strength: 0.75,
  autoExposure: false,
  cameraCalibration: false,
  distortionFactor: -0.1,
  generativeCleanup: false,
  generativeModelUrl: null,
  cpuFilterMaxPixels: CPU_FILTER_MAX_PIXELS,
};

export function getDefaultPreprocessorSettings(): PosePreprocessorSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!PHASE2_CV_FILTERS_ENABLED) {
    settings.cameraCalibration = false;
    settings.generativeCleanup = false;
  }
  return settings;
}

export function normalizePreprocessorSettings(
  partial: Partial<PosePreprocessorSettings>
): PosePreprocessorSettings {
  const autoExposure = partial.autoExposure ?? partial.mode === 'auto';
  return {
    enabled: partial.enabled ?? DEFAULT_SETTINGS.enabled,
    mode: partial.mode ?? (autoExposure ? 'auto' : 'none'),
    targetMean: clamp(partial.targetMean ?? DEFAULT_SETTINGS.targetMean, 0.1, 0.9),
    strength: clamp(partial.strength ?? DEFAULT_SETTINGS.strength, 0, 1),
    autoExposure,
    cameraCalibration: PHASE2_CV_FILTERS_ENABLED
      ? (partial.cameraCalibration ?? DEFAULT_SETTINGS.cameraCalibration)
      : false,
    distortionFactor: clamp(
      partial.distortionFactor ?? DEFAULT_SETTINGS.distortionFactor,
      -0.5,
      0.5
    ),
    generativeCleanup: PHASE2_CV_FILTERS_ENABLED
      ? (partial.generativeCleanup ?? DEFAULT_SETTINGS.generativeCleanup)
      : false,
    generativeModelUrl: partial.generativeModelUrl ?? DEFAULT_SETTINGS.generativeModelUrl,
    cpuFilterMaxPixels: partial.cpuFilterMaxPixels ?? DEFAULT_SETTINGS.cpuFilterMaxPixels,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute an integer stride for virtual frame downsampling.
 *
 * When a frame exceeds the CPU pixel budget, we process it in
 * `stride x stride` blocks (nearest-neighbor fill) so the work scales with
 * the budget, not the raw resolution. A stride of 1 means "process at full
 * resolution".
 */
function getDownsampleStride(width: number, height: number, maxPixels: number): number {
  const pixelCount = width * height;
  if (pixelCount <= maxPixels) return 1;
  // Cap at 8 so quality doesn't completely fall off a cliff on very large frames.
  return Math.min(8, Math.max(2, Math.ceil(Math.sqrt(pixelCount / maxPixels))));
}

/** Track one-time console warnings so we don't spam on every frame. */
let cameraCalibrationDownsampleWarned = false;
let toneCurveDownsampleWarned = false;

/** Storage key for the user's pre-processor preference. */
export const PREPROCESSOR_STORAGE_KEY = 'prefPosePreprocessor';

export function loadPreprocessorSettings(): PosePreprocessorSettings {
  if (typeof window === 'undefined') return getDefaultPreprocessorSettings();
  try {
    const raw = window.localStorage.getItem(PREPROCESSOR_STORAGE_KEY);
    if (!raw) return getDefaultPreprocessorSettings();
    return normalizePreprocessorSettings(JSON.parse(raw));
  } catch {
    return getDefaultPreprocessorSettings();
  }
}

export function savePreprocessorSettings(settings: PosePreprocessorSettings): void {
  if (typeof window === 'undefined') return;
  // Don't persist the runtime/device-specific threshold; it is recomputed on load.
  const { cpuFilterMaxPixels: _, ...persistable } = settings;
  window.localStorage.setItem(PREPROCESSOR_STORAGE_KEY, JSON.stringify(persistable));
}

interface HistogramResult {
  meanR: number;
  meanG: number;
  meanB: number;
  minL: number;
  maxL: number;
}

/**
 * Build a down-sampled histogram / mean from a subset of pixels.
 * Sampling every Nth pixel keeps the cost roughly constant regardless of
 * frame resolution while remaining representative for exposure/WB.
 */
function analyzeImageData(data: Uint8ClampedArray, sampleStep = 4): HistogramResult {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let minL = 255;
  let maxL = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    rSum += r;
    gSum += g;
    bSum += b;

    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    if (l < minL) minL = l;
    if (l > maxL) maxL = l;
    count++;
  }

  const invCount = count > 0 ? 1 / count : 0;
  return {
    meanR: rSum * invCount,
    meanG: gSum * invCount,
    meanB: bSum * invCount,
    minL,
    maxL,
  };
}

/**
 * Apply classical auto-exposure and white-balance correction to an ImageData.
 * Operates in-place for efficiency.
 */
export function preprocessImageData(
  imageData: ImageData,
  settings: PosePreprocessorSettings
): void {
  if (!settings.enabled || !settings.autoExposure) return;

  const { targetMean, strength } = settings;
  const data = imageData.data;
  const { meanR, meanG, meanB, minL, maxL } = analyzeImageData(data);

  // Gray-world white balance: bring each channel to the same mean (the gray mean).
  const grayMean = (meanR + meanG + meanB) / 3;

  // Exposure factor: lift/darken the gray mean to the target mean.
  const exposureFactor = grayMean > 0 ? (targetMean * 255) / grayMean : 1;

  // Clamp gains to avoid blowing out channels or over-saturating colors.
  const maxGain = 3.0;
  const minGain = 0.3;

  const rGain = clamp((grayMean / (meanR + 0.0001)) * exposureFactor, minGain, maxGain);
  const gGain = clamp((grayMean / (meanG + 0.0001)) * exposureFactor, minGain, maxGain);
  const bGain = clamp((grayMean / (meanB + 0.0001)) * exposureFactor, minGain, maxGain);

  // Optional mild contrast stretch based on the observed luminance range.
  // Stretch so that [minL, maxL] maps closer to the full [0,255] range.
  const range = maxL - minL;
  const stretch = range > 20 && range < 250 ? 255 / (range + 1) : 1;
  const stretchClamped = clamp(stretch, 1, 2);

  const invStrength = 1 - strength;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply white-balance/exposure correction with strength blend.
    r = r * (invStrength + strength * rGain);
    g = g * (invStrength + strength * gGain);
    b = b * (invStrength + strength * bGain);

    // Mild contrast stretch (only when the range is small enough to benefit).
    if (range > 20 && range < 250) {
      r = (r - minL) * stretchClamped + minL;
      g = (g - minL) * stretchClamped + minL;
      b = (b - minL) * stretchClamped + minL;
    }

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }
}

/**
 * Pre-process an ImageBitmap in a 2D canvas/OffscreenCanvas context.
 * Returns a new ImageBitmap. The caller must close the input bitmap.
 */
export async function preprocessImageBitmap(
  bitmap: ImageBitmap,
  settings: PosePreprocessorSettings,
  canvas?: OffscreenCanvas | HTMLCanvasElement
): Promise<ImageBitmap> {
  const shouldApplyAnything =
    settings.enabled &&
    (settings.autoExposure || settings.cameraCalibration || settings.generativeCleanup);

  if (!shouldApplyAnything) {
    return bitmap;
  }

  const width = bitmap.width;
  const height = bitmap.height;

  if (!canvas) {
    canvas = new OffscreenCanvas(width, height);
  } else if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d', { alpha: false }) as
    OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  if (settings.autoExposure) {
    preprocessImageData(imageData, settings);
  }
  applyCameraCalibration(imageData, settings);
  if (settings.generativeCleanup) {
    applyToneCurveEnhancement(imageData, settings);
  }
  ctx.putImageData(imageData, 0, 0);

  return createImageBitmap(canvas as any);
}

/**
 * Apply radial lens distortion correction to ImageData in-place.
 * Negative factor corrects barrel distortion; positive corrects pincushion.
 *
 * WARNING: This performs a full-image bilinear resample on the CPU and is
 * expensive at real-time frame rates. Treat as an experimental/offline tool
 * unless the frame size is small or the device is very fast. Automatically
 * skipped when the frame exceeds CPU_FILTER_MAX_PIXELS.
 */
export function applyCameraCalibration(
  imageData: ImageData,
  settings: PosePreprocessorSettings
): void {
  if (!settings.enabled || !settings.cameraCalibration) return;

  const { distortionFactor } = settings;
  if (distortionFactor === 0) return;

  const { width, height, data } = imageData;

  const cpuFilterMaxPixels = settings.cpuFilterMaxPixels ?? CPU_FILTER_MAX_PIXELS;
  const stride = getDownsampleStride(width, height, cpuFilterMaxPixels);
  const isDownsampled = stride > 1;

  if (isDownsampled && !cameraCalibrationDownsampleWarned) {
    console.warn(
      `[posePreprocessor] Camera calibration downsampled: frame ${width}x${height} exceeds cpuFilterMaxPixels=${cpuFilterMaxPixels}; using stride=${stride}.`
    );
    cameraCalibrationDownsampleWarned = true;
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
  const output = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      // Use the center of the block for the source coordinate so the
      // downsampled result better represents the block.
      const sampleX = Math.min(width - 1, x + Math.floor(stride / 2));
      const sampleY = Math.min(height - 1, y + Math.floor(stride / 2));

      const dx = sampleX - centerX;
      const dy = sampleY - centerY;
      const r = Math.sqrt(dx * dx + dy * dy) / maxRadius;
      // r_corrected = r * (1 + k * r^2)
      const scale = 1 + distortionFactor * r * r;
      const srcX = centerX + dx * scale;
      const srcY = centerY + dy * scale;

      let rValue = 0;
      let gValue = 0;
      let bValue = 0;
      let aValue = 255;

      if (srcX < 0 || srcX >= width - 1 || srcY < 0 || srcY >= height - 1) {
        rValue = 0;
        gValue = 0;
        bValue = 0;
        aValue = 255;
      } else {
        // Bilinear sample
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const xf = srcX - x0;
        const yf = srcY - y0;
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);

        const i00 = (y0 * width + x0) * 4;
        const i10 = (y0 * width + x1) * 4;
        const i01 = (y1 * width + x0) * 4;
        const i11 = (y1 * width + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const v00 = data[i00 + c];
          const v10 = data[i10 + c];
          const v01 = data[i01 + c];
          const v11 = data[i11 + c];
          const v0 = v00 + (v10 - v00) * xf;
          const v1 = v01 + (v11 - v01) * xf;
          const v = v0 + (v1 - v0) * yf;
          const value = Math.min(255, Math.max(0, Math.round(v)));
          if (c === 0) rValue = value;
          if (c === 1) gValue = value;
          if (c === 2) bValue = value;
        }
      }

      // Fill the stride x stride output block, clamped to image bounds.
      const blockEndY = Math.min(height, y + stride);
      const blockEndX = Math.min(width, x + stride);
      for (let by = y; by < blockEndY; by++) {
        for (let bx = x; bx < blockEndX; bx++) {
          const outIdx = (by * width + bx) * 4;
          output[outIdx] = rValue;
          output[outIdx + 1] = gValue;
          output[outIdx + 2] = bValue;
          output[outIdx + 3] = aValue;
        }
      }
    }
  }

  data.set(output);
}

/**
 * Apply a local histogram equalization / tone curve that brightens shadows and
 * compresses highlights. This is the Phase 2 "generative cleanup" spike: a fast
 * canvas-based fallback that runs in both main thread and Web Workers while we
 * evaluate whether a real tiny generative model is justified for battery/latency.
 *
 * NOTE: This is intentionally not a neural model. It is a lightweight classical
 * enhancement so the feature can ship and be measured before committing to a
 * heavier generative approach (e.g. Zero-DCE Lite via TensorFlow.js).
 */
export function applyToneCurveEnhancement(
  imageData: ImageData,
  settings: PosePreprocessorSettings
): void {
  const data = imageData.data;

  const cpuFilterMaxPixels = settings.cpuFilterMaxPixels ?? CPU_FILTER_MAX_PIXELS;
  const stride = getDownsampleStride(imageData.width, imageData.height, cpuFilterMaxPixels);
  const isDownsampled = stride > 1;

  if (isDownsampled && !toneCurveDownsampleWarned) {
    console.warn(
      `[posePreprocessor] Tone curve enhancement downsampled: frame ${imageData.width}x${imageData.height} exceeds cpuFilterMaxPixels=${cpuFilterMaxPixels}; using stride=${stride}.`
    );
    toneCurveDownsampleWarned = true;
  }

  // Build a simple luminance histogram. For large frames we subsample more
  // aggressively so histogram cost stays proportional to the pixel budget,
  // but we still apply the resulting LUT to every pixel (a cheap point op).
  // step = bytes between samples; 16 = every 4th pixel at full resolution,
  // scaled up by the downsample stride on large frames.
  const step = (isDownsampled ? stride : 1) * 16;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += step) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    hist[Math.min(255, Math.floor(l))]++;
  }

  // Build CDF (cumulative distribution function) for equalization.
  const cdf = new Uint32Array(256);
  cdf[0] = hist[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + hist[i];
  }
  const total = cdf[255];
  const lut = new Uint8Array(256);
  if (total > 0) {
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.min(255, Math.round((cdf[i] / total) * 255));
    }
  }

  // Apply tone curve and a mild gamma lift to shadows.
  for (let i = 0; i < data.length; i += 4) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const mapped = lut[Math.min(255, Math.floor(l))];
    const factor = Math.min(1.2, 0.8 + (mapped / 255) * 0.4);
    data[i] = Math.min(255, data[i] * factor);
    data[i + 1] = Math.min(255, data[i + 1] * factor);
    data[i + 2] = Math.min(255, data[i + 2] * factor);
  }
}

/**
 * Pre-process a video frame by drawing it to a canvas and returning the canvas.
 * The canvas can be passed directly to MoveNet.estimatePoses.
 */
export function preprocessVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  settings: PosePreprocessorSettings
): HTMLCanvasElement {
  const shouldApplyAnything =
    settings.enabled &&
    (settings.autoExposure || settings.cameraCalibration || settings.generativeCleanup);

  if (!shouldApplyAnything) {
    return canvas;
  }

  canvas.width = video.videoWidth || video.width || 640;
  canvas.height = video.videoHeight || video.height || 480;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return canvas;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (settings.autoExposure) {
    preprocessImageData(imageData, settings);
  }
  applyCameraCalibration(imageData, settings);
  if (settings.generativeCleanup) {
    applyToneCurveEnhancement(imageData, settings);
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}
