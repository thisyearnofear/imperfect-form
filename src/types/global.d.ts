import type { PoseDetector } from '@tensorflow-models/pose-detection';

declare global {
  interface Window {
    /** Pre-warmed MoveNet detector created by ClientOnlyProviders to speed up first workout. */
    __imfPreWarmedDetector?: PoseDetector;
  }
}
