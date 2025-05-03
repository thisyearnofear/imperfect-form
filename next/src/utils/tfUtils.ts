import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

// Flag to track if TensorFlow has been initialized
let tfInitialized = false;

/**
 * Initialize TensorFlow.js with the best available backend
 * This should be called before any TensorFlow operations
 */
export async function initializeTensorFlow(): Promise<string> {
  if (tfInitialized) {
    return tf.getBackend() || 'unknown';
  }
  
  try {
    // Try WebGPU first (if available in the browser)
    try {
      await tf.setBackend('webgpu');
      await tf.ready();
      console.log('TensorFlow.js initialized with WebGPU backend');
      tfInitialized = true;
      return 'webgpu';
    } catch (webgpuError) {
      console.warn('WebGPU initialization failed, trying WebGL:', webgpuError);
    }
    
    // Try WebGL next
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('TensorFlow.js initialized with WebGL backend');
      tfInitialized = true;
      return 'webgl';
    } catch (webglError) {
      console.warn('WebGL initialization failed, trying WASM:', webglError);
    }
    
    // Fall back to WASM
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
