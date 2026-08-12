import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

// Flag to track if TensorFlow has been initialized
let tfInitialized = false;

/**
 * Platform-specific TensorFlow configuration
 */
interface TFPlatformConfig {
  backend: string;
  fallbackBackend?: string;
  settings?: Record<string, unknown>;
}

/**
 * Get the best configuration for the current platform
 * This separates mobile and desktop settings for clean optimization
 */
function getPlatformConfig(isMobile: boolean): TFPlatformConfig {
  // Mobile-specific optimizations - use minimal conservative settings
  if (isMobile) {
    return {
      backend: 'webgl',
      settings: {
        // Only use the most essential and widely-supported optimizations
        // These are known to work on most mobile browsers
        WEBGL_FORCE_F16_TEXTURES: false, // More compatible but less optimized
        CHECK_COMPUTATION_FOR_ERRORS: false,
      },
    };
  }

  // Desktop can use more resources for better accuracy
  // Use WebGL as default for stability, WebGPU as fallback if WebGL fails
  return {
    backend: 'webgl',
    fallbackBackend: 'webgpu',
    settings: {
      // Default settings for desktop - can use more resources
      CHECK_COMPUTATION_FOR_ERRORS: true,
      // Use higher precision on desktop
      WEBGL_FORCE_F16_TEXTURES: false,
      WEBGL_RENDER_FLOAT32_ENABLED: true,
      WEBGL_MAX_TEXTURE_SIZE: 4096,
    },
  };
}

/**
 * Initialize TensorFlow.js with the best available backend
 * This should be called before any TensorFlow operations
 * @param isMobile Whether the app is running on a mobile device
 */
export async function initializeTensorFlow(isMobile = false): Promise<string> {
  if (tfInitialized) {
    return tf.getBackend() || 'unknown';
  }

  // Get the best config for the current platform
  const platformConfig = getPlatformConfig(isMobile);

  // Apply environment settings
  if (platformConfig.settings) {
    Object.entries(platformConfig.settings).forEach(([key, value]) => {
      tf.env().set(key, value as boolean | number | string);
    });
  }

  try {
    // Try the platform's preferred backend first
    try {
      await tf.setBackend(platformConfig.backend);
      await tf.ready();
      console.log(`TensorFlow.js initialized with ${platformConfig.backend} backend`);
      tfInitialized = true;
      return platformConfig.backend;
    } catch (primaryError) {
      console.warn(`${platformConfig.backend} initialization failed:`, primaryError);

      // Try fallback backend if available
      if (platformConfig.fallbackBackend) {
        try {
          // Dynamically import WebGPU if it's the fallback
          if (platformConfig.fallbackBackend === 'webgpu') {
            await import('@tensorflow/tfjs-backend-webgpu');
            console.log('WebGPU backend loaded as fallback');
          }

          await tf.setBackend(platformConfig.fallbackBackend);
          await tf.ready();
          console.log(
            `TensorFlow.js initialized with fallback ${platformConfig.fallbackBackend} backend`
          );
          tfInitialized = true;
          return platformConfig.fallbackBackend;
        } catch (fallbackError) {
          console.warn(`Fallback ${platformConfig.fallbackBackend} also failed:`, fallbackError);
        }
      }
    }

    // Always fall back to WebGL which has wider support
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('TensorFlow.js initialized with WebGL backend');
      tfInitialized = true;
      return 'webgl';
    } catch (webglError) {
      console.warn('WebGL initialization failed, trying WASM:', webglError);
    }

    // Last resort: WASM
    await tf.setBackend('wasm');
    await tf.ready();
    console.log('TensorFlow.js initialized with WASM backend');
    tfInitialized = true;
    return 'wasm';
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    throw new Error('Failed to initialize TensorFlow.js');
  }
}

/**
 * Get the current TensorFlow.js backend
 */
export function getTensorFlowBackend(): string {
  return tf.getBackend() || 'not initialized';
}

/**
 * Check if TensorFlow.js has been initialized
 */
export function isTensorFlowInitialized(): boolean {
  return tfInitialized;
}

/**
 * Utility functions for mobile-specific TensorFlow operations
 */
export const mobileTFUtils = {
  /**
   * Gets the optimal model type for the current device
   * @param isMobile Whether the app is running on a mobile device
   * @returns The appropriate model type to use
   */
  getOptimalModelType: (isMobile: boolean): string => {
    // For mobile, use a lighter model
    if (isMobile) {
      return 'lightning';
    }
    // For desktop, use a more accurate model
    return 'thunder';
  },

  /**
   * Gets optimized detector configuration based on device type
   * @param isMobile Whether the app is running on a mobile device
   * @returns Configuration object for the pose detector
   */
  getDetectorConfig: (isMobile: boolean): Record<string, unknown> => {
    if (isMobile) {
      return {
        modelType: 'lightning',
        // Avoid MoveNet's transient null bounding-box (`null.yMin`) path.
        enableSmoothing: false,
        minPoseScore: 0.15, // Lower threshold for mobile to detect poses from further away
        multiPoseMaxDimension: 256, // Smaller dimension for better performance
        // Keep the legacy bounding-box tracker off for transient null boxes.
        enableTracking: false,
      };
    } else {
      // Desktop can use more accurate but computation-heavy settings
      return {
        modelType: 'thunder',
        // Avoid MoveNet's transient null bounding-box (`null.yMin`) path.
        enableSmoothing: false,
        minPoseScore: 0.25,
        multiPoseMaxDimension: 512,
        // Keep the legacy bounding-box tracker off for transient null boxes.
        enableTracking: false,
      };
    }
  },
};
