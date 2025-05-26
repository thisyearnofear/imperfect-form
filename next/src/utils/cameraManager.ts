/**
 * Enhanced Camera Management Utility
 * Provides robust methods for stopping cameras across different browser contexts
 */

import { createRemoteLogger } from "./remoteLogger";

const logger = createRemoteLogger("CameraManager");

export interface CameraTrackInfo {
  id: string;
  kind: string;
  label: string;
  readyState: MediaStreamTrackState;
  enabled: boolean;
}

export class CameraManager {
  private static instance: CameraManager;
  private activeTracks: Set<MediaStreamTrack> = new Set();
  private activeStreams: Set<MediaStream> = new Set();

  private constructor() {}

  public static getInstance(): CameraManager {
    if (!CameraManager.instance) {
      CameraManager.instance = new CameraManager();
    }
    return CameraManager.instance;
  }

  /**
   * Register a track for management
   */
  public registerTrack(track: MediaStreamTrack): void {
    this.activeTracks.add(track);
    logger.info("Registered track", {
      id: track.id,
      kind: track.kind,
      label: track.label,
      state: track.readyState,
    });
  }

  /**
   * Register a stream for management
   */
  public registerStream(stream: MediaStream): void {
    this.activeStreams.add(stream);
    stream.getTracks().forEach(track => this.registerTrack(track));
    logger.info("Registered stream", {
      id: stream.id,
      trackCount: stream.getTracks().length,
    });
  }

  /**
   * Stop a specific track
   */
  public stopTrack(track: MediaStreamTrack): boolean {
    try {
      if (track.readyState === 'live') {
        track.stop();
        this.activeTracks.delete(track);
        logger.info("Stopped track", {
          id: track.id,
          kind: track.kind,
          label: track.label,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Error stopping track", { error, trackId: track.id });
      return false;
    }
  }

  /**
   * Stop all registered tracks
   */
  public stopAllTracks(): number {
    let stoppedCount = 0;
    
    this.activeTracks.forEach(track => {
      if (this.stopTrack(track)) {
        stoppedCount++;
      }
    });

    this.activeStreams.forEach(stream => {
      stream.getTracks().forEach(track => {
        if (this.stopTrack(track)) {
          stoppedCount++;
        }
      });
    });

    this.activeTracks.clear();
    this.activeStreams.clear();

    logger.info(`Stopped ${stoppedCount} tracks`);
    return stoppedCount;
  }

  /**
   * Get information about all active tracks
   */
  public getActiveTracksInfo(): CameraTrackInfo[] {
    const tracksInfo: CameraTrackInfo[] = [];
    
    this.activeTracks.forEach(track => {
      tracksInfo.push({
        id: track.id,
        kind: track.kind,
        label: track.label,
        readyState: track.readyState,
        enabled: track.enabled,
      });
    });

    return tracksInfo;
  }

  /**
   * Nuclear option: Stop ALL video tracks in the entire document
   */
  public stopAllVideoTracksInDocument(): number {
    let stoppedCount = 0;

    // Method 1: Stop tracks from all video elements
    const videoElements = document.getElementsByTagName("video");
    for (let i = 0; i < videoElements.length; i++) {
      const video = videoElements[i];
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
            stoppedCount++;
            logger.info("Document cleanup: Stopped track", {
              id: track.id,
              kind: track.kind,
              element: `video[${i}]`,
            });
          }
        });
        video.srcObject = null;
        video.pause();
        video.load();
      }
    }

    // Method 2: Stop tracks from all audio elements (in case of audio tracks)
    const audioElements = document.getElementsByTagName("audio");
    for (let i = 0; i < audioElements.length; i++) {
      const audio = audioElements[i];
      if (audio.srcObject) {
        const stream = audio.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
            stoppedCount++;
            logger.info("Document cleanup: Stopped audio track", {
              id: track.id,
              kind: track.kind,
              element: `audio[${i}]`,
            });
          }
        });
        audio.srcObject = null;
        audio.pause();
        audio.load();
      }
    }

    logger.info(`Document cleanup: Stopped ${stoppedCount} total tracks`);
    return stoppedCount;
  }

  /**
   * Check if any cameras are currently active
   */
  public hasActiveCameras(): boolean {
    const activeCount = Array.from(this.activeTracks).filter(
      track => track.readyState === 'live' && track.kind === 'video'
    ).length;
    
    return activeCount > 0;
  }

  /**
   * Get a summary of camera status
   */
  public getCameraStatus(): {
    totalTracks: number;
    activeTracks: number;
    videoTracks: number;
    audioTracks: number;
  } {
    const tracks = Array.from(this.activeTracks);
    const activeTracks = tracks.filter(track => track.readyState === 'live');
    const videoTracks = activeTracks.filter(track => track.kind === 'video');
    const audioTracks = activeTracks.filter(track => track.kind === 'audio');

    return {
      totalTracks: tracks.length,
      activeTracks: activeTracks.length,
      videoTracks: videoTracks.length,
      audioTracks: audioTracks.length,
    };
  }
}

// Export singleton instance
export const cameraManager = CameraManager.getInstance();

// Export convenience functions
export const stopAllCameras = () => cameraManager.stopAllVideoTracksInDocument();
export const getCameraStatus = () => cameraManager.getCameraStatus();
export const hasActiveCameras = () => cameraManager.hasActiveCameras();
