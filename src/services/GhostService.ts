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
 * A 30-second workout (60 frames) compresses to ~300 characters.
 * This fits within most social media URL limits (2000+ chars).
 */

import { SessionSnapshot, LocalWorkout } from '@/types/workout';
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
const MAX_URL_LENGTH = 2000; // Safety limit for URL sharing
const QUANTIZATION_BITS = 6; // 0-63 range (64 values)
const QUANTIZATION_MAX = (1 << QUANTIZATION_BITS) - 1; // 63

// Version byte for future compatibility
const FORMAT_VERSION = 1;

class GhostServiceImpl {
  /**
   * Compress a workout trace into a URL-safe string
   */
  compress(trace: SessionSnapshot[], mode: 'pushups' | 'squats' = 'pushups'): string {
    if (!trace || trace.length === 0) {
      throw new Error('Cannot compress empty trace');
    }

    // Step 1: Downsample to 2fps
    const downsampled: SessionSnapshot[] = [];
    let lastTimestamp = -COMPRESSION_INTERVAL_MS;

    for (const snapshot of trace) {
      if (snapshot.timestamp - lastTimestamp >= COMPRESSION_INTERVAL_MS) {
        downsampled.push(snapshot);
        lastTimestamp = snapshot.timestamp;
      }
    }

    if (downsampled.length === 0) {
      downsampled.push(trace[0]);
    }

    // Step 2: Create keypoint map for quick lookup
    const kpMap = new Map<string, Keypoint>();
    if (downsampled[0]?.keypoints) {
      for (const kp of downsampled[0].keypoints) {
        kpMap.set(kp.name, kp);
      }
    }

    // Step 3: Find bounding box for normalization
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const kp of kpMap.values()) {
      minX = Math.min(minX, kp.x);
      maxX = Math.max(maxX, kp.x);
      minY = Math.min(minY, kp.y);
      maxY = Math.max(maxY, kp.y);
    }

    // Handle edge case: single point or all same
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Step 4: Encode each frame
    const frames: number[] = [];

    for (const snapshot of downsampled) {
      const snapshotKpMap = new Map<string, Keypoint>();
      for (const kp of snapshot.keypoints) {
        snapshotKpMap.set(kp.name, kp);
      }

      for (const kpName of REQUIRED_KEYPOINTS) {
        const kp = snapshotKpMap.get(kpName);
        if (kp && kp.score > 0.3) {
          // Normalize and quantize x (6 bits: 0-63)
          const normalizedX = Math.max(0, Math.min(1, (kp.x - minX) / rangeX));
          const quantizedX = Math.round(normalizedX * QUANTIZATION_MAX);

          // Normalize and quantize y (6 bits: 0-63)
          const normalizedY = Math.max(0, Math.min(1, (kp.y - minY) / rangeY));
          const quantizedY = Math.round(normalizedY * QUANTIZATION_MAX);

          // Pack into 12 bits: x(6) in high bits, y(6) in low bits
          frames.push((quantizedX << 6) | quantizedY);
        } else {
          // No keypoint - use 0xFFFF as marker
          frames.push(0xffff);
        }
      }
    }

    // Step 5: Add header info
    // Format: version(4) | mode(1) | frameCount(8) | minX(16) | minY(16) | rangeX(16) | rangeY(16) | frames...
    const header: number[] = [];

    // Version (4 bits) + Mode (1 bit) + Reserved (3 bits)
    header.push((FORMAT_VERSION << 4) | (mode === 'squats' ? 1 : 0));

    // Frame count (8 bits, max 255 frames for ~2 min at 2fps)
    const frameCount = Math.min(downsampled.length, 255);
    header.push(frameCount);

    // Bounding box (each as 16-bit unsigned, big-endian)
    // Scale to fit in 16 bits (assuming max resolution of 4096)
    const scaleX = 4096 / Math.max(rangeX, 1);
    const scaleY = 4096 / Math.max(rangeY, 1);

    header.push(Math.round(minX * scaleX) >> 8, Math.round(minX * scaleX) & 0xff);
    header.push(Math.round(minY * scaleY) >> 8, Math.round(minY * scaleY) & 0xff);
    header.push(Math.round(rangeX * scaleX) >> 8, Math.round(rangeX * scaleX) & 0xff);
    header.push(Math.round(rangeY * scaleY) >> 8, Math.round(rangeY * scaleY) & 0xff);

    // Combine header and frames
    const combined = [...header, ...frames];

    // Step 6: Convert to Base64URL
    return this.bytesToBase64Url(combined);
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

      if (bytes.length < 5) {
        throw new Error('Invalid encoded data: too short');
      }

      // Step 2: Parse header
      const headerByte = bytes[0];
      const version = (headerByte >> 4) & 0x0f;
      const modeBit = headerByte & 0x01;
      const mode: 'pushups' | 'squats' = modeBit === 1 ? 'squats' : 'pushups';

      // Check version compatibility
      if (version > FORMAT_VERSION) {
        console.warn(
          `Ghost trace version ${version} > supported ${FORMAT_VERSION}, may not decode correctly`
        );
      }

      const frameCount = bytes[1];

      // Step 3: Decode frames
      const trace: SessionSnapshot[] = [];
      let byteIndex = 10;

      for (let frame = 0; frame < frameCount && byteIndex + 24 <= bytes.length; frame++) {
        const timestamp = frame * COMPRESSION_INTERVAL_MS;
        const keypoints: Keypoint[] = [];

        for (let kpIndex = 0; kpIndex < REQUIRED_KEYPOINTS.length; kpIndex++) {
          const packed = (bytes[byteIndex] << 8) | bytes[byteIndex + 1];
          byteIndex += 2;

          if (packed !== 0xffff) {
            // Decode from 12-bit packed format
            const quantizedX = (packed >> 6) & 0x3f;
            const quantizedY = packed & 0x3f;

            // Dequantize to NORMALIZED coordinates (0.0 to 1.0)
            // This allows the trace to work on any canvas size
            const normalizedX = quantizedX / QUANTIZATION_MAX;
            const normalizedY = quantizedY / QUANTIZATION_MAX;

            keypoints.push({
              name: REQUIRED_KEYPOINTS[kpIndex],
              x: normalizedX, // Normalized 0.0-1.0
              y: normalizedY, // Normalized 0.0-1.0
              score: 0.8, // Use fixed high score since we filtered low-confidence in compression
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
  generateShareUrl(trace: SessionSnapshot[], mode: 'pushups' | 'squats', baseUrl?: string): string {
    const compressed = this.compress(trace, mode);

    // Check URL length
    if (compressed.length > MAX_URL_LENGTH) {
      console.warn(`Compressed trace (${compressed.length} chars) exceeds recommended limit`);
    }

    const url = new URL(baseUrl || (typeof window !== 'undefined' ? window.location.origin : ''));
    url.pathname = '/game';
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
    // Convert to Uint8Array
    const uint8 = new Uint8Array(bytes);

    // Convert to binary string
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }

    // Base64 encode
    let base64 = btoa(binary);

    // Convert to Base64URL (replace + with -, / with _, remove = padding)
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return base64;
  }

  /**
   * Convert Base64URL string to byte array
   */
  private base64UrlToBytes(base64Url: string): number[] {
    // Convert from Base64URL to Base64
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    // Decode
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
