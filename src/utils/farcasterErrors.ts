export enum ErrorCodes {
  CAMERA_ACCESS = 'CAMERA_ACCESS_ERROR',
  TENSORFLOW_INIT = 'TENSORFLOW_INIT_ERROR',
  CAMERA_DISCONNECTED = 'CAMERA_DISCONNECTED',
  POSE_DETECTION_FAILED = 'POSE_DETECTION_FAILED',
  FRAME_PROCESSING_ERROR = 'FRAME_PROCESSING_ERROR',
  MEMORY_EXCEEDED = 'MEMORY_EXCEEDED',
  IOS_SAFARI_COMPATIBILITY = 'IOS_SAFARI_COMPATIBILITY_ERROR',
  WEBGL_NOT_SUPPORTED = 'WEBGL_NOT_SUPPORTED',
  MODEL_LOADING_FAILED = 'MODEL_LOADING_FAILED',
}

export interface FarcasterError {
  code: ErrorCodes;
  userMessage: string;
  technicalMessage: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function handleFarcasterError(error: Error, context: string): FarcasterError {
  console.error(`Farcaster error in ${context}:`, error);

  // Default error object
  let farcasterError: FarcasterError = {
    code: ErrorCodes.CAMERA_ACCESS,
    userMessage: 'An error occurred',
    technicalMessage: error instanceof Error ? error.message : String(error),
    severity: 'medium',
  };

  // Map specific errors based on context and error message
  switch (context) {
    case 'camera-access':
      farcasterError = {
        code: ErrorCodes.CAMERA_ACCESS,
        userMessage: 'Camera access denied',
        technicalMessage: error instanceof Error ? error.message : String(error),
        suggestion: 'Please allow camera access in your browser settings',
        severity: 'high',
      };
      break;

    case 'tensorflow-init':
      farcasterError = {
        code: ErrorCodes.TENSORFLOW_INIT,
        userMessage: 'AI model initialization failed',
        technicalMessage: error instanceof Error ? error.message : String(error),
        suggestion: 'Try refreshing the page or using a different browser',
        severity: 'high',
      };
      break;

    case 'camera-disconnected':
      farcasterError = {
        code: ErrorCodes.CAMERA_DISCONNECTED,
        userMessage: 'Camera disconnected',
        technicalMessage: error instanceof Error ? error.message : String(error),
        suggestion: 'Check your camera connection and refresh the page',
        severity: 'medium',
      };
      break;

    case 'pose-detection':
      farcasterError = {
        code: ErrorCodes.POSE_DETECTION_FAILED,
        userMessage: 'Pose detection failed',
        technicalMessage: error instanceof Error ? error.message : String(error),
        suggestion: 'Make sure you are in a well-lit area and positioned correctly',
        severity: 'medium',
      };
      break;

    case 'ios-safari':
      farcasterError = {
        code: ErrorCodes.IOS_SAFARI_COMPATIBILITY,
        userMessage: 'Compatibility issue with iOS Safari',
        technicalMessage: error instanceof Error ? error.message : String(error),
        suggestion: 'Try using Chrome or Firefox on iOS, or restart Safari',
        severity: 'high',
      };
      break;

    default:
      // Try to infer error type from message content
      const errorMsg =
        error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

      if (errorMsg.includes('camera') || errorMsg.includes('permission')) {
        farcasterError.code = ErrorCodes.CAMERA_ACCESS;
        farcasterError.userMessage = 'Camera access issue';
        farcasterError.severity = 'high';
        farcasterError.suggestion = 'Please allow camera access in your browser settings';
      } else if (errorMsg.includes('webgl') || errorMsg.includes('gpu')) {
        farcasterError.code = ErrorCodes.WEBGL_NOT_SUPPORTED;
        farcasterError.userMessage = 'Graphics acceleration unavailable';
        farcasterError.severity = 'medium';
        farcasterError.suggestion = 'Try enabling hardware acceleration in browser settings';
      } else if (errorMsg.includes('memory') || errorMsg.includes('heap')) {
        farcasterError.code = ErrorCodes.MEMORY_EXCEEDED;
        farcasterError.userMessage = 'Insufficient memory';
        farcasterError.severity = 'high';
        farcasterError.suggestion = 'Close other tabs/apps and try again';
      }
  }

  // Log error for analytics
  if (typeof window !== 'undefined' && (window as any).logFarcasterError) {
    (window as any).logFarcasterError(farcasterError);
  }

  return farcasterError;
}

// Specific error handlers for different contexts
export function handleCameraError(error: Error): FarcasterError {
  return handleFarcasterError(error, 'camera-access');
}

export function handleTensorFlowError(error: Error): FarcasterError {
  return handleFarcasterError(error, 'tensorflow-init');
}

export function handlePoseDetectionError(error: Error): FarcasterError {
  return handleFarcasterError(error, 'pose-detection');
}

export function handleIOSSafariError(error: Error): FarcasterError {
  return handleFarcasterError(error, 'ios-safari');
}
