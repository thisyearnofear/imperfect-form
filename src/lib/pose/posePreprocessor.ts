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

export interface PosePreprocessorSettings {
  enabled: boolean;
  /** 'auto' is the only shipped Phase 1 mode. 'none' is the same as enabled:false. */
  mode: 'auto' | 'none';
  /** Target mean luminance in [0,1]. Default 0.5. */
  targetMean: number;
  /** Blend strength in [0,1]. 0 = no effect, 1 = full correction. Default 0.75. */
  strength: number;
}

const DEFAULT_SETTINGS: PosePreprocessorSettings = {
  enabled: false,
  mode: 'auto',
  targetMean: 0.5,
  strength: 0.75,
};

export function getDefaultPreprocessorSettings(): PosePreprocessorSettings {
  return { ...DEFAULT_SETTINGS };
}

export function normalizePreprocessorSettings(
  partial: Partial<PosePreprocessorSettings>
): PosePreprocessorSettings {
  return {
    enabled: partial.enabled ?? DEFAULT_SETTINGS.enabled,
    mode: partial.mode ?? DEFAULT_SETTINGS.mode,
    targetMean: clamp(partial.targetMean ?? DEFAULT_SETTINGS.targetMean, 0.1, 0.9),
    strength: clamp(partial.strength ?? DEFAULT_SETTINGS.strength, 0, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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
  window.localStorage.setItem(PREPROCESSOR_STORAGE_KEY, JSON.stringify(settings));
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
  if (!settings.enabled || settings.mode === 'none') return;

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
  if (!settings.enabled || settings.mode === 'none') {
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
  preprocessImageData(imageData, settings);
  ctx.putImageData(imageData, 0, 0);

  return createImageBitmap(canvas as any);
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
  if (!settings.enabled || settings.mode === 'none') {
    return canvas;
  }

  canvas.width = video.videoWidth || video.width || 640;
  canvas.height = video.videoHeight || video.height || 480;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return canvas;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  preprocessImageData(imageData, settings);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}
