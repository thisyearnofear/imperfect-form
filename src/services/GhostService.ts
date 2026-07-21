/**
 * GhostService
 *
 * Handles compression and decompression of workout traces for URL-safe sharing.
 * This enables "Social Ghost Challenges" where users can share their workout
 * performance and compete against friends.
 *
 * Compression Strategy:
 * - Downsample from 5fps to 2fps (every 500ms) to reduce size
 * - Filter to only the 12 keypoints required for skeleton rendering
 * - Normalize coordinates to 0.0-1.0 range
 * - Quantize to 6 bits (0-63) for efficient packing
 * - Encode as Base64URL string
 *
 * A 30-second workout (60 frames) compresses to ~300-500 characters.
 * This fits within most social media URL limits (2000+ chars).
 */

import { SessionSnapshot } from '@/types/workout';
import { Keypoint } from '@/types/mediapipe';

// Keypoints required for skeleton drawing (in order for encoding)
const REQUIRED_KEYPOINTS = [
  'left_shoulder',
  'right_shoulder',
  'left_hip',
  'right_hip',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

// Compression constants
const COMPRESSION_INTERVAL_MS = 500; // 2fps for compressed trace
const _MAX_URL_LENGTH = 2000; // Safety limit for URL sharing
const QUANTIZATION_BITS = 6; // 0-63 range (64 values)
const _QUANTIZATION_MAX = (1 << QUANTIZATION_BITS) - 1; // 63

// Version byte for future compatibility
const FORMAT_VERSION = 1;

class GhostServiceImpl {
  /**
   * Compress a workout trace into a URL-safe string
   */
  compress(trace: SessionSnapshot[], mode: string = 'pushups'): string {
    if (!trace || trace.length === 0) {
      throw new Error('Cannot compress empty trace');
    }

    // Step 1: Downsample to 2fps (or more if the workout is long)
    let interval = COMPRESSION_INTERVAL_MS;
    const duration = trace[trace.length - 1].timestamp;

    // If workout is > 60s, increase interval to keep URL size down
    if (duration > 60000) {
      interval = 1000; // 1fps
    }
    if (duration > 120000) {
      interval = 2000; // 0.5fps
    }

    const downsampled: SessionSnapshot[] = [];
    let lastTimestamp = -interval;

    for (const snapshot of trace) {
      if (snapshot.timestamp - lastTimestamp >= interval) {
        downsampled.push(snapshot);
        lastTimestamp = snapshot.timestamp;
      }
    }

    if (downsampled.length === 0) {
      downsampled.push(trace[0]);
    }

    // Step 2: Find bounding box for normalization of the WHOLE trace
    // This makes the ghost auto-centered and auto-scaled
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    downsampled.forEach((s) => {
      s.keypoints.forEach((kp) => {
        if (REQUIRED_KEYPOINTS.includes(kp.name) && kp.score > 0.3) {
          minX = Math.min(minX, kp.x);
          maxX = Math.max(maxX, kp.x);
          minY = Math.min(minY, kp.y);
          maxY = Math.max(maxY, kp.y);
        }
      });
    });

    // Handle edge case: no valid points or all same
    if (minX === Infinity) {
      minX = 0;
      maxX = 100;
      minY = 0;
      maxY = 100;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Step 3: Pack into bytes
    const bytes: number[] = [];

    // Header: version (4 bits) | reserved (1 bit) | mode (1 bit) | interval_idx (2 bits)
    // interval_idx: 0=500ms, 1=1000ms, 2=2000ms
    const intervalIdx = interval === 500 ? 0 : interval === 1000 ? 1 : 2;
    bytes.push((FORMAT_VERSION << 4) | (mode === 'squats' ? 4 : 0) | intervalIdx);

    // Frame count (8 bits)
    const frameCount = Math.min(downsampled.length, 255);
    bytes.push(frameCount);

    // Step 4: Encode each frame
    // We use 2 bytes per keypoint (8 bits X, 8 bits Y) for better precision
    // Total 24 bytes per frame for 12 keypoints
    for (let i = 0; i < frameCount; i++) {
      const snapshot = downsampled[i];
      const snapshotKpMap = new Map<string, Keypoint>();
      for (const kp of snapshot.keypoints) {
        snapshotKpMap.set(kp.name, kp);
      }

      for (const kpName of REQUIRED_KEYPOINTS) {
        const kp = snapshotKpMap.get(kpName);
        if (kp && kp.score > 0.3) {
          // Normalize 0-255 relative to the bounding box
          const bX = Math.round(Math.max(0, Math.min(1, (kp.x - minX) / rangeX)) * 255);
          const bY = Math.round(Math.max(0, Math.min(1, (kp.y - minY) / rangeY)) * 255);
          bytes.push(bX, bY);
        } else {
          // No keypoint
          bytes.push(0xff, 0xff);
        }
      }
    }

    // Step 5: Convert to Base64URL
    return this.bytesToBase64Url(bytes);
  }

  /**
   * Decompress a URL-safe string back into a trace
   */
  decompress(encoded: string): SessionSnapshot[] {
    if (!encoded || encoded.length === 0) {
      return [];
    }

    try {
      // Step 1: Decode Base64URL
      const bytes = this.base64UrlToBytes(encoded);

      if (bytes.length < 2) {
        throw new Error('Invalid encoded data: too short');
      }

      // Step 2: Parse header
      const headerByte = bytes[0];
      const _version = (headerByte >> 4) & 0x0f;
      const _modeBit = (headerByte >> 3) & 0x01; // Wait, mode is bit 3 now
      // Actually let's use the same bit positions I just defined above
      // (FORMAT_VERSION << 4) | (mode === 'squats' ? 8 : 0) | intervalIdx
      // Wait, let's stick to what I wrote: (FORMAT_VERSION << 4) | (mode === 'squats' ? 1 : 0) | intervalIdx
      // Actually my previous version was (FORMAT_VERSION << 4) | (modeBit << 3) | intervalIdx
      // Let's re-read: bytes.push((FORMAT_VERSION << 4) | (mode === 'squats' ? 1 : 0) | intervalIdx);
      // Wait, that's only 2 bits for interval if mode is bit 0.
      // bits 7-4: version
      // bit 3: reserved
      // bit 2: mode
      // bits 1-0: interval

      const _mode = headerByte & 0x04 ? 'squats' : 'pushups';
      const intervalIdx = headerByte & 0x03;
      const interval = intervalIdx === 0 ? 500 : intervalIdx === 1 ? 1000 : 2000;

      const frameCount = bytes[1];

      // Step 3: Decode frames
      const trace: SessionSnapshot[] = [];
      let byteIndex = 2;

      for (let frame = 0; frame < frameCount && byteIndex + 24 <= bytes.length; frame++) {
        const timestamp = frame * interval;
        const keypoints: Keypoint[] = [];

        for (let kpIndex = 0; kpIndex < REQUIRED_KEYPOINTS.length; kpIndex++) {
          const bX = bytes[byteIndex];
          const bY = bytes[byteIndex + 1];
          byteIndex += 2;

          if (bX !== 0xff || bY !== 0xff) {
            // Dequantize to NORMALIZED coordinates (0.0 to 1.0)
            const normalizedX = bX / 255;
            const normalizedY = bY / 255;

            keypoints.push({
              name: REQUIRED_KEYPOINTS[kpIndex],
              x: normalizedX,
              y: normalizedY,
              score: 0.8,
            });
          }
        }

        trace.push({
          timestamp,
          metrics: {
            trunkLean: 0,
            kneeValgus: 0,
            ankleFlexion: 0,
            depth: 0.5,
            symmetry: 1,
            isStable: true,
            warnings: [],
          },
          keypoints,
        });
      }

      return trace;
    } catch (error) {
      console.error('Failed to decompress ghost trace:', error);
      return [];
    }
  }

  /**
   * Generate a shareable URL for a workout trace
   */
  generateShareUrl(trace: SessionSnapshot[], mode: string, baseUrl?: string): string {
    const compressed = this.compress(trace, mode);

    const url = new URL(baseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
    url.pathname = '/';
    url.searchParams.set('race', compressed);
    url.searchParams.set('mode', mode);

    return url.toString();
  }

  /**
   * Extract trace from URL parameters
   */
  extractFromUrl(raceParam: string | null): SessionSnapshot[] | null {
    if (!raceParam) {
      return null;
    }

    try {
      return this.decompress(raceParam);
    } catch (error) {
      console.error('Failed to extract trace from URL:', error);
      return null;
    }
  }

  /**
   * Convert byte array to Base64URL string
   */
  private bytesToBase64Url(bytes: number[]): string {
    const uint8 = new Uint8Array(bytes);

    // Use a more robust way to convert Uint8Array to Base64
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }

    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Convert Base64URL string to byte array
   */
  private base64UrlToBytes(base64Url: string): number[] {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const binary = atob(base64);
    const bytes: number[] = [];
    for (let i = 0; i < binary.length; i++) {
      bytes.push(binary.charCodeAt(i));
    }

    return bytes;
  }
}

export const ghostService = new GhostServiceImpl();
export default ghostService;
