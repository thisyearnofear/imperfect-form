import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

export interface TensorFlowConfig {
  isFarcaster?: boolean;
  isMobile?: boolean;
  preferWebGL?: boolean;
  memoryLimit?: number;
}

export interface TensorFlowResult {
  success: boolean;
  backend?: string;
  error?: string;
}

export async function initializeTensorFlow(
  config: TensorFlowConfig = {}
): Promise<TensorFlowResult> {
  try {
    // Set memory limits if specified
    if (config.memoryLimit) {
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', config.memoryLimit);
    }

    // Determine optimal backend based on platform
    let backend: string;
    if (config.preferWebGL && typeof WebGLRenderingContext !== 'undefined') {
      backend = 'webgl';
    } else {
      backend = 'cpu';
    }

    // Special handling for iOS Safari
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari =
      /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      // iOS Safari optimizations
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
      tf.env().set('WEBGL_FLUSH_THRESHOLD', 16);
      tf.env().set('WEBGL_PACK_DEPTHWISECONV', true);

      // Try WebGL first, fall back to CPU if needed
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        backend = 'webgl';
      } catch (webglError) {
        console.warn('WebGL failed on iOS Safari, falling back to CPU:', webglError);
        await tf.setBackend('cpu');
        await tf.ready();
        backend = 'cpu';
      }
    } else {
      // Standard initialization
      await tf.setBackend(backend);
      await tf.ready();
    }

    // Apply platform-specific optimizations
    if (config.isMobile) {
      // Mobile optimizations
      tf.env().set('WEBGL_FORCE_F16_PIPELINES', true);
      tf.env().set('WEBGL_PACK', true);
    }

    if (config.isFarcaster) {
      // Farcaster-specific optimizations
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 256);
    }

    return {
      success: true,
      backend,
    };
  } catch (error: any) {
    console.error('TensorFlow initialization error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export function monitorTensorFlowMemory() {
  try {
    const info = tf.engine().memory();
    const shouldDispose = info.numBytes > 100 * 1024 * 1024; // 100MB threshold

    return {
      memoryInfo: info,
      shouldDispose,
    };
  } catch (error) {
    console.error('Memory monitoring error:', error);
    return {
      memoryInfo: null,
      shouldDispose: false,
    };
  }
}
